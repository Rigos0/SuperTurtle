import { session } from "../session";
import type { ChatDriver, DriverRunInput, DriverStatusSnapshot } from "./types";

export class ClaudeDriver implements ChatDriver {
  readonly id = "claude" as const;
  readonly displayName = "Claude";
  readonly auditEvent = "TEXT" as const;

  async runMessage(input: DriverRunInput): Promise<string> {
    return session.sendMessageStreaming(
      input.message,
      input.username,
      input.userId,
      input.statusCallback,
      input.chatId,
      input.ctx
    );
  }

  async stop() {
    if (!session.isRunning) {
      return false;
    }

    const result = await session.stop();
    if (result) {
      await Bun.sleep(100);
      session.clearStopRequested();
    }
    return result;
  }

  async kill(): Promise<void> {
    await session.kill();
  }

  isCrashError(error: unknown): boolean {
    return String(error).includes("exited with code");
  }

  isStallError(error: unknown): boolean {
    return String(error).toLowerCase().includes("event stream stalled");
  }

  isCancellationError(error: unknown): boolean {
    const errorStr = String(error).toLowerCase();
    return errorStr.includes("abort") || errorStr.includes("cancel");
  }

  getStatusSnapshot(): DriverStatusSnapshot {
    return {
      driverName: "Claude",
      isActive: session.isActive,
      sessionId: session.sessionId,
      lastActivity: session.lastActivity,
      lastError: session.lastError,
      lastErrorTime: session.lastErrorTime,
      lastUsage: session.lastUsage
        ? {
            inputTokens: session.lastUsage.input_tokens || 0,
            outputTokens: session.lastUsage.output_tokens || 0,
            cacheReadInputTokens: session.lastUsage.cache_read_input_tokens,
          }
        : null,
    };
  }
}
