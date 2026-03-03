/**
 * MCP Servers Configuration for Claude Telegram Bot.
 */

import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)));

export const MCP_SERVERS: Record<
  string,
  | { command: string; args?: string[]; env?: Record<string, string> }
  | { type: "http"; url: string; headers?: Record<string, string> }
> = {
  "send-turtle": {
    command: "bun",
    args: ["run", `${REPO_ROOT}/send_turtle_mcp/server.ts`],
    env: { SUPERTURTLE_IPC_DIR: process.env.SUPERTURTLE_IPC_DIR || "" },
  },
  "bot-control": {
    command: "bun",
    args: ["run", `${REPO_ROOT}/bot_control_mcp/server.ts`],
    env: { SUPERTURTLE_IPC_DIR: process.env.SUPERTURTLE_IPC_DIR || "" },
  },
};
