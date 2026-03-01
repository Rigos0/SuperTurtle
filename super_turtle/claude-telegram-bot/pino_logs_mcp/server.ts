#!/usr/bin/env bun
/**
 * Pino Logs MCP Server — fetch recent Pino logs with basic filtering.
 *
 * Uses file-based IPC with polling:
 *   1. Writes request to /tmp/pino-logs-{uuid}.json  (status: "pending")
 *   2. Bot's streaming handler picks it up, executes, writes result back (status: "completed")
 *   3. This server polls the file until the result appears (100ms intervals, 10s timeout)
 *   4. Returns result text to Claude
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { mcpLog } from "../src/logger";

const POLL_INTERVAL_MS = 100;
const POLL_TIMEOUT_MS = 10_000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

const VALID_LEVELS = [
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "all",
] as const;

type Level = (typeof VALID_LEVELS)[number];

const pinoLogsLog = mcpLog.child({ tool: "pino_logs", server: "pino-logs" });

// Create the MCP server
const server = new Server(
  { name: "pino-logs", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "pino_logs",
      description: [
        "Fetch recent Pino logs from the Telegram bot.",
        "Use 'levels' for exact levels (e.g., [\"error\",\"warn\"]).",
        "Use 'level' for minimum severity (e.g., \"info\" includes warn/error).",
      ].join("\n"),
      inputSchema: {
        type: "object" as const,
        properties: {
          level: {
            type: "string",
            enum: VALID_LEVELS as unknown as string[],
            description: "Minimum severity (default: error).",
          },
          levels: {
            type: "array",
            items: { type: "string", enum: VALID_LEVELS as unknown as string[] },
            description: "Exact levels to include (overrides level).",
          },
          limit: {
            type: "integer",
            description: "Max number of log entries to return (default: 50).",
            minimum: 1,
            maximum: MAX_LIMIT,
          },
          module: {
            type: "string",
            description: "Optional module filter (e.g., claude, streaming, bot).",
          },
        },
      },
    },
  ],
}));

/**
 * Poll a request file until the bot writes a result back.
 */
async function pollForResult(filepath: string): Promise<string> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const text = await Bun.file(filepath).text();
      const data = JSON.parse(text);

      if (data.status === "completed") {
        try {
          const { unlinkSync } = await import("fs");
          unlinkSync(filepath);
        } catch {
          /* best-effort cleanup */
        }
        return data.result || "Done (no result data).";
      }

      if (data.status === "error") {
        try {
          const { unlinkSync } = await import("fs");
          unlinkSync(filepath);
        } catch {
          /* best-effort cleanup */
        }
        return `Error: ${data.error || "unknown error"}`;
      }
    } catch {
      // File might not exist yet or be mid-write — keep polling
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  return "Timed out waiting for bot to process the request. The bot may be busy.";
}

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "pino_logs") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = request.params.arguments as {
    level?: string;
    levels?: string[];
    limit?: number;
    module?: string;
  };

  const level = (args.level || "error") as Level;
  const levels =
    args.levels?.filter((item) => VALID_LEVELS.includes(item as Level)) || [];
  const limit = Math.max(
    1,
    Math.min(Number(args.limit || DEFAULT_LIMIT), MAX_LIMIT),
  );
  const moduleFilter = args.module ? String(args.module) : undefined;

  if (!VALID_LEVELS.includes(level)) {
    throw new Error(
      `Invalid level: ${level}. Valid: ${VALID_LEVELS.join(", ")}`,
    );
  }

  const requestUuid = crypto.randomUUID().slice(0, 8);
  const chatId = process.env.TELEGRAM_CHAT_ID || "";

  const requestData = {
    request_id: requestUuid,
    level,
    levels,
    limit,
    module: moduleFilter,
    status: "pending",
    chat_id: chatId,
    created_at: new Date().toISOString(),
  };

  const requestFile = `/tmp/pino-logs-${requestUuid}.json`;
  await Bun.write(requestFile, JSON.stringify(requestData, null, 2));

  const result = await pollForResult(requestFile);

  return {
    content: [{ type: "text" as const, text: result }],
  };
});

// Run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  pinoLogsLog.info({ action: "startup" }, "Pino Logs MCP server running on stdio");
}

main().catch((error) => {
  pinoLogsLog.error({ err: error, action: "startup" }, "Pino Logs MCP server failed");
  process.exitCode = 1;
});
