import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { buildAuthorSummaryById } from "./helpers";

const resolvePostImageUrls = async (ctx: QueryCtx, post: Doc<"posts">) => {
  if (post.imageStorageIds?.length) {
    const resolvedUrls = await Promise.all(
      post.imageStorageIds.map((storageId) => ctx.storage.getUrl(storageId)),
    );

    return resolvedUrls.filter((url): url is string => typeof url === "string" && url.length > 0);
  }

  if (post.fileType === "image" && post.fileData) {
    return [post.fileData];
  }

  return [];
};

const buildBookmarkedPostPayload = async (ctx: QueryCtx, post: Doc<"posts">) => {
  const [author, imageUrls, reposts] = await Promise.all([
    buildAuthorSummaryById(ctx, post.authorId),
    resolvePostImageUrls(ctx, post),
    ctx.db
      .query("reposts")
      .withIndex("byOriginalPost", (q) => q.eq("originalPostId", post._id))
      .collect(),
  ]);

  return {
    ...post,
    fileData: post.fileType === "image" && imageUrls.length > 0 ? imageUrls[0] : post.fileData,
    likesCount: post.likesCount,
    commentsCount: post.commentsCount,
    repostCount: reposts.length,
    imageUrls,
    author,
  };
};

export const toggleBookmark = mutation({
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

    const existingBookmark = await ctx.db
      .query("bookmarks")
      .withIndex("byUserAndPost", (q) =>
        q.eq("userId", userId).eq("postId", args.postId),
      )
      .first();

    if (existingBookmark) {
      await ctx.db.delete(existingBookmark._id);
      return { bookmarked: false };
    }

    await ctx.db.insert("bookmarks", {
      userId,
      postId: args.postId,
      createdAt: Date.now(),
    });

    return { bookmarked: true };
  },
});

export const isBookmarked = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return false;
    }

    const bookmark = await ctx.db
      .query("bookmarks")
      .withIndex("byUserAndPost", (q) =>
        q.eq("userId", userId).eq("postId", args.postId),
      )
      .first();

    return Boolean(bookmark);
  },
});

export const getUserBookmarks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    const bookmarks = await ctx.db
      .query("bookmarks")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    const sortedBookmarks = [...bookmarks].sort((a, b) => b.createdAt - a.createdAt);
    const bookmarkedPosts = await Promise.all(
      sortedBookmarks.map(async (bookmark) => {
        const post = await ctx.db.get(bookmark.postId);
        if (!post) {
          return null;
        }

        const payload = await buildBookmarkedPostPayload(ctx, post);
        return {
          ...payload,
          bookmarkedAt: bookmark.createdAt,
        };
      }),
    );

    return bookmarkedPosts.filter(
      (post): post is NonNullable<typeof post> => post !== null,
    );
  },
});
