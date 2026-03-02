import { v } from "convex/values";
import { query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { buildAuthorSummary } from "./helpers";

const normalizeHashtag = (value: string) =>
  value
    .trim()
    .replace(/^#+/, "")
    .toLowerCase();

const resolvePostImageUrls = async (
  ctx: { storage: { getUrl: (storageId: Id<"_storage">) => Promise<string | null> } },
  post: Doc<"posts">,
) => {
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

export const getPostsByHashtag = query({
  args: {
    tag: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedTag = normalizeHashtag(args.tag);
    if (!normalizedTag) {
      return [];
    }

    const hashtagEntries = await ctx.db
      .query("hashtags")
      .withIndex("byTag", (q) => q.eq("tag", normalizedTag))
      .collect();

    if (hashtagEntries.length === 0) {
      return [];
    }

    const uniquePostIds = Array.from(new Set(hashtagEntries.map((entry) => entry.postId)));
    const posts = await Promise.all(uniquePostIds.map((postId) => ctx.db.get(postId)));
    const existingPosts = posts
      .filter((post): post is Doc<"posts"> => post !== null)
      .sort((a, b) => b.createdAt - a.createdAt);

    return await Promise.all(
      existingPosts.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        const imageUrls = await resolvePostImageUrls(ctx, post);
        const resolvedFileData =
          post.fileType === "image" && imageUrls.length > 0 ? imageUrls[0] : post.fileData;

        return {
          ...post,
          fileData: resolvedFileData,
          likesCount: post.likesCount,
          commentsCount: post.commentsCount,
          imageUrls,
          author: await buildAuthorSummary(ctx, author),
        };
      }),
    );
  },
});
