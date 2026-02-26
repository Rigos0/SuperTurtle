import { codexSession, mapThinkingToReasoningEffort } from "../codex-session";
import { session } from "../session";
import type { ChatDriver, DriverRunInput, DriverStatusSnapshot } from "./types";

async function wait(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export class CodexDriver implements ChatDriver {
  readonly id = "codex" as const;
  readonly displayName = "Codex";
  readonly auditEvent = "TEXT_CODEX" as const;

  async runMessage(input: DriverRunInput): Promise<string> {
    const {
      checkPendingAskUserRequests,
      checkPendingBotControlRequests,
      checkPendingSendTurtleRequests,
    } = await import("../handlers/streaming");

    const reasoningEffort = mapThinkingToReasoningEffort(input.message);

    let keepPolling = true;
    const pendingPump = (async () => {
      while (keepPolling) {
        try {
          await checkPendingAskUserRequests(input.ctx, input.chatId);
          await checkPendingSendTurtleRequests(input.ctx, input.chatId);
          await checkPendingBotControlRequests(session, input.chatId);
        } catch (error) {
          console.warn("Failed to process pending Codex MCP request:", error);
        }
        if (keepPolling) {
          await wait(100);
        }
      }
    })();

    let response: string;
    try {
      response = await codexSession.sendMessage(
        input.message,
        input.statusCallback,
        undefined,
        reasoningEffort
      );
    } finally {
      keepPolling = false;
      await pendingPump;
    }

    // Final flush for late writes near turn completion.
    await wait(100);
    await checkPendingAskUserRequests(input.ctx, input.chatId);
    await checkPendingSendTurtleRequests(input.ctx, input.chatId);
    await checkPendingBotControlRequests(session, input.chatId);

    return response;
  }

  async stop() {
    const result = await codexSession.stop();
    if (result) {
      await Bun.sleep(100);
    }
    return result;
  }

  async kill(): Promise<void> {
    await codexSession.kill();
  }

  isCrashError(error: unknown): boolean {
    const errorStr = String(error).toLowerCase();
    return errorStr.includes("crashed") || errorStr.includes("failed");
  }

  isCancellationError(error: unknown): boolean {
    const errorStr = String(error).toLowerCase();
    return errorStr.includes("abort") || errorStr.includes("cancel");
  }

  getStatusSnapshot(): DriverStatusSnapshot {
    return {
      driverName: "Codex",
      isActive: codexSession.isActive,
      sessionId: codexSession.getThreadId(),
      lastActivity: codexSession.lastActivity,
      lastError: codexSession.lastError,
      lastErrorTime: codexSession.lastErrorTime,
      lastUsage: codexSession.lastUsage
        ? {
            inputTokens: codexSession.lastUsage.input_tokens || 0,
            outputTokens: codexSession.lastUsage.output_tokens || 0,
          }
        : null,
    };
  }
}
