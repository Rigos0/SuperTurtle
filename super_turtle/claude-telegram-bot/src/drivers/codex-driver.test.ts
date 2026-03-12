import { afterEach, describe, expect, it, mock } from "bun:test";
import type { Context } from "grammy";
import { codexSession } from "../codex-session";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();
process.env.CODEX_ENABLED ||= "true";
process.env.CODEX_CLI_AVAILABLE_OVERRIDE ||= "true";

const originalSendMessage = codexSession.sendMessage;

async function loadCodexDriverModule() {
  return import(`./codex-driver.ts?test=${Date.now()}-${Math.random()}`);
}

afterEach(() => {
  codexSession.sendMessage = originalSendMessage;
  mock.restore();
});

describe("CodexDriver", () => {
  it("classifies transient Codex stream disconnects as retriable stalls", async () => {
    const { CodexDriver } = await loadCodexDriverModule();
    const driver = new CodexDriver();

    expect(
      driver.isStallError(
        new Error(
          "Codex stream error: Reconnecting... 1/5 (stream disconnected before completion: An error occurred while processing your request.)"
        )
      )
    ).toBe(true);
  });

  it("does not classify Codex auth failures as retriable stalls", async () => {
    const { CodexDriver } = await loadCodexDriverModule();
    const driver = new CodexDriver();

    expect(
      driver.isStallError(
        new Error(
          "Codex stream error: Reconnecting... 1/5 (unexpected status 401 Unauthorized: Missing bearer or basic authentication in header)"
        )
      )
    ).toBe(false);
  });

  it("does not derive reasoning effort from message keywords", async () => {
    const actualStreaming = await import(`../handlers/streaming.ts?actual=${Date.now()}-${Math.random()}`);
    mock.module("../handlers/streaming", () => ({
      checkPendingAskUserRequests: async () => false,
      checkPendingBotControlRequests: async () => false,
      checkPendingPinoLogsRequests: async () => false,
      checkPendingSendImageRequests: async () => false,
      checkPendingSendTurtleRequests: async () => false,
      isSpawnOrchestrationToolStatus: actualStreaming.isSpawnOrchestrationToolStatus,
    }));

    const reasoningEfforts: Array<string | undefined> = [];
    codexSession.sendMessage = (async (
      _message,
      _statusCallback,
      _model,
      reasoningEffort
    ) => {
      reasoningEfforts.push(reasoningEffort);
      return "ok";
    }) as typeof codexSession.sendMessage;

    const { CodexDriver } = await loadCodexDriverModule();
    const driver = new CodexDriver();

    const response = await driver.runMessage({
      message: "please ultrathink about this",
      source: "text",
      username: "tester",
      userId: 123,
      chatId: 456,
      ctx: {} as Context,
      statusCallback: async () => {},
    });

    expect(response).toBe("ok");
    expect(reasoningEfforts).toEqual([undefined]);
  });

  it("flushes pending send_image requests for Codex MCP tool calls", async () => {
    const sendImageChecks: number[] = [];
    const actualStreaming = await import(`../handlers/streaming.ts?actual=${Date.now()}-${Math.random()}`);

    mock.module("../handlers/streaming", () => ({
      checkPendingAskUserRequests: async () => false,
      checkPendingBotControlRequests: async () => false,
      checkPendingPinoLogsRequests: async () => false,
      checkPendingSendImageRequests: async (_ctx: Context, chatId: number) => {
        sendImageChecks.push(chatId);
        return true;
      },
      checkPendingSendTurtleRequests: async () => false,
      isSpawnOrchestrationToolStatus: actualStreaming.isSpawnOrchestrationToolStatus,
    }));

    codexSession.sendMessage = (async (
      _message,
      _statusCallback,
      _model,
      _reasoning,
      mcpCompletionCallback
    ) => {
      await mcpCompletionCallback?.("bot-control", "send_image");
      return "ok";
    }) as typeof codexSession.sendMessage;

    const { CodexDriver } = await loadCodexDriverModule();
    const driver = new CodexDriver();

    const response = await driver.runMessage({
      message: "send the screenshot",
      source: "text",
      username: "tester",
      userId: 123,
      chatId: 789,
      ctx: {} as Context,
      statusCallback: async () => {},
    });

    expect(response).toBe("ok");
    expect(sendImageChecks).toContain(789);
  });
});
