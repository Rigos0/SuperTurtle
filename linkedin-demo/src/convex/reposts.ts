import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const normalizeCommentary = (commentary?: string) => {
  if (typeof commentary !== "string") {
    return undefined;
  }

  const trimmedCommentary = commentary.trim();
  return trimmedCommentary.length > 0 ? trimmedCommentary : undefined;
};

export const repostPost = mutation({
  args: {
    postId: v.id("posts"),
    commentary: v.optional(v.string()),
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

    const commentary = normalizeCommentary(args.commentary);
    const existingRepost = await ctx.db
      .query("reposts")
      .withIndex("byUserAndPost", (q) =>
        q.eq("userId", userId).eq("originalPostId", args.postId),
      )
      .first();

    if (existingRepost) {
      await ctx.db.patch(existingRepost._id, {
        commentary,
      });

      return existingRepost._id;
    }

    return await ctx.db.insert("reposts", {
      userId,
      originalPostId: args.postId,
      commentary,
      createdAt: Date.now(),
    });
  },
});

export const removeRepost = mutation({
  args: {
    repostId: v.id("reposts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const repost = await ctx.db.get(args.repostId);
    if (!repost) {
      throw new Error("Repost not found");
    }

    if (repost.userId !== userId) {
      throw new Error("Not authorized to remove this repost");
    }

    await ctx.db.delete(args.repostId);

    return { removed: true };
  },
});

export const getRepostCount = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const reposts = await ctx.db
      .query("reposts")
      .withIndex("byOriginalPost", (q) => q.eq("originalPostId", args.postId))
      .collect();

    return reposts.length;
  },
});

export const getUserRepost = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    return await ctx.db
      .query("reposts")
      .withIndex("byUserAndPost", (q) =>
        q.eq("userId", userId).eq("originalPostId", args.postId),
      )
      .first();
  },
});
