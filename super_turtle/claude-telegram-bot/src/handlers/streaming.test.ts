import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { mkdirSync, rmSync } from "fs";
import type { Context } from "grammy";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();

const {
  checkPendingAskUserRequests,
  checkPendingBotControlRequests,
  checkPendingPinoLogsRequests,
  checkPendingSendImageRequests,
  checkPendingSendTurtleRequests,
  cleanupToolMessages,
  clearStreamingState,
  createAskUserKeyboard,
  createStatusCallback,
  getStreamingState,
  isAskUserPromptMessage,
  isSpawnOrchestrationToolStatus,
  shouldSendToolStatusMessage,
  StreamingState,
} = await import("./streaming");
const { IPC_DIR } = await import("../config");
mkdirSync(IPC_DIR, { recursive: true });

const STREAMING_ASK_USER_PATTERN = "ask-user-streaming-*.json";
const STREAMING_PINO_LOGS_PATTERN = "pino-logs-streaming-*.json";
const STREAMING_BOT_CONTROL_PATTERN = "bot-control-streaming-*.json";

async function cleanupIpcFiles(pattern: string): Promise<void> {
  const glob = new Bun.Glob(pattern);
  for await (const filename of glob.scan({ cwd: IPC_DIR, absolute: false })) {
    try {
      const { unlinkSync } = await import("fs");
      unlinkSync(`${IPC_DIR}/${filename}`);
    } catch {
      // best effort cleanup
    }
  }
}

beforeEach(async () => {
  mock.restore();
  process.env.SUPERTURTLE_IPC_DIR = IPC_DIR;
  await cleanupIpcFiles(STREAMING_ASK_USER_PATTERN);
  await cleanupIpcFiles(STREAMING_PINO_LOGS_PATTERN);
  await cleanupIpcFiles(STREAMING_BOT_CONTROL_PATTERN);
});

afterEach(async () => {
  mock.restore();
  await cleanupIpcFiles(STREAMING_ASK_USER_PATTERN);
  await cleanupIpcFiles(STREAMING_PINO_LOGS_PATTERN);
  await cleanupIpcFiles(STREAMING_BOT_CONTROL_PATTERN);
});

async function loadStreamingModuleWithLogLines(lines: string[]) {
  const logReader = await import("../log-reader");
  mock.module("../log-reader", () => ({
    ...logReader,
    readPinoLogLines: async () => lines,
  }));

  return import(`./streaming.ts?pino-log-lines=${Date.now()}-${Math.random()}`);
}

async function loadFreshStreamingModule() {
  return import(`./streaming.ts?fresh=${Date.now()}-${Math.random()}`);
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

describe("checkPendingAskUserRequests()", () => {
  it("does not deliver pending ask-user request with missing chat_id", async () => {
    const { checkPendingAskUserRequests } = await loadFreshStreamingModule();
    const requestId = `streaming-ask-user-missing-chat-${Date.now()}`;
    const requestFile = `${IPC_DIR}/ask-user-${requestId}.json`;
    await Bun.write(
      requestFile,
      JSON.stringify({
        request_id: requestId,
        question: "Should not send",
        options: ["Yes", "No"],
        status: "pending",
        chat_id: "",
        created_at: new Date().toISOString(),
      })
    );

    const replyMock = mock(async () => ({ message_id: 1 }));
    const ctx = { reply: replyMock } as unknown as Context;
    const handled = await checkPendingAskUserRequests(ctx, 123);

    expect(handled).toBe(false);
    expect(replyMock).not.toHaveBeenCalled();
    const updated = JSON.parse(await Bun.file(requestFile).text());
    expect(updated.status).toBe("error");
    expect(String(updated.error)).toContain("Missing chat_id");
  });

  it("expires stale pending ask-user request instead of delivering it", async () => {
    const { checkPendingAskUserRequests } = await loadFreshStreamingModule();
    const requestId = `streaming-ask-user-stale-${Date.now()}`;
    const requestFile = `${IPC_DIR}/ask-user-${requestId}.json`;
    await Bun.write(
      requestFile,
      JSON.stringify({
        request_id: requestId,
        question: "Should be expired",
        options: ["A", "B"],
        status: "pending",
        chat_id: "123",
        created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      })
    );

    const replyMock = mock(async () => ({ message_id: 1 }));
    const ctx = { reply: replyMock } as unknown as Context;
    const handled = await checkPendingAskUserRequests(ctx, 123);

    expect(handled).toBe(false);
    expect(replyMock).not.toHaveBeenCalled();
    const updated = JSON.parse(await Bun.file(requestFile).text());
    expect(updated.status).toBe("expired");
    expect(String(updated.error)).toContain("expired");
  });
});

describe("checkPendingSendImageRequests()", () => {
  it("respects a custom SUPERTURTLE_IPC_DIR override for pending image requests", async () => {
    const customIpcDir = `/tmp/streaming-send-image-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const previousIpcDir = process.env.SUPERTURTLE_IPC_DIR;
    mkdirSync(customIpcDir, { recursive: true });
    process.env.SUPERTURTLE_IPC_DIR = customIpcDir;

    try {
      const { checkPendingSendImageRequests } = await loadFreshStreamingModule();
      const requestId = `streaming-send-image-${Date.now()}`;
      const requestFile = `${customIpcDir}/send-image-${requestId}.json`;
      const imagePath = `${customIpcDir}/send-image-${requestId}.png`;

      await Bun.write(imagePath, new Uint8Array([1, 2, 3, 4]));
      await Bun.write(
        requestFile,
        JSON.stringify({
          request_id: requestId,
          source: imagePath,
          caption: "Test image",
          status: "pending",
          chat_id: "123",
          created_at: new Date().toISOString(),
        })
      );

      const replyWithPhotoMock = mock(async () => ({ message_id: 1 }));
      const replyMock = mock(async () => ({ message_id: 2 }));
      const ctx = {
        replyWithPhoto: replyWithPhotoMock,
        reply: replyMock,
      } as unknown as Context;

      const handled = await checkPendingSendImageRequests(ctx, 123);

      expect(handled).toBe(true);
      expect(replyWithPhotoMock).toHaveBeenCalledTimes(1);
      expect(replyMock).not.toHaveBeenCalled();

      const updated = JSON.parse(await Bun.file(requestFile).text());
      expect(updated.status).toBe("sent");
      expect(typeof updated.sent_at).toBe("string");
    } finally {
      process.env.SUPERTURTLE_IPC_DIR = previousIpcDir || IPC_DIR;
      rmSync(customIpcDir, { recursive: true, force: true });
    }
  });
});

describe("pending media request locking", () => {
  it("prevents duplicate send_turtle delivery when pollers race on the same request", async () => {
    const { checkPendingSendTurtleRequests } = await loadFreshStreamingModule();
    const customIpcDir = `/tmp/streaming-send-turtle-lock-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const previousIpcDir = process.env.SUPERTURTLE_IPC_DIR;
    mkdirSync(customIpcDir, { recursive: true });
    process.env.SUPERTURTLE_IPC_DIR = customIpcDir;

    const originalFetch = globalThis.fetch;
    let releaseStickerSend!: () => void;
    const stickerSendStarted = new Promise<void>((resolve) => {
      releaseStickerSend = resolve;
    });

    globalThis.fetch = mock(
      async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 })
    ) as unknown as typeof fetch;

    try {
      const requestId = `streaming-send-turtle-lock-${Date.now()}`;
      const requestFile = `${customIpcDir}/send-turtle-${requestId}.json`;
      await Bun.write(
        requestFile,
        JSON.stringify({
          request_id: requestId,
          url: "https://example.com/turtle.webp",
          status: "pending",
          chat_id: "777",
          created_at: new Date().toISOString(),
        })
      );

      let stickerCalls = 0;
      const replyWithStickerMock = mock(async () => {
        stickerCalls += 1;
        if (stickerCalls === 1) {
          await stickerSendStarted;
        }
        return {
          chat: { id: 777 },
          message_id: stickerCalls,
          sticker: { file_id: "sticker-file-id" },
        };
      });

      const ctx = {
        chat: { id: 777 },
        replyWithSticker: replyWithStickerMock,
        reply: mock(async () => ({ chat: { id: 777 }, message_id: 99 })),
      } as unknown as Context;

      const first = checkPendingSendTurtleRequests(ctx, 777);
      await Promise.resolve();
      const second = checkPendingSendTurtleRequests(ctx, 777);
      releaseStickerSend();

      const [firstHandled, secondHandled] = await Promise.all([first, second]);

      expect(stickerCalls).toBe(1);
      expect([firstHandled, secondHandled].filter(Boolean)).toHaveLength(1);

      const updated = JSON.parse(await Bun.file(requestFile).text());
      expect(updated.status).toBe("sent");
    } finally {
      globalThis.fetch = originalFetch;
      process.env.SUPERTURTLE_IPC_DIR = previousIpcDir || IPC_DIR;
      rmSync(customIpcDir, { recursive: true, force: true });
    }
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

    const { checkPendingPinoLogsRequests } = await loadStreamingModuleWithLogLines(logLines);
    const requestId = "streaming-pino-logs-test-error";
    const requestFile = `${IPC_DIR}/pino-logs-${requestId}.json`;
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

  it("filters by exact levels and module", async () => {
    const logLines = [
      JSON.stringify({ level: 30, time: 1710000100000, module: "bot", msg: "hello" }),
      JSON.stringify({ level: 40, time: 1710000105000, module: "streaming", msg: "warned" }),
      JSON.stringify({ level: 50, time: 1710000110000, module: "streaming", msg: "error" }),
    ];

    const { checkPendingPinoLogsRequests } = await loadStreamingModuleWithLogLines(logLines);
    const requestId = "streaming-pino-logs-test-warn";
    const requestFile = `${IPC_DIR}/pino-logs-${requestId}.json`;
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

describe("StreamingState lifecycle", () => {
  it("getStreamingState returns undefined before registration and after clear", async () => {
    const streaming = await import(
      `./streaming.ts?lifecycle=${Date.now()}-${Math.random()}`
    );
    const chatId = 999;
    streaming.clearStreamingState(chatId);
    expect(streaming.getStreamingState(chatId)).toBeUndefined();

    const state = new streaming.StreamingState();
    const ctx = { chat: { id: chatId } } as unknown as Context;
    streaming.createStatusCallback(ctx, state);

    expect(streaming.getStreamingState(chatId)).toBe(state);
    streaming.clearStreamingState(chatId);
    expect(streaming.getStreamingState(chatId)).toBeUndefined();
  });
});

describe("cleanupToolMessages()", () => {
  it("deletes tool messages from Telegram via ctx.api.deleteMessage", async () => {
    const state = new StreamingState();
    const deleteMessageMock = mock(async () => {});
    const chatId = 77;

    state.toolMessages = [
      { chat: { id: chatId }, message_id: 1001 } as any,
      { chat: { id: chatId }, message_id: 1002 } as any,
    ];

    const ctx = { api: { deleteMessage: deleteMessageMock } } as unknown as Context;

    await cleanupToolMessages(ctx, state);

    expect(deleteMessageMock).toHaveBeenCalledTimes(2);
    expect(deleteMessageMock).toHaveBeenCalledWith(chatId, 1001);
    expect(deleteMessageMock).toHaveBeenCalledWith(chatId, 1002);
  });

  it("skips deletion for ask-user prompt messages with inline keyboards", async () => {
    const state = new StreamingState();
    const deleteMessageMock = mock(async () => {});
    const chatId = 77;

    state.toolMessages = [
      { chat: { id: chatId }, message_id: 2001 } as any,
      {
        chat: { id: chatId },
        message_id: 2002,
        reply_markup: {
          inline_keyboard: [[{ text: "Option", callback_data: "askuser:req:0" }]],
        },
      } as any,
      { chat: { id: chatId }, message_id: 2003 } as any,
    ];

    const ctx = { api: { deleteMessage: deleteMessageMock } } as unknown as Context;

    await cleanupToolMessages(ctx, state);

    expect(deleteMessageMock).toHaveBeenCalledTimes(2);
    expect(deleteMessageMock).toHaveBeenCalledWith(chatId, 2001);
    expect(deleteMessageMock).toHaveBeenCalledWith(chatId, 2003);
    expect(deleteMessageMock).not.toHaveBeenCalledWith(chatId, 2002);
  });

  it("suppresses benign deleteMessage errors and still clears tool messages", async () => {
    const state = new StreamingState();
    const chatId = 77;
    state.toolMessages = [
      { chat: { id: chatId }, message_id: 3001 } as any,
    ];

    const deleteMessageMock = mock(async () => {
      throw new Error("400: Bad Request: message to delete not found");
    });
    const ctx = { api: { deleteMessage: deleteMessageMock } } as unknown as Context;

    await cleanupToolMessages(ctx, state);

    expect(deleteMessageMock).toHaveBeenCalledTimes(1);
    expect(state.toolMessages.length).toBe(0);
  });
});

describe("tool status visibility", () => {
  it("hides routine tool statuses in quiet mode", () => {
    expect(shouldSendToolStatusMessage("<code>git status</code>", false)).toBe(false);
    expect(shouldSendToolStatusMessage("▶️ <code>npm test</code>", false)).toBe(false);
  });

  it("still shows failure-like tool statuses in quiet mode", () => {
    expect(shouldSendToolStatusMessage("Error: command failed", false)).toBe(true);
    expect(shouldSendToolStatusMessage("BLOCKED: rm target outside allowed paths", false)).toBe(true);
    expect(shouldSendToolStatusMessage("Access denied: /etc/passwd", false)).toBe(true);
    expect(shouldSendToolStatusMessage("🔧 mcp: tool (failed: boom)", false)).toBe(true);
  });

  it("still detects spawn orchestration from hidden tool statuses", () => {
    expect(isSpawnOrchestrationToolStatus("▶️ <code>subturtle/ctl spawn worker-a</code>")).toBe(true);
    expect(isSpawnOrchestrationToolStatus("Spawn SubTurtle worker-a")).toBe(true);
    expect(isSpawnOrchestrationToolStatus("<code>git status</code>")).toBe(false);
  });

  it("can explicitly allow routine tool statuses for debug mode", () => {
    expect(shouldSendToolStatusMessage("<code>git status</code>", true)).toBe(true);
    expect(shouldSendToolStatusMessage("<code>git status</code>", false)).toBe(false);
  });
});

describe("bot-control dynamic import", () => {
  it("imports commands.ts via executeBotControlAction without throwing", async () => {
    const { checkPendingBotControlRequests } = await loadFreshStreamingModule();
    const originalSpawnSync = Bun.spawnSync;
    Bun.spawnSync = ((_cmd: unknown, _opts?: unknown) => {
      return {
        stdout: Buffer.from(""),
        stderr: Buffer.from(""),
        success: false,
        exitCode: 1,
      } as ReturnType<typeof Bun.spawnSync>;
    }) as typeof Bun.spawnSync;

    const chatId = 12345;
    const requestId = `streaming-bot-control-test-${Date.now()}-${Math.random()}`;
    const requestFile = `${IPC_DIR}/bot-control-${requestId}.json`;
    const request = {
      request_id: requestId,
      action: "usage",
      params: {},
      status: "pending",
      chat_id: String(chatId),
      created_at: new Date().toISOString(),
    };

    try {
      await Bun.write(requestFile, JSON.stringify(request, null, 2));
      const handled = await checkPendingBotControlRequests({} as any, chatId);
      expect(handled).toBe(true);

      const result = JSON.parse(await Bun.file(requestFile).text());
      expect(result.status).toBe("completed");
      expect(result.result).toContain("Failed to fetch usage data");
    } finally {
      Bun.spawnSync = originalSpawnSync;
      try {
        const { unlinkSync } = await import("fs");
        unlinkSync(requestFile);
      } catch {
        /* best-effort cleanup */
      }
    }
  });
});

describe("streaming notifications", () => {
  it("keeps interim streamed replies silent and promotes the final segment as the notifying message", async () => {
    const { StreamingState, createStatusCallback } = await loadFreshStreamingModule();
    const replyCalls: Array<{ text: string; extra?: Record<string, unknown> }> = [];
    const deleteMessageMock = mock(async () => {});
    let nextMessageId = 1;

    const ctx = {
      chat: { id: 123 },
      reply: mock(async (text: string, extra?: Record<string, unknown>) => {
        replyCalls.push({ text, extra });
        return {
          chat: { id: 123 },
          message_id: nextMessageId++,
        };
      }),
      api: {
        editMessageText: mock(async () => {}),
        deleteMessage: deleteMessageMock,
      },
    } as unknown as Context;

    const state = new StreamingState();
    const statusCallback = createStatusCallback(ctx, state);

    await statusCallback("text", "Hello from Super Turtle", 0);
    await statusCallback("segment_end", "Hello from Super Turtle", 0);
    await statusCallback("done", "");

    expect(replyCalls).toHaveLength(2);
    expect(replyCalls[0]?.extra?.disable_notification).toBe(true);
    expect(replyCalls[1]?.extra?.disable_notification).toBeUndefined();
    expect(deleteMessageMock).toHaveBeenCalledTimes(1);
    expect(deleteMessageMock).toHaveBeenCalledWith(123, 1);
  });

  it("sends thinking/tool progress messages with push notifications disabled", async () => {
    const { StreamingState, createStatusCallback } = await loadFreshStreamingModule();
    const replyCalls: Array<{ text: string; extra?: Record<string, unknown> }> = [];

    const ctx = {
      chat: { id: 456 },
      reply: mock(async (text: string, extra?: Record<string, unknown>) => {
        replyCalls.push({ text, extra });
        return {
          chat: { id: 456 },
          message_id: replyCalls.length,
        };
      }),
      api: {
        deleteMessage: mock(async () => {}),
        editMessageText: mock(async () => {}),
      },
    } as unknown as Context;

    const state = new StreamingState();
    const statusCallback = createStatusCallback(ctx, state, { showToolStatus: true });

    await statusCallback("thinking", "Planning the answer");
    await statusCallback("tool", "Error: command failed");

    expect(replyCalls).toHaveLength(2);
    expect(replyCalls.every((call) => call.extra?.disable_notification === true)).toBe(true);
  });

  it("keeps the final text reply as the notifying message when an image is sent later", async () => {
    const {
      checkPendingSendImageRequests,
      clearStreamingState,
      createStatusCallback,
      StreamingState,
    } = await loadFreshStreamingModule();
    const customIpcDir = `/tmp/streaming-text-wins-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const previousIpcDir = process.env.SUPERTURTLE_IPC_DIR;
    mkdirSync(customIpcDir, { recursive: true });
    process.env.SUPERTURTLE_IPC_DIR = customIpcDir;

    try {
      const requestId = `streaming-send-image-text-wins-${Date.now()}`;
      const requestFile = `${customIpcDir}/send-image-${requestId}.json`;
      const deleteMessageMock = mock(async () => {});
      let nextReplyMessageId = 1;
      const replyMock = mock(async (text: string, extra?: Record<string, unknown>) => ({
        chat: { id: 123 },
        message_id: nextReplyMessageId++,
        text,
        extra,
      }));
      const replyWithPhotoMock = mock(async () => ({
        chat: { id: 123 },
        message_id: 99,
        photo: [{ file_id: "photo-file-id" }],
      }));

      await Bun.write(
        requestFile,
        JSON.stringify({
          request_id: requestId,
          source: "https://example.com/final-image.png",
          caption: "Late image",
          status: "pending",
          chat_id: "123",
          created_at: new Date().toISOString(),
        })
      );

      const ctx = {
        chat: { id: 123 },
        reply: replyMock,
        replyWithPhoto: replyWithPhotoMock,
        api: {
          deleteMessage: deleteMessageMock,
          editMessageText: mock(async () => {}),
        },
      } as unknown as Context;

      const state = new StreamingState();
      const statusCallback = createStatusCallback(ctx, state);

      await statusCallback("segment_end", "Hello from Super Turtle", 0);
      expect(state.hasTextSegmentOutput).toBe(true);

      const handled = await checkPendingSendImageRequests(ctx, 123);
      expect(handled).toBe(true);
      expect(replyWithPhotoMock).toHaveBeenCalledTimes(1);
      expect(replyWithPhotoMock.mock.calls[0]?.[1]).toMatchObject({
        caption: "Late image",
        disable_notification: true,
      });
      expect(state.lastNotifiableOutput?.messages[0]?.message_id).toBe(1);

      await statusCallback("done", "");

      expect(replyMock).toHaveBeenCalledTimes(2);
      expect(replyMock.mock.calls[0]?.[0]).toBe("Hello from Super Turtle");
      expect(replyMock.mock.calls[0]?.[1]).toMatchObject({
        disable_notification: true,
        parse_mode: "HTML",
      });
      expect(replyMock.mock.calls[1]?.[0]).toBe("Hello from Super Turtle");
      expect(replyMock.mock.calls[1]?.[1]).toMatchObject({
        parse_mode: "HTML",
      });
      expect(replyMock.mock.calls[1]?.[1]?.disable_notification).toBeUndefined();
      expect(deleteMessageMock).toHaveBeenCalledTimes(1);
      expect(deleteMessageMock).toHaveBeenCalledWith(123, 1);
      expect(deleteMessageMock).not.toHaveBeenCalledWith(123, 99);
    } finally {
      process.env.SUPERTURTLE_IPC_DIR = previousIpcDir || IPC_DIR;
      rmSync(customIpcDir, { recursive: true, force: true });
      clearStreamingState(123);
    }
  });

  it("promotes a final image reply as the notifying message", async () => {
    const {
      checkPendingSendImageRequests,
      clearStreamingState,
      createStatusCallback,
      StreamingState,
    } = await loadFreshStreamingModule();
    const customIpcDir = `/tmp/streaming-image-notify-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const previousIpcDir = process.env.SUPERTURTLE_IPC_DIR;
    mkdirSync(customIpcDir, { recursive: true });
    process.env.SUPERTURTLE_IPC_DIR = customIpcDir;

    try {
      const requestId = `streaming-send-image-notify-${Date.now()}`;
      const requestFile = `${customIpcDir}/send-image-${requestId}.json`;
      const deleteMessageMock = mock(async () => {});
      const replyMock = mock(async (text: string, extra?: Record<string, unknown>) => ({
        chat: { id: 123 },
        message_id: extra?.disable_notification === true ? 3 : 4,
        text,
      }));
      const replyWithPhotoMock = mock(
        async (_source: unknown, extra?: Record<string, unknown>) => ({
          chat: { id: 123 },
          message_id: 1,
          photo: [{ file_id: "photo-file-id" }],
        })
      );

      await Bun.write(
        requestFile,
        JSON.stringify({
          request_id: requestId,
          source: "https://example.com/test.png",
          caption: "Final image",
          status: "pending",
          chat_id: "123",
          created_at: new Date().toISOString(),
        })
      );

      const ctx = {
        chat: { id: 123 },
        reply: replyMock,
        replyWithPhoto: replyWithPhotoMock,
        api: {
          deleteMessage: deleteMessageMock,
          editMessageText: mock(async () => {}),
        },
      } as unknown as Context;

      const state = new StreamingState();
      const statusCallback = createStatusCallback(ctx, state);

      const handled = await checkPendingSendImageRequests(ctx, 123);
      expect(handled).toBe(true);
      expect(state.lastNotifiableOutput?.messages[0]?.message_id).toBe(1);
      expect(replyWithPhotoMock).toHaveBeenCalledTimes(1);
      expect(replyWithPhotoMock.mock.calls[0]?.[1]).toMatchObject({
        caption: "Final image",
        disable_notification: true,
      });

      await statusCallback("done", "");

      expect(deleteMessageMock).not.toHaveBeenCalledWith(123, 1);
      expect(replyWithPhotoMock).toHaveBeenCalledTimes(1);
      expect(replyMock).toHaveBeenCalledTimes(1);
      expect(replyMock.mock.calls[0]?.[0]).toBe("🖼️ Final image");
      expect(replyMock.mock.calls[0]?.[1]).toBeUndefined();
    } finally {
      process.env.SUPERTURTLE_IPC_DIR = previousIpcDir || IPC_DIR;
      rmSync(customIpcDir, { recursive: true, force: true });
      clearStreamingState(123);
    }
  });

  it("promotes a final sticker reply as the notifying message", async () => {
    const {
      checkPendingSendTurtleRequests,
      clearStreamingState,
      createStatusCallback,
      StreamingState,
    } = await loadFreshStreamingModule();
    const customIpcDir = `/tmp/streaming-sticker-notify-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const previousIpcDir = process.env.SUPERTURTLE_IPC_DIR;
    mkdirSync(customIpcDir, { recursive: true });
    process.env.SUPERTURTLE_IPC_DIR = customIpcDir;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(
      async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 })
    ) as unknown as typeof fetch;

    try {
      const requestId = `streaming-send-turtle-notify-${Date.now()}`;
      const requestFile = `${customIpcDir}/send-turtle-${requestId}.json`;
      const deleteMessageMock = mock(async () => {});
      const replyMock = mock(async (text: string, extra?: Record<string, unknown>) => ({
        chat: { id: 321 },
        message_id: extra?.disable_notification === true ? 13 : 14,
        text,
      }));
      const replyWithStickerMock = mock(
        async (_source: unknown, extra?: Record<string, unknown>) => ({
          chat: { id: 321 },
          message_id: 11,
          sticker: { file_id: "sticker-file-id" },
        })
      );

      await Bun.write(
        requestFile,
        JSON.stringify({
          request_id: requestId,
          url: "https://example.com/turtle.webp",
          status: "pending",
          chat_id: "321",
          created_at: new Date().toISOString(),
        })
      );

      const ctx = {
        chat: { id: 321 },
        reply: replyMock,
        replyWithSticker: replyWithStickerMock,
        api: {
          deleteMessage: deleteMessageMock,
          editMessageText: mock(async () => {}),
        },
      } as unknown as Context;

      const state = new StreamingState();
      const statusCallback = createStatusCallback(ctx, state);

      const handled = await checkPendingSendTurtleRequests(ctx, 321);
      expect(handled).toBe(true);
      expect(replyWithStickerMock).toHaveBeenCalledTimes(1);
      expect(replyWithStickerMock.mock.calls[0]?.[1]).toMatchObject({
        disable_notification: true,
      });

      await statusCallback("done", "");

      expect(deleteMessageMock).not.toHaveBeenCalledWith(321, 11);
      expect(replyWithStickerMock).toHaveBeenCalledTimes(1);
      expect(replyMock).toHaveBeenCalledTimes(1);
      expect(replyMock.mock.calls[0]?.[0]).toBe("🐢 Turtle sent.");
      expect(replyMock.mock.calls[0]?.[1]).toBeUndefined();
    } finally {
      globalThis.fetch = originalFetch;
      process.env.SUPERTURTLE_IPC_DIR = previousIpcDir || IPC_DIR;
      rmSync(customIpcDir, { recursive: true, force: true });
      clearStreamingState(321);
    }
  });
});
