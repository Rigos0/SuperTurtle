/**
 * /switch command handler — switch between Claude Code and Codex drivers.
 */

import type { Context } from "grammy";
import { session } from "../../session";
import { codexSession } from "../../codex-session";
import { ALLOWED_USERS, CODEX_AVAILABLE } from "../../config";
import { isAuthorized } from "../../security";
import { buildSessionOverviewLines, getCodexUnavailableMessage } from "./shared";
import { resetAllDriverSessions } from "./new";

/**
 * /switch - Switch between Claude Code and Codex drivers.
 */
export async function handleSwitch(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  // Parse command: /switch codex or /switch claude
  const args = ctx.message?.text?.split(/\s+/).slice(1) || [];
  const target = args[0]?.toLowerCase();

  if (!target) {
    // No argument — show options
    const currentDriver = session.activeDriver;
    const driverEmoji = currentDriver === "codex" ? "🟢" : "🔵";
    const codexRow = CODEX_AVAILABLE
      ? [[{
          text: `${currentDriver === "codex" ? "✔ " : ""}Codex 🟢`,
          callback_data: "switch:codex",
        }]]
      : [[{
          text: "Codex unavailable",
          callback_data: "switch:codex_unavailable",
        }]];
    await ctx.reply(`<b>Current driver:</b> ${currentDriver} ${driverEmoji}\n\nSwitch to:`, {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: `${currentDriver === "claude" ? "✔ " : ""}Claude Code 🔵`,
              callback_data: "switch:claude",
            },
          ],
          ...codexRow,
        ],
      },
    });
    return;
  }

  // Direct switch via argument
  if (target === "claude") {
    await resetAllDriverSessions({ stopRunning: true });
    session.activeDriver = "claude";
    const lines = await buildSessionOverviewLines("Switched to Claude Code 🔵");
    await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
  } else if (target === "codex") {
    if (!CODEX_AVAILABLE) {
      await ctx.reply(getCodexUnavailableMessage());
      return;
    }
    await resetAllDriverSessions({ stopRunning: true });
    try {
      // Fail fast: ensure Codex is available after reset.
      await codexSession.startNewThread();
      session.activeDriver = "codex";
    } catch (error) {
      await ctx.reply(`❌ Failed to switch to Codex: ${String(error).slice(0, 100)}`);
      return;
    }
    const lines = await buildSessionOverviewLines("Switched to Codex 🟢");
    await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
  } else {
    await ctx.reply(`❌ Unknown driver: ${target}. Use /switch claude or /switch codex`);
  }
}
