import { afterEach, describe, expect, it } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { resolve } from "path";
import { codexSession } from "../codex-session";
import { getAvailableModels, session } from "../session";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();
process.env.CODEX_ENABLED = "false";

const { ALLOWED_USERS } = await import("../config");

const {
  getCommandLines,
  formatModelInfo,
  parseClaudeBacklogItems,
  parseClaudeStateSummary,
  formatBacklogSummary,
  parseCtlListOutput,
  readMainLoopLogTail,
  MAIN_LOOP_LOG_PATH,
  handleNew,
  handleStatus,
  handleCron,
  handleModel,
  handlePinologs,
} = await import("./commands");

type ReplyRecord = {
  text: string;
  extra?: { parse_mode?: string; reply_markup?: unknown };
};

function mockContext(messageText: string): {
  ctx: {
    from: { id: number };
    message: { text: string };
    reply: (text: string, extra?: { parse_mode?: string; reply_markup?: unknown }) => Promise<void>;
  };
  replies: ReplyRecord[];
} {
  const replies: ReplyRecord[] = [];
  const authorizedUserId = ALLOWED_USERS[0] ?? Number((process.env.TELEGRAM_ALLOWED_USERS || "123").split(",")[0]?.trim() || "123");
  return {
    ctx: {
      from: { id: authorizedUserId },
      message: { text: messageText },
      reply: async (text: string, extra?: { parse_mode?: string; reply_markup?: unknown }) => {
        replies.push({ text, extra });
      },
    },
    replies,
  };
}

function mockClaudeCredentialLookupFailure(): () => void {
  const originalSpawnSync = Bun.spawnSync;

  Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
    const parts = Array.isArray(cmd) ? cmd.map((part) => String(part)) : [String(cmd)];
    if (parts[0] === "security" && parts[1] === "find-generic-password") {
      return {
        stdout: Buffer.from(""),
        stderr: Buffer.from("mocked keychain miss"),
        success: false,
        exitCode: 1,
      } as ReturnType<typeof Bun.spawnSync>;
    }
    return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
  }) as typeof Bun.spawnSync;

  return () => {
    Bun.spawnSync = originalSpawnSync;
  };
}

const cronJobsPath = resolve(import.meta.dir, "../../cron-jobs.json");
const originalCronJobsText = existsSync(cronJobsPath) ? readFileSync(cronJobsPath, "utf-8") : null;
const originalSessionStopTyping = session.stopTyping;
const originalSessionKill = session.kill;
const originalSessionModel = session.model;
const originalSessionEffort = session.effort;
const originalSessionActiveDriver = session.activeDriver;
const originalCodexKill = codexSession.kill;

afterEach(() => {
  session.stopTyping = originalSessionStopTyping;
  session.kill = originalSessionKill;
  session.model = originalSessionModel;
  session.effort = originalSessionEffort;
  session.activeDriver = originalSessionActiveDriver;
  codexSession.kill = originalCodexKill;

  if (originalCronJobsText !== null) {
    writeFileSync(cronJobsPath, originalCronJobsText);
  } else if (existsSync(cronJobsPath)) {
    writeFileSync(cronJobsPath, "[]\n");
  }
});

describe("getCommandLines", () => {
  it("returns slash commands including all known commands", () => {
    const lines = getCommandLines();
    const commands = lines.map((line) => line.split(/\s+/)[0]);

    expect(Array.isArray(lines)).toBe(true);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.every((line) => line.startsWith("/"))).toBe(true);

    for (const expected of [
      "/new",
      "/model",
      "/switch",
      "/usage",
      "/context",
      "/status",
      "/looplogs",
      "/pinologs",
      "/resume",
      "/sub",
      "/cron",
    ]) {
      expect(commands).toContain(expected);
    }
  });
});

function getInlineKeyboard(reply: ReplyRecord): Array<Array<{ text?: string; callback_data?: string }>> {
  return (
    (reply.extra?.reply_markup as {
      inline_keyboard?: Array<Array<{ text?: string; callback_data?: string }>>;
    })?.inline_keyboard || []
  );
}

function runSwitchNoArgInIsolatedProcess(codexEnabled: boolean): ReplyRecord[] {
  const projectRoot = resolve(import.meta.dir, "../..");
  const script = `
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_ALLOWED_USERS = "123";
    process.env.CLAUDE_WORKING_DIR = process.cwd();
    process.env.CODEX_ENABLED = ${JSON.stringify(codexEnabled ? "true" : "false")};
    process.env.CODEX_CLI_AVAILABLE_OVERRIDE = ${JSON.stringify(codexEnabled ? "true" : "false")};
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};
    const { handleSwitch } = await import("./src/handlers/commands.ts");
    const { session } = await import("./src/session.ts");
    session.activeDriver = "claude";
    const replies = [];
    const ctx = {
      from: { id: 123 },
      message: { text: "/switch" },
      reply: async (text, extra) => {
        replies.push({ text, extra });
      },
    };
    await handleSwitch(ctx);
    process.stdout.write(JSON.stringify(replies));
  `;
  const proc = Bun.spawnSync(["bun", "-e", script], { cwd: projectRoot });
  expect(proc.exitCode).toBe(0);
  const combinedOutput = `${proc.stdout.toString()}\n${proc.stderr.toString()}`;
  const jsonStart = combinedOutput.search(/\[\s*\{/);
  expect(jsonStart).toBeGreaterThanOrEqual(0);

  let depth = 0;
  let inString = false;
  let isEscaped = false;
  let jsonEnd = -1;
  for (let i = jsonStart; i < combinedOutput.length; i += 1) {
    const ch = combinedOutput[i]!;
    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (ch === "\\") {
        isEscaped = true;
      } else if (ch === "\"") {
        inString = false;
      }
      continue;
    }
    if (ch === "\"") {
      inString = true;
      continue;
    }
    if (ch === "[") {
      depth += 1;
      continue;
    }
    if (ch === "]") {
      depth -= 1;
      if (depth === 0) {
        jsonEnd = i;
        break;
      }
    }
  }

  expect(jsonEnd).toBeGreaterThanOrEqual(jsonStart);
  const jsonText = combinedOutput.slice(jsonStart, jsonEnd + 1);
  return JSON.parse(jsonText) as ReplyRecord[];
}

describe("formatModelInfo", () => {
  it("maps known model IDs to display names", () => {
    const known = getAvailableModels()[0]!;
    const result = formatModelInfo(known.value, "high");

    expect(result.modelName).toBe(known.displayName);
  });

  it("omits effort string for haiku models", () => {
    const haikuModel = getAvailableModels().find((m) => m.value.includes("haiku"))?.value || "claude-haiku-test";
    const result = formatModelInfo(haikuModel, "high");

    expect(result.effortStr).toBe("");
  });

  it("falls back to raw model string for unknown model IDs", () => {
    const unknown = "unknown-model-id";
    const result = formatModelInfo(unknown, "medium");

    expect(result.modelName).toBe(unknown);
    expect(result.effortStr).toContain("Medium");
  });
});

describe("parseClaudeBacklogItems", () => {
  it("parses checked, unchecked, and current marker items", () => {
    const content = [
      "## Backlog",
      "- [ ] unchecked item",
      "- [x] checked item",
      "- [ ] in progress <- current",
    ].join("\n");

    const items = parseClaudeBacklogItems(content);

    expect(items).toEqual([
      { text: "unchecked item", done: false, current: false },
      { text: "checked item", done: true, current: false },
      { text: "in progress", done: false, current: true },
    ]);
  });

  it("returns empty array for empty content", () => {
    expect(parseClaudeBacklogItems("")).toEqual([]);
  });

  it("returns empty array when Backlog section is missing", () => {
    const content = [
      "## Current Task",
      "Do something",
      "",
      "## End Goal",
      "Ship it",
    ].join("\n");

    expect(parseClaudeBacklogItems(content)).toEqual([]);
  });
});

describe("parseClaudeStateSummary", () => {
  it("extracts current task and backlog progress from well-formed content", () => {
    const content = [
      "## Current Task",
      "- Implement parser tests",
      "",
      "## End Goal with Specs",
      "Cover handlers and pure functions.",
      "",
      "## Backlog",
      "- [x] Read existing test patterns",
      "- [ ] Write parser tests <- current",
      "- [ ] Run test suite",
    ].join("\n");

    const summary = parseClaudeStateSummary(content);

    expect(summary).toEqual({
      currentTask: "Implement parser tests",
      backlogDone: 1,
      backlogTotal: 3,
      backlogCurrent: "Write parser tests",
    });
  });

  it("returns empty fields when sections are missing", () => {
    const summary = parseClaudeStateSummary("## Notes\nNo task or backlog here.");

    expect(summary).toEqual({
      currentTask: "",
      backlogDone: 0,
      backlogTotal: 0,
      backlogCurrent: "",
    });
  });

  it("parses real-world CLAUDE.md content", async () => {
    const statePath = resolve(import.meta.dir, "../../../../.subturtles/test-commands/CLAUDE.md");
    const content = await Bun.file(statePath).text();

    const summary = parseClaudeStateSummary(content);

    expect(summary.currentTask.length).toBeGreaterThan(0);
    expect(summary.backlogTotal).toBeGreaterThan(0);
    expect(summary.backlogDone).toBeGreaterThanOrEqual(0);
    expect(summary.backlogDone).toBeLessThanOrEqual(summary.backlogTotal);
  });
});

describe("formatBacklogSummary", () => {
  it("formats progress and current item into readable summary", () => {
    const result = formatBacklogSummary({
      currentTask: "ignored by formatter",
      backlogDone: 2,
      backlogTotal: 5,
      backlogCurrent: "Write parser tests",
    });

    expect(result).toBe("2/5 done • Current: Write parser tests");
  });
});

describe("parseCtlListOutput", () => {
  it("parses real ctl list output with fixed-width columns, skills, and tunnel URL", () => {
    const output = [
      "  docs-agent      running  yolo-codex   (PID 12345)   9m left       Implement parser coverage [skills: [\"frontend\",\"tests\"]]",
      "                 → https://docs-agent.trycloudflare.com",
      "  bugfix-ops      stopped                                             (no task)",
    ].join("\n");

    const turtles = parseCtlListOutput(output);

    expect(turtles).toEqual([
      {
        name: "docs-agent",
        status: "running",
        type: "yolo-codex",
        pid: "12345",
        timeRemaining: "9m",
        task: "Implement parser coverage",
        tunnelUrl: "https://docs-agent.trycloudflare.com",
      },
      {
        name: "bugfix-ops",
        status: "stopped",
        type: "",
        pid: "",
        timeRemaining: "",
        task: "(no task)",
        tunnelUrl: "",
      },
    ]);
  });

  it("parses real running variants for no-timeout and overdue subturtles", () => {
    const output = [
      "  infra-watch     running  yolo-codex-spark (PID 456) no timeout    Investigate flaky CI",
      "  migration       running  slow         (PID 7890) OVERDUE      Finish data migration",
    ].join("\n");

    const turtles = parseCtlListOutput(output);

    expect(turtles).toEqual([
      {
        name: "infra-watch",
        status: "running",
        type: "yolo-codex-spark",
        pid: "456",
        timeRemaining: "no timeout",
        task: "Investigate flaky CI",
        tunnelUrl: "",
      },
      {
        name: "migration",
        status: "running",
        type: "slow",
        pid: "7890",
        timeRemaining: "OVERDUE",
        task: "Finish data migration",
        tunnelUrl: "",
      },
    ]);
  });

  it("returns empty array for empty output", () => {
    expect(parseCtlListOutput("")).toEqual([]);
  });

  it("returns empty array for no-subturtles output", () => {
    expect(parseCtlListOutput("No SubTurtles found.")).toEqual([]);
  });

  it("returns empty array for header-only output", () => {
    const output = "NAME STATUS TYPE PID TIME TASK";
    expect(parseCtlListOutput(output)).toEqual([]);
  });
});

describe("readMainLoopLogTail", () => {
  it("returns ok=true with log text when tail succeeds", () => {
    const expectedText = "line 1\nline 2\n";
    const originalSpawnSync = Bun.spawnSync;
    const spawnedCommands: string[][] = [];

    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      const parts = Array.isArray(cmd) ? cmd.map((part) => String(part)) : [String(cmd)];
      spawnedCommands.push(parts);
      if (parts[0] === "tail") {
        return {
          stdout: Buffer.from(expectedText),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }
      return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
    }) as typeof Bun.spawnSync;

    try {
      expect(readMainLoopLogTail()).toEqual({ ok: true, text: expectedText });
    } finally {
      Bun.spawnSync = originalSpawnSync;
    }

    expect(spawnedCommands.some((parts) => parts[0] === "tail")).toBe(true);
    expect(spawnedCommands.some((parts) => parts[0] === "tail" && parts.includes(MAIN_LOOP_LOG_PATH))).toBe(true);
  });

  it("returns ok=false with an error when tail fails", () => {
    const originalSpawnSync = Bun.spawnSync;
    const expectedError = `tail: ${MAIN_LOOP_LOG_PATH}: No such file or directory`;

    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      const parts = Array.isArray(cmd) ? cmd.map((part) => String(part)) : [String(cmd)];
      if (parts[0] === "tail") {
        return {
          stdout: Buffer.from(""),
          stderr: Buffer.from(expectedError),
          success: false,
          exitCode: 1,
        } as ReturnType<typeof Bun.spawnSync>;
      }
      return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
    }) as typeof Bun.spawnSync;

    try {
      expect(readMainLoopLogTail()).toEqual({ ok: false, error: expectedError });
    } finally {
      Bun.spawnSync = originalSpawnSync;
    }
  });
});

describe("handlers with mock Context", () => {
  it("handleNew replies with HTML command overview and resets driver sessions", async () => {
    let stopTypingCalls = 0;
    let sessionKillCalls = 0;
    let codexKillCalls = 0;

    session.stopTyping = () => {
      stopTypingCalls += 1;
    };
    session.kill = (async () => {
      sessionKillCalls += 1;
    }) as typeof session.kill;
    codexSession.kill = (async () => {
      codexKillCalls += 1;
    }) as typeof codexSession.kill;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response("{}", { status: 404 })) as unknown as typeof fetch;
    const restoreSpawnSync = mockClaudeCredentialLookupFailure();

    const { ctx, replies } = mockContext("/new");
    try {
      await handleNew(ctx as any);
    } finally {
      globalThis.fetch = originalFetch;
      restoreSpawnSync();
    }

    expect(replies).toHaveLength(1);
    expect(replies[0]!.extra?.parse_mode).toBe("HTML");
    expect(replies[0]!.text).toContain("<b>New session</b>");
    expect(replies[0]!.text).toContain("<b>Commands:</b>");
    expect(replies[0]!.text).toContain("/new - Fresh session");
    expect(replies[0]!.text).toContain("/status - Detailed status");
    expect(replies[0]!.text).toContain("/cron - Scheduled jobs");
    expect(stopTypingCalls).toBe(1);
    expect(sessionKillCalls).toBe(1);
    expect(codexKillCalls).toBe(1);
  });

  it("handleStatus replies with HTML settings overview without resetting sessions", async () => {
    let stopTypingCalls = 0;
    let sessionKillCalls = 0;
    let codexKillCalls = 0;

    session.stopTyping = () => {
      stopTypingCalls += 1;
    };
    session.kill = (async () => {
      sessionKillCalls += 1;
    }) as typeof session.kill;
    codexSession.kill = (async () => {
      codexKillCalls += 1;
    }) as typeof codexSession.kill;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response("{}", { status: 404 })) as unknown as typeof fetch;
    const restoreSpawnSync = mockClaudeCredentialLookupFailure();

    const { ctx, replies } = mockContext("/status");
    try {
      await handleStatus(ctx as any);
    } finally {
      globalThis.fetch = originalFetch;
      restoreSpawnSync();
    }

    expect(replies).toHaveLength(1);
    expect(replies[0]!.extra?.parse_mode).toBe("HTML");
    expect(replies[0]!.text).toContain("<b>Status</b>");
    expect(replies[0]!.text).toContain("<b>Commands:</b>");
    expect(stopTypingCalls).toBe(0);
    expect(sessionKillCalls).toBe(0);
    expect(codexKillCalls).toBe(0);
  });

  it("handleCron shows no-jobs message when cron job list is empty", async () => {
    writeFileSync(cronJobsPath, "[]\n");

    const { ctx, replies } = mockContext("/cron");
    await handleCron(ctx as any);

    expect(replies).toHaveLength(1);
    expect(replies[0]!.extra?.parse_mode).toBe("HTML");
    expect(replies[0]!.text).toContain("<b>Scheduled Jobs</b>");
    expect(replies[0]!.text).toContain("No jobs scheduled");
  });

  it("handleCron shows jobs with cancel buttons", async () => {
    const now = Date.now();
    const longPrompt = "Run recurring maintenance task with a very long prompt to force truncation";
    const expectedTruncatedPrompt = `${longPrompt.slice(0, 37)}...`;

    writeFileSync(
      cronJobsPath,
      JSON.stringify(
        [
          {
            id: "job-1",
            prompt: "Do a quick status check",
            chat_id: 123,
            type: "one-shot",
            interval_ms: null,
            fire_at: now + 5 * 60 * 1000,
            created_at: new Date(now).toISOString(),
          },
          {
            id: "job-2",
            prompt: longPrompt,
            chat_id: 123,
            type: "recurring",
            interval_ms: 15 * 60 * 1000,
            fire_at: now + 2 * 60 * 60 * 1000,
            created_at: new Date(now).toISOString(),
          },
        ],
        null,
        2
      )
    );

    const { ctx, replies } = mockContext("/cron");
    await handleCron(ctx as any);

    expect(replies).toHaveLength(1);
    expect(replies[0]!.extra?.parse_mode).toBe("HTML");
    expect(replies[0]!.text).toContain("<b>Scheduled Jobs</b>");
    expect(replies[0]!.text).toContain("⏱️ <code>Do a quick status check</code>");
    expect(replies[0]!.text).toContain(`🔁 <code>${expectedTruncatedPrompt}</code>`);

    const keyboard = (replies[0]!.extra?.reply_markup as {
      inline_keyboard?: Array<Array<{ callback_data?: string }>>;
    })?.inline_keyboard;
    expect(Array.isArray(keyboard)).toBe(true);
    expect(keyboard?.flat().some((button) => button.callback_data === "cron_cancel:job-1")).toBe(true);
    expect(keyboard?.flat().some((button) => button.callback_data === "cron_cancel:job-2")).toBe(true);
  });

  it("handleModel replies with inline keyboard model options for Claude", async () => {
    session.activeDriver = "claude";
    session.model = getAvailableModels()[0]!.value;
    session.effort = "high";

    const { ctx, replies } = mockContext("/model");
    await handleModel(ctx as any);

    expect(replies).toHaveLength(1);
    const reply = replies[0]!;
    expect(reply.extra?.parse_mode).toBe("HTML");
    expect(reply.text).toContain("<b>Model:</b>");
    expect(reply.text).toContain("Select model or effort level:");

    const keyboard = getInlineKeyboard(reply);
    expect(keyboard.length).toBeGreaterThan(1);

    const callbackData = keyboard.flat().map((button) => button.callback_data || "");
    for (const model of getAvailableModels()) {
      expect(callbackData).toContain(`model:${model.value}`);
    }
    expect(callbackData).toContain("effort:low");
    expect(callbackData).toContain("effort:medium");
    expect(callbackData).toContain("effort:high");
  });

  it("handlePinologs replies with inline keyboard level options", async () => {
    const { ctx, replies } = mockContext("/pinologs");
    await handlePinologs(ctx as any);

    expect(replies).toHaveLength(1);
    const reply = replies[0]!;
    expect(reply.text).toBe("Select log level:");

    const keyboard = getInlineKeyboard(reply);
    expect(keyboard).toEqual([
      [
        { text: "Info", callback_data: "pinologs:info" },
        { text: "Warning", callback_data: "pinologs:warn" },
        { text: "Errors", callback_data: "pinologs:error" },
      ],
    ]);
  });

  it("handleSwitch shows switch buttons when Codex is unavailable", () => {
    const replies = runSwitchNoArgInIsolatedProcess(false);
    expect(replies).toHaveLength(1);
    const reply = replies[0]!;
    expect(reply.extra?.parse_mode).toBe("HTML");
    expect(reply.text).toContain("<b>Current driver:</b>");

    const callbackData = getInlineKeyboard(reply).flat().map((button) => button.callback_data || "");
    expect(callbackData).toContain("switch:claude");
    expect(callbackData).toContain("switch:codex_unavailable");
  });

  it("handleSwitch shows Codex button when Codex is available", () => {
    const replies = runSwitchNoArgInIsolatedProcess(true);

    expect(replies).toHaveLength(1);
    const reply = replies[0]!;
    expect(reply.extra?.parse_mode).toBe("HTML");
    expect(reply.text).toContain("<b>Current driver:</b>");

    const callbackData = getInlineKeyboard(reply).flat().map((button) => button.callback_data || "");
    expect(callbackData).toContain("switch:claude");
    expect(callbackData).toContain("switch:codex");
    expect(callbackData).not.toContain("switch:codex_unavailable");
  });
});
