import { afterEach, describe, expect, it, mock } from "bun:test";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();

afterEach(() => {
  mock.restore();
});

describe("ClaudeSession stall timeout", () => {
  it("does not false-trigger during normal streaming responses", async () => {
    let capturedSignal: AbortSignal | null = null;

    mock.module("@anthropic-ai/claude-agent-sdk", () => ({
      query: ({ options }: { options?: { abortController?: AbortController } }) => {
        capturedSignal = options?.abortController?.signal ?? null;

        return {
          [Symbol.asyncIterator]: async function* () {
            yield {
              type: "assistant",
              session_id: "session-normal-123",
              message: {
                content: [{ type: "text", text: "Normal response" }],
              },
            };

            await new Promise((resolve) => setTimeout(resolve, 10));

            yield {
              type: "result",
              usage: {
                input_tokens: 10,
                output_tokens: 5,
              },
            };
          },
        };
      },
    }));

    const warnings: string[] = [];
    const originalWarn = console.warn;
    console.warn = (...args: unknown[]) => {
      warnings.push(args.map((arg) => String(arg)).join(" "));
    };

    const { ClaudeSession } = await import("./session");
    const session = new ClaudeSession();

    const statuses: Array<{ type: string; content: string; segmentId?: number }> = [];

    try {
      const response = await session.sendMessageStreaming(
        "hello",
        "tester",
        123,
        async (type, content, segmentId) => {
          statuses.push({ type, content, segmentId });
        }
      );

      expect(response).toBe("Normal response");
      expect(capturedSignal).not.toBeNull();
      expect(capturedSignal?.aborted).toBe(false);
      expect(warnings.some((entry) => entry.includes("Event stream stalled"))).toBe(false);
      expect(statuses.some((entry) => entry.type === "segment_end")).toBe(true);
      expect(statuses.some((entry) => entry.type === "done")).toBe(true);
      expect(session.lastUsage).toEqual({ input_tokens: 10, output_tokens: 5 });
    } finally {
      console.warn = originalWarn;
      await session.kill();
    }
  });
});
