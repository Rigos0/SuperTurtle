/**
 * /usage command handler and usage/quota formatting utilities.
 */

import type { Context } from "grammy";
import { session } from "../../session";
import { codexSession } from "../../codex-session";
import {
  ALLOWED_USERS,
  CODEX_ENABLED,
  IS_MACOS,
  IS_LINUX,
} from "../../config";
import { isAuthorized } from "../../security";
import { escapeHtml } from "../../formatting";

/**
 * Retrieve Claude Code OAuth credentials from the platform keychain.
 * macOS: uses `security find-generic-password` (Keychain)
 * Linux: uses `secret-tool lookup` (GNOME Keyring / libsecret)
 * Returns the parsed credentials object, or null on failure.
 */
function getClaudeCredentials(): Record<string, unknown> | null {
  try {
    if (IS_MACOS) {
      const proc = Bun.spawnSync([
        "security",
        "find-generic-password",
        "-s",
        "Claude Code-credentials",
        "-a",
        process.env.USER || "unknown",
        "-w",
      ]);
      if (proc.exitCode !== 0) return null;
      return JSON.parse(proc.stdout.toString());
    }

    if (IS_LINUX) {
      // Try secret-tool (libsecret / GNOME Keyring)
      if (Bun.which("secret-tool")) {
        const proc = Bun.spawnSync([
          "secret-tool",
          "lookup",
          "service",
          "Claude Code-credentials",
          "username",
          process.env.USER || "unknown",
        ]);
        if (proc.exitCode === 0) {
          const output = proc.stdout.toString().trim();
          if (output) return JSON.parse(output);
        }
      }

      // Fallback: try reading from Claude Code config directory
      const credPaths = [
        `${process.env.HOME}/.config/claude-code/credentials.json`,
        `${process.env.HOME}/.claude/credentials.json`,
      ];
      for (const credPath of credPaths) {
        try {
          const file = Bun.file(credPath);
          if (file.size > 0) {
            const text = require("fs").readFileSync(credPath, "utf-8");
            return JSON.parse(text);
          }
        } catch {
          // Try next path
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Fetch and format usage info as HTML lines. Returns empty array on failure.
 */
export async function getUsageLines(): Promise<string[]> {
  try {
    const creds = getClaudeCredentials();
    if (!creds) return [];
    const token = (creds as Record<string, Record<string, string>>).claudeAiOauth?.accessToken;
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
  const sections: string[] = [];

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

  let unifiedOutput = formatUnifiedUsage(usageLines, codexQuotaLines, CODEX_ENABLED);

  // Add Codex token usage from last turn if available
  if (CODEX_ENABLED && codexSession.lastUsage) {
    const usage = codexSession.lastUsage;
    const codexTokenUsage = [
      "",
      "<b>📊 Codex Last Query Tokens</b>",
      `   Input: ${usage.input_tokens?.toLocaleString() || "?"} tokens`,
      `   Output: ${usage.output_tokens?.toLocaleString() || "?"} tokens`,
    ];
    unifiedOutput += "\n" + codexTokenUsage.join("\n");
  }

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
    // Spawn codex app-server process — use PATH-resolved binary, not hardcoded path
    const codexBin = Bun.which("codex") || "codex";
    const proc = Bun.spawn([codexBin, "app-server"], {
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
