import pino from "pino";

export const PINO_LOG_PATH = "/tmp/claude-telegram-bot.log.jsonl";

/**
 * Detect if we're running inside an MCP server subprocess.
 * MCP servers use stdout as the JSON-RPC transport, so we MUST NOT
 * write any log output to stdout (fd 1) — it would corrupt the protocol
 * and cause "Transport closed" / "serde error" failures in the client.
 *
 * We detect this via the MCP_SERVER env var that we set in mcp-config.ts,
 * OR by checking if the script path contains "mcp" directory markers.
 */
const IS_MCP_SERVER =
  process.env.MCP_SERVER === "1" ||
  (typeof Bun !== "undefined" && Bun.main?.includes("_mcp/"));

function createLogger() {
  try {
    // MCP servers: log ONLY to file — never to stdout (which is the JSON-RPC transport)
    if (IS_MCP_SERVER) {
      return pino({
        level: process.env.LOG_LEVEL || "info",
        transport: {
          targets: [
            {
              target: "pino-pretty",
              options: { destination: 2 }, // stderr, safe for MCP
            },
            {
              target: "pino/file",
              options: { destination: PINO_LOG_PATH },
            },
          ],
        },
      });
    }

    // Normal bot process: log to stdout (pretty) + file
    return pino({
      level: process.env.LOG_LEVEL || "info",
      transport: {
        targets: [
          {
            target: "pino-pretty",
            options: { destination: 1 },
          },
          {
            target: "pino/file",
            options: { destination: PINO_LOG_PATH },
          },
        ],
      },
    });
  } catch {
    // Fallback for runtimes where worker-thread transports are unavailable.
    return pino(
      {
        level: process.env.LOG_LEVEL || "info",
      },
      pino.destination(PINO_LOG_PATH)
    );
  }
}

export const logger = createLogger();

export const botLog = logger.child({ module: "bot" });
export const cronLog = logger.child({ module: "cron" });
export const claudeLog = logger.child({ module: "claude" });
export const codexLog = logger.child({ module: "codex" });
export const mcpLog = logger.child({ module: "mcp" });
export const streamLog = logger.child({ module: "streaming" });
export const cmdLog = logger.child({ module: "commands" });
export const eventLog = logger.child({ module: "events" });
