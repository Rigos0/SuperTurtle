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

    const response = await codexSession.sendMessage(
      input.message,
      input.statusCallback,
      undefined,
      reasoningEffort
    );

    // Codex MCP handlers write request files to /tmp; poll briefly to flush them.
    await wait(200);

    for (let attempt = 0; attempt < 3; attempt++) {
      const buttonsSent = await checkPendingAskUserRequests(input.ctx, input.chatId);
      if (buttonsSent) break;
      if (attempt < 2) await wait(100);
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const photoSent = await checkPendingSendTurtleRequests(input.ctx, input.chatId);
      if (photoSent) break;
      if (attempt < 2) await wait(100);
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      const handled = await checkPendingBotControlRequests(session, input.chatId);
      if (handled) break;
      if (attempt < 2) await wait(100);
    }

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
