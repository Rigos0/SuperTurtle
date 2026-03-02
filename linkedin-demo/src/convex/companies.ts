import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const listCompanyNames = query({
  args: {},
  handler: async (ctx) => {
    const companies = await ctx.db.query("companies").collect();

    return companies
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((company) => ({
        _id: company._id,
        name: company.name,
        slug: company.slug,
        logoStorageId: company.logoStorageId ?? null,
      }));
  },
});

export const searchCompanies = query({
  args: {
    query: v.string(),
  },
  handler: async (ctx, args) => {
    const normalizedQuery = args.query.trim().toLowerCase();
    if (!normalizedQuery) {
      return [];
    }

    const [companies, companyFollowers] = await Promise.all([
      ctx.db.query("companies").collect(),
      ctx.db.query("companyFollowers").collect(),
    ]);

    const followerCountByCompanyId = new Map<string, number>();
    for (const follow of companyFollowers) {
      const companyId = follow.companyId;
      followerCountByCompanyId.set(companyId, (followerCountByCompanyId.get(companyId) ?? 0) + 1);
    }

    return companies
      .filter((company) => company.name.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 10)
      .map((company) => ({
        name: company.name,
        slug: company.slug,
        industry: company.industry,
        followerCount: followerCountByCompanyId.get(company._id) ?? 0,
        logoStorageId: company.logoStorageId ?? null,
      }));
  },
});

export const getCompanyAnalytics = query({
  args: {
    companyId: v.id("companies"),
  },
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    if (!viewerId) {
      return null;
    }

    const company = await ctx.db.get(args.companyId);
    if (!company) {
      return null;
    }

    const isAdmin = company.admins.some((adminId) => adminId === viewerId);
    if (!isAdmin) {
      return null;
    }

    const [followers, posts] = await Promise.all([
      ctx.db
        .query("companyFollowers")
        .withIndex("byCompany", (q) => q.eq("companyId", args.companyId))
        .collect(),
      ctx.db.query("posts").collect(),
    ]);

    const companyAdminIds = new Set(company.admins);
    const companyPosts = posts.filter((post) => companyAdminIds.has(post.authorId));
    const totalPostLikes = companyPosts.reduce((sum, post) => sum + post.likesCount, 0);

    return {
      totalFollowers: followers.length,
      totalPosts: companyPosts.length,
      totalPostLikes,
    };
  },
});
