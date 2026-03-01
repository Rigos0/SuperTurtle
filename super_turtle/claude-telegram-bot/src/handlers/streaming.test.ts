import { describe, expect, it } from "bun:test";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();

const { createAskUserKeyboard, isAskUserPromptMessage, checkPendingPinoLogsRequests } = await import("./streaming");
const { PINO_LOG_PATH } = await import("../logger");

async function withTempPinoLogs(lines: string[], fn: () => Promise<void>) {
  const file = Bun.file(PINO_LOG_PATH);
  let original: string | null = null;
  if (await file.exists()) {
    original = await file.text();
  }
  await Bun.write(PINO_LOG_PATH, lines.join("\n") + "\n");
  try {
    await fn();
  } finally {
    if (original === null) {
      try {
        const { unlinkSync } = await import("fs");
        unlinkSync(PINO_LOG_PATH);
      } catch {
        /* best-effort cleanup */
      }
    } else {
      await Bun.write(PINO_LOG_PATH, original);
    }
  }
}

describe("isAskUserPromptMessage()", () => {
  it("detects messages with inline keyboards", () => {
    const message = {
      reply_markup: {
        inline_keyboard: [[{ text: "Option", callback_data: "askuser:req:0" }]],
      },
    } as any;

    expect(isAskUserPromptMessage(message)).toBe(true);
  });

  it("returns false for regular messages", () => {
    expect(isAskUserPromptMessage({ text: "hello" } as any)).toBe(false);
    expect(
      isAskUserPromptMessage({ reply_markup: { inline_keyboard: [] } } as any)
    ).toBe(false);
  });
});

describe("createAskUserKeyboard()", () => {
  it("builds one row per option for two options", () => {
    const keyboard = createAskUserKeyboard("request-abc", ["Yes", "No"]);
    const inlineKeyboard = (keyboard as any).inline_keyboard;
    const rows = inlineKeyboard.filter((row: unknown[]) => row.length > 0);

    expect(rows).toEqual([
      [{ text: "Yes", callback_data: "askuser:request-abc:0" }],
      [{ text: "No", callback_data: "askuser:request-abc:1" }],
    ]);
  });

  it("builds six callback buttons with askuser:<id>:<index> data", () => {
    const options = ["One", "Two", "Three", "Four", "Five", "Six"];
    const keyboard = createAskUserKeyboard("req-6", options);
    const inlineKeyboard = (keyboard as any).inline_keyboard;
    const rows = inlineKeyboard.filter((row: unknown[]) => row.length > 0);

    expect(rows).toHaveLength(6);
    expect(rows.flat()).toHaveLength(6);

    options.forEach((option, idx) => {
      expect(rows[idx]).toEqual([
        { text: option, callback_data: `askuser:req-6:${idx}` },
      ]);
    });
  });
});

describe("checkPendingPinoLogsRequests()", () => {
  it("filters by minimum level and returns formatted entries", async () => {
    const logLines = [
      JSON.stringify({ level: 30, time: 1710000000000, module: "bot", msg: "hello" }),
      JSON.stringify({
        level: 50,
        time: 1710000005000,
        module: "claude",
        msg: "processing failed",
        err: { message: "boom" },
      }),
      JSON.stringify({ level: 40, time: 1710000010000, module: "streaming", msg: "warned" }),
    ];

    await withTempPinoLogs(logLines, async () => {
      const requestId = "pino-logs-test-error";
      const requestFile = `/tmp/pino-logs-${requestId}.json`;
      const request = {
        request_id: requestId,
        level: "error",
        limit: 50,
        status: "pending",
        chat_id: "123",
        created_at: new Date().toISOString(),
      };
      await Bun.write(requestFile, JSON.stringify(request, null, 2));

      await checkPendingPinoLogsRequests(123);

      const result = JSON.parse(await Bun.file(requestFile).text());
      expect(result.status).toBe("completed");
      expect(result.result).toContain("ERROR");
      expect(result.result).toContain("[claude]");
      expect(result.result).toContain("processing failed");
      expect(result.result).toContain("(boom)");
      expect(result.result).not.toContain("WARN");
    });
  });

  it("filters by exact levels and module", async () => {
    const logLines = [
      JSON.stringify({ level: 30, time: 1710000100000, module: "bot", msg: "hello" }),
      JSON.stringify({ level: 40, time: 1710000105000, module: "streaming", msg: "warned" }),
      JSON.stringify({ level: 50, time: 1710000110000, module: "streaming", msg: "error" }),
    ];

    await withTempPinoLogs(logLines, async () => {
      const requestId = "pino-logs-test-warn";
      const requestFile = `/tmp/pino-logs-${requestId}.json`;
      const request = {
        request_id: requestId,
        levels: ["warn"],
        module: "streaming",
        limit: 10,
        status: "pending",
        chat_id: "123",
        created_at: new Date().toISOString(),
      };
      await Bun.write(requestFile, JSON.stringify(request, null, 2));

      await checkPendingPinoLogsRequests(123);

      const result = JSON.parse(await Bun.file(requestFile).text());
      expect(result.status).toBe("completed");
      expect(result.result).toContain("WARN");
      expect(result.result).toContain("[streaming]");
      expect(result.result).toContain("warned");
      expect(result.result).not.toContain("ERROR");
    });
  });
});
