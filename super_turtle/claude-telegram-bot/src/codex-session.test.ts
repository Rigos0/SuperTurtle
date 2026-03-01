import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();
process.env.CODEX_ENABLED ||= "true";
process.env.CODEX_CLI_AVAILABLE_OVERRIDE ||= "true";

const CODEX_PREFS_FILE = "/tmp/codex-telegram-prefs.json";
const CODEX_SESSION_FILE = "/tmp/codex-telegram-session.json";
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
});
