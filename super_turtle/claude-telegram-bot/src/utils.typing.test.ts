import { afterEach, describe, expect, it, mock } from "bun:test";
import type { Context } from "grammy";
import { startTypingIndicator } from "./utils";

describe("startTypingIndicator", () => {
  const originalSetTimeout = globalThis.setTimeout;
  const originalClearTimeout = globalThis.clearTimeout;

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout;
    globalThis.clearTimeout = originalClearTimeout;
  });

  it("cancels the pending repeat timer when stopped", async () => {
    const scheduled = new Map<symbol, () => void>();
    const cleared = new Set<symbol>();
    const setTimeoutMock = mock((callback: (...args: never[]) => void) => {
      const id = Symbol("typing-timeout");
      scheduled.set(id, () => callback());
      return id as unknown as ReturnType<typeof setTimeout>;
    });
    const clearTimeoutMock = mock((id?: ReturnType<typeof setTimeout>) => {
      if (!id) return;
      cleared.add(id as unknown as symbol);
      scheduled.delete(id as unknown as symbol);
    });
    globalThis.setTimeout = setTimeoutMock as unknown as typeof setTimeout;
    globalThis.clearTimeout = clearTimeoutMock as unknown as typeof clearTimeout;

    const ctx = {
      replyWithChatAction: mock(async () => {}),
    } as unknown as Context;

    const controller = startTypingIndicator(ctx);
    await Promise.resolve();

    expect(ctx.replyWithChatAction).toHaveBeenCalledTimes(1);
    expect(setTimeoutMock).toHaveBeenCalledTimes(1);
    expect(scheduled.size).toBe(1);

    const pendingTimer = Array.from(scheduled.keys())[0];
    expect(pendingTimer).toBeDefined();
    if (!pendingTimer) {
      throw new Error("Expected pending typing timer");
    }
    controller.stop();

    expect(clearTimeoutMock).toHaveBeenCalledTimes(1);
    expect(cleared.has(pendingTimer)).toBe(true);
    expect(scheduled.size).toBe(0);
  });
});
