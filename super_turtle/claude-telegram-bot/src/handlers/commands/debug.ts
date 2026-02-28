/**
 * /debug command handler — show internal bot state.
 */

import type { Context } from "grammy";
import { session } from "../../session";
import { codexSession } from "../../codex-session";
import { ALLOWED_USERS } from "../../config";
import { isAuthorized } from "../../security";
import { escapeHtml } from "../../formatting";
import { isAnyDriverRunning, isBackgroundRunActive, wasBackgroundRunPreempted } from "../driver-routing";
import { getPreparedSnapshotCount } from "../../cron-supervision-queue";
import { getAllDeferredQueues } from "../../deferred-queue";
import { formatModelInfo } from "./shared";
import { readMainLoopLogTail } from "./looplogs";

/**
 * /debug - Show internal state for troubleshooting.
 */
export async function handleDebug(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const now = Date.now();
  const lines: string[] = ["🔍 <b>Debug — Internal State</b>\n"];

  // ── Driver / Session ──
  const driverLabel = session.activeDriver === "codex" ? "Codex 🟢" : "Claude 🔵";
  const { modelName, effortStr } = formatModelInfo(session.model, session.effort);
  const claudeRunning = session.isRunning;
  const codexRunning = codexSession.isRunning;
  const anyDriverRunning = isAnyDriverRunning();

  lines.push(`<b>Driver</b>`);
  lines.push(`  Active: ${driverLabel}`);
  lines.push(`  Model: ${escapeHtml(modelName)}${escapeHtml(effortStr)}`);
  lines.push(`  Claude session: ${session.isActive ? `active (${session.sessionId?.slice(0, 8)}…)` : "none"}`);
  lines.push(`  Claude running: ${claudeRunning ? "✅ yes" : "no"}`);
  if (session.queryStarted) {
    const elapsed = Math.round((now - session.queryStarted.getTime()) / 1000);
    lines.push(`  Claude query elapsed: ${elapsed}s`);
  }
  if (session.currentTool) {
    lines.push(`  Claude current tool: <code>${escapeHtml(session.currentTool)}</code>`);
  }
  lines.push(`  Codex session: ${codexSession.isActive ? "active" : "none"}`);
  lines.push(`  Codex running: ${codexRunning ? "✅ yes" : "no"}`);
  if (codexRunning && codexSession.runningSince) {
    const elapsed = Math.round((now - codexSession.runningSince.getTime()) / 1000);
    lines.push(`  Codex query elapsed: ${elapsed}s`);
  }
  lines.push(`  Any driver running: ${anyDriverRunning ? "✅ yes" : "no"}`);
  lines.push("");

  // ── Background runs (cron / snapshots) ──
  const bgActive = isBackgroundRunActive();
  const bgPreempted = wasBackgroundRunPreempted();
  const snapshotQueueSize = getPreparedSnapshotCount();

  lines.push(`<b>Background</b>`);
  lines.push(`  Background run active: ${bgActive ? "✅ yes" : "no"}`);
  lines.push(`  Background preempted: ${bgPreempted ? "⚠️ yes" : "no"}`);
  lines.push(`  Supervision snapshot queue: ${snapshotQueueSize}`);
  lines.push("");

  // ── Deferred message queue ──
  const deferredQueues = getAllDeferredQueues();
  let totalDeferred = 0;
  for (const [, msgs] of deferredQueues) {
    totalDeferred += msgs.length;
  }

  lines.push(`<b>Deferred Queue</b>`);
  if (totalDeferred === 0) {
    lines.push(`  Empty`);
  } else {
    for (const [chatId, msgs] of deferredQueues) {
      lines.push(`  Chat ${chatId}: ${msgs.length} message${msgs.length === 1 ? "" : "s"}`);
      for (const msg of msgs) {
        const age = Math.round((now - msg.enqueuedAt) / 1000);
        const preview = msg.text.length > 60 ? msg.text.slice(0, 57) + "…" : msg.text;
        lines.push(`    • ${escapeHtml(preview)} (${age}s ago, ${msg.source})`);
      }
    }
  }
  lines.push("");

  // ── Last error from loop log ──
  const logResult = readMainLoopLogTail();
  if (logResult.ok && logResult.text) {
    const logLines = logResult.text.split("\n");
    // Find last error/warning line in the log
    const errorLines: string[] = [];
    for (let i = logLines.length - 1; i >= 0 && errorLines.length < 5; i--) {
      const line = logLines[i]!.trim();
      if (!line) continue;
      if (/error|fail|crash|panic|BLOCKED|SIGTERM|SIGKILL|exit/i.test(line)) {
        errorLines.unshift(line);
      }
    }
    if (errorLines.length > 0) {
      lines.push(`<b>Recent Errors (loop log)</b>`);
      for (const errLine of errorLines) {
        const truncated = errLine.length > 120 ? errLine.slice(0, 117) + "…" : errLine;
        lines.push(`  <code>${escapeHtml(truncated)}</code>`);
      }
    }
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}
