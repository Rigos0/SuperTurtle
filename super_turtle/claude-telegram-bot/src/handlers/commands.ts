/**
 * Command handlers for Claude Telegram Bot.
 *
 * /start, /new, /stop, /status, /resume, /context, /restart
 */

import type { Context } from "grammy";
import { session, getAvailableModels, EFFORT_DISPLAY, type EffortLevel } from "../session";
import {
  WORKING_DIR,
  ALLOWED_USERS,
  RESTART_FILE,
  TELEGRAM_SAFE_LIMIT,
  CODEX_ENABLED,
} from "../config";
import { getContextReport } from "../context-command";
import { isAuthorized } from "../security";
import { escapeHtml } from "../formatting";
import { getJobs } from "../cron";

/**
 * Shared command list for display in /start, /new, and new_session bot-control.
 */
export function getCommandLines(): string[] {
  return [
    `/new - Start fresh session`,
    `/model - Switch model/effort`,
    `/usage - Subscription usage`,
    `/codex-quota - Codex quota status`,
    `/context - Show Claude context usage`,
    `/stop - Stop current query`,
    `/status - Detailed status`,
    `/resume - Pick from recent sessions`,
    `/subturtle - Manage SubTurtles`,
    `/cron - List scheduled jobs`,
    `/retry - Retry last message`,
    `/restart - Restart bot`,
  ];
}

/**
 * Format current model + effort as a display string (e.g. "Sonnet | ⚡ high effort").
 */
export function formatModelInfo(model: string, effort: string): { modelName: string; effortStr: string } {
  const models = getAvailableModels();
  const currentModel = models.find((m) => m.value === model);
  const modelName = currentModel?.displayName || model;
  const effortStr = model.includes("haiku") ? "" : ` | ${EFFORT_DISPLAY[effort as EffortLevel]} effort`;
  return { modelName, effortStr };
}

type ListedSubTurtle = {
  name: string;
  status: string;
  type: string;
  pid: string;
  timeRemaining: string;
  task: string;
  tunnelUrl: string;
};

function parseCtlListOutput(output: string): ListedSubTurtle[] {
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
      const typeMatch = remainder.match(/^(slow|yolo|yolo-codex)\b\s*(.*)$/);
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

async function getSubTurtleElapsed(name: string): Promise<string> {
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
 * /start - Show welcome message and status.
 */
export async function handleStart(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || "unknown";

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized. Contact the bot owner for access.");
    return;
  }

  const status = session.isActive ? "Active session" : "No active session";
  const workDir = WORKING_DIR;

  const commandBlock = getCommandLines().join("\n");
  await ctx.reply(
    `🤖 <b>Claude Telegram Bot</b>\n\n` +
      `Status: ${status}\n` +
      `Working directory: <code>${workDir}</code>\n\n` +
      `<b>Commands:</b>\n` +
      `${commandBlock}\n\n` +
      `<b>Tips:</b>\n` +
      `• Prefix with <code>!</code> to interrupt current query\n` +
      `• Use "think" keyword for extended reasoning\n` +
      `• Send photos, voice, or documents`,
    { parse_mode: "HTML" }
  );
}

/**
 * /new - Start a fresh session with model info and usage.
 */
export async function handleNew(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  // Stop any running query
  session.stopTyping();
  if (session.isRunning) {
    const result = await session.stop();
    if (result) {
      await Bun.sleep(100);
      session.clearStopRequested();
    }
  }

  // Clear session
  await session.kill();

  // Get model info
  const { modelName, effortStr } = formatModelInfo(session.model, session.effort);

  // Build message
  const lines: string[] = [
    `<b>New session</b>\n`,
    `<b>Model:</b> ${modelName}${effortStr}`,
    `<b>Dir:</b> <code>${WORKING_DIR}</code>\n`,
  ];

  // Fetch usage (non-blocking — show what we can)
  const usageLines = await getUsageLines();
  if (usageLines.length > 0) {
    lines.push(...usageLines, "");
  }

  lines.push(`<b>Commands:</b>`, ...getCommandLines());

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}

/**
 * /stop - Stop the current query (silently).
 */
export async function handleStop(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  // Kill typing indicator immediately so the bot stops showing "typing..."
  session.stopTyping();

  if (session.isRunning) {
    const result = await session.stop();
    if (result) {
      // Wait for the abort to be processed, then clear stopRequested so next message can proceed
      await Bun.sleep(100);
      session.clearStopRequested();
    }
    // Silent stop - no message shown
  }
  // If nothing running, also stay silent
}

/**
 * /status - Show detailed status.
 */
export async function handleStatus(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const lines: string[] = ["📊 <b>Bot Status</b>\n"];

  // Session status
  if (session.isActive) {
    lines.push(`✅ Session: Active (${session.sessionId?.slice(0, 8)}...)`);
  } else {
    lines.push("⚪ Session: None");
  }

  // Query status
  if (session.isRunning) {
    const elapsed = session.queryStarted
      ? Math.floor((Date.now() - session.queryStarted.getTime()) / 1000)
      : 0;
    lines.push(`🔄 Query: Running (${elapsed}s)`);
    if (session.currentTool) {
      lines.push(`   └─ ${session.currentTool}`);
    }
  } else {
    lines.push("⚪ Query: Idle");
    if (session.lastTool) {
      lines.push(`   └─ Last: ${session.lastTool}`);
    }
  }

  // Last activity
  if (session.lastActivity) {
    const ago = Math.floor(
      (Date.now() - session.lastActivity.getTime()) / 1000
    );
    lines.push(`\n⏱️ Last activity: ${ago}s ago`);
  }

  // Usage stats
  if (session.lastUsage) {
    const usage = session.lastUsage;
    lines.push(
      `\n📈 Last query usage:`,
      `   Input: ${usage.input_tokens?.toLocaleString() || "?"} tokens`,
      `   Output: ${usage.output_tokens?.toLocaleString() || "?"} tokens`
    );
    if (usage.cache_read_input_tokens) {
      lines.push(
        `   Cache read: ${usage.cache_read_input_tokens.toLocaleString()}`
      );
    }
  }

  // Error status
  if (session.lastError) {
    const ago = session.lastErrorTime
      ? Math.floor((Date.now() - session.lastErrorTime.getTime()) / 1000)
      : "?";
    lines.push(`\n⚠️ Last error (${ago}s ago):`, `   ${session.lastError}`);
  }

  // Working directory
  lines.push(`\n📁 Working dir: <code>${WORKING_DIR}</code>`);

  // SubTurtle status from ctl list
  lines.push(`\n🐢 <b>SubTurtles</b>`);
  try {
    const ctlPath = `${WORKING_DIR}/super_turtle/subturtle/ctl`;
    const proc = Bun.spawnSync([ctlPath, "list"], { cwd: WORKING_DIR });
    const output = proc.stdout.toString().trim();
    const allTurtles = parseCtlListOutput(output);
    const runningTurtles = allTurtles.filter((turtle) => turtle.status === "running");

    if (runningTurtles.length === 0) {
      lines.push(`   None running`);
    } else {
      const elapsedEntries = await Promise.all(
        runningTurtles.map(async (turtle) => [turtle.name, await getSubTurtleElapsed(turtle.name)] as const)
      );
      const elapsedByName = new Map(elapsedEntries);

      for (const turtle of runningTurtles) {
        const type = turtle.type || "unknown";
        const elapsed = elapsedByName.get(turtle.name) || "unknown";
        const remaining = turtle.timeRemaining || "unknown";
        lines.push(`🟢 <b>${escapeHtml(turtle.name)}</b> <code>${escapeHtml(type)}</code>`);
        lines.push(`   ⏱️ elapsed: ${escapeHtml(elapsed)} • remaining: ${escapeHtml(remaining)}`);
        if (turtle.task) {
          lines.push(`   📌 ${escapeHtml(turtle.task)}`);
        }
        if (turtle.tunnelUrl) {
          const safeUrl = escapeHtml(turtle.tunnelUrl);
          lines.push(`   🔗 <a href="${safeUrl}">${safeUrl}</a>`);
        }
      }
    }
  } catch {
    lines.push(`   <i>Unavailable (ctl list failed)</i>`);
  }

  // Last 3 git commits
  lines.push(`\n🧾 <b>Recent Commits</b>`);
  try {
    const gitProc = Bun.spawnSync(["git", "log", "--oneline", "-3"], { cwd: WORKING_DIR });
    const gitOutput = gitProc.stdout.toString().trim();
    if (!gitOutput) {
      lines.push(`   <i>No commits found</i>`);
    } else {
      for (const commitLine of gitOutput.split("\n")) {
        if (!commitLine.trim()) continue;
        lines.push(`   <code>${escapeHtml(commitLine)}</code>`);
      }
    }
  } catch {
    lines.push(`   <i>Unavailable</i>`);
  }

  // Usage and quota summary
  const [usageLines, codexQuotaLines] = await Promise.all([
    getUsageLines(),
    CODEX_ENABLED ? getCodexQuotaLines() : Promise.resolve<string[]>([]),
  ]);
  lines.push(`\n${formatUnifiedUsage(usageLines, codexQuotaLines, CODEX_ENABLED)}`);

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}

/**
 * /resume - Show list of sessions to resume with inline keyboard.
 */
export async function handleResume(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  if (session.isActive) {
    await ctx.reply("Sessione già attiva. Usa /new per iniziare da capo.");
    return;
  }

  // Get saved sessions
  const sessions = session.getSessionList();

  if (sessions.length === 0) {
    await ctx.reply("❌ Nessuna sessione salvata.");
    return;
  }

  // Build inline keyboard with session list
  const buttons = sessions.map((s) => {
    // Format date: "18/01 10:30"
    const date = new Date(s.saved_at);
    const dateStr = date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
    });
    const timeStr = date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Truncate title for button (max ~40 chars to fit)
    const titlePreview =
      s.title.length > 35 ? s.title.slice(0, 32) + "..." : s.title;

    return [
      {
        text: `📅 ${dateStr} ${timeStr} - "${titlePreview}"`,
        callback_data: `resume:${s.session_id}`,
      },
    ];
  });

  await ctx.reply("📋 <b>Sessioni salvate</b>\n\nSeleziona una sessione da riprendere:", {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
}

/**
 * /model - Show current model and let user switch model/effort.
 */
export async function handleModel(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const models = getAvailableModels();
  const currentModel = models.find((m) => m.value === session.model);
  const currentEffort = EFFORT_DISPLAY[session.effort];

  // Model buttons — one per row
  const modelButtons = models.map((m) => [{
    text: `${m.value === session.model ? "✔ " : ""}${m.displayName}`,
    callback_data: `model:${m.value}`,
  }]);

  // Effort buttons — Haiku doesn't support effort
  const isHaiku = session.model.includes("haiku");
  const effortButtons = isHaiku
    ? []
    : [(Object.entries(EFFORT_DISPLAY) as [EffortLevel, string][]).map(
        ([level, label]) => ({
          text: `${level === session.effort ? "✔ " : ""}${label}`,
          callback_data: `effort:${level}`,
        })
      )];

  const modelName = currentModel?.displayName || session.model;
  const modelDesc = currentModel?.description ? ` — ${currentModel.description}` : "";

  await ctx.reply(
    `<b>Model:</b> ${modelName}${modelDesc}\n` +
      `<b>Effort:</b> ${currentEffort}\n\n` +
      `Select model or effort level:`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [...modelButtons, ...effortButtons],
      },
    }
  );
}

/**
 * Fetch and format usage info as HTML lines. Returns empty array on failure.
 */
export async function getUsageLines(): Promise<string[]> {
  try {
    const proc = Bun.spawnSync([
      "security",
      "find-generic-password",
      "-s",
      "Claude Code-credentials",
      "-a",
      process.env.USER || "unknown",
      "-w",
    ]);
    const creds = JSON.parse(proc.stdout.toString());
    const token = creds.claudeAiOauth?.accessToken;
    if (!token) return [];

    const res = await fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": "oauth-2025-04-20",
      },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as Record<
      string,
      { utilization: number; resets_at: string } | null
    >;

    const bar = (pct: number): string => {
      const filled = Math.round(pct / 5);
      const empty = 20 - filled;
      return "\u2588".repeat(filled) + "\u2591".repeat(empty);
    };

    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const resetStr = (iso: string): string => {
      const d = new Date(iso);
      const timeStr = d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: d.getMinutes() ? "2-digit" : undefined,
        timeZone: tz,
      }).toLowerCase();
      return `Resets ${timeStr} (${tz})`;
    };

    const lines: string[] = [];
    const sections: [string, string][] = [
      ["five_hour", "Session"],
      ["seven_day", "Week (all)"],
      ["seven_day_sonnet", "Week (Sonnet)"],
      ["seven_day_opus", "Week (Opus)"],
    ];

    for (const [key, label] of sections) {
      const entry = data[key];
      if (!entry) continue;
      const pct = Math.round(entry.utilization);
      const reset = resetStr(entry.resets_at);
      lines.push(`<code>${bar(pct)}</code> ${pct}% ${label}\n${reset}`);
    }

    return lines;
  } catch {
    return [];
  }
}

type CodexUsageResult = {
  input_tokens?: number;
  output_tokens?: number;
  input_cached_tokens?: number;
  num_model_requests?: number;
};

type CodexUsageBucket = {
  results?: CodexUsageResult[];
};

type CodexUsageResponse = {
  data?: CodexUsageBucket[];
  has_more?: boolean;
  next_page?: string | null;
};

/**
 * Fetch and format Codex usage info from local Codex CLI. Returns empty array on failure.
 * Parses Codex history to count recent requests.
 */
export async function getCodexUsageLines(): Promise<string[]> {
  try {
    // Try to get stats from running Codex instance via CLI
    const proc = Bun.spawnSync(["codex", "exec", "/stats"], {
      timeout: 5000,
    });

    if (proc.success && proc.stdout) {
      const output = proc.stdout.toString().trim();

      // Parse the stats output to extract usage data
      // For now, try to count requests from the output if it contains any metrics
      if (output && !output.toLowerCase().includes("error")) {
        // If we got valid output, parse it for metrics
        // This is a fallback approach: count lines/sessions mentioned
        const lines = output.split("\n").length;
        if (lines > 0) {
          return [
            `Codex (local): <code>${lines.toLocaleString()}</code> operations`,
            `Status: Running and accessible`,
          ];
        }
      }
    }

    // If CLI approach fails, try parsing local history file
    const historyPath = `${Bun.env.HOME}/.codex/history.jsonl`;
    const historyFile = await Bun.file(historyPath).text().catch(() => null);

    if (!historyFile) {
      return [];
    }

    // Parse history.jsonl to count requests from the last 7 days
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - sevenDaysMs;

    let requestCount = 0;
    let sessionCount = new Set<string>();
    let estimatedInputTokens = 0;
    let estimatedOutputTokens = 0;

    const lines = historyFile.split("\n").filter((line) => line.trim());
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as {
          session_id?: string;
          ts?: number;
          text?: string;
        };

        // Check if this entry is within the 7-day window (ts is in seconds)
        const entryMs = (entry.ts ?? 0) * 1000;
        if (entryMs >= sevenDaysAgo) {
          requestCount += 1;
          if (entry.session_id) {
            sessionCount.add(entry.session_id);
          }

          // Estimate tokens: roughly 1 token per 4 characters for input
          // and 1 token per 3 characters for output
          if (entry.text) {
            estimatedInputTokens += Math.ceil(entry.text.length / 4);
            // Assume average response is 2x the input length
            estimatedOutputTokens += Math.ceil((entry.text.length * 2) / 3);
          }
        }
      } catch {
        // Skip invalid JSON lines
      }
    }

    if (requestCount === 0) {
      return ["No Codex usage in last 7 days."];
    }

    return [
      `Codex (last 7 days): <code>${requestCount.toLocaleString()}</code> requests (${sessionCount.size} sessions)`,
      `Est. input tokens: <code>${estimatedInputTokens.toLocaleString()}</code>`,
      `Est. output tokens: <code>${estimatedOutputTokens.toLocaleString()}</code>`,
    ];
  } catch {
    return [];
  }
}

/**
 * Parse percentage from Claude usage bar line (e.g., "▓▓░░░░ 45% Session")
 */
function parseClaudePercentage(line: string): number | null {
  const match = line.match(/(\d+)%/);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

/**
 * Parse percentage from Codex quota lines (e.g., "<code>████░░░░░░░░░░░░░░░░</code> 85% window")
 */
function parseCodexPercentage(line: string): number | null {
  const match = line.match(/(\d+)%/);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

/**
 * Get status emoji based on usage percentage.
 * ✅ Good (<80%), ⚠️ Warning (80-94%), 🔴 Critical (≥95%)
 */
function getStatusEmoji(pct: number | null): string {
  if (pct === null) return "❓";
  if (pct < 80) return "✅";
  if (pct < 95) return "⚠️";
  return "🔴";
}

/**
 * Format unified usage display combining Claude and Codex data.
 */
export function formatUnifiedUsage(
  usageLines: string[],
  codexLines: string[],
  codexEnabled: boolean
): string {
  const sections: string[] = ["📊 <b>Usage & Quotas</b>\n"];

  // Extract Claude usage data
  let claudeStatus = "❓";
  let claudeHighestPct = 0;
  let claudeDataMissing = true;
  const claudeSection: string[] = [];

  if (usageLines.length > 0) {
    for (const line of usageLines) {
      const pct = parseClaudePercentage(line);
      if (pct !== null) {
        claudeDataMissing = false;
        claudeHighestPct = Math.max(claudeHighestPct, pct);
      }
    }
    if (!claudeDataMissing) {
      claudeStatus = getStatusEmoji(claudeHighestPct);
    }
    claudeSection.push(`${claudeStatus} <b>Claude Code</b>`);
    claudeSection.push(...usageLines.map((line) => `   ${line}`));
  } else {
    claudeSection.push(`❓ <b>Claude Code</b>`);
    claudeSection.push(`   <i>No usage data available</i>`);
  }

  sections.push(claudeSection.join("\n"));

  // Extract Codex quota data
  if (codexEnabled) {
    let codexStatus = "❓";
    let codexHighestPct = 0;
    let codexDataMissing = true;
    let codexPlanType = "";
    const codexSection: string[] = [];
    let codexDisplayLines = [...codexLines];

    // Extract plan type from special marker (first line)
    if (codexDisplayLines.length > 0 && codexDisplayLines[0]?.startsWith("__CODEX_PLAN_TYPE__")) {
      codexPlanType = codexDisplayLines[0].replace("__CODEX_PLAN_TYPE__", "");
      codexDisplayLines = codexDisplayLines.slice(1);
    }

    if (codexDisplayLines.length > 0 && !codexDisplayLines[0]?.includes("Failed to fetch")) {
      for (const line of codexDisplayLines) {
        const pct = parseCodexPercentage(line);
        if (pct !== null) {
          codexDataMissing = false;
          codexHighestPct = Math.max(codexHighestPct, pct);
        }
      }
      if (!codexDataMissing) {
        codexStatus = getStatusEmoji(codexHighestPct);
      }
      const codexHeader = `${codexStatus} <b>Codex${codexPlanType ? ` (${escapeHtml(codexPlanType)})` : ""}</b>`;
      codexSection.push(codexHeader);
      codexSection.push(...codexDisplayLines.map((line) => `   ${line}`));
    } else if (codexDisplayLines.length > 0) {
      codexSection.push(`⚠️ <b>Codex</b>`);
      codexSection.push(...codexDisplayLines.map((line) => `   ${line}`));
    } else {
      codexSection.push(`❓ <b>Codex</b>`);
      codexSection.push(`   <i>No quota data available</i>`);
    }

    sections.push(codexSection.join("\n"));

    // Add summary line
    const bothOk = claudeHighestPct < 80 && codexHighestPct < 80;
    const anyWarning = claudeHighestPct >= 80 || codexHighestPct >= 80;
    const anyCritical = claudeHighestPct >= 95 || codexHighestPct >= 95;

    let statusSummary = "";
    if (claudeDataMissing || codexDataMissing) {
      statusSummary = `❓ <b>Status:</b> Partial data — check above`;
    } else if (anyCritical) {
      statusSummary = `🔴 <b>Status:</b> One or more services critical`;
    } else if (anyWarning) {
      statusSummary = `⚠️ <b>Status:</b> One or more services nearing limit`;
    } else if (bothOk) {
      statusSummary = `✅ <b>Status:</b> All services operating normally`;
    } else {
      statusSummary = `❓ <b>Status:</b> Check data above`;
    }
    sections.push(statusSummary);
  } else {
    // Just show Claude status
    let statusSummary = "";
    if (claudeHighestPct >= 95) {
      statusSummary = `🔴 <b>Status:</b> Claude Code critical`;
    } else if (claudeHighestPct >= 80) {
      statusSummary = `⚠️ <b>Status:</b> Claude Code nearing limit`;
    } else {
      statusSummary = `✅ <b>Status:</b> Claude Code operating normally`;
    }
    sections.push(statusSummary);
  }

  return sections.join("\n\n");
}

/**
 * /usage - Show Claude subscription usage and Codex quota in unified display.
 */
export async function handleUsage(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const [usageLines, codexQuotaLines] = await Promise.all([
    getUsageLines(),
    CODEX_ENABLED ? getCodexQuotaLines() : Promise.resolve<string[]>([]),
  ]);

  const hasClaudeData = usageLines.length > 0;
  const hasCodexData = !CODEX_ENABLED || codexQuotaLines.length > 0;

  if (!hasClaudeData && !hasCodexData) {
    await ctx.reply("❌ <b>Failed to fetch usage data</b>\n\nCould not retrieve Claude or Codex quota information.", {
      parse_mode: "HTML",
    });
    return;
  }

  const unifiedOutput = formatUnifiedUsage(usageLines, codexQuotaLines, CODEX_ENABLED);
  await ctx.reply(unifiedOutput, {
    parse_mode: "HTML",
  });
}

/**
 * Fetch and format Codex quota info via codex app-server JSON-RPC protocol.
 * Returns formatted lines with progress bars and reset times, or empty array on failure.
 */
export async function getCodexQuotaLines(): Promise<string[]> {
  try {
    // Spawn codex app-server process
    const proc = Bun.spawn(["/opt/homebrew/bin/codex", "app-server"], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });

    if (!proc.stdin) {
      return [];
    }

    let responseText = "";
    let messageId = 1;
    let initComplete = false;
    let rateLimitsReceived = false;

    // Set up timeout for entire operation (8 seconds max)
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<void>((resolve) => {
      timeoutId = setTimeout(() => resolve(), 8000);
    });

    // Helper to send JSON-RPC message
    const send = (msg: Record<string, unknown>) => {
      const line = JSON.stringify(msg) + "\n";
      proc.stdin!.write(line);
    };

    // Initialize: send initialize message
    send({
      jsonrpc: "2.0",
      id: messageId++,
      method: "initialize",
      params: {
        clientInfo: {
          name: "quota-checker",
          version: "1.0.0",
        },
      },
    });

    // Wait for initialization response and rate limits with timeout
    const readLoop = (async () => {
      const reader = proc.stdout!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (!rateLimitsReceived) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete lines from buffer
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (!line.trim()) continue;

            try {
              const response = JSON.parse(line) as Record<string, unknown>;

              // Check for initialization response
              if (!initComplete && response.id === 1) {
                initComplete = true;

                // Send initialized notification (no id)
                send({
                  jsonrpc: "2.0",
                  method: "initialized",
                  params: {},
                });

                // Send rate limits request
                send({
                  jsonrpc: "2.0",
                  id: messageId++,
                  method: "account/rateLimits/read",
                  params: {},
                });
              }

              // Check for rate limits response
              if (initComplete && response.result && typeof response.result === "object") {
                const result = response.result as Record<string, unknown>;
                if (result.rateLimits) {
                  rateLimitsReceived = true;
                  responseText = JSON.stringify(response);
                  break;
                }
              }
            } catch {
              // Skip unparseable lines
            }
          }

          if (rateLimitsReceived) break;
        }
      } catch {
        // Ignore read errors
      } finally {
        reader.releaseLock();
      }
    })();

    // Race between read loop and timeout
    await Promise.race([readLoop, timeoutPromise]);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    // Close the process
    proc.stdin?.end();
    proc.kill();

    if (!responseText) {
      return [];
    }

    // Parse the response
    const response = JSON.parse(responseText) as {
      result?: {
        rateLimits?: {
          primary?: { usedPercent?: number; windowDurationMins?: number; resetsAt?: number };
          secondary?: { usedPercent?: number; windowDurationMins?: number; resetsAt?: number };
          planType?: string;
        };
      };
    };

    const rateLimits = response.result?.rateLimits;
    if (!rateLimits) {
      return [];
    }

    const lines: string[] = [];
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Helper function to format progress bar
    const bar = (pct: number): string => {
      const filled = Math.round(pct / 5);
      const empty = 20 - filled;
      return "\u2588".repeat(filled) + "\u2591".repeat(empty);
    };

    // Helper function to format reset time
    const resetStr = (unixSeconds: number): string => {
      const d = new Date(unixSeconds * 1000);
      const now = new Date();

      // If reset is within today, show time
      if (
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate()
      ) {
        return d.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          timeZone: tz,
        });
      }

      // Otherwise show date
      const parts = d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: tz,
      }).split(" ");

      return parts.join(" ");
    };

    // Format primary window (5-hour)
    const primary = rateLimits.primary;
    if (primary) {
      const pct = primary.usedPercent ?? 0;
      const windowLabel = primary.windowDurationMins === 300 ? "5h window" : `${primary.windowDurationMins}m window`;
      const resetTime = primary.resetsAt ? resetStr(primary.resetsAt) : "";
      lines.push(`<code>${bar(pct)}</code> ${pct}% ${windowLabel}`);
      if (resetTime) {
        lines.push(`Resets ${resetTime} (${tz})`);
      }
    }

    // Format secondary window (weekly)
    const secondary = rateLimits.secondary;
    if (secondary) {
      const pct = secondary.usedPercent ?? 0;
      const windowLabel = secondary.windowDurationMins === 10080 ? "Weekly" : `${secondary.windowDurationMins}m window`;
      const resetTime = secondary.resetsAt ? resetStr(secondary.resetsAt) : "";
      lines.push(`<code>${bar(pct)}</code> ${pct}% ${windowLabel}`);
      if (resetTime) {
        lines.push(`Resets ${resetTime} (${tz})`);
      }
    }

    // Include plan type as a special marker (first element)
    const planType = rateLimits.planType || "";
    if (planType) {
      lines.unshift(`__CODEX_PLAN_TYPE__${planType}`);
    }

    return lines;
  } catch (error) {
    return [];
  }
}

/**
 * /codex-quota - Show Codex quota status from /status command.
 */
export async function handleCodexQuota(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const progress = await ctx.reply("📊 Fetching Codex quota...");

  try {
    const quotaLines = await getCodexQuotaLines();

    if (quotaLines.length === 0) {
      await ctx.reply(
        "⚠️ <b>Codex Quota</b>\n\n" +
        "Could not fetch quota. Make sure:\n" +
        "• Codex is logged in (`codex login`)\n" +
        "• You have an active ChatGPT Pro subscription\n" +
        "• Codex is installed at /opt/homebrew/bin/codex",
        { parse_mode: "HTML" }
      );
    } else {
      await ctx.reply(
        `📊 <b>Codex Quota</b>\n\n${quotaLines.join("\n")}`,
        { parse_mode: "HTML" }
      );
    }
  } catch (error) {
    await ctx.reply(
      `❌ <b>Error fetching Codex quota:</b>\n${escapeHtml(String(error).slice(0, 150))}`,
      { parse_mode: "HTML" }
    );
  } finally {
    try {
      await ctx.api.deleteMessage(progress.chat.id, progress.message_id);
    } catch {
      // Ignore failures to remove transient progress messages.
    }
  }
}

function chunkText(text: string, chunkSize = TELEGRAM_SAFE_LIMIT): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

function parseMarkdownTable(
  lines: string[],
  startIndex: number
): { headers: string[]; rows: string[][]; nextIndex: number } | null {
  let i = startIndex;
  const tableLines: string[] = [];

  while (i < lines.length && lines[i]!.trim().startsWith("|")) {
    tableLines.push(lines[i]!.trim());
    i++;
  }

  if (tableLines.length < 2) return null;

  const parseRow = (line: string): string[] =>
    line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim());

  const headers = parseRow(tableLines[0]!);
  const rows: string[][] = [];

  for (let rowIdx = 1; rowIdx < tableLines.length; rowIdx++) {
    const row = parseRow(tableLines[rowIdx]!);
    const isSeparator = row.every((cell) => /^-+$/.test(cell));
    if (!isSeparator) {
      rows.push(row);
    }
  }

  return { headers, rows, nextIndex: i };
}

function formatContextRow(headers: string[], row: string[]): string {
  const lowerHeaders = headers.map((h) => h.toLowerCase());
  const tokenIdx = lowerHeaders.findIndex((h) => h.includes("token"));
  const pctIdx = lowerHeaders.findIndex((h) => h.includes("percentage"));

  const labelParts: string[] = [];
  for (let i = 0; i < row.length; i++) {
    if (i !== tokenIdx && i !== pctIdx && row[i]) {
      labelParts.push(row[i]!);
    }
  }

  const label = labelParts.length > 0 ? labelParts.join(" · ") : row[0] || "item";
  let line = `• ${escapeHtml(label)}`;

  if (tokenIdx !== -1 && row[tokenIdx]) {
    line += `: <code>${escapeHtml(row[tokenIdx]!)}</code>`;
  }
  if (pctIdx !== -1 && row[pctIdx]) {
    line += ` (${escapeHtml(row[pctIdx]!)})`;
  }

  return line;
}

function chunkLines(lines: string[], chunkSize = TELEGRAM_SAFE_LIMIT): string[] {
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    const next = current ? `${current}\n${line}` : line;
    if (next.length > chunkSize && current) {
      chunks.push(current);
      current = line;
    } else if (next.length > chunkSize) {
      chunks.push(...chunkText(line, chunkSize));
      current = "";
    } else {
      current = next;
    }
  }

  if (current) {
    chunks.push(current);
  }
  return chunks;
}

function formatContextForTelegram(markdown: string): string[] {
  const lines = markdown.split("\n");
  const out: string[] = ["📊 <b>Context Usage</b>"];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!.trim();
    if (!line) {
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      i++;
      continue;
    }

    if (line.startsWith("**Model:**")) {
      const model = line.replace("**Model:**", "").trim();
      out.push(`<b>Model:</b> <code>${escapeHtml(model)}</code>`);
      i++;
      continue;
    }

    if (line.startsWith("**Tokens:**")) {
      const tokens = line.replace("**Tokens:**", "").trim();
      out.push(`<b>Tokens:</b> ${escapeHtml(tokens)}`, "");
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      const sectionName = line.replace("###", "").trim();
      out.push(`<b>${escapeHtml(sectionName)}</b>`);

      let j = i + 1;
      while (j < lines.length && !lines[j]!.trim()) j++;

      if (j < lines.length && lines[j]!.trim().startsWith("|")) {
        const table = parseMarkdownTable(lines, j);
        if (table) {
          for (const row of table.rows) {
            out.push(formatContextRow(table.headers, row));
          }
          out.push("");
          i = table.nextIndex;
          continue;
        }
      }

      out.push("");
      i++;
      continue;
    }

    out.push(escapeHtml(line));
    i++;
  }

  return chunkLines(out.filter((line, idx, arr) => !(line === "" && arr[idx - 1] === "")));
}

/**
 * /context - Show Claude Code context usage for the active session.
 */
export async function handleContext(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  if (!session.isActive || !session.sessionId) {
    await ctx.reply("❌ No active session. Send a message or use /resume first.");
    return;
  }

  if (session.isRunning) {
    await ctx.reply("⏳ Query is running. Use /stop, then /context.");
    return;
  }

  const progress = await ctx.reply("📊 Fetching context usage...");

  try {
    const result = await getContextReport(session.sessionId, WORKING_DIR);
    if (!result.ok) {
      await ctx.reply(`❌ ${result.error}`);
      return;
    }

    const raw = result.markdown.trim();
    const payload = raw.startsWith("## Context Usage") ? raw : `## Context Usage\n\n${raw}`;
    const chunks = formatContextForTelegram(payload);
    if (chunks.length === 0) {
      await ctx.reply("❌ Context output is empty.");
      return;
    }

    for (let i = 0; i < chunks.length; i++) {
      await ctx.reply(chunks[i]!, { parse_mode: "HTML" });
    }
  } catch (error) {
    await ctx.reply(`❌ Failed to fetch context: ${String(error).slice(0, 200)}`);
  } finally {
    try {
      await ctx.api.deleteMessage(progress.chat.id, progress.message_id);
    } catch {
      // Ignore failures to remove transient progress messages.
    }
  }
}

/**
 * /restart - Restart the bot process.
 */
export async function handleRestart(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;

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

  // Exit - launchd will restart us
  process.exit(0);
}

/**
 * /retry - Retry the last message (resume session and re-send).
 */
export async function handleRetry(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  // Check if there's a message to retry
  if (!session.lastMessage) {
    await ctx.reply("❌ No message to retry.");
    return;
  }

  // Check if something is already running
  if (session.isRunning) {
    await ctx.reply("⏳ A query is already running. Use /stop first.");
    return;
  }

  const message = session.lastMessage;
  await ctx.reply(`🔄 Retrying: "${message.slice(0, 50)}${message.length > 50 ? "..." : ""}"`);

  // Simulate sending the message again by emitting a fake text message event
  // We do this by directly calling the text handler logic
  const { handleText } = await import("./text");

  // Create a modified context with the last message
  const fakeCtx = {
    ...ctx,
    message: {
      ...ctx.message,
      text: message,
    },
  } as Context;

  await handleText(fakeCtx);
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

  // Parse the output into structured data
  interface SubTurtle {
    name: string;
    status: string;
    type: string;
    pid?: string;
    time?: string;
    task: string;
  }

  const turtles: SubTurtle[] = [];
  const lines = output.split("\n");

  for (const line of lines) {
    if (!line.trim()) continue;

    // Parse columnar output: name status type pid time task
    // Format from ctl list uses variable widths, so we need to be flexible
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;

    let idx = 0;
    const name = parts[idx++]!;
    const status = parts[idx++]!;

    let type = "";
    let pid = "";
    let time = "";
    let task = "";

    // Status can be "running" or "stopped"
    if (status === "running") {
      // After running, next could be type (slow, yolo, yolo-codex)
      if (["slow", "yolo", "yolo-codex"].includes(parts[idx]!)) {
        type = parts[idx++]!;
      }

      // Then comes (PID nnn)
      if (parts[idx] === "(PID") {
        pid = parts[++idx]!.replace(")", "");
        idx++;
      }

      // Then comes time like "45m left", "1h 23m left", "no timeout", or "OVERDUE"
      // Find "left" marker and capture everything before it as time
      const leftIdx = parts.indexOf("left", idx);
      if (leftIdx > idx) {
        time = parts.slice(idx, leftIdx).join(" ");
        idx = leftIdx + 1; // skip past "left"
      } else if (idx < parts.length && parts[idx] === "no" && idx + 1 < parts.length && parts[idx + 1] === "timeout") {
        // Handle "no timeout" case
        time = "no timeout";
        idx += 2;
      } else if (idx < parts.length && parts[idx] === "OVERDUE") {
        time = "OVERDUE";
        idx++;
      }
    }

    // Remaining is task (join with spaces)
    if (idx < parts.length) {
      task = parts.slice(idx).join(" ");
    }

    turtles.push({ name, status, type, pid, time, task });
  }

  if (turtles.length === 0) {
    await ctx.reply("📋 <b>SubTurtles</b>\n\nNo SubTurtles found", { parse_mode: "HTML" });
    return;
  }

  // Build message and inline keyboard
  const messageLines: string[] = ["🐢 <b>SubTurtles</b>\n"];

  const keyboard: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const turtle of turtles) {
    // Format the turtle info line
    let statusEmoji = turtle.status === "running" ? "🟢" : "⚫";
    let typeStr = turtle.type ? ` <code>${escapeHtml(turtle.type)}</code>` : "";
    let timeStr = turtle.time ? ` • ${escapeHtml(turtle.time)} left` : "";
    let taskStr = turtle.task ? ` • ${escapeHtml(turtle.task)}` : "";

    messageLines.push(
      `${statusEmoji} <b>${escapeHtml(turtle.name)}</b>${typeStr}${timeStr}${taskStr}`
    );

    // Add buttons for running turtles
    if (turtle.status === "running") {
      keyboard.push([
        {
          text: "📋 Logs",
          callback_data: `subturtle_logs:${turtle.name}`,
        },
        {
          text: "🛑 Stop",
          callback_data: `subturtle_stop:${turtle.name}`,
        },
      ]);
    }
  }

  await ctx.reply(messageLines.join("\n"), {
    parse_mode: "HTML",
    reply_markup: keyboard.length > 0 ? { inline_keyboard: keyboard } : undefined,
  });
}

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
