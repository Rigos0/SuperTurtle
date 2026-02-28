/**
 * /new command handler — start a fresh session.
 */

import type { Context } from "grammy";
import { session } from "../../session";
import { codexSession } from "../../codex-session";
import { ALLOWED_USERS } from "../../config";
import { isAuthorized } from "../../security";
import { isAnyDriverRunning, stopActiveDriverQuery } from "../driver-routing";
import { clearPreparedSnapshots } from "../../cron-supervision-queue";
import { buildSessionOverviewLines } from "./shared";

/**
 * /new - Start a fresh session with model info and usage.
 */
export async function handleNew(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  await resetAllDriverSessions({ stopRunning: true });

  const lines = await buildSessionOverviewLines("New session");

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}

export async function resetAllDriverSessions(opts?: { stopRunning?: boolean }): Promise<void> {
  if (opts?.stopRunning) {
    session.stopTyping();
    if (isAnyDriverRunning()) {
      const result = await stopActiveDriverQuery();
      if (result) {
        await Bun.sleep(100);
        session.clearStopRequested();
      }
    }
  }

  await session.kill();
  await codexSession.kill();
  clearPreparedSnapshots();
}
