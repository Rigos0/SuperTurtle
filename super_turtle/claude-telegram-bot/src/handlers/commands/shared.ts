/**
 * Shared utilities, types, and helpers used across command handlers.
 */

import { session, getAvailableModels, EFFORT_DISPLAY, type EffortLevel } from "../../session";
import { codexSession } from "../../codex-session";
import {
  CODEX_AVAILABLE,
  CODEX_ENABLED,
  CODEX_USER_ENABLED,
  CODEX_CLI_AVAILABLE,
  TELEGRAM_SAFE_LIMIT,
  getCodexUnavailableReason,
} from "../../config";
import { escapeHtml } from "../../formatting";
import { getUsageLines } from "./usage";
import { getCodexQuotaLines, formatUnifiedUsage } from "./usage";

/**
 * Shared command list for display in /new and /status, and new_session bot-control.
 */
export function getCommandLines(): string[] {
  const switchLine = CODEX_AVAILABLE
    ? `/switch - Claude ↔ Codex`
    : `/switch - Driver controls (Codex unavailable)`;
  return [
    `/new - Fresh session`,
    `/model - Switch model/effort`,
    switchLine,
    `/usage - Subscription usage`,
    `/context - Context usage`,
    `/status - Detailed status`,
    `/looplogs - Main loop logs`,
    `/resume - Resume a session`,
    `/sub - SubTurtles`,
    `/cron - Scheduled jobs`,
  ];
}

export function getCodexUnavailableMessage(): string {
  const reason = getCodexUnavailableReason();
  if (!reason) return "❌ Codex is unavailable.";
  if (!CODEX_USER_ENABLED) {
    return (
      `❌ ${reason}\n` +
      `Run onboarding/setup and enable Codex integration to allow driver switching.`
    );
  }
  if (!CODEX_CLI_AVAILABLE) {
    return `❌ ${reason}`;
  }
  return `❌ ${reason}`;
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

export function getSettingsOverviewLines(): string[] {
  const { modelName, effortStr } = formatModelInfo(session.model, session.effort);
  const isCodex = session.activeDriver === "codex";
  const driverLabel = isCodex ? "Codex 🟢" : "Claude 🔵";
  const activeModelLine = isCodex
    ? `${escapeHtml(codexSession.model)} | ${escapeHtml(codexSession.reasoningEffort)}`
    : `${modelName}${effortStr}`;

  return [
    `${driverLabel} · ${activeModelLine}`,
  ];
}

export async function buildSessionOverviewLines(title: string): Promise<string[]> {
  const lines: string[] = [`<b>${title}</b>\n`, ...getSettingsOverviewLines(), ""];
  const [usageLines, codexQuotaLines] = await Promise.all([
    getUsageLines(),
    CODEX_ENABLED ? getCodexQuotaLines() : Promise.resolve<string[]>([]),
  ]);
  lines.push(formatUnifiedUsage(usageLines, codexQuotaLines, CODEX_ENABLED), "");
  lines.push(`<b>Commands:</b>`, ...getCommandLines());
  return lines;
}

export function truncateText(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  if (maxLength <= 3) return value.slice(0, maxLength);
  return `${value.slice(0, maxLength - 3)}...`;
}

export function chunkText(text: string, chunkSize = TELEGRAM_SAFE_LIMIT): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

export function chunkLines(lines: string[], chunkSize = TELEGRAM_SAFE_LIMIT): string[] {
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
