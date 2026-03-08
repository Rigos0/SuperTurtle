import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();
process.env.CODEX_ENABLED ||= "true";
process.env.CODEX_CLI_AVAILABLE_OVERRIDE ||= "true";

const TOKEN_PREFIX = (process.env.TELEGRAM_BOT_TOKEN || "test-token").split(":")[0] || "default";
const CODEX_PREFS_FILE = `/tmp/codex-telegram-${TOKEN_PREFIX}-prefs.json`;
const CODEX_SESSION_FILE = `/tmp/codex-telegram-${TOKEN_PREFIX}-session.json`;
const originalHome = process.env.HOME;

type CodexSessionModule = typeof import("./codex-session");

async function loadCodexSessionModule(tag: string): Promise<CodexSessionModule> {
  return import(`./codex-session.ts?test=${tag}-${Date.now()}-${Math.random()}`);
}

function cleanupCodexFiles(): void {
  rmSync(CODEX_PREFS_FILE, { force: true });
  rmSync(CODEX_SESSION_FILE, { force: true });
}

beforeEach(() => {
  cleanupCodexFiles();
  const isolatedHome = join(
    tmpdir(),
    `codex-session-test-home-${Date.now()}-${Math.random().toString(16).slice(2)}`
  );
  mkdirSync(isolatedHome, { recursive: true });
  process.env.HOME = isolatedHome;
});

afterEach(() => {
  cleanupCodexFiles();
  if (typeof originalHome === "string") {
    process.env.HOME = originalHome;
  } else {
    delete process.env.HOME;
  }
  mock.restore();
});

describe("CodexSession", () => {
  it("parses Codex transcripts into conversation history and injection evidence", async () => {
    const { parseCodexTranscript } = await loadCodexSessionModule("parse-transcript");
    const transcript = [
      JSON.stringify({
        timestamp: "2026-03-07T17:00:00.000Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: "<system-instructions>\nmeta prompt text\n</system-instructions>\n\n[Current date/time: Saturday, March 7, 2026 at 06:00 PM GMT+1]\n\nHello from resume",
            },
          ],
        },
      }),
      JSON.stringify({
        timestamp: "2026-03-07T17:00:02.000Z",
        type: "response_item",
        payload: {
          type: "message",
          role: "assistant",
          content: [
            {
              type: "output_text",
              text: "Transcript assistant reply",
            },
          ],
        },
      }),
    ].join("\n");

    const result = parseCodexTranscript("transcript-session", transcript, "/tmp/transcript.jsonl");

    expect(result.messages).toEqual([
      {
        role: "user",
        text: "Hello from resume",
        timestamp: "2026-03-07T17:00:00.000Z",
      },
      {
        role: "assistant",
        text: "Transcript assistant reply",
        timestamp: "2026-03-07T17:00:02.000Z",
      },
    ]);
    expect(result.metaSharedLoaded).toBe(true);
    expect(result.datePrefixApplied).toBe(true);
    expect(result.injectedArtifacts.map((item) => item.id)).toEqual([
      "codex-bootstrap-prompt",
      "date-prefix",
    ]);
  });

  it("extracts the Codex date prefix even when system instructions are prepended", async () => {
    const { buildInjectedArtifacts } = await import("./injected-artifacts");

    const artifacts = buildInjectedArtifacts({
      source: "text",
      effectivePrompt: "<system-instructions>\nmeta prompt text\n</system-instructions>\n\n[Current date/time: Saturday, March 7, 2026 at 06:00 PM GMT+1]\n\nHello from resume",
      originalMessage: "Hello from resume",
      datePrefixApplied: true,
      metaPromptApplied: true,
      claudeMdLoaded: false,
      claudeMdText: "",
      metaPromptText: "meta prompt text",
      metaPromptArtifactId: "codex-bootstrap-prompt",
      metaPromptLabel: "Codex bootstrap prompt",
    });

    expect(artifacts.find((item) => item.id === "date-prefix")?.text).toBe(
      "[Current date/time: Saturday, March 7, 2026 at 06:00 PM GMT+1]\n\n"
    );
  });

  it("initializes SDK and persists thread/model/reasoning on new thread", async () => {
    const constructorCalls: Array<Record<string, unknown> | undefined> = [];
    const startThreadCalls: Array<Record<string, unknown> | undefined> = [];

    mock.module("@openai/codex-sdk", () => ({
      Codex: class {
        constructor(options?: Record<string, unknown>) {
          constructorCalls.push(options);
        }

        startThread(options?: Record<string, unknown>) {
          startThreadCalls.push(options);
          return {
            id: "thread-start-123",
            run: async () => ({ finalResponse: "", usage: null }),
            runStreamed: async () => ({ events: (async function* () {})() }),
          };
        }

        resumeThread() {
          throw new Error("not used");
        }
      },
    }));

    const { CodexSession } = await loadCodexSessionModule("start-new-thread");
    const codex = new CodexSession();
    await codex.startNewThread("gpt-5.2-codex", "high");

    expect(constructorCalls).toHaveLength(1);
    expect(constructorCalls[0]).toMatchObject({
      codexPathOverride: expect.any(String),
      config: { mcp_servers: expect.any(Object) },
    });

    expect(startThreadCalls).toHaveLength(1);
    expect(startThreadCalls[0]).toMatchObject({
      workingDirectory: expect.any(String),
      skipGitRepoCheck: true,
      sandboxMode: expect.any(String),
      approvalPolicy: expect.any(String),
      networkAccessEnabled: expect.any(Boolean),
      model: "gpt-5.2-codex",
      modelReasoningEffort: "high",
    });
    expect(codex.getThreadId()).toBe("thread-start-123");

    const prefs = JSON.parse(readFileSync(CODEX_PREFS_FILE, "utf-8")) as Record<string, unknown>;
    expect(prefs.threadId).toBe("thread-start-123");
    expect(prefs.model).toBe("gpt-5.2-codex");
    expect(prefs.reasoningEffort).toBe("high");

    const savedSessions = JSON.parse(readFileSync(CODEX_SESSION_FILE, "utf-8")) as {
      sessions: Array<Record<string, unknown>>;
    };
    expect(savedSessions.sessions[0]).toMatchObject({
      session_id: "thread-start-123",
      title: "Active Codex session",
    });
  });

  it("captures the real thread ID from the streamed thread.started event", async () => {
    mock.module("@openai/codex-sdk", () => ({
      Codex: class {
        startThread() {
          return {
            id: undefined,
            run: async () => ({ finalResponse: "", usage: null }),
            runStreamed: async () => ({
              events: (async function* () {
                yield { type: "thread.started", thread_id: "thread-stream-456" };
                yield {
                  type: "item.completed",
                  item: {
                    type: "agent_message",
                    id: "msg-1",
                    text: "streamed assistant reply",
                  },
                };
                yield {
                  type: "turn.completed",
                  usage: {
                    input_tokens: 10,
                    output_tokens: 20,
                  },
                };
              })(),
            }),
          };
        }

        resumeThread() {
          throw new Error("not used");
        }
      },
    }));

    const { CodexSession } = await loadCodexSessionModule("stream-thread-id");
    const codex = new CodexSession();
    const response = await codex.sendMessage("Hello from streamed thread");

    expect(response).toBe("streamed assistant reply");
    expect(codex.getThreadId()).toBe("thread-stream-456");

    const prefs = JSON.parse(readFileSync(CODEX_PREFS_FILE, "utf-8")) as Record<string, unknown>;
    expect(prefs.threadId).toBe("thread-stream-456");

    const savedSessions = JSON.parse(readFileSync(CODEX_SESSION_FILE, "utf-8")) as {
      sessions: Array<Record<string, unknown>>;
    };
    expect(savedSessions.sessions[0]).toMatchObject({
      session_id: "thread-stream-456",
      title: "Hello from streamed thread",
    });
  });

  it("loads saved preferences and uses them when resuming threads", async () => {
    writeFileSync(
      CODEX_PREFS_FILE,
      JSON.stringify({
        threadId: "saved-thread-id",
        model: "gpt-5.2-codex",
        reasoningEffort: "low",
      })
    );

    const resumeThreadCalls: Array<{
      threadId: string;
      options?: Record<string, unknown>;
    }> = [];

    mock.module("@openai/codex-sdk", () => ({
      Codex: class {
        startThread() {
          throw new Error("not used");
        }

        resumeThread(threadId: string, options?: Record<string, unknown>) {
          resumeThreadCalls.push({ threadId, options });
          return {
            id: threadId,
            run: async () => ({ finalResponse: "", usage: null }),
            runStreamed: async () => ({ events: (async function* () {})() }),
          };
        }
      },
    }));

    const { CodexSession } = await loadCodexSessionModule("resume-thread");
    const codex = new CodexSession();

    expect(codex.model).toBe("gpt-5.2-codex");
    expect(codex.reasoningEffort).toBe("low");
    expect(codex.getThreadId()).toBe("saved-thread-id");

    await codex.resumeThread("resume-thread-999");

    expect(resumeThreadCalls).toHaveLength(1);
    expect(resumeThreadCalls[0]).toEqual({
      threadId: "resume-thread-999",
      options: expect.objectContaining({
        workingDirectory: expect.any(String),
        skipGitRepoCheck: true,
        sandboxMode: expect.any(String),
        approvalPolicy: expect.any(String),
        networkAccessEnabled: expect.any(Boolean),
        model: "gpt-5.2-codex",
        modelReasoningEffort: "low",
      }),
    });
    expect(codex.getThreadId()).toBe("resume-thread-999");
    expect((codex as unknown as { systemPromptPrepended: boolean }).systemPromptPrepended).toBe(true);

    const savedSessions = JSON.parse(readFileSync(CODEX_SESSION_FILE, "utf-8")) as {
      sessions: Array<Record<string, unknown>>;
    };
    expect(savedSessions.sessions[0]).toMatchObject({
      session_id: "resume-thread-999",
    });
  });

  it("returns a formatted initialization error when SDK initialization fails", async () => {
    mock.module("@openai/codex-sdk", () => ({
      Codex: class {
        constructor() {
          throw new Error("sdk init failed");
        }
      },
    }));

    const { CodexSession } = await loadCodexSessionModule("missing-export");
    const codex = new CodexSession();

    await expect(codex.startNewThread()).rejects.toThrow("Failed to initialize Codex SDK:");
  });

  it("passes MCP servers config with cwd to ensure relative imports resolve correctly", async () => {
    const constructorCalls: Array<Record<string, unknown> | undefined> = [];

    mock.module("@openai/codex-sdk", () => ({
      Codex: class {
        constructor(options?: Record<string, unknown>) {
          constructorCalls.push(options);
        }

        startThread() {
          return {
            id: "thread-mcp-123",
            runStreamed: async () => ({ events: (async function* () {})() }),
          };
        }
      },
    }));

    const { CodexSession } = await loadCodexSessionModule("mcp-config-test");
    const codex = new CodexSession();
    await codex.startNewThread();

    expect(constructorCalls).toHaveLength(1);
    const config = constructorCalls[0] as Record<string, unknown>;
    expect(config.config).toBeDefined();

    const mcpServers = (config.config as Record<string, unknown>).mcp_servers as Record<string, unknown>;
    expect(mcpServers).toBeDefined();

    // Verify that each MCP server has a cwd option set
    // Import WORKING_DIR from the same config module that buildCodexMcpConfig() uses,
    // so the expected value always matches regardless of env var load order.
    const { WORKING_DIR } = await import("./config");
    for (const [serverName, serverConfig] of Object.entries(mcpServers)) {
      const server = serverConfig as Record<string, unknown>;
      expect(server.cwd).toBeDefined();
      expect(typeof server.cwd).toBe("string");
      expect(server.cwd).toBe(WORKING_DIR);
    }
  });

  it("hydrates resumed sessions from transcript history before saving", async () => {
    const { WORKING_DIR } = await import("./config");

    mock.module("@openai/codex-sdk", () => ({
      Codex: class {
        startThread() {
          throw new Error("not used");
        }

        resumeThread(threadId: string) {
          return {
            id: threadId,
            run: async () => ({ finalResponse: "", usage: null }),
            runStreamed: async () => ({ events: (async function* () {})() }),
          };
        }
      },
    }));

    writeFileSync(
      CODEX_SESSION_FILE,
      JSON.stringify({
        sessions: [
          {
            session_id: "resume-history-session",
            saved_at: "2026-03-07T17:00:00.000Z",
            working_dir: WORKING_DIR,
            title: "Resume history session",
          },
        ],
      })
    );

    const { CodexSession } = await loadCodexSessionModule("resume-hydration");
    const codex = new CodexSession();
    codex.getSessionTranscript = async () => ({
      sessionId: "resume-history-session",
      path: "/tmp/fake-codex-transcript.jsonl",
      messages: [
        {
          role: "user",
          text: "Older user message",
          timestamp: "2026-03-07T17:00:00.000Z",
        },
        {
          role: "assistant",
          text: "Older assistant message",
          timestamp: "2026-03-07T17:00:01.000Z",
        },
      ],
      injectedArtifacts: [],
      metaSharedLoaded: false,
      datePrefixApplied: false,
    });

    const [success] = await codex.resumeSession("resume-history-session");
    expect(success).toBe(true);
    expect(codex.recentMessages).toEqual([
      {
        role: "user",
        text: "Older user message",
        timestamp: "2026-03-07T17:00:00.000Z",
      },
      {
        role: "assistant",
        text: "Older assistant message",
        timestamp: "2026-03-07T17:00:01.000Z",
      },
    ]);

    const saved = JSON.parse(readFileSync(CODEX_SESSION_FILE, "utf-8")) as {
      sessions: Array<{ session_id: string; recentMessages?: Array<{ text: string }> }>;
    };
    expect(saved.sessions[0]?.session_id).toBe("resume-history-session");
    expect(saved.sessions[0]?.recentMessages?.map((message) => message.text)).toEqual([
      "Older user message",
      "Older assistant message",
    ]);
  });

  it("does not reapply Codex bootstrap prompt on the first turn after resume", async () => {
    let sentMessage = "";

    mock.module("@openai/codex-sdk", () => ({
      Codex: class {
        startThread() {
          throw new Error("not used");
        }

        resumeThread(threadId: string) {
          return {
            id: threadId,
            run: async () => ({ finalResponse: "", usage: null }),
            runStreamed: async (message: string) => {
              sentMessage = message;
              return {
                events: (async function* () {
                  yield {
                    type: "item.completed",
                    item: {
                      type: "agent_message",
                      id: "msg-1",
                      text: "resumed reply",
                    },
                  };
                  yield {
                    type: "turn.completed",
                    usage: {
                      input_tokens: 3,
                      output_tokens: 4,
                    },
                  };
                })(),
              };
            },
          };
        }
      },
    }));

    const { CodexSession } = await loadCodexSessionModule("resume-bootstrap-turn");
    const codex = new CodexSession();
    await codex.resumeThread("resume-thread-bootstrap");
    await codex.sendMessage("Spawn a subturtle");

    expect(sentMessage).toBe("Spawn a subturtle");
  });
});
