import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const followCompany = mutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const followerId = await getAuthUserId(ctx);
    if (!followerId) {
      throw new Error("Authentication required");
    }

    const [company, existingFollow] = await Promise.all([
      ctx.db.get(args.companyId),
      ctx.db
        .query("companyFollowers")
        .withIndex("byFollowerAndCompany", (q) =>
          q.eq("followerId", followerId).eq("companyId", args.companyId),
        )
        .first(),
    ]);

    if (!company) {
      throw new Error("Company not found");
    }

    if (existingFollow) {
      return existingFollow._id;
    }

    return await ctx.db.insert("companyFollowers", {
      followerId,
      companyId: args.companyId,
      createdAt: Date.now(),
    });
  },
});

export const unfollowCompany = mutation({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const followerId = await getAuthUserId(ctx);
    if (!followerId) {
      throw new Error("Authentication required");
    }

    const existingFollow = await ctx.db
      .query("companyFollowers")
      .withIndex("byFollowerAndCompany", (q) =>
        q.eq("followerId", followerId).eq("companyId", args.companyId),
      )
      .first();

    if (!existingFollow) {
      return { unfollowed: false };
    }

    await ctx.db.delete(existingFollow._id);
    return { unfollowed: true };
  },
});

export const getFollowerCount = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const followers = await ctx.db
      .query("companyFollowers")
      .withIndex("byCompany", (q) => q.eq("companyId", args.companyId))
      .collect();

    return followers.length;
  },
});

export const isFollowing = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const followerId = await getAuthUserId(ctx);
    if (!followerId) {
      return false;
    }

    const follow = await ctx.db
      .query("companyFollowers")
      .withIndex("byFollowerAndCompany", (q) =>
        q.eq("followerId", followerId).eq("companyId", args.companyId),
      )
      .first();

    return Boolean(follow);
  },
});
