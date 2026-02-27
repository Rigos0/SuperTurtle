import { describe, expect, it } from "bun:test";
import { resolve } from "path";

type RetryProbeMode =
  | "tool-before-crash"
  | "plain-crash"
  | "tool-before-stall"
  | "spawn-tool-before-stall"
  | "plain-stall";

type RetryProbePayload = {
  attempts: number;
  replies: string[];
  messages: string[];
};

type RetryProbeResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  payload: RetryProbePayload | null;
};

const textHandlerPath = resolve(import.meta.dir, "text.ts");
const sessionPath = resolve(import.meta.dir, "../session.ts");
const marker = "__HANDLE_TEXT_RETRY_PROBE__=";

async function probeRetry(mode: RetryProbeMode): Promise<RetryProbeResult> {
  const env: Record<string, string> = {
    ...process.env,
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_ALLOWED_USERS: "123",
    CLAUDE_WORKING_DIR: process.cwd(),
    HOME: process.env.HOME || "/tmp",
  };

  const script = `
    const marker = ${JSON.stringify(marker)};
    const textHandlerPath = ${JSON.stringify(textHandlerPath)};
    const sessionPath = ${JSON.stringify(sessionPath)};

    const { handleText } = await import(textHandlerPath);
    const { session } = await import(sessionPath);
    session.activeDriver = "claude";

    const replies = [];
    const messages = [];
    const chat = { id: 123, type: "private" };
    let attempts = 0;

    const ctx = {
      from: { id: 123, username: "tester", is_bot: false, first_name: "Tester" },
      chat,
      message: {
        text: "spawn subturtles",
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat,
      },
      reply: async (text) => {
        replies.push(String(text));
        return {
          message_id: replies.length,
          chat,
          text,
        };
      },
      replyWithChatAction: async () => {},
      api: {
        editMessageText: async () => {},
        deleteMessage: async () => {},
      },
    };

    const original = session.sendMessageStreaming;
    session.sendMessageStreaming = async (_message, _username, _userId, statusCallback) => {
      attempts += 1;
      messages.push(String(_message));

      if (${JSON.stringify(mode)} === "tool-before-crash" && attempts === 1) {
        await statusCallback("tool", "Tool: spawn");
        throw new Error("process exited with code 1");
      }

      if (${JSON.stringify(mode)} === "plain-crash" && attempts === 1) {
        throw new Error("process exited with code 1");
      }

      if (${JSON.stringify(mode)} === "tool-before-stall" && attempts === 1) {
        await statusCallback("tool", "▶️ <code>git status</code>");
        throw new Error("Event stream stalled for 120000ms before completion");
      }

      if (${JSON.stringify(mode)} === "spawn-tool-before-stall" && attempts === 1) {
        await statusCallback("tool", "▶️ <code>./super_turtle/subturtle/ctl spawn web-ui --prompt 'x'</code>");
        throw new Error("Event stream stalled for 120000ms before completion");
      }

      if (${JSON.stringify(mode)} === "plain-stall" && attempts === 1) {
        throw new Error("Event stream stalled for 120000ms before completion");
      }

      await statusCallback("text", "Retry succeeded", 0);
      await statusCallback("segment_end", "Retry succeeded", 0);
      await statusCallback("done", "");
      return "Retry succeeded";
    };

    try {
      await handleText(ctx);
    } finally {
      session.sendMessageStreaming = original;
    }

    const payload = { attempts, replies, messages };
    console.log(marker + JSON.stringify(payload));
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
    ? (JSON.parse(payloadLine.slice(marker.length)) as RetryProbePayload)
    : null;

  return { exitCode, stdout, stderr, payload };
}

describe("handleText crash retry gating", () => {
  it("does not retry crash errors after tool execution", async () => {
    const result = await probeRetry("tool-before-crash");
    if (result.exitCode !== 0) {
      throw new Error(
        `Tool-before-crash probe failed:\n${result.stderr || result.stdout}`
      );
    }

    expect(result.payload).not.toBeNull();
    expect(result.payload?.attempts).toBe(1);
    expect(
      result.payload?.replies.some((entry) =>
        entry.includes("retrying")
      )
    ).toBe(false);
  });

  it("still retries crash errors when no tools ran", async () => {
    const result = await probeRetry("plain-crash");
    if (result.exitCode !== 0) {
      throw new Error(`Plain-crash probe failed:\n${result.stderr || result.stdout}`);
    }

    expect(result.payload).not.toBeNull();
    expect(result.payload?.attempts).toBe(2);
    expect(
      result.payload?.replies.some((entry) =>
        entry.includes("retrying")
      )
    ).toBe(true);
  });

  it("retries stalled runs after tool execution with a recovery prompt", async () => {
    const result = await probeRetry("tool-before-stall");
    if (result.exitCode !== 0) {
      throw new Error(`Tool-before-stall probe failed:\n${result.stderr || result.stdout}`);
    }

    expect(result.payload).not.toBeNull();
    expect(result.payload?.attempts).toBe(2);
    expect(
      result.payload?.replies.some((entry) =>
        entry.includes("stream stalled mid-task")
      )
    ).toBe(true);
    expect(result.payload?.messages.length).toBe(2);
    expect(result.payload?.messages[1]?.includes("Do not blindly repeat side-effecting operations")).toBe(true);
  });

  it("does not retry stalled runs after spawn orchestration tool activity", async () => {
    const result = await probeRetry("spawn-tool-before-stall");
    if (result.exitCode !== 0) {
      throw new Error(`Spawn-tool-before-stall probe failed:\n${result.stderr || result.stdout}`);
    }

    expect(result.payload).not.toBeNull();
    expect(result.payload?.attempts).toBe(1);
    expect(
      result.payload?.replies.some((entry) =>
        entry.includes("stalled after spawn orchestration")
      )
    ).toBe(true);
  });

  it("retries stalled runs without tool execution", async () => {
    const result = await probeRetry("plain-stall");
    if (result.exitCode !== 0) {
      throw new Error(`Plain-stall probe failed:\n${result.stderr || result.stdout}`);
    }

    expect(result.payload).not.toBeNull();
    expect(result.payload?.attempts).toBe(2);
    expect(
      result.payload?.replies.some((entry) =>
        entry.includes("stream stalled, retrying")
      )
    ).toBe(true);
  });
});
