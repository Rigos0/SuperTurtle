import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listPosts = query({
  args: {},
  handler: async (ctx) => {
    const posts = await ctx.db.query("posts").collect();
    const sortedPosts = [...posts].sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      sortedPosts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        const likes = await ctx.db
          .query("likes")
          .filter((q) => q.eq(q.field("postId"), post._id))
          .collect();
        const comments = await ctx.db
          .query("comments")
          .filter((q) => q.eq(q.field("postId"), post._id))
          .collect();

        return {
          ...post,
          likesCount: likes.length,
          commentsCount: comments.length,
          author: author
            ? {
                displayName: author.displayName ?? author.name ?? "Guest User",
                photoURL: author.photoURL ?? author.image ?? "",
                title: author.title ?? "",
                username: author.username ?? "",
              }
            : null,
        };
      }),
    );
  },
});

export const listPostsByUser = query({
  args: {
    authorId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const posts = await ctx.db
      .query("posts")
      .filter((q) => q.eq(q.field("authorId"), args.authorId))
      .collect();
    const sortedPosts = [...posts].sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      sortedPosts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        const likes = await ctx.db
          .query("likes")
          .filter((q) => q.eq(q.field("postId"), post._id))
          .collect();
        const comments = await ctx.db
          .query("comments")
          .filter((q) => q.eq(q.field("postId"), post._id))
          .collect();

        return {
          ...post,
          likesCount: likes.length,
          commentsCount: comments.length,
          author: author
            ? {
                displayName: author.displayName ?? author.name ?? "Guest User",
                photoURL: author.photoURL ?? author.image ?? "",
                title: author.title ?? "",
                username: author.username ?? "",
              }
            : null,
        };
      }),
    );
  },
});

export const searchPosts = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedQuery = args.query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    const posts = await ctx.db.query("posts").collect();
    const matchingPosts = [...posts]
      .filter((post) =>
        post.description.toLowerCase().includes(normalizedQuery),
      )
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10);

    return await Promise.all(
      matchingPosts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        return {
          _id: post._id,
          authorId: post.authorId,
          description: post.description,
          createdAt: post.createdAt,
          author: author
            ? {
                _id: author._id,
                displayName: author.displayName ?? author.name ?? "Guest User",
                photoURL: author.photoURL ?? author.image ?? "",
                title: author.title ?? "",
                username: author.username ?? "",
              }
            : null,
        };
      }),
    );
  },
});

export const createPost = mutation({
  args: {
    authorId: v.id("users"),
    description: v.string(),
    fileType: v.optional(v.string()),
    fileData: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("posts", {
      authorId: args.authorId,
      description: args.description,
      createdAt: Date.now(),
      likesCount: 0,
      commentsCount: 0,
      ...(args.fileType ? { fileType: args.fileType } : {}),
      ...(args.fileData ? { fileData: args.fileData } : {}),
    });
  },
});

export const deletePost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.postId);
  },
});

export const updatePost = mutation({
  args: {
    postId: v.id("posts"),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      description: args.description,
    });
  },
});
