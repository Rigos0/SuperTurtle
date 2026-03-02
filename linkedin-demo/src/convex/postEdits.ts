import { v } from "convex/values";
import { query } from "./_generated/server";

export const getEditHistory = query({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const edits = await ctx.db
      .query("postEdits")
      .withIndex("byPostId", (q) => q.eq("postId", args.postId))
      .collect();

    return edits.sort((a, b) => b.editedAt - a.editedAt);
  },
});
