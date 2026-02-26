import { describe, expect, it } from "bun:test";
import {
  dequeueDeferredMessage,
  enqueueDeferredMessage,
  getDeferredQueueSize,
} from "./deferred-queue";

describe("deferred queue", () => {
  it("enqueues and dequeues FIFO", () => {
    const chatId = 99101;

    enqueueDeferredMessage({
      text: "first",
      userId: 1,
      username: "u",
      chatId,
      source: "voice",
      enqueuedAt: 1000,
    });

    enqueueDeferredMessage({
      text: "second",
      userId: 1,
      username: "u",
      chatId,
      source: "voice",
      enqueuedAt: 2000,
    });

    expect(getDeferredQueueSize(chatId)).toBe(2);
    expect(dequeueDeferredMessage(chatId)?.text).toBe("first");
    expect(dequeueDeferredMessage(chatId)?.text).toBe("second");
    expect(getDeferredQueueSize(chatId)).toBe(0);
  });

  it("dedupes immediate duplicate transcripts", () => {
    const chatId = 99102;

    enqueueDeferredMessage({
      text: "same",
      userId: 1,
      username: "u",
      chatId,
      source: "voice",
      enqueuedAt: 1000,
    });

    enqueueDeferredMessage({
      text: "same",
      userId: 1,
      username: "u",
      chatId,
      source: "voice",
      enqueuedAt: 5000,
    });

    expect(getDeferredQueueSize(chatId)).toBe(1);
  });

  it("keeps max 10 queued items", () => {
    const chatId = 99103;

    for (let i = 0; i < 12; i++) {
      enqueueDeferredMessage({
        text: `msg-${i}`,
        userId: 1,
        username: "u",
        chatId,
        source: "voice",
        enqueuedAt: 10000 + i,
      });
    }

    expect(getDeferredQueueSize(chatId)).toBe(10);
    expect(dequeueDeferredMessage(chatId)?.text).toBe("msg-2");
  });
});
