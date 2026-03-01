import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import type { Context } from "grammy";
import { session } from "./session";

type DeferredQueueModule = typeof import("./deferred-queue");

let isAnyDriverRunningMock: ReturnType<typeof mock>;
let runMessageWithActiveDriverMock: ReturnType<typeof mock>;
let auditLogMock: ReturnType<typeof mock>;
let startTypingIndicatorMock: ReturnType<typeof mock>;
let createStatusCallbackMock: ReturnType<typeof mock>;
let startProcessingMock: ReturnType<typeof mock>;
let typingStopMock: ReturnType<typeof mock>;

const originalSessionTypingController = session.typingController;
const originalSessionStartProcessing = session.startProcessing;

async function loadDeferredQueueModule(): Promise<DeferredQueueModule> {
  return import(`./deferred-queue.ts?drain-test=${Date.now()}-${Math.random()}`);
}

function makeCtx() {
  const replies: string[] = [];
  const ctx = {
    reply: async (text: string) => {
      replies.push(text);
    },
  } as unknown as Context;

  return { ctx, replies };
}

beforeEach(async () => {
  typingStopMock = mock(() => {});
  const actualImportSuffix = `${Date.now()}-${Math.random()}`;
  const actualDriverRouting = await import(
    `./handlers/driver-routing.ts?actual=${actualImportSuffix}`
  );
  const actualUtils = await import(`./utils.ts?actual=${actualImportSuffix}`);
  const actualStreaming = await import(
    `./handlers/streaming.ts?actual=${actualImportSuffix}`
  );

  isAnyDriverRunningMock = mock(() => false);
  runMessageWithActiveDriverMock = mock(async () => "queued response");
  auditLogMock = mock(async () => {});
  createStatusCallbackMock = mock(() => async () => {});
  startTypingIndicatorMock = mock(() => ({ stop: typingStopMock }));
  startProcessingMock = mock(() => () => {});

  session.typingController = null;
  session.startProcessing = startProcessingMock as unknown as typeof session.startProcessing;

  mock.module("./handlers/driver-routing", () => ({
    ...actualDriverRouting,
    isAnyDriverRunning: () => isAnyDriverRunningMock(),
    runMessageWithActiveDriver: (input: unknown) => runMessageWithActiveDriverMock(input),
  }));

  mock.module("./utils", () => ({
    ...actualUtils,
    auditLog: (...args: unknown[]) => auditLogMock(...args),
    startTypingIndicator: (ctx: Context) => startTypingIndicatorMock(ctx),
  }));

  mock.module("./handlers/streaming", () => ({
    ...actualStreaming,
    StreamingState: class StreamingState {},
    createStatusCallback: (ctx: Context, state: unknown) =>
      createStatusCallbackMock(ctx, state),
  }));
});

afterEach(() => {
  session.typingController = originalSessionTypingController;
  session.startProcessing = originalSessionStartProcessing;
  mock.restore();
});

describe("drainDeferredQueue", () => {
  it("does not drain when a driver is already running", async () => {
    isAnyDriverRunningMock = mock(() => true);

    const deferredQueue = await loadDeferredQueueModule();
    const { ctx } = makeCtx();
    const chatId = 31001;

    deferredQueue.enqueueDeferredMessage({
      text: "first",
      userId: 1,
      username: "u",
      chatId,
      source: "voice",
      enqueuedAt: 1000,
    });

    await deferredQueue.drainDeferredQueue(ctx, chatId);

    expect(runMessageWithActiveDriverMock).not.toHaveBeenCalled();
    expect(deferredQueue.getDeferredQueueSize(chatId)).toBe(1);
  });

  it("drains queued voice messages and audits processed items", async () => {
    const runningStates = [false, false, true];
    isAnyDriverRunningMock = mock(() => runningStates.shift() ?? true);

    const deferredQueue = await loadDeferredQueueModule();
    const { ctx } = makeCtx();
    const chatId = 31002;

    deferredQueue.enqueueDeferredMessage({
      text: "voice one",
      userId: 42,
      username: "queue-user",
      chatId,
      source: "voice",
      enqueuedAt: 1000,
    });

    deferredQueue.enqueueDeferredMessage({
      text: "voice two",
      userId: 42,
      username: "queue-user",
      chatId,
      source: "voice",
      enqueuedAt: 2000,
    });

    await deferredQueue.drainDeferredQueue(ctx, chatId);

    expect(runMessageWithActiveDriverMock).toHaveBeenCalledTimes(1);
    expect(runMessageWithActiveDriverMock.mock.calls[0]?.[0]).toMatchObject({
      message: "voice one",
      userId: 42,
      username: "queue-user",
      chatId,
      ctx,
    });
    expect(auditLogMock).toHaveBeenCalledWith(
      42,
      "queue-user",
      "VOICE_QUEUED",
      "voice one",
      "queued response"
    );
    expect(deferredQueue.getDeferredQueueSize(chatId)).toBe(1);
    expect(typingStopMock).toHaveBeenCalledTimes(1);
  });

  it("replies once on non-cancel error and stops draining", async () => {
    runMessageWithActiveDriverMock = mock(async () => {
      throw new Error("boom");
    });

    const deferredQueue = await loadDeferredQueueModule();
    const { ctx, replies } = makeCtx();
    const chatId = 31003;

    deferredQueue.enqueueDeferredMessage({
      text: "first",
      userId: 99,
      username: "err-user",
      chatId,
      source: "voice",
      enqueuedAt: 1000,
    });

    deferredQueue.enqueueDeferredMessage({
      text: "second",
      userId: 99,
      username: "err-user",
      chatId,
      source: "voice",
      enqueuedAt: 2000,
    });

    await deferredQueue.drainDeferredQueue(ctx, chatId);

    expect(runMessageWithActiveDriverMock).toHaveBeenCalledTimes(1);
    expect(auditLogMock).not.toHaveBeenCalled();
    expect(replies).toHaveLength(1);
    expect(replies[0]).toContain("❌ Error: Error: boom");
    expect(deferredQueue.getDeferredQueueSize(chatId)).toBe(1);
  });
});
