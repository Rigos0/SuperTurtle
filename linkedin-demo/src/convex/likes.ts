import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

const REACTION_TYPES = [
  "like",
  "love",
  "celebrate",
  "insightful",
  "funny",
] as const;

type ReactionType = (typeof REACTION_TYPES)[number];
const reactionTypeValidator = v.union(
  v.literal("like"),
  v.literal("love"),
  v.literal("celebrate"),
  v.literal("insightful"),
  v.literal("funny"),
);

type ReactionCounts = Record<ReactionType, number> & {
  total: number;
};

const buildEmptyReactionCounts = (): ReactionCounts => ({
  like: 0,
  love: 0,
  celebrate: 0,
  insightful: 0,
  funny: 0,
  total: 0,
});

export const toggleLike = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const existingLike = await ctx.db
      .query("likes")
      .withIndex("byUserAndPost", (q) =>
        q.eq("userId", userId).eq("postId", args.postId),
      )
      .first();

    if (existingLike) {
      await ctx.db.delete(existingLike._id);
      await ctx.db.patch(args.postId, {
        likesCount: Math.max(0, post.likesCount - 1),
      });
      return { liked: false };
    }

    await ctx.db.insert("likes", {
      userId,
      postId: args.postId,
    });
    await ctx.db.patch(args.postId, {
      likesCount: post.likesCount + 1,
    });
    await ctx.runMutation(internal.notifications.createNotification, {
      userId: post.authorId,
      type: "like",
      fromUserId: userId,
      postId: args.postId,
    });

    return { liked: true };
  },
});

export const setReaction = mutation({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
    reactionType: reactionTypeValidator,
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const now = Date.now();
    const existingReaction = await ctx.db
      .query("reactions")
      .withIndex("byUserAndPost", (q) =>
        q.eq("userId", userId).eq("postId", args.postId),
      )
      .first();

    if (existingReaction) {
      if (existingReaction.reactionType === args.reactionType) {
        return { reactionType: existingReaction.reactionType };
      }

      await ctx.db.patch(existingReaction._id, {
        reactionType: args.reactionType,
        updatedAt: now,
      });

      return { reactionType: args.reactionType };
    }

    await ctx.db.insert("reactions", {
      userId,
      postId: args.postId,
      reactionType: args.reactionType,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.patch(args.postId, {
      likesCount: post.likesCount + 1,
    });

    if (post.authorId !== userId) {
      await ctx.runMutation(internal.notifications.createNotification, {
        userId: post.authorId,
        type: "like",
        fromUserId: userId,
        postId: args.postId,
      });
    }

    return { reactionType: args.reactionType };
  },
});

export const removeReaction = mutation({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const post = await ctx.db.get(args.postId);
    if (!post) {
      throw new Error("Post not found");
    }

    const existingReaction = await ctx.db
      .query("reactions")
      .withIndex("byUserAndPost", (q) =>
        q.eq("userId", userId).eq("postId", args.postId),
      )
      .first();

    if (!existingReaction) {
      return { removed: false };
    }

    await ctx.db.delete(existingReaction._id);
    await ctx.db.patch(args.postId, {
      likesCount: Math.max(0, post.likesCount - 1),
    });

    return { removed: true };
  },
});

export const getLikeStatus = query({
  args: {
    userId: v.id("users"),
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const existingLike = await ctx.db
      .query("likes")
      .withIndex("byUserAndPost", (q) =>
        q.eq("userId", args.userId).eq("postId", args.postId),
      )
      .first();

    return Boolean(existingLike);
  },
});

export const getLikeStatuses = query({
  args: {
    userId: v.id("users"),
    postIds: v.array(v.id("posts")),
  },
  handler: async (ctx, args) => {
    const allLikes = await ctx.db
      .query("likes")
      .withIndex("byUserId", (q) => q.eq("userId", args.userId))
      .collect();

    const likedPostIds = new Set(allLikes.map((like) => like.postId));
    const result: Record<string, boolean> = {};
    for (const postId of args.postIds) {
      result[postId] = likedPostIds.has(postId);
    }
    return result;
  },
});

export const getUserReactionsByPostIds = query({
  args: {
    userId: v.id("users"),
    postIds: v.array(v.id("posts")),
  },
  handler: async (ctx, args) => {
    const postIds = args.postIds.map((postId) => `${postId}`);
    const postIdSet = new Set(postIds);
    const reactionsByPostId: Record<string, ReactionType | null> = {};

    for (const postId of postIds) {
      reactionsByPostId[postId] = null;
    }

    if (postIds.length === 0) {
      return reactionsByPostId;
    }

    const userReactions = await ctx.db
      .query("reactions")
      .withIndex("byUserAndPost", (q) => q.eq("userId", args.userId))
      .collect();
    const postsWithReaction = new Set<string>();

    for (const reaction of userReactions) {
      const postId = `${reaction.postId}`;
      if (!postIdSet.has(postId)) {
        continue;
      }

      reactionsByPostId[postId] = reaction.reactionType;
      postsWithReaction.add(postId);
    }

    if (postsWithReaction.size !== postIdSet.size) {
      const likes = await ctx.db
        .query("likes")
        .withIndex("byUserId", (q) => q.eq("userId", args.userId))
        .collect();

      for (const like of likes) {
        const postId = `${like.postId}`;
        if (!postIdSet.has(postId) || postsWithReaction.has(postId)) {
          continue;
        }

        reactionsByPostId[postId] = "like";
      }
    }

    return reactionsByPostId;
  },
});

export const getReactionCountsByPostIds = query({
  args: {
    postIds: v.array(v.id("posts")),
  },
  handler: async (ctx, args) => {
    const postIds = args.postIds.map((postId) => `${postId}`);
    const reactionCountsByPostId: Record<string, ReactionCounts> = {};

    for (const postId of postIds) {
      reactionCountsByPostId[postId] = buildEmptyReactionCounts();
    }

    if (postIds.length === 0) {
      return reactionCountsByPostId;
    }

    const countsByPost = await Promise.all(
      args.postIds.map(async (postId) => {
        const [reactions, likes] = await Promise.all([
          ctx.db
            .query("reactions")
            .withIndex("byPost", (q) => q.eq("postId", postId))
            .collect(),
          ctx.db
            .query("likes")
            .withIndex("byPostId", (q) => q.eq("postId", postId))
            .collect(),
        ]);

        const counts = buildEmptyReactionCounts();
        if (reactions.length > 0) {
          for (const reaction of reactions) {
            counts[reaction.reactionType] += 1;
          }
        } else {
          counts.like = likes.length;
        }

        return [`${postId}`, counts] as const;
      }),
    );

    for (const [postId, counts] of countsByPost) {
      reactionCountsByPostId[postId] = counts;
    }

    for (const postId of postIds) {
      const counts = reactionCountsByPostId[postId];
      counts.total = REACTION_TYPES.reduce((sum, reactionType) => {
        return sum + counts[reactionType];
      }, 0);
    }

    return reactionCountsByPostId;
  },
});
