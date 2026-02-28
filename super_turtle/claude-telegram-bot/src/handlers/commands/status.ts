/**
 * /status command handler — show current status without resetting sessions.
 */

import type { Context } from "grammy";
import { ALLOWED_USERS } from "../../config";
import { isAuthorized } from "../../security";
import { buildSessionOverviewLines } from "./shared";

/**
 * /status - Show status. Same screen as /new but without resetting sessions.
 */
export async function handleStatus(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const lines = await buildSessionOverviewLines("Status");

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}
