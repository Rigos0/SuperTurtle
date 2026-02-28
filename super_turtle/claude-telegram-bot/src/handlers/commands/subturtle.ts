/**
 * /subturtle command handler and SubTurtle parsing utilities.
 */

import type { Context } from "grammy";
import { ALLOWED_USERS, WORKING_DIR } from "../../config";
import { isAuthorized } from "../../security";
import { escapeHtml, convertMarkdownToHtml } from "../../formatting";
import { truncateText } from "./shared";
import {
  readClaudeStateSummary,
  formatBacklogSummary,
  type ClaudeStateSummary,
} from "./state";

export type ListedSubTurtle = {
  name: string;
  status: string;
  type: string;
  pid: string;
  timeRemaining: string;
  task: string;
  tunnelUrl: string;
};

export function parseCtlListOutput(output: string): ListedSubTurtle[] {
  const turtles: ListedSubTurtle[] = [];
  let lastTurtle: ListedSubTurtle | null = null;

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line || line === "No SubTurtles found.") continue;

    // Tunnel lines are emitted as: "→ https://..."
    if (line.startsWith("→")) {
      if (lastTurtle) {
        lastTurtle.tunnelUrl = line.replace(/^→\s*/, "");
      }
      continue;
    }

    const baseMatch = line.match(/^(\S+)\s+(\S+)\s*(.*)$/);
    if (!baseMatch) continue;

    const name = baseMatch[1] ?? "";
    const status = baseMatch[2] ?? "";
    let remainder = baseMatch[3] ?? "";
    let type = "";
    let pid = "";
    let timeRemaining = "";

    if (status === "running") {
      const typeMatch = remainder.match(/^(yolo-codex-spark|yolo-codex|slow|yolo)\b\s*(.*)$/);
      if (typeMatch) {
        type = typeMatch[1]!;
        remainder = typeMatch[2] || "";
      }

      const pidMatch = remainder.match(/^\(PID\s+(\d+)\)\s*(.*)$/);
      if (pidMatch) {
        pid = pidMatch[1]!;
        remainder = pidMatch[2] || "";
      }

      const overdueMatch = remainder.match(/^OVERDUE\b\s*(.*)$/);
      if (overdueMatch) {
        timeRemaining = "OVERDUE";
        remainder = overdueMatch[1] || "";
      } else {
        const noTimeoutMatch = remainder.match(/^no timeout\b\s*(.*)$/);
        if (noTimeoutMatch) {
          timeRemaining = "no timeout";
          remainder = noTimeoutMatch[1] || "";
        } else {
          const leftMatch = remainder.match(/^(.+?)\s+left\b\s*(.*)$/);
          if (leftMatch) {
            timeRemaining = leftMatch[1]!.trim();
            remainder = leftMatch[2] || "";
          }
        }
      }
    }

    const task = remainder.replace(/\s+\[skills:\s+.*\]$/, "").trim();
    const turtle: ListedSubTurtle = {
      name,
      status,
      type,
      pid,
      timeRemaining,
      task,
      tunnelUrl: "",
    };
    turtles.push(turtle);
    lastTurtle = turtle;
  }

  return turtles;
}

export async function getSubTurtleElapsed(name: string): Promise<string> {
  try {
    const metaPath = `${WORKING_DIR}/.subturtles/${name}/subturtle.meta`;
    const metaText = await Bun.file(metaPath).text();
    const spawnedAtMatch = metaText.match(/^SPAWNED_AT=(\d+)$/m);
    if (!spawnedAtMatch?.[1]) return "unknown";

    const spawnedAt = Number.parseInt(spawnedAtMatch[1], 10);
    if (!Number.isFinite(spawnedAt)) return "unknown";
    const elapsedSeconds = Math.max(0, Math.floor(Date.now() / 1000) - spawnedAt);

    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  } catch {
    return "unknown";
  }
}

/**
 * /subturtle - List all SubTurtles with status and controls.
 */
export async function handleSubturtle(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  // Run ctl list command
  const ctlPath = `${WORKING_DIR}/super_turtle/subturtle/ctl`;
  const proc = Bun.spawnSync([ctlPath, "list"], { cwd: WORKING_DIR });
  const output = proc.stdout.toString().trim();

  if (!output || output.includes("No SubTurtles")) {
    await ctx.reply("📋 <b>SubTurtles</b>\n\nNo SubTurtles running", { parse_mode: "HTML" });
    return;
  }

  const turtles = parseCtlListOutput(output);

  if (turtles.length === 0) {
    await ctx.reply("📋 <b>SubTurtles</b>\n\nNo SubTurtles found", { parse_mode: "HTML" });
    return;
  }

  const rootStatePath = `${WORKING_DIR}/CLAUDE.md`;
  const [rootSummary, turtleStateEntries] = await Promise.all([
    readClaudeStateSummary(rootStatePath),
    Promise.all(
      turtles.map(async (turtle) => {
        const statePath = `${WORKING_DIR}/.subturtles/${turtle.name}/CLAUDE.md`;
        const summary = await readClaudeStateSummary(statePath);
        return [turtle.name, summary] as const;
      })
    ),
  ]);
  const turtleStateMap = new Map(turtleStateEntries);

  // Build message and inline keyboard
  const messageLines: string[] = ["🐢 <b>SubTurtles</b>\n"];

  if (rootSummary) {
    const rootTask = rootSummary.currentTask || "No current task in root CLAUDE.md";
    messageLines.push(`🧭 <b>Root</b> • ${escapeHtml(truncateText(rootTask, 110))}`);
    messageLines.push(`   📌 ${escapeHtml(truncateText(formatBacklogSummary(rootSummary), 140))}`);
    messageLines.push("");
  }

  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const turtle of turtles) {
    const stateSummary = turtleStateMap.get(turtle.name) || null;

    // Format the turtle info line
    let statusEmoji = turtle.status === "running" ? "🟢" : "⚫";
    let timeStr = "";
    if (turtle.timeRemaining) {
      const suffix = turtle.timeRemaining === "OVERDUE" || turtle.timeRemaining === "no timeout"
        ? ""
        : " left";
      timeStr = ` • ${escapeHtml(turtle.timeRemaining)}${suffix}`;
    }
    const taskSource = stateSummary?.currentTask || turtle.task || "No current task";
    const taskStr = truncateText(taskSource, 120);

    messageLines.push(
      `${statusEmoji} <b>${escapeHtml(turtle.name)}</b>${timeStr}`
    );
    messageLines.push(`   🧩 ${convertMarkdownToHtml(taskStr)}`);

    if (stateSummary) {
      const backlogSummary = formatBacklogSummary(stateSummary);
      messageLines.push(`   📌 ${convertMarkdownToHtml(truncateText(backlogSummary, 140))}`);
    }

    // Add buttons for running turtles
    if (turtle.status === "running") {
      keyboard.push([
        {
          text: "📋 State",
          callback_data: `subturtle_logs:${turtle.name}`,
        },
        {
          text: "🛑 Stop",
          callback_data: `subturtle_stop:${turtle.name}`,
        },
      ]);
    }
    if (turtle.tunnelUrl) {
      messageLines.push(`   🔗 ${escapeHtml(turtle.tunnelUrl)}`);
    }
  }

  await ctx.reply(messageLines.join("\n"), {
    parse_mode: "HTML",
    reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
  });
}
