/**
 * /cron command handler — list scheduled cron jobs.
 */

import type { Context } from "grammy";
import { ALLOWED_USERS } from "../../config";
import { isAuthorized } from "../../security";
import { escapeHtml } from "../../formatting";
import { getJobs } from "../../cron";

/**
 * /cron - List scheduled cron jobs with cancel buttons.
 */
export async function handleCron(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const jobs = getJobs();

  if (jobs.length === 0) {
    await ctx.reply("⏰ <b>Scheduled Jobs</b>\n\nNo jobs scheduled", { parse_mode: "HTML" });
    return;
  }

  // Build message and inline keyboard
  const messageLines: string[] = ["⏰ <b>Scheduled Jobs</b>\n"];
  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const job of jobs) {
    // Format fire_at timestamp: "18/01 10:30" or "in 5 mins" if soon
    const fireDate = new Date(job.fire_at);
    const now = Date.now();
    const timeUntil = job.fire_at - now;

    let timeStr: string;
    if (timeUntil < 60000) {
      // Less than a minute - show "in Xs"
      const seconds = Math.ceil(timeUntil / 1000);
      timeStr = `in ${seconds}s`;
    } else if (timeUntil < 3600000) {
      // Less than an hour - show "in Xm"
      const minutes = Math.ceil(timeUntil / 60000);
      timeStr = `in ${minutes}m`;
    } else {
      // Show absolute time
      const dateStr = fireDate.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "2-digit",
      });
      const timeOfDayStr = fireDate.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      timeStr = `${dateStr} ${timeOfDayStr}`;
    }

    // Get prompt preview
    const promptPreview = job.prompt.length > 40 ? job.prompt.slice(0, 37) + "..." : job.prompt;

    // Build the job line
    const typeEmoji = job.type === "recurring" ? "🔁" : "⏱️";
    messageLines.push(
      `${typeEmoji} <code>${escapeHtml(promptPreview)}</code>\n   🕐 ${timeStr}`
    );

    // Add cancel button
    keyboard.push([
      {
        text: "❌ Cancel",
        callback_data: `cron_cancel:${job.id}`,
      },
    ]);
  }

  await ctx.reply(messageLines.join("\n"), {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: keyboard,
    },
  });
}
