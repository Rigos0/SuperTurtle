/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as articles from "../articles.js";
import type * as auth from "../auth.js";
import type * as bookmarks from "../bookmarks.js";
import type * as comments from "../comments.js";
import type * as companies from "../companies.js";
import type * as companyFollowers from "../companyFollowers.js";
import type * as companyPeople from "../companyPeople.js";
import type * as connections from "../connections.js";
import type * as follows from "../follows.js";
import type * as hashtags from "../hashtags.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as likes from "../likes.js";
import type * as messaging from "../messaging.js";
import type * as notifications from "../notifications.js";
import type * as onboarding from "../onboarding.js";
import type * as polls from "../polls.js";
import type * as postEdits from "../postEdits.js";
import type * as posts from "../posts.js";
import type * as reports from "../reports.js";
import type * as reposts from "../reposts.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  articles: typeof articles;
  auth: typeof auth;
  bookmarks: typeof bookmarks;
  comments: typeof comments;
  companies: typeof companies;
  companyFollowers: typeof companyFollowers;
  companyPeople: typeof companyPeople;
  connections: typeof connections;
  follows: typeof follows;
  hashtags: typeof hashtags;
  helpers: typeof helpers;
  http: typeof http;
  likes: typeof likes;
  messaging: typeof messaging;
  notifications: typeof notifications;
  onboarding: typeof onboarding;
  polls: typeof polls;
  postEdits: typeof postEdits;
  posts: typeof posts;
  reports: typeof reports;
  reposts: typeof reposts;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
