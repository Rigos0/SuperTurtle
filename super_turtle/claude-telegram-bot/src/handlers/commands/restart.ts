/**
 * /restart command handler — restart the bot process.
 */

import type { Context } from "grammy";
import { ALLOWED_USERS, RESTART_FILE, WORKING_DIR } from "../../config";
import { isAuthorized } from "../../security";

/**
 * /restart - Restart the bot process.
 */
export async function handleRestart(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;
  const inRunLoop = process.env.SUPERTURTLE_RUN_LOOP === "1";

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const msg = await ctx.reply("🔄 Restarting bot...");

  // Save message info so we can update it after restart
  if (chatId && msg.message_id) {
    try {
      await Bun.write(
        RESTART_FILE,
        JSON.stringify({
          chat_id: chatId,
          message_id: msg.message_id,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.warn("Failed to save restart info:", e);
    }
  }

  // Give time for the message to send
  await Bun.sleep(500);

  // In run-loop mode, just exit; run-loop respawns in the same tmux terminal.
  if (!inRunLoop) {
    // Re-exec this same command so /restart works even when launched directly.
    const botDir = `${WORKING_DIR}/super_turtle/claude-telegram-bot`;
    const child = Bun.spawn(process.argv, {
      cwd: botDir,
      stdin: "ignore",
      stdout: "ignore",
      stderr: "ignore",
      detached: true,
    });
    child.unref();
  }

  // Exit current process after replacement is spawned.
  process.exit(0);
}
