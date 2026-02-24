#!/usr/bin/env bun
/**
 * Schedule MCP Server — lets Claude schedule future messages for the bot.
 *
 * Actions: create (schedule a new job), list (show all jobs), cancel (cancel a job).
 *
 * Uses file-based IPC with polling:
 *   1. Writes request to /tmp/schedule-{uuid}.json  (status: "pending")
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

const POLL_INTERVAL_MS = 100;
const POLL_TIMEOUT_MS = 10_000;

const VALID_ACTIONS = ["create", "list", "cancel"] as const;

type Action = (typeof VALID_ACTIONS)[number];

// Create the MCP server
const server = new Server(
  { name: "schedule", version: "1.0.0" },
  { capabilities: { tools: {} } },
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "schedule",
      description: [
        "Schedule messages for the Telegram bot.",
        "Available actions:",
        '  "create"  — schedule a new message. params: { prompt, delay_minutes?, interval_minutes?, type: "one-shot"|"recurring" }',
        '  "list"    — show all scheduled jobs (no params)',
        '  "cancel"  — cancel a scheduled job. params: { job_id }',
      ].join("\n"),
      inputSchema: {
        type: "object" as const,
        properties: {
          action: {
            type: "string",
            enum: VALID_ACTIONS as unknown as string[],
            description: "The schedule action to perform",
          },
          params: {
            type: "object",
            description: "Optional parameters for the action",
            properties: {
              prompt: { type: "string", description: "Message to schedule" },
              delay_minutes: {
                type: "number",
                description: "Minutes until message fires (for one-shot jobs)",
              },
              interval_minutes: {
                type: "number",
                description: "Interval in minutes for recurring jobs",
              },
              type: {
                type: "string",
                enum: ["one-shot", "recurring"],
                description: "Job type",
              },
              job_id: { type: "string", description: "Job ID to cancel" },
            },
          },
        },
        required: ["action"],
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
        // Clean up the request file
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
  if (request.params.name !== "schedule") {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  const args = request.params.arguments as {
    action?: string;
    params?: Record<string, unknown>;
  };

  const action = args.action as Action;
  if (!action || !VALID_ACTIONS.includes(action)) {
    throw new Error(
      `Invalid action: ${action}. Valid: ${VALID_ACTIONS.join(", ")}`,
    );
  }

  const requestUuid = crypto.randomUUID().slice(0, 8);
  const chatId = process.env.TELEGRAM_CHAT_ID || "";

  const requestData = {
    request_id: requestUuid,
    action,
    params: args.params || {},
    status: "pending",
    chat_id: chatId,
    created_at: new Date().toISOString(),
  };

  const requestFile = `/tmp/schedule-${requestUuid}.json`;
  await Bun.write(requestFile, JSON.stringify(requestData, null, 2));

  // Poll for the bot to process and write a result
  const result = await pollForResult(requestFile);

  return {
    content: [{ type: "text" as const, text: result }],
  };
});

// Run the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Schedule MCP server running on stdio");
}

main().catch(console.error);
