import { describe, expect, it } from "bun:test";
import { resolve } from "path";

const callbackPath = resolve(import.meta.dir, "callback.ts");
const sessionPath = resolve(import.meta.dir, "../session.ts");
const codexPath = resolve(import.meta.dir, "../codex-session.ts");
const marker = "__CALLBACK_PROBE__=";

type ProbeResult<T> = {
  exitCode: number;
  stdout: string;
  stderr: string;
  payload: T | null;
};

async function runCallbackProbe<T>(
  scriptBody: string,
  opts?: { codexEnabled?: boolean; codexCliAvailable?: boolean }
): Promise<ProbeResult<T>> {
  const env: Record<string, string> = {
    ...process.env,
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_ALLOWED_USERS: "123",
    CLAUDE_WORKING_DIR: process.cwd(),
    CODEX_ENABLED: opts?.codexEnabled === false ? "false" : "true",
    CODEX_CLI_AVAILABLE_OVERRIDE: opts?.codexCliAvailable === false ? "false" : "true",
    HOME: process.env.HOME || "/tmp",
  };

  const script = `
    const marker = ${JSON.stringify(marker)};
    const callbackPath = ${JSON.stringify(callbackPath)};
    const sessionPath = ${JSON.stringify(sessionPath)};
    const codexPath = ${JSON.stringify(codexPath)};
    ${scriptBody}
  `;

  const proc = Bun.spawn({
    cmd: ["bun", "--no-env-file", "-e", script],
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  const payloadLine = stdout
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith(marker));
  const payload = payloadLine
    ? (JSON.parse(payloadLine.slice(marker.length)) as T)
    : null;

  return { exitCode, stdout, stderr, payload };
}

describe("handleCallback Codex switching and controls", () => {
  it("switch:codex returns unavailable alert and does not switch when Codex is unavailable", async () => {
    const result = await runCallbackProbe<{
      activeDriver: string;
      startNewThreadCalls: number;
      callbackAnswers: Array<{ text?: string; show_alert?: boolean }>;
      editTexts: string[];
    }>(
      `
      const { handleCallback } = await import(callbackPath);
      const { session } = await import(sessionPath);
      const { codexSession } = await import(codexPath);

      let startNewThreadCalls = 0;
      codexSession.startNewThread = async () => {
        startNewThreadCalls += 1;
      };

      const callbackAnswers = [];
      const editTexts = [];
      session.activeDriver = "claude";

      const ctx = {
        from: { id: 123, username: "tester" },
        chat: { id: 123, type: "private" },
        callbackQuery: { data: "switch:codex" },
        answerCallbackQuery: async (payload) => {
          callbackAnswers.push(payload || {});
        },
        editMessageText: async (text) => {
          editTexts.push(String(text));
        },
      };

      await handleCallback(ctx);

      console.log(marker + JSON.stringify({
        activeDriver: session.activeDriver,
        startNewThreadCalls,
        callbackAnswers,
        editTexts,
      }));
      `,
      { codexEnabled: false, codexCliAvailable: false }
    );

    expect(result.exitCode).toBe(0);
    expect(result.payload).not.toBeNull();
    expect(result.payload?.activeDriver).toBe("claude");
    expect(result.payload?.startNewThreadCalls).toBe(0);
    expect(result.payload?.editTexts || []).toHaveLength(0);
    expect(result.payload?.callbackAnswers[0]?.show_alert).toBe(true);
    expect(result.payload?.callbackAnswers[0]?.text || "").toContain("Codex");
  });

  it("switch:codex resets sessions, starts new thread, and updates active driver when Codex is available", async () => {
    const result = await runCallbackProbe<{
      activeDriver: string;
      startNewThreadCalls: number;
      sessionKillCalls: number;
      codexKillCalls: number;
      callbackAnswers: Array<{ text?: string; show_alert?: boolean }>;
      editTexts: string[];
    }>(`
      const { handleCallback } = await import(callbackPath);
      const { session } = await import(sessionPath);
      const { codexSession } = await import(codexPath);

      let startNewThreadCalls = 0;
      let sessionKillCalls = 0;
      let codexKillCalls = 0;
      session.stopTyping = () => {};
      session.kill = async () => {
        sessionKillCalls += 1;
      };
      codexSession.kill = async () => {
        codexKillCalls += 1;
      };
      codexSession.startNewThread = async () => {
        startNewThreadCalls += 1;
      };

      const callbackAnswers = [];
      const editTexts = [];
      session.activeDriver = "claude";

      const ctx = {
        from: { id: 123, username: "tester" },
        chat: { id: 123, type: "private" },
        callbackQuery: { data: "switch:codex" },
        answerCallbackQuery: async (payload) => {
          callbackAnswers.push(payload || {});
        },
        editMessageText: async (text) => {
          editTexts.push(String(text));
        },
      };

      await handleCallback(ctx);

      console.log(marker + JSON.stringify({
        activeDriver: session.activeDriver,
        startNewThreadCalls,
        sessionKillCalls,
        codexKillCalls,
        callbackAnswers,
        editTexts,
      }));
    `);

    expect(result.exitCode).toBe(0);
    expect(result.payload).not.toBeNull();
    expect(result.payload?.activeDriver).toBe("codex");
    expect(result.payload?.startNewThreadCalls).toBe(1);
    expect(result.payload?.sessionKillCalls).toBe(1);
    expect(result.payload?.codexKillCalls).toBe(1);
    expect(result.payload?.callbackAnswers[0]?.text).toBe("Switched to Codex");
    expect(result.payload?.editTexts[0] || "").toContain("Switched to Codex");
  });

  it("codex_model callback with active session starts fresh thread and edits message", async () => {
    const result = await runCallbackProbe<{
      model: string;
      reasoningEffort: string;
      targetModel: string;
      startNewThreadArgs: Array<[string, string]>;
      callbackAnswers: Array<{ text?: string }>;
      editTexts: string[];
    }>(`
      const { handleCallback } = await import(callbackPath);
      const { codexSession, getAvailableCodexModelsLive } = await import(codexPath);

      const models = await getAvailableCodexModelsLive();
      const targetModel = models[0]?.value || "gpt-5.3-codex";
      const initialModel = models[1]?.value || targetModel;

      codexSession.model = initialModel;
      codexSession.reasoningEffort = "medium";
      Object.defineProperty(codexSession, "isActive", {
        configurable: true,
        get: () => true,
      });

      const startNewThreadArgs = [];
      codexSession.startNewThread = async (model, effort) => {
        startNewThreadArgs.push([String(model), String(effort)]);
      };

      const callbackAnswers = [];
      const editTexts = [];
      const ctx = {
        from: { id: 123, username: "tester" },
        chat: { id: 123, type: "private" },
        callbackQuery: { data: "codex_model:" + targetModel },
        answerCallbackQuery: async (payload) => {
          callbackAnswers.push(payload || {});
        },
        editMessageText: async (text) => {
          editTexts.push(String(text));
        },
      };

      await handleCallback(ctx);

      console.log(marker + JSON.stringify({
        model: codexSession.model,
        reasoningEffort: codexSession.reasoningEffort,
        targetModel,
        startNewThreadArgs,
        callbackAnswers,
        editTexts,
      }));
    `);

    expect(result.exitCode).toBe(0);
    expect(result.payload).not.toBeNull();
    expect(result.payload?.model).toBe(result.payload?.targetModel);
    expect(result.payload?.startNewThreadArgs).toEqual([
      [result.payload?.targetModel || "", "medium"],
    ]);
    expect(result.payload?.callbackAnswers[0]?.text || "").toContain("(new thread)");
    expect(result.payload?.editTexts[0] || "").toContain("<b>Codex Model:</b>");
  });

  it("codex_effort callback with active session starts fresh thread and edits message", async () => {
    const result = await runCallbackProbe<{
      model: string;
      reasoningEffort: string;
      startNewThreadArgs: Array<[string, string]>;
      callbackAnswers: Array<{ text?: string }>;
      editTexts: string[];
    }>(`
      const { handleCallback } = await import(callbackPath);
      const { codexSession, getAvailableCodexModelsLive } = await import(codexPath);

      const models = await getAvailableCodexModelsLive();
      const modelValue = models[0]?.value || "gpt-5.3-codex";

      codexSession.model = modelValue;
      codexSession.reasoningEffort = "medium";
      Object.defineProperty(codexSession, "isActive", {
        configurable: true,
        get: () => true,
      });

      const startNewThreadArgs = [];
      codexSession.startNewThread = async (model, effort) => {
        startNewThreadArgs.push([String(model), String(effort)]);
      };

      const callbackAnswers = [];
      const editTexts = [];
      const ctx = {
        from: { id: 123, username: "tester" },
        chat: { id: 123, type: "private" },
        callbackQuery: { data: "codex_effort:high" },
        answerCallbackQuery: async (payload) => {
          callbackAnswers.push(payload || {});
        },
        editMessageText: async (text) => {
          editTexts.push(String(text));
        },
      };

      await handleCallback(ctx);

      console.log(marker + JSON.stringify({
        model: codexSession.model,
        reasoningEffort: codexSession.reasoningEffort,
        startNewThreadArgs,
        callbackAnswers,
        editTexts,
      }));
    `);

    expect(result.exitCode).toBe(0);
    expect(result.payload).not.toBeNull();
    expect(result.payload?.reasoningEffort).toBe("high");
    expect(result.payload?.startNewThreadArgs).toEqual([
      [result.payload?.model || "", "high"],
    ]);
    expect(result.payload?.callbackAnswers[0]?.text || "").toContain("(new thread)");
    expect(result.payload?.editTexts[0] || "").toContain("Reasoning Effort:</b> high");
  });
});

describe("handleCallback resume_current", () => {
  it("continues the active Claude session", async () => {
    const result = await runCallbackProbe<{
      callbackAnswers: Array<{ text?: string; show_alert?: boolean }>;
      replies: string[];
      editTexts: string[];
    }>(`
      const { handleCallback } = await import(callbackPath);
      const { session } = await import(sessionPath);

      session.activeDriver = "claude";
      session.sessionId = "claude-current-123";
      session.recentMessages = [
        { role: "user", text: "hello" },
        { role: "assistant", text: "hi there" },
      ];

      const callbackAnswers = [];
      const replies = [];
      const editTexts = [];
      const ctx = {
        from: { id: 123, username: "tester" },
        chat: { id: 123, type: "private" },
        callbackQuery: { data: "resume_current" },
        answerCallbackQuery: async (payload) => {
          callbackAnswers.push(payload || {});
        },
        reply: async (text) => {
          replies.push(String(text));
        },
        editMessageText: async (text) => {
          editTexts.push(String(text));
        },
      };

      await handleCallback(ctx);

      console.log(marker + JSON.stringify({
        callbackAnswers,
        replies,
        editTexts,
      }));
    `);

    expect(result.exitCode).toBe(0);
    expect(result.payload).not.toBeNull();
    expect(result.payload?.callbackAnswers[0]?.text).toBe("Continuing current Claude session");
    expect(result.payload?.callbackAnswers[0]?.show_alert).toBeUndefined();
    expect(result.payload?.editTexts[0]).toContain("Continuing current Claude session");
    expect(result.payload?.replies[0]).toContain("📝 **Last messages:**");
  });

  it("continues the active Codex session", async () => {
    const result = await runCallbackProbe<{
      callbackAnswers: Array<{ text?: string; show_alert?: boolean }>;
      replies: string[];
      editTexts: string[];
    }>(`
      const { handleCallback } = await import(callbackPath);
      const { session } = await import(sessionPath);
      const { codexSession } = await import(codexPath);

      session.activeDriver = "codex";
      codexSession.getThreadId = () => "codex-thread-123";
      codexSession.recentMessages = [
        { role: "user", text: "continue codex" },
        { role: "assistant", text: "continuing now" },
      ];

      const callbackAnswers = [];
      const replies = [];
      const editTexts = [];
      const ctx = {
        from: { id: 123, username: "tester" },
        chat: { id: 123, type: "private" },
        callbackQuery: { data: "resume_current" },
        answerCallbackQuery: async (payload) => {
          callbackAnswers.push(payload || {});
        },
        reply: async (text) => {
          replies.push(String(text));
        },
        editMessageText: async (text) => {
          editTexts.push(String(text));
        },
      };

      await handleCallback(ctx);

      console.log(marker + JSON.stringify({
        callbackAnswers,
        replies,
        editTexts,
      }));
    `);

    expect(result.exitCode).toBe(0);
    expect(result.payload).not.toBeNull();
    expect(result.payload?.callbackAnswers[0]?.text).toBe("Continuing current Codex session");
    expect(result.payload?.callbackAnswers[0]?.show_alert).toBeUndefined();
    expect(result.payload?.editTexts[0]).toContain("Continuing current Codex session");
    expect(result.payload?.replies[0]).toContain("📝 **Last messages:**");
  });

  it("shows alert when resume_current has no active session", async () => {
    const result = await runCallbackProbe<{
      callbackAnswers: Array<{ text?: string; show_alert?: boolean }>;
      replies: string[];
      editTexts: string[];
    }>(`
      const { handleCallback } = await import(callbackPath);
      const { session } = await import(sessionPath);

      session.activeDriver = "claude";
      session.sessionId = null;

      const callbackAnswers = [];
      const replies = [];
      const editTexts = [];
      const ctx = {
        from: { id: 123, username: "tester" },
        chat: { id: 123, type: "private" },
        callbackQuery: { data: "resume_current" },
        answerCallbackQuery: async (payload) => {
          callbackAnswers.push(payload || {});
        },
        reply: async (text) => {
          replies.push(String(text));
        },
        editMessageText: async (text) => {
          editTexts.push(String(text));
        },
      };

      await handleCallback(ctx);

      console.log(marker + JSON.stringify({
        callbackAnswers,
        replies,
        editTexts,
      }));
    `);

    expect(result.exitCode).toBe(0);
    expect(result.payload).not.toBeNull();
    expect(result.payload?.callbackAnswers[0]?.show_alert).toBe(true);
    expect(result.payload?.callbackAnswers[0]?.text).toBe("No active Claude session");
    expect(result.payload?.replies).toHaveLength(0);
    expect(result.payload?.editTexts).toHaveLength(0);
  });
});
