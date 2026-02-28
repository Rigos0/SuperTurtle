/**
 * /context command handler — show Claude Code context usage.
 */

import type { Context } from "grammy";
import { session } from "../../session";
import { ALLOWED_USERS, TELEGRAM_SAFE_LIMIT, WORKING_DIR } from "../../config";
import { isAuthorized } from "../../security";
import { escapeHtml } from "../../formatting";
import { getContextReport } from "../../context-command";
import { chunkText, chunkLines } from "./shared";

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

  if (session.activeDriver === "codex") {
    await ctx.reply("ℹ️ /context is currently available only for Claude sessions.");
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
