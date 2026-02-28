import { describe, expect, it } from "bun:test";
import { resolve } from "path";
import { getAvailableModels } from "../session";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();

const {
  getCommandLines,
  formatModelInfo,
  parseClaudeBacklogItems,
  parseClaudeStateSummary,
  formatBacklogSummary,
  parseCtlListOutput,
  readMainLoopLogTail,
  MAIN_LOOP_LOG_PATH,
} = await import("./commands");

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
      "/resume",
      "/sub",
      "/cron",
    ]) {
      expect(commands).toContain(expected);
    }
  });
});

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
