import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";

export const createNotification = internalMutation({
  args: {
    userId: v.id("users"),
    type: v.string(),
    fromUserId: v.id("users"),
    postId: v.optional(v.id("posts")),
    conversationId: v.optional(v.id("conversations")),
  },
  handler: async (ctx, args) => {
    if (args.userId === args.fromUserId) {
      return null;
    }

    return await ctx.db.insert("notifications", {
      userId: args.userId,
      type: args.type,
      fromUserId: args.fromUserId,
      ...(args.postId ? { postId: args.postId } : {}),
      ...(args.conversationId ? { conversationId: args.conversationId } : {}),
      read: false,
      createdAt: Date.now(),
    });
  },
});

export const listNotifications = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    const sortedNotifications = [...notifications]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50);

    return await Promise.all(
      sortedNotifications.map(async (notification) => {
        const fromUser = await ctx.db.get(notification.fromUserId);

        return {
          ...notification,
          fromUser: fromUser
            ? {
                _id: fromUser._id,
                displayName: fromUser.displayName ?? fromUser.name ?? "Guest User",
                photoURL: fromUser.photoURL ?? fromUser.image ?? "",
                username: fromUser.username ?? "",
              }
            : null,
        };
      }),
    );
  },
});

export const getUnreadCount = query({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("read"), false),
        ),
      )
      .collect();

    return unreadNotifications.length;
  },
});

export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.read) {
      return;
    }

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllAsRead = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .filter((q) =>
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("read"), false),
        ),
      )
      .collect();

    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, { read: true }),
      ),
    );
  },
});
