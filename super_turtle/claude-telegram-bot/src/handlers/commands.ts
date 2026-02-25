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
 * Fetch and format Codex usage info as HTML lines. Returns empty array on failure.
 */
export async function getCodexUsageLines(): Promise<string[]> {
  try {
    const adminKey = process.env.OPENAI_ADMIN_KEY?.trim();
    if (!adminKey) return [];

    const now = Math.floor(Date.now() / 1000);
    const sevenDaysAgo = now - 7 * 24 * 60 * 60;

    const params = new URLSearchParams({
      start_time: String(sevenDaysAgo),
      end_time: String(now),
      bucket_width: "1d",
      limit: "7",
    });

    let page: string | undefined;
    let totalRequests = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let totalCachedInputTokens = 0;
    let bucketCount = 0;

    do {
      if (page) {
        params.set("page", page);
      } else {
        params.delete("page");
      }

      const res = await fetch(
        `https://api.openai.com/v1/organization/usage/completions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${adminKey}`,
          },
        }
      );
      if (!res.ok) return [];

      const data = (await res.json()) as CodexUsageResponse;
      const buckets = Array.isArray(data.data) ? data.data : [];

      for (const bucket of buckets) {
        const results = Array.isArray(bucket.results) ? bucket.results : [];
        if (results.length === 0) continue;
        bucketCount += 1;

        for (const result of results) {
          totalRequests += result.num_model_requests ?? 0;
          totalInputTokens += result.input_tokens ?? 0;
          totalOutputTokens += result.output_tokens ?? 0;
          totalCachedInputTokens += result.input_cached_tokens ?? 0;
        }
      }

      page = data.has_more && data.next_page ? data.next_page : undefined;
    } while (page);

    if (bucketCount === 0) {
      return ["No Codex usage in last 7 days."];
    }

    return [
      `Codex (last 7 days): <code>${totalRequests.toLocaleString()}</code> requests`,
      `Input tokens: <code>${totalInputTokens.toLocaleString()}</code>`,
      `Output tokens: <code>${totalOutputTokens.toLocaleString()}</code>`,
      `Cached input tokens: <code>${totalCachedInputTokens.toLocaleString()}</code>`,
    ];
  } catch {
    return [];
  }
}

/**
 * /usage - Show Claude subscription usage (rate limits).
 */
export async function handleUsage(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const [usageLines, codexUsageLines] = await Promise.all([
    getUsageLines(),
    CODEX_ENABLED ? getCodexUsageLines() : Promise.resolve<string[]>([]),
  ]);

  const sections: string[] = [];

  if (usageLines.length > 0) {
    sections.push(`<b>Claude usage</b>\n${usageLines.join("\n")}`);
  } else {
    sections.push(`<b>Claude usage</b>\nUnavailable right now.`);
  }

  if (CODEX_ENABLED) {
    if (codexUsageLines.length > 0) {
      sections.push(`<b>Codex usage</b>\n${codexUsageLines.join("\n")}`);
    } else {
      sections.push(`<b>Codex usage</b>\nUnavailable right now.`);
    }
  }

  const hasClaudeData = usageLines.length > 0;
  const hasCodexData = !CODEX_ENABLED || codexUsageLines.length > 0;
  if (!hasClaudeData && !hasCodexData) {
    await ctx.reply("Failed to fetch usage.");
    return;
  }

  await ctx.reply(`<b>Usage</b>\n\n${sections.join("\n\n")}`, {
    parse_mode: "HTML",
  });
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
