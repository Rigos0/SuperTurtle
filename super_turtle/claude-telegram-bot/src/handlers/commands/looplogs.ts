/**
 * /looplogs command handler — show main run-loop log tail.
 */

import type { Context } from "grammy";
import { ALLOWED_USERS, WORKING_DIR } from "../../config";
import { isAuthorized } from "../../security";
import { truncateText, chunkText } from "./shared";

// Canonical main-loop log written by live.sh (tmux + caffeinate + run-loop).
export const MAIN_LOOP_LOG_PATH = "/tmp/claude-telegram-bot-ts.log";
const LOOPLOGS_LINE_COUNT = 50;

export function readMainLoopLogTail(): { ok: true; text: string } | { ok: false; error: string } {
  const proc = Bun.spawnSync(
    ["tail", "-n", String(LOOPLOGS_LINE_COUNT), MAIN_LOOP_LOG_PATH],
    { cwd: WORKING_DIR }
  );

  if (proc.exitCode !== 0) {
    const detail = proc.stderr.toString().trim() || proc.stdout.toString().trim() || "unknown error";
    return { ok: false, error: detail };
  }

  return { ok: true, text: proc.stdout.toString() };
}

/**
 * /looplogs - Show last 50 lines from the main run-loop log.
 */
export async function handleLooplogs(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const result = readMainLoopLogTail();
  if (!result.ok) {
    const reason = truncateText(result.error, 160);
    await ctx.reply(
      `❌ Cannot read main loop log at ${MAIN_LOOP_LOG_PATH}. ` +
        `Start the bot with 'bun run start' and retry.\n${reason}`
    );
    return;
  }

  if (!result.text) {
    await ctx.reply(`ℹ️ Main loop log is empty: ${MAIN_LOOP_LOG_PATH}`);
    return;
  }

  for (const chunk of chunkText(result.text)) {
    await ctx.reply(chunk);
  }
}
