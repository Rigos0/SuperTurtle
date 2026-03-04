import { afterEach, describe, expect, it } from "bun:test";
import type { Context } from "grammy";
import { readFileSync, rmSync } from "fs";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();

const originalSpawn = Bun.spawn;

const { IPC_DIR } = await import("./config");

async function cleanupAskUserFiles(): Promise<void> {
  const glob = new Bun.Glob("ask-user-*.json");
  for await (const filename of glob.scan({ cwd: IPC_DIR, absolute: false })) {
    try {
      rmSync(`${IPC_DIR}/${filename}`, { force: true });
    } catch {
      // best effort cleanup
    }
  }
}

async function loadSessionModule() {
  return import(`./session.ts?ask-user-test=${Date.now()}-${Math.random()}`);
}

afterEach(async () => {
  Bun.spawn = originalSpawn;
  await cleanupAskUserFiles();
});

describe("ClaudeSession ask_user tool routing", () => {
  it("handles ask_user calls from bot-control namespace", async () => {
    let killed = false;
    const chatId = 6769019304;
    const requestId = `ask-user-test-${Date.now()}-${Math.random()}`;
    const requestFile = `${IPC_DIR}/ask-user-${requestId}.json`;

    await Bun.write(
      requestFile,
      JSON.stringify(
        {
          request_id: requestId,
          question: "Pick one",
          options: ["A", "B"],
          status: "pending",
          chat_id: String(chatId),
          created_at: new Date().toISOString(),
        },
        null,
        2
      )
    );

    Bun.spawn = ((_cmd: unknown, _opts?: unknown) => {
      const lines = [
        JSON.stringify({
          type: "assistant",
          session_id: "session-ask-user-123",
          message: {
            content: [
              {
                type: "tool_use",
                name: "mcp__bot-control__ask_user",
                input: {
                  question: "Pick one option",
                  options: ["A", "B"],
                },
              },
            ],
          },
        }),
      ];

      const output = `${lines.join("\n")}\n`;
      const encoder = new TextEncoder();
      const encoded = encoder.encode(output);

      const stdout = new ReadableStream({
        start(controller) {
          controller.enqueue(encoded);
          controller.close();
        },
      });

      const stderr = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      return {
        stdout,
        stderr,
        pid: 99998,
        kill: () => {
          killed = true;
        },
        exited: Promise.resolve(0),
      } as unknown as ReturnType<typeof Bun.spawn>;
    }) as typeof Bun.spawn;

    const { ClaudeSession } = await loadSessionModule();
    const session = new ClaudeSession();
    const statusEvents: string[] = [];

    const ctx = {
      chat: { id: chatId, type: "private" },
      reply: async () => ({ message_id: 1 }),
    } as unknown as Context;

    const response = await session.sendMessageStreaming(
      "show me buttons",
      "tester",
      123,
      async (type: string) => {
        statusEvents.push(type);
      },
      chatId,
      ctx
    );

    const updated = JSON.parse(await Bun.file(requestFile).text());
    expect(response).toBe("[Waiting for user selection]");
    expect(killed).toBe(true);
    expect(updated.status).toBe("sent");
    expect(statusEvents).toContain("done");
  });

  it("writes chat-scoped TELEGRAM_CHAT_ID into Claude MCP config", async () => {
    Bun.spawn = ((_cmd: unknown, _opts?: unknown) => {
      const lines = [
        JSON.stringify({
          type: "assistant",
          session_id: "session-chat-id-123",
          message: {
            content: [{ type: "text", text: "ok" }],
          },
        }),
        JSON.stringify({
          type: "result",
          session_id: "session-chat-id-123",
          usage: { input_tokens: 1, output_tokens: 1 },
        }),
      ];

      const output = `${lines.join("\n")}\n`;
      const encoder = new TextEncoder();
      const encoded = encoder.encode(output);

      const stdout = new ReadableStream({
        start(controller) {
          controller.enqueue(encoded);
          controller.close();
        },
      });

      const stderr = new ReadableStream({
        start(controller) {
          controller.close();
        },
      });

      return {
        stdout,
        stderr,
        pid: 99997,
        kill: () => {},
        exited: Promise.resolve(0),
      } as unknown as ReturnType<typeof Bun.spawn>;
    }) as typeof Bun.spawn;

    const { ClaudeSession } = await loadSessionModule();
    const session = new ClaudeSession();
    const chatId = 6769019304;

    await session.sendMessageStreaming(
      "hello",
      "tester",
      123,
      async () => {},
      chatId
    );

    const mcpConfigPath = "/tmp/superturtle-test-token-mcp-config.json";
    const config = JSON.parse(readFileSync(mcpConfigPath, "utf-8")) as {
      mcpServers?: Record<string, { env?: Record<string, string> }>;
    };

    expect(config.mcpServers?.["bot-control"]?.env?.TELEGRAM_CHAT_ID).toBe(String(chatId));
    expect(config.mcpServers?.["send-turtle"]?.env?.TELEGRAM_CHAT_ID).toBe(String(chatId));
  });
});
