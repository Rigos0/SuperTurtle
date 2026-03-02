import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const followUser = mutation({
  args: {
    followerId: v.id("users"),
    followedId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.followerId === args.followedId) {
      throw new Error("Cannot follow yourself");
    }

    const [follower, followed, existingFollow] = await Promise.all([
      ctx.db.get(args.followerId),
      ctx.db.get(args.followedId),
      ctx.db
        .query("follows")
        .withIndex("byFollowerAndFollowed", (q) =>
          q.eq("followerId", args.followerId).eq("followedId", args.followedId),
        )
        .first(),
    ]);

    if (!follower || !followed) {
      throw new Error("User not found");
    }

    if (existingFollow) {
      return existingFollow._id;
    }

    const followId = await ctx.db.insert("follows", {
      followerId: args.followerId,
      followedId: args.followedId,
      createdAt: Date.now(),
    });

    await ctx.runMutation(internal.notifications.createNotification, {
      userId: args.followedId,
      type: "follow",
      fromUserId: args.followerId,
    });

    return followId;
  },
});

export const unfollowUser = mutation({
  args: {
    followerId: v.id("users"),
    followedId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const existingFollow = await ctx.db
      .query("follows")
      .withIndex("byFollowerAndFollowed", (q) =>
        q.eq("followerId", args.followerId).eq("followedId", args.followedId),
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
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const followers = await ctx.db
      .query("follows")
      .withIndex("byFollowed", (q) => q.eq("followedId", args.userId))
      .collect();

    return followers.length;
  },
});

export const getFollowingCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const following = await ctx.db
      .query("follows")
      .withIndex("byFollower", (q) => q.eq("followerId", args.userId))
      .collect();

    return following.length;
  },
});

export const isFollowing = query({
  args: {
    followerId: v.id("users"),
    followedId: v.id("users"),
  },
  handler: async (ctx, args) => {
    if (args.followerId === args.followedId) {
      return false;
    }

    const follow = await ctx.db
      .query("follows")
      .withIndex("byFollowerAndFollowed", (q) =>
        q.eq("followerId", args.followerId).eq("followedId", args.followedId),
      )
      .first();

    return Boolean(follow);
  },
});
