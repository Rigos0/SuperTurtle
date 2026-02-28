import { describe, expect, it } from "bun:test";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();

const { handleCallback } = await import("./callback");
const authorizedUserId = Number((process.env.TELEGRAM_ALLOWED_USERS || "123").split(",")[0]?.trim() || "123");

function makeCallbackCtx(callbackData: string) {
  const callbackAnswers: string[] = [];
  const ctx = {
    from: { id: authorizedUserId, username: "tester" },
    chat: { id: authorizedUserId, type: "private" },
    callbackQuery: { data: callbackData },
    answerCallbackQuery: async (payload?: { text?: string }) => {
      callbackAnswers.push(payload?.text || "");
    },
  } as any;

  return { ctx, callbackAnswers };
}

describe("callback input validation", () => {
  it("rejects askuser callbacks with unsafe request IDs", async () => {
    const { ctx, callbackAnswers } = makeCallbackCtx("askuser:../etc/passwd:0");
    await handleCallback(ctx);
    expect(callbackAnswers).toEqual(["Invalid request ID"]);
  });

  it("rejects askuser callbacks with non-numeric option index", async () => {
    const { ctx, callbackAnswers } = makeCallbackCtx("askuser:safeid:not-a-number");
    await handleCallback(ctx);
    expect(callbackAnswers).toEqual(["Invalid option"]);
  });

  it("rejects subturtle logs callback with unsafe subturtle name", async () => {
    const { ctx, callbackAnswers } = makeCallbackCtx("subturtle_logs:../../secret");
    await handleCallback(ctx);
    expect(callbackAnswers).toEqual(["Invalid SubTurtle name"]);
  });

  it("rejects subturtle stop callback with unsafe subturtle name", async () => {
    const { ctx, callbackAnswers } = makeCallbackCtx("subturtle_stop:../../secret");
    await handleCallback(ctx);
    expect(callbackAnswers).toEqual(["Invalid SubTurtle name"]);
  });

  it("accepts dotted subturtle names", async () => {
    const { ctx, callbackAnswers } = makeCallbackCtx("subturtle_logs:e2b.remote-fix");
    await handleCallback(ctx);
    expect(callbackAnswers[0]).toBe("State file not found");
  });
});
