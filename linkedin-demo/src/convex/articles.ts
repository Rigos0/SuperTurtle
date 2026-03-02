import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const normalizeRequiredField = (value: string, fieldName: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new Error(`${fieldName} is required`);
  }

  return trimmedValue;
};

const normalizeOptionalDescription = (value?: string) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const buildArticleDescription = (body: string, description?: string) => {
  const normalizedDescription = normalizeOptionalDescription(description);
  if (normalizedDescription) {
    return normalizedDescription;
  }

  const compactBody = body.replace(/\s+/g, " ").trim();
  return compactBody.slice(0, 280);
};

const resolveUserPhotoURL = async (ctx: QueryCtx, user: Doc<"users">) => {
  if (user.photoStorageId) {
    const storagePhotoURL = await ctx.storage.getUrl(user.photoStorageId);
    if (storagePhotoURL) {
      return storagePhotoURL;
    }
  }

  return user.photoURL ?? user.image ?? "";
};

const buildAuthorSummary = async (ctx: QueryCtx, authorId: Id<"users">) => {
  const author = await ctx.db.get(authorId);
  if (!author) {
    return null;
  }

  return {
    _id: author._id,
    displayName: author.displayName ?? author.name ?? "Guest User",
    photoURL: await resolveUserPhotoURL(ctx, author),
    title: author.title ?? "",
    username: author.username ?? "",
  };
};

const canViewConnectionsOnlyArticle = async (
  ctx: QueryCtx,
  viewerId: Id<"users">,
  authorId: Id<"users">,
) => {
  if (viewerId === authorId) {
    return true;
  }

  const [viewerRequestedConnection, viewerReceivedConnection] = await Promise.all([
    ctx.db
      .query("connections")
      .withIndex("byUsers", (q) => q.eq("userId1", viewerId).eq("userId2", authorId))
      .first(),
    ctx.db
      .query("connections")
      .withIndex("byUsers", (q) => q.eq("userId1", authorId).eq("userId2", viewerId))
      .first(),
  ]);

  return (
    viewerRequestedConnection?.status === "accepted" ||
    viewerReceivedConnection?.status === "accepted"
  );
};

export const createArticle = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authorId = await getAuthUserId(ctx);
    if (!authorId) {
      throw new Error("Not authenticated");
    }

    const title = normalizeRequiredField(args.title, "Title");
    const body = normalizeRequiredField(args.body, "Body");
    const description = buildArticleDescription(body, args.description);

    return await ctx.db.insert("posts", {
      authorId,
      description,
      type: "article",
      articleTitle: title,
      articleBody: body,
      visibility: "public",
      createdAt: Date.now(),
      likesCount: 0,
      commentsCount: 0,
    });
  },
});

export const getArticle = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    const article = await ctx.db.get(args.postId);
    if (!article || article.type !== "article") {
      return null;
    }

    if (article.visibility === "connections") {
      if (!viewerId) {
        return null;
      }

      const canView = await canViewConnectionsOnlyArticle(
        ctx,
        viewerId,
        article.authorId,
      );
      if (!canView) {
        return null;
      }
    }

    return {
      ...article,
      author: await buildAuthorSummary(ctx, article.authorId),
    };
  },
});
