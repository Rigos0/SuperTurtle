/**
 * /resume command handler — resume a previous session.
 */

import type { Context } from "grammy";
import { session } from "../../session";
import { codexSession } from "../../codex-session";
import { ALLOWED_USERS, CODEX_AVAILABLE } from "../../config";
import { isAuthorized } from "../../security";
import { getCodexUnavailableMessage } from "./shared";

/**
 * /resume - Show saved sessions and let user pick one to resume.
 */
export async function handleResume(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  if (session.activeDriver === "codex" && !CODEX_AVAILABLE) {
    session.activeDriver = "claude";
    await ctx.reply(`${getCodexUnavailableMessage()}\nFalling back to Claude sessions.`);
  }

  // Get sessions based on active driver
  let sessions: Array<{
    session_id: string;
    saved_at: string;
    working_dir: string;
    title: string;
  }>;
  let driverName: string;

  if (session.activeDriver === "codex") {
    sessions = await codexSession.getSessionListLive();
    if (sessions.length === 0) {
      sessions = codexSession.getSessionList();
    }
    driverName = "Codex";
  } else {
    sessions = session.getSessionList();
    driverName = "Claude";
  }

  if (session.isActive || (session.activeDriver === "codex" && codexSession.isActive)) {
    await ctx.reply(`${driverName} session already active. Use /new to start fresh.`);
    return;
  }

  if (sessions.length === 0) {
    await ctx.reply(`❌ No saved ${driverName} sessions.`);
    return;
  }
  sessions = sessions.slice(0, 20);

  // Build inline keyboard with session list
  const buttons = sessions.map((s) => {
    // Format date: "18/01 10:30"
    const date = new Date(s.saved_at);
    const dateStr = date.toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
    });
    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Truncate title for button (max ~40 chars to fit)
    const titlePreview =
      s.title.length > 35 ? s.title.slice(0, 32) + "..." : s.title;

    const callbackPrefix = session.activeDriver === "codex" ? "codex_resume" : "resume";
    return [
      {
        text: `📅 ${dateStr} ${timeStr} - "${titlePreview}"`,
        callback_data: `${callbackPrefix}:${s.session_id}`,
      },
    ];
  });

  await ctx.reply(`📋 <b>${driverName} Sessions</b>\n\nSelect a session to resume:`, {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
}
