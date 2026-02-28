import pino from "pino";

const LOG_FILE_PATH = "/tmp/claude-telegram-bot.log.jsonl";

function createLogger() {
  try {
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
            options: { destination: LOG_FILE_PATH },
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
      pino.destination(LOG_FILE_PATH)
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
