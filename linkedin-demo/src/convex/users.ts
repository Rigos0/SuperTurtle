import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import type { Doc, Id } from "./_generated/dataModel";
import { resolveUserPhotoURL } from "./helpers";

const USERNAME_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugifyUsername = (value: string) => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "user";
};

const normalizeUsername = (value: string) => value.trim().toLowerCase();
const buildPrefixUpperBound = (value: string) => `${value}\uffff`;

const resolveUserCoverURL = async (
  ctx: { storage: { getUrl: (storageId: Id<"_storage">) => Promise<string | null> } },
  user: Doc<"users">,
) => {
  if (!user.coverStorageId) {
    return "";
  }

  const storageCoverURL = await ctx.storage.getUrl(user.coverStorageId);
  return storageCoverURL ?? "";
};

const normalizeOptionalField = (value?: string) => {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const normalizeRequiredField = (value: string, fieldName: string) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    throw new Error(`${fieldName} is required`);
  }
  return trimmedValue;
};

const normalizeExperienceInput = (args: {
  title: string;
  company: string;
  companyId?: Id<"companies">;
  startDate: string;
  endDate?: string;
  description?: string;
}) => {
  const normalizedInput: {
    title: string;
    company: string;
    companyId?: Id<"companies">;
    startDate: string;
    endDate?: string;
    description?: string;
  } = {
    title: normalizeRequiredField(args.title, "Title"),
    company: normalizeRequiredField(args.company, "Company"),
    startDate: normalizeRequiredField(args.startDate, "Start date"),
    endDate: normalizeOptionalField(args.endDate),
    description: normalizeOptionalField(args.description),
  };

  if (args.companyId) {
    normalizedInput.companyId = args.companyId;
  }

  return normalizedInput;
};

const normalizeEducationInput = (args: {
  school: string;
  degree: string;
  field: string;
  startYear: string;
  endYear?: string;
}) => ({
  school: normalizeRequiredField(args.school, "School"),
  degree: normalizeRequiredField(args.degree, "Degree"),
  field: normalizeRequiredField(args.field, "Field of study"),
  startYear: normalizeRequiredField(args.startYear, "Start year"),
  endYear: normalizeOptionalField(args.endYear),
});

const normalizeSkill = (value: string) => {
  const normalizedValue = value.trim().replace(/\s+/g, " ");

  if (!normalizedValue) {
    throw new Error("Skill is required");
  }

  if (normalizedValue.length > 50) {
    throw new Error("Skill must be 50 characters or fewer");
  }

  return normalizedValue;
};

const buildSkillKey = (value: string) => value.trim().toLowerCase();

const resolveActivityLimit = (limit?: number) => {
  if (typeof limit !== "number" || Number.isNaN(limit)) {
    return 10;
  }

  const normalizedLimit = Math.floor(limit);
  return Math.min(Math.max(normalizedLimit, 1), 20);
};

const MAX_FEATURED_POSTS = 3;

const normalizeFeaturedPostIds = (postIds?: Id<"posts">[]) => {
  if (!Array.isArray(postIds)) {
    return [];
  }

  const seenPostIds = new Set<Id<"posts">>();
  const normalizedPostIds: Id<"posts">[] = [];

  for (const postId of postIds) {
    if (seenPostIds.has(postId)) {
      continue;
    }
    seenPostIds.add(postId);
    normalizedPostIds.push(postId);
  }

  return normalizedPostIds;
};

export const getUser = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.id);
    if (!user) {
      return null;
    }

    return {
      ...user,
      photoURL: await resolveUserPhotoURL(ctx, user),
      coverURL: await resolveUserCoverURL(ctx, user),
    };
  },
});

export const getFeaturedUser = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const featuredUser = users.find((user) => user.isFeatured);

    if (!featuredUser) {
      return null;
    }

    return {
      ...featuredUser,
      photoURL: await resolveUserPhotoURL(ctx, featuredUser),
      coverURL: await resolveUserCoverURL(ctx, featuredUser),
    };
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    return {
      ...user,
      photoURL: await resolveUserPhotoURL(ctx, user),
      coverURL: await resolveUserCoverURL(ctx, user),
    };
  },
});

export const getUserByUsername = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedUsername = normalizeUsername(args.username);
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", normalizedUsername))
      .unique();

    if (!user) {
      return null;
    }

    return {
      ...user,
      photoURL: await resolveUserPhotoURL(ctx, user),
      coverURL: await resolveUserCoverURL(ctx, user),
    };
  },
});

export const getRecentActivity = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return [];
    }

    const limit = resolveActivityLimit(args.limit);

    const [posts, comments] = await Promise.all([
      ctx.db
        .query("posts")
        .filter((q) => q.eq(q.field("authorId"), args.userId))
        .collect(),
      ctx.db
        .query("comments")
        .filter((q) => q.eq(q.field("authorId"), args.userId))
        .collect(),
    ]);

    const commentPostIds = Array.from(new Set(comments.map((comment) => comment.postId)));
    const postById = new Map<Id<"posts">, Doc<"posts"> | null>();
    await Promise.all(
      commentPostIds.map(async (postId) => {
        postById.set(postId, await ctx.db.get(postId));
      }),
    );

    const commentPostAuthorIds = Array.from(
      new Set(
        commentPostIds
          .map((postId) => postById.get(postId)?.authorId)
          .filter((authorId): authorId is Id<"users"> => Boolean(authorId)),
      ),
    );

    const userById = new Map<Id<"users">, Doc<"users"> | null>();
    await Promise.all(
      commentPostAuthorIds.map(async (authorId) => {
        userById.set(authorId, await ctx.db.get(authorId));
      }),
    );

    const postActivity = posts.map((post) => ({
      activityType: "post" as const,
      activityId: post._id,
      createdAt: post.createdAt,
      postId: post._id,
      content: post.description,
      postPreview: post.description,
      postAuthorName: user.displayName ?? user.name ?? "User",
    }));

    const commentActivity = comments.map((comment) => {
      const commentPost = postById.get(comment.postId) ?? null;
      const commentPostAuthor = commentPost ? userById.get(commentPost.authorId) ?? null : null;

      return {
        activityType: "comment" as const,
        activityId: comment._id,
        createdAt: comment.createdAt,
        postId: comment.postId,
        content: comment.body,
        postPreview: commentPost?.description ?? "",
        postAuthorName:
          commentPostAuthor?.displayName ?? commentPostAuthor?.name ?? "Unknown user",
      };
    });

    return [...postActivity, ...commentActivity]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);
  },
});

export const isUsernameAvailable = query({
  args: {
    username: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedUsername = normalizeUsername(args.username);
    if (!USERNAME_REGEX.test(normalizedUsername)) {
      return false;
    }

    const existingUser = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", normalizedUsername))
      .unique();

    return !existingUser;
  },
});

export const searchUsersByPrefix = query({
  args: {
    prefix: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedPrefix = normalizeUsername(args.prefix);
    if (!normalizedPrefix) {
      return [];
    }

    const users = await ctx.db
      .query("users")
      .withIndex("username", (q) =>
        q.gte("username", normalizedPrefix).lt("username", buildPrefixUpperBound(normalizedPrefix)),
      )
      .take(10);

    return await Promise.all(
      users
        .filter((user) => typeof user.username === "string" && user.username.length > 0)
        .map(async (user) => ({
          username: user.username as string,
          displayName: user.displayName ?? user.name ?? "Guest User",
          photoURL: await resolveUserPhotoURL(ctx, user),
        })),
    );
  },
});

export const ensureUsername = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.username) {
      return user.username;
    }

    const baseUsername = slugifyUsername(user.displayName ?? user.name ?? "user");
    let candidateUsername = baseUsername;
    let suffix = 2;

    while (true) {
      const existingUser = await ctx.db
        .query("users")
        .withIndex("username", (q) => q.eq("username", candidateUsername))
        .unique();

      if (!existingUser || existingUser._id === userId) {
        await ctx.db.patch(userId, { username: candidateUsername });
        return candidateUsername;
      }

      candidateUsername = `${baseUsername}-${suffix}`;
      suffix += 1;
    }
  },
});

export const updateCurrentUserProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    title: v.optional(v.string()),
    headline: v.optional(v.string()),
    location: v.optional(v.string()),
    about: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const patch: {
      displayName?: string;
      title?: string;
      headline?: string;
      location?: string;
      about?: string;
    } = {};

    if (args.displayName !== undefined) {
      patch.displayName = args.displayName.trim();
    }
    if (args.title !== undefined) {
      patch.title = args.title.trim();
    }
    if (args.headline !== undefined) {
      patch.headline = args.headline.trim();
    }
    if (args.location !== undefined) {
      patch.location = args.location.trim();
    }
    if (args.about !== undefined) {
      patch.about = args.about.trim();
    }

    if (Object.keys(patch).length === 0) {
      return user;
    }

    await ctx.db.patch(userId, patch);
    return await ctx.db.get(userId);
  },
});

export const addSkill = mutation({
  args: {
    skill: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const nextSkill = normalizeSkill(args.skill);
    const currentSkills = user.skills ?? [];
    const nextSkillKey = buildSkillKey(nextSkill);

    if (currentSkills.some((skill) => buildSkillKey(skill) === nextSkillKey)) {
      return currentSkills;
    }

    if (currentSkills.length >= 50) {
      throw new Error("Maximum of 50 skills reached");
    }

    const nextSkills = [...currentSkills, nextSkill];
    await ctx.db.patch(userId, { skills: nextSkills });
    return nextSkills;
  },
});

export const removeSkill = mutation({
  args: {
    skill: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const targetSkillKey = buildSkillKey(normalizeSkill(args.skill));
    const currentSkills = user.skills ?? [];
    const nextSkills = currentSkills.filter((skill) => buildSkillKey(skill) !== targetSkillKey);

    if (nextSkills.length === currentSkills.length) {
      return currentSkills;
    }

    await ctx.db.patch(userId, { skills: nextSkills });
    return nextSkills;
  },
});

export const updateCurrentUserAbout = mutation({
  args: {
    about: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const about = args.about.trim();
    await ctx.db.patch(userId, { about });

    return { ...user, about };
  },
});

export const addFeaturedPost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const post = await ctx.db.get(args.postId);
    if (!post || post.authorId !== userId) {
      throw new Error("You can only feature your own posts");
    }

    const currentFeaturedPostIds = normalizeFeaturedPostIds(user.featuredPostIds);
    const validFeaturedPostIds = (
      await Promise.all(
        currentFeaturedPostIds.map(async (featuredPostId) => {
          const featuredPost = await ctx.db.get(featuredPostId);
          if (!featuredPost || featuredPost.authorId !== userId) {
            return null;
          }
          return featuredPostId;
        }),
      )
    ).filter((featuredPostId): featuredPostId is Id<"posts"> => featuredPostId !== null);

    if (validFeaturedPostIds.includes(args.postId)) {
      if (validFeaturedPostIds.length !== currentFeaturedPostIds.length) {
        await ctx.db.patch(userId, { featuredPostIds: validFeaturedPostIds });
      }
      return validFeaturedPostIds;
    }

    if (validFeaturedPostIds.length >= MAX_FEATURED_POSTS) {
      throw new Error(`You can feature up to ${MAX_FEATURED_POSTS} posts`);
    }

    const nextFeaturedPostIds = [args.postId, ...validFeaturedPostIds];
    await ctx.db.patch(userId, { featuredPostIds: nextFeaturedPostIds });

    return nextFeaturedPostIds;
  },
});

export const removeFeaturedPost = mutation({
  args: {
    postId: v.id("posts"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currentFeaturedPostIds = normalizeFeaturedPostIds(user.featuredPostIds);
    const validFeaturedPostIds = (
      await Promise.all(
        currentFeaturedPostIds.map(async (featuredPostId) => {
          const featuredPost = await ctx.db.get(featuredPostId);
          if (!featuredPost || featuredPost.authorId !== userId) {
            return null;
          }
          return featuredPostId;
        }),
      )
    ).filter((featuredPostId): featuredPostId is Id<"posts"> => featuredPostId !== null);

    const nextFeaturedPostIds = validFeaturedPostIds.filter(
      (featuredPostId) => featuredPostId !== args.postId,
    );

    if (
      nextFeaturedPostIds.length === validFeaturedPostIds.length &&
      validFeaturedPostIds.length === currentFeaturedPostIds.length
    ) {
      return validFeaturedPostIds;
    }

    await ctx.db.patch(userId, { featuredPostIds: nextFeaturedPostIds });
    return nextFeaturedPostIds;
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const saveProfilePhoto = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.photoStorageId && user.photoStorageId !== args.storageId) {
      await ctx.storage.delete(user.photoStorageId);
    }

    const resolvedPhotoURL = await ctx.storage.getUrl(args.storageId);
    const patch: { photoStorageId: Id<"_storage">; photoURL?: string } = {
      photoStorageId: args.storageId,
    };

    if (resolvedPhotoURL) {
      patch.photoURL = resolvedPhotoURL;
    }

    await ctx.db.patch(userId, patch);

    return {
      photoStorageId: args.storageId,
      photoURL: resolvedPhotoURL ?? user.photoURL ?? user.image ?? "",
    };
  },
});

export const generateCoverUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

export const saveCoverPhoto = mutation({
  args: {
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    if (user.coverStorageId && user.coverStorageId !== args.storageId) {
      await ctx.storage.delete(user.coverStorageId);
    }

    const resolvedCoverURL = await ctx.storage.getUrl(args.storageId);

    await ctx.db.patch(userId, {
      coverStorageId: args.storageId,
    });

    return {
      coverStorageId: args.storageId,
      coverURL: resolvedCoverURL ?? "",
    };
  },
});

export const listNetworkUsers = query({
  args: {
    searchTerm: v.optional(v.string()),
    offset: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewerUserId = await getAuthUserId(ctx);
    const normalizedSearchTerm = (args.searchTerm ?? "").trim().toLowerCase();
    const rawOffset = Math.floor(args.offset ?? 0);
    const rawLimit = Math.floor(args.limit ?? 10);
    const offset = rawOffset < 0 ? 0 : rawOffset;
    const limit = Math.min(Math.max(rawLimit, 1), 200);

    const fetchedUsers = normalizedSearchTerm
      ? await ctx.db.query("users").collect()
      : await ctx.db.query("users").order("desc").take(offset + limit + 10);

    const filteredUsers = fetchedUsers.filter((user) => {
      if (viewerUserId && user._id === viewerUserId) {
        return false;
      }

      if (!normalizedSearchTerm) {
        return true;
      }

      const fields = [
        user.displayName ?? user.name ?? "",
        user.title ?? "",
        user.location ?? "",
        user.username ?? "",
      ];

      return fields.some((field) => field.toLowerCase().includes(normalizedSearchTerm));
    });

    const sortedUsers = normalizedSearchTerm
      ? [...filteredUsers].sort((a, b) =>
          (a.displayName ?? a.name ?? "").localeCompare(b.displayName ?? b.name ?? ""),
        )
      : filteredUsers;

    const pageUsers = sortedUsers.slice(offset, offset + limit);
    const hasMore = sortedUsers.length > offset + limit;

    const relationshipByOtherUserId = new Map<
      string,
      | { status: "none" }
      | { status: "accepted"; connectionId: Id<"connections"> }
      | { status: "pending"; connectionId: Id<"connections">; direction: "sent" | "received" }
    >();
    const viewerConnectionUserIds = new Set<Id<"users">>();
    const followingUserIds = new Set<Id<"users">>();

    if (viewerUserId) {
      const [
        acceptedOutgoingConnections,
        acceptedIncomingConnections,
        pendingOutgoingConnections,
        pendingIncomingConnections,
        follows,
      ] = await Promise.all([
        ctx.db
          .query("connections")
          .withIndex("byUser1", (q) => q.eq("userId1", viewerUserId).eq("status", "accepted"))
          .collect(),
        ctx.db
          .query("connections")
          .withIndex("byUser2", (q) => q.eq("userId2", viewerUserId).eq("status", "accepted"))
          .collect(),
        ctx.db
          .query("connections")
          .withIndex("byUser1", (q) => q.eq("userId1", viewerUserId).eq("status", "pending"))
          .collect(),
        ctx.db
          .query("connections")
          .withIndex("byUser2", (q) => q.eq("userId2", viewerUserId).eq("status", "pending"))
          .collect(),
        ctx.db
          .query("follows")
          .withIndex("byFollower", (q) => q.eq("followerId", viewerUserId))
          .collect(),
      ]);

      for (const connection of acceptedOutgoingConnections) {
        viewerConnectionUserIds.add(connection.userId2);
        relationshipByOtherUserId.set(`${connection.userId2}`, {
          status: "accepted",
          connectionId: connection._id,
        });
      }

      for (const connection of acceptedIncomingConnections) {
        viewerConnectionUserIds.add(connection.userId1);
        relationshipByOtherUserId.set(`${connection.userId1}`, {
          status: "accepted",
          connectionId: connection._id,
        });
      }

      for (const connection of pendingOutgoingConnections) {
        const key = `${connection.userId2}`;
        if (!relationshipByOtherUserId.has(key)) {
          relationshipByOtherUserId.set(key, {
            status: "pending",
            connectionId: connection._id,
            direction: "sent",
          });
        }
      }

      for (const connection of pendingIncomingConnections) {
        const key = `${connection.userId1}`;
        if (!relationshipByOtherUserId.has(key)) {
          relationshipByOtherUserId.set(key, {
            status: "pending",
            connectionId: connection._id,
            direction: "received",
          });
        }
      }

      for (const follow of follows) {
        followingUserIds.add(follow.followedId);
      }
    }

    const candidateConnectionIds = new Map<string, Set<Id<"users">>>();
    if (viewerUserId && pageUsers.length > 0) {
      const connectionSets = await Promise.all(
        pageUsers.map(async (candidateUser) => {
          const [requestedConnections, receivedConnections] = await Promise.all([
            ctx.db
              .query("connections")
              .withIndex("byUser1", (q) =>
                q.eq("userId1", candidateUser._id).eq("status", "accepted"),
              )
              .collect(),
            ctx.db
              .query("connections")
              .withIndex("byUser2", (q) =>
                q.eq("userId2", candidateUser._id).eq("status", "accepted"),
              )
              .collect(),
          ]);

          const connectionUserIds = new Set<Id<"users">>([
            ...requestedConnections.map((connection) => connection.userId2),
            ...receivedConnections.map((connection) => connection.userId1),
          ]);

          return [`${candidateUser._id}`, connectionUserIds] as const;
        }),
      );

      for (const [candidateId, connectionIds] of connectionSets) {
        candidateConnectionIds.set(candidateId, connectionIds);
      }
    }

    const users = await Promise.all(
      pageUsers.map(async (user) => {
        const candidateId = `${user._id}`;
        const connectionSet = candidateConnectionIds.get(candidateId);
        const fallbackConnectionCount =
          typeof user.connections === "number" ? user.connections : connectionSet?.size ?? 0;
        const relationship = relationshipByOtherUserId.get(candidateId) ?? { status: "none" as const };

        let mutualConnectionsCount = 0;
        if (viewerConnectionUserIds.size > 0 && connectionSet && connectionSet.size > 0) {
          const smallerSet =
            viewerConnectionUserIds.size <= connectionSet.size
              ? viewerConnectionUserIds
              : connectionSet;
          const largerSet = smallerSet === viewerConnectionUserIds ? connectionSet : viewerConnectionUserIds;

          for (const connectionId of smallerSet) {
            if (largerSet.has(connectionId)) {
              mutualConnectionsCount += 1;
            }
          }
        }

        return {
          _id: user._id,
          displayName: user.displayName ?? user.name ?? "Guest User",
          photoURL: await resolveUserPhotoURL(ctx, user),
          username: user.username ?? null,
          title: user.title ?? "",
          location: user.location ?? "",
          connectionCount: fallbackConnectionCount,
          mutualConnectionsCount,
          connectionStatus: relationship,
          isFollowing: viewerUserId ? followingUserIds.has(user._id) : false,
        };
      }),
    );

    return {
      users,
      hasMore,
      nextOffset: offset + users.length,
    };
  },
});

export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    return await Promise.all(
      [...users]
        .sort((a, b) => (a.displayName ?? a.name ?? "").localeCompare(b.displayName ?? b.name ?? ""))
        .map(async (user) => ({
          _id: user._id,
          displayName: user.displayName ?? user.name ?? "Guest User",
          photoURL: await resolveUserPhotoURL(ctx, user),
          title: user.title ?? "",
          location: user.location ?? "",
          connections: user.connections ?? 0,
        })),
    );
  },
});

export const addExperience = mutation({
  args: {
    title: v.string(),
    company: v.string(),
    companyId: v.optional(v.id("companies")),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const normalizedInput = normalizeExperienceInput(args);
    const nextEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      ...normalizedInput,
    };

    await ctx.db.patch(userId, {
      experienceEntries: [...(user.experienceEntries ?? []), nextEntry],
    });

    return nextEntry;
  },
});

export const updateExperience = mutation({
  args: {
    entryId: v.string(),
    title: v.string(),
    company: v.string(),
    companyId: v.optional(v.id("companies")),
    startDate: v.string(),
    endDate: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const entries = user.experienceEntries ?? [];
    const existingEntry = entries.find((entry) => entry.id === args.entryId);

    if (!existingEntry) {
      throw new Error("Experience entry not found");
    }

    const normalizedInput = normalizeExperienceInput(args);
    const nextEntries = entries.map((entry) =>
      entry.id === args.entryId
        ? {
            id: entry.id,
            ...normalizedInput,
          }
        : entry,
    );

    await ctx.db.patch(userId, { experienceEntries: nextEntries });
  },
});

export const removeExperience = mutation({
  args: {
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currentEntries = user.experienceEntries ?? [];
    const nextEntries = currentEntries.filter((entry) => entry.id !== args.entryId);

    if (nextEntries.length === currentEntries.length) {
      throw new Error("Experience entry not found");
    }

    await ctx.db.patch(userId, { experienceEntries: nextEntries });
  },
});

export const addEducation = mutation({
  args: {
    school: v.string(),
    degree: v.string(),
    field: v.string(),
    startYear: v.string(),
    endYear: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const normalizedInput = normalizeEducationInput(args);
    const nextEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      ...normalizedInput,
    };

    await ctx.db.patch(userId, {
      educationEntries: [...(user.educationEntries ?? []), nextEntry],
    });

    return nextEntry;
  },
});

export const updateEducation = mutation({
  args: {
    entryId: v.string(),
    school: v.string(),
    degree: v.string(),
    field: v.string(),
    startYear: v.string(),
    endYear: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const entries = user.educationEntries ?? [];
    const existingEntry = entries.find((entry) => entry.id === args.entryId);

    if (!existingEntry) {
      throw new Error("Education entry not found");
    }

    const normalizedInput = normalizeEducationInput(args);
    const nextEntries = entries.map((entry) =>
      entry.id === args.entryId
        ? {
            id: entry.id,
            ...normalizedInput,
          }
        : entry,
    );

    await ctx.db.patch(userId, { educationEntries: nextEntries });
  },
});

export const removeEducation = mutation({
  args: {
    entryId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const currentEntries = user.educationEntries ?? [];
    const nextEntries = currentEntries.filter((entry) => entry.id !== args.entryId);

    if (nextEntries.length === currentEntries.length) {
      throw new Error("Education entry not found");
    }

    await ctx.db.patch(userId, { educationEntries: nextEntries });
  },
});

export const searchUsers = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedQuery = args.query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    const [recentUsers, usernamePrefixUsers] = await Promise.all([
      ctx.db.query("users").order("desc").take(300),
      ctx.db
        .query("users")
        .withIndex("username", (q) =>
          q.gte("username", normalizedQuery).lt("username", buildPrefixUpperBound(normalizedQuery)),
        )
        .take(10),
    ]);

    const seenUserIds = new Set<Id<"users">>();
    const combinedUsers = [...usernamePrefixUsers, ...recentUsers].filter((user) => {
      if (seenUserIds.has(user._id)) {
        return false;
      }
      seenUserIds.add(user._id);
      return true;
    });

    const matchedUsers = combinedUsers
      .filter((user) =>
        [
          user.displayName ?? user.name ?? "",
          user.title ?? "",
          user.location ?? "",
          user.username ?? "",
        ].some((field) => field.toLowerCase().includes(normalizedQuery)),
      )
      .sort((a, b) => (a.displayName ?? a.name ?? "").localeCompare(b.displayName ?? b.name ?? ""))
      .slice(0, 10);

    return await Promise.all(
      matchedUsers.map(async (user) => ({
        _id: user._id,
        displayName: user.displayName ?? user.name ?? "Guest User",
        photoURL: await resolveUserPhotoURL(ctx, user),
        title: user.title ?? "",
        username: user.username ?? null,
      })),
    );
  },
});
