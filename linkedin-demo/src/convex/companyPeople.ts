import { v } from "convex/values";
import { query } from "./_generated/server";
import { resolveUserPhotoURL } from "./helpers";

export const getCompanyPeople = query({
  args: {
    companyName: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedCompanyName = args.companyName.trim().toLowerCase();
    if (!normalizedCompanyName) {
      return [];
    }

    const users = await ctx.db.query("users").collect();

    return await Promise.all(
      users
        .filter((user) => {
          const entries = user.experienceEntries ?? [];
          return entries.some(
            (entry) => entry.company.trim().toLowerCase() === normalizedCompanyName,
          );
        })
        .sort((a, b) => (a.displayName ?? a.name ?? "").localeCompare(b.displayName ?? b.name ?? ""))
        .map(async (user) => ({
          _id: user._id,
          username: user.username ?? null,
          displayName: user.displayName ?? user.name ?? "Guest User",
          title: user.title ?? "",
          photoURL: await resolveUserPhotoURL(ctx, user),
        })),
    );
  },
});
