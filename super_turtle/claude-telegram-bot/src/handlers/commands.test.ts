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
  it("parses a running SubTurtle line with status fields", () => {
    const output = "worker-1 running yolo-codex (PID 4321) 14m left Implement parser";
    const turtles = parseCtlListOutput(output);

    expect(turtles).toEqual([
      {
        name: "worker-1",
        status: "running",
        type: "yolo-codex",
        pid: "4321",
        timeRemaining: "14m",
        task: "Implement parser",
        tunnelUrl: "",
      },
    ]);
  });

  it("parses a stopped SubTurtle line", () => {
    const output = "worker-2 stopped (no task)";
    const turtles = parseCtlListOutput(output);

    expect(turtles).toEqual([
      {
        name: "worker-2",
        status: "stopped",
        type: "",
        pid: "",
        timeRemaining: "",
        task: "(no task)",
        tunnelUrl: "",
      },
    ]);
  });

  it("captures tunnel URL from the next line", () => {
    const output = [
      "worker-3 running slow (PID 99) OVERDUE Finish release",
      "→ https://example.trycloudflare.com",
    ].join("\n");
    const turtles = parseCtlListOutput(output);

    expect(turtles).toHaveLength(1);
    expect(turtles[0]?.tunnelUrl).toBe("https://example.trycloudflare.com");
  });

  it("returns empty array for empty output", () => {
    expect(parseCtlListOutput("")).toEqual([]);
  });

  it("returns empty array for header-only output", () => {
    const output = "NAME STATUS TYPE PID TIME TASK";
    expect(parseCtlListOutput(output)).toEqual([]);
  });
});
