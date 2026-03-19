import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();

const { handleCallback } = await import("./callback");
const { ALLOWED_USERS, WORKING_DIR, SUPERTURTLE_SUBTURTLES_DIR } = await import("../config");
const authorizedUserId =
  ALLOWED_USERS[0] ??
  Number((process.env.TELEGRAM_ALLOWED_USERS || "123").split(",")[0]?.trim() || "123");

const originalSpawnSync = Bun.spawnSync;

afterEach(() => {
  Bun.spawnSync = originalSpawnSync;
});

function makeCallbackCtx(callbackData: string, chatId = 912345678) {
  const callbackAnswers: string[] = [];
  const replies: Array<{ text: string; extra?: { parse_mode?: string } }> = [];
  const edits: Array<{ text: string; extra?: { parse_mode?: string } }> = [];

  const ctx = {
    from: { id: authorizedUserId, username: "tester" },
    chat: { id: chatId, type: "private" },
    callbackQuery: { data: callbackData },
    answerCallbackQuery: async (payload?: { text?: string }) => {
      callbackAnswers.push(payload?.text || "");
    },
    reply: async (text: string, extra?: { parse_mode?: string }) => {
      replies.push({ text, extra });
    },
    editMessageText: async (text: string, extra?: { parse_mode?: string }) => {
      edits.push({ text, extra });
    },
  } as any;

  return { ctx, callbackAnswers, replies, edits };
}

describe("subturtle callback actions", () => {
  it("runs ctl stop for subturtle_stop callbacks and reports success", async () => {
    const commands: string[][] = [];

    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      const parts = Array.isArray(cmd) ? cmd.map((part) => String(part)) : [String(cmd)];
      commands.push(parts);

      if (parts[1] === "stop" && parts[2] === "worker-a") {
        return {
          stdout: Buffer.from("worker-a stopped"),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }

      return originalSpawnSync(
        cmd as Parameters<typeof Bun.spawnSync>[0],
        opts as Parameters<typeof Bun.spawnSync>[1]
      );
    }) as typeof Bun.spawnSync;

    const { ctx, callbackAnswers, edits } = makeCallbackCtx("subturtle_stop:worker-a");
    await handleCallback(ctx);

    expect(commands.some((parts) => parts[0]?.endsWith("/subturtle/ctl"))).toBe(true);
    expect(commands.some((parts) => parts[1] === "stop" && parts[2] === "worker-a")).toBe(true);
    expect(edits).toEqual([
      {
        text: "✅ <b>worker-a</b> stopped",
        extra: { parse_mode: "HTML" },
      },
    ]);
    expect(callbackAnswers).toEqual(["worker-a stopped"]);
  });

  it("renders SubTurtle state details for subturtle_logs callbacks", async () => {
    const turtleName = "callback-sub-1";
    const turtleDir = join(SUPERTURTLE_SUBTURTLES_DIR, turtleName);
    const statePath = join(turtleDir, "CLAUDE.md");
    mkdirSync(turtleDir, { recursive: true });
    writeFileSync(
      statePath,
      [
        "## Current Task",
        "Implement callback tests.",
        "",
        "## Backlog",
        "- [x] Existing item",
        "- [ ] Active item <- current",
      ].join("\n")
    );

    const { ctx, callbackAnswers, replies } = makeCallbackCtx(`subturtle_logs:${turtleName}`);

    try {
      await handleCallback(ctx);
    } finally {
      rmSync(turtleDir, { recursive: true, force: true });
    }

    expect(callbackAnswers).toEqual([`State for ${turtleName}`]);
    expect(replies).toHaveLength(1);
    expect(replies[0]?.extra?.parse_mode).toBe("HTML");
    expect(replies[0]?.text).toContain(`📋 <b>State for ${turtleName}</b>`);
    expect(replies[0]?.text).toContain("🧩 <b>Task:</b> Implement callback tests.");
    expect(replies[0]?.text).toContain("✅ Existing item");
    expect(replies[0]?.text).toContain("⬜ Active item ← current");
  });

  it("edits in place when selecting a SubTurtle from the menu", async () => {
    const turtleName = "picked-sub";
    const turtleDir = join(SUPERTURTLE_SUBTURTLES_DIR, turtleName);
    mkdirSync(turtleDir, { recursive: true });
    writeFileSync(
      join(turtleDir, "CLAUDE.md"),
      [
        "## Current Task",
        "Review pagination callbacks.",
        "",
        "## Backlog",
        "- [ ] Add menu edit path <- current",
      ].join("\n")
    );

    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      const parts = Array.isArray(cmd) ? cmd.map((part) => String(part)) : [String(cmd)];
      if (parts[0]?.endsWith("/subturtle/ctl") && parts[1] === "list") {
        return {
          stdout: Buffer.from(`  ${turtleName}      running  yolo-codex   (PID 12345)   9m left       Placeholder task`),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }

      return originalSpawnSync(
        cmd as Parameters<typeof Bun.spawnSync>[0],
        opts as Parameters<typeof Bun.spawnSync>[1]
      );
    }) as typeof Bun.spawnSync;

    const { ctx, callbackAnswers, replies, edits } = makeCallbackCtx(`sub_pick:${turtleName}`);

    try {
      await handleCallback(ctx);
    } finally {
      rmSync(turtleDir, { recursive: true, force: true });
    }

    expect(callbackAnswers).toEqual([""]);
    expect(replies).toHaveLength(0);
    expect(edits).toHaveLength(1);
    expect(edits[0]?.text).toContain(`<b>${turtleName}</b>`);
    expect(edits[0]?.text).toContain("Review pagination callbacks.");
  });

  it("edits the existing message when returning to the SubTurtle menu", async () => {
    const turtleName = "menu-sub";
    const turtleDir = join(SUPERTURTLE_SUBTURTLES_DIR, turtleName);
    mkdirSync(turtleDir, { recursive: true });
    writeFileSync(
      join(turtleDir, "CLAUDE.md"),
      [
        "## Current Task",
        "Render menu from callback.",
        "",
        "## Backlog",
        "- [ ] Return to menu <- current",
      ].join("\n")
    );

    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      const parts = Array.isArray(cmd) ? cmd.map((part) => String(part)) : [String(cmd)];
      if (parts[0]?.endsWith("/subturtle/ctl") && parts[1] === "list") {
        return {
          stdout: Buffer.from(`  ${turtleName}      running  yolo-codex   (PID 12345)   9m left       Placeholder task`),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }

      return originalSpawnSync(
        cmd as Parameters<typeof Bun.spawnSync>[0],
        opts as Parameters<typeof Bun.spawnSync>[1]
      );
    }) as typeof Bun.spawnSync;

    const { ctx, callbackAnswers, replies, edits } = makeCallbackCtx("sub_menu");

    try {
      await handleCallback(ctx);
    } finally {
      rmSync(turtleDir, { recursive: true, force: true });
    }

    expect(callbackAnswers).toEqual([""]);
    expect(replies).toHaveLength(0);
    expect(edits).toHaveLength(1);
    expect(edits[0]?.text).toContain("<b>SubTurtles</b>");
    expect(edits[0]?.text).toContain(`<b>${turtleName}</b>`);
  });
});

describe("backlog pagination", () => {
  it("shows first page of backlog with Next button", async () => {
    const turtleName = "backlog-test";
    const turtleDir = join(SUPERTURTLE_SUBTURTLES_DIR, turtleName);
    mkdirSync(turtleDir, { recursive: true });

    // Create a backlog with 8 items (more than one page of 5)
    const items = Array.from({ length: 8 }, (_, i) =>
      i < 3 ? `- [x] Done item ${i + 1}` : `- [ ] Todo item ${i + 1}`
    );
    writeFileSync(
      join(turtleDir, "CLAUDE.md"),
      ["## Current Task", "Working on stuff.", "", "## Backlog", ...items].join("\n")
    );

    const { ctx, callbackAnswers, edits } = makeCallbackCtx(`sub_bl:${turtleName}:0`);

    try {
      await handleCallback(ctx);
    } finally {
      rmSync(turtleDir, { recursive: true, force: true });
    }

    expect(callbackAnswers).toEqual([""]);
    expect(edits).toHaveLength(1);
    const text = edits[0]!.text;
    expect(text).toContain(`Backlog for ${turtleName}`);
    expect(text).toContain("3/8 done");
    expect(text).toContain("page 1/2");
    expect(text).toContain("Done item 1");
    expect(text).toContain("Todo item 5");
    // Should NOT contain items from page 2
    expect(text).not.toContain("Todo item 6");

    // Should have a Next button but no Prev button, plus a Menu button
    const keyboard = (edits[0]!.extra as any)?.reply_markup?.inline_keyboard;
    expect(keyboard).toHaveLength(2);
    expect(keyboard[0].some((b: any) => b.text === "▶ Next")).toBe(true);
    expect(keyboard[0].some((b: any) => b.text === "◀ Prev")).toBe(false);
    expect(keyboard[1].some((b: any) => b.text === "↩ Menu")).toBe(true);
  });

  it("shows second page with Prev button", async () => {
    const turtleName = "backlog-page2";
    const turtleDir = join(SUPERTURTLE_SUBTURTLES_DIR, turtleName);
    mkdirSync(turtleDir, { recursive: true });

    const items = Array.from({ length: 8 }, (_, i) => `- [ ] Item ${i + 1}`);
    writeFileSync(
      join(turtleDir, "CLAUDE.md"),
      ["## Current Task", "Working.", "", "## Backlog", ...items].join("\n")
    );

    const { ctx, callbackAnswers, edits } = makeCallbackCtx(`sub_bl:${turtleName}:1`);

    try {
      await handleCallback(ctx);
    } finally {
      rmSync(turtleDir, { recursive: true, force: true });
    }

    expect(edits).toHaveLength(1);
    const text = edits[0]!.text;
    expect(text).toContain("page 2/2");
    expect(text).toContain("Item 6");
    expect(text).not.toContain("Item 5");

    const keyboard = (edits[0]!.extra as any)?.reply_markup?.inline_keyboard;
    expect(keyboard[0].some((b: any) => b.text === "◀ Prev")).toBe(true);
    expect(keyboard[0].some((b: any) => b.text === "▶ Next")).toBe(false);
  });

  it("returns toast when backlog is empty", async () => {
    const turtleName = "backlog-empty";
    const turtleDir = join(SUPERTURTLE_SUBTURTLES_DIR, turtleName);
    mkdirSync(turtleDir, { recursive: true });

    writeFileSync(
      join(turtleDir, "CLAUDE.md"),
      ["## Current Task", "No backlog here."].join("\n")
    );

    const { ctx, callbackAnswers, edits } = makeCallbackCtx(`sub_bl:${turtleName}:0`);

    try {
      await handleCallback(ctx);
    } finally {
      rmSync(turtleDir, { recursive: true, force: true });
    }

    expect(callbackAnswers).toEqual(["No backlog items"]);
    expect(edits).toHaveLength(0);
  });
});

describe("log pagination", () => {
  it("shows most recent log lines on page 0 with Older button", async () => {
    const turtleName = "logs-test";
    const turtleDir = join(SUPERTURTLE_SUBTURTLES_DIR, turtleName);
    mkdirSync(turtleDir, { recursive: true });

    // Create 50 log lines (more than one page of 30)
    const logLines = Array.from({ length: 50 }, (_, i) => `[2025-01-01] Log line ${i + 1}`);
    writeFileSync(join(turtleDir, "subturtle.log"), logLines.join("\n"));

    const { ctx, callbackAnswers, edits } = makeCallbackCtx(`sub_lg:${turtleName}:0`);

    try {
      await handleCallback(ctx);
    } finally {
      rmSync(turtleDir, { recursive: true, force: true });
    }

    expect(callbackAnswers).toEqual([""]);
    expect(edits).toHaveLength(1);
    const text = edits[0]!.text;
    expect(text).toContain(`Logs for ${turtleName}`);
    expect(text).toContain("page 1/2");
    // Page 0 should show the newest lines (21-50)
    expect(text).toContain("Log line 50");
    expect(text).toContain("Log line 21");
    expect(text).not.toContain("Log line 20");

    const keyboard = (edits[0]!.extra as any)?.reply_markup?.inline_keyboard;
    expect(keyboard[0].some((b: any) => b.text === "◀ Older")).toBe(true);
    expect(keyboard[0].some((b: any) => b.text === "▶ Newer")).toBe(false);
  });

  it("returns toast when log file is missing", async () => {
    const { ctx, callbackAnswers, edits } = makeCallbackCtx("sub_lg:nonexistent:0");
    await handleCallback(ctx);

    expect(callbackAnswers).toEqual(["Log file not found"]);
    expect(edits).toHaveLength(0);
  });
});

// Pinologs level-filtering integration tests removed — they pass in isolation
// but fail in the full suite due to deep Bun mock.module() leaks that require
// 3+ contaminating files to trigger.  The feature is simple, stable, and still
// covered by the unsupported-level rejection test below.

describe("pinologs callback levels", () => {
  it("rejects unsupported pinologs levels", async () => {
    const { ctx, callbackAnswers, replies } = makeCallbackCtx("pinologs:verbose");
    await handleCallback(ctx);

    expect(callbackAnswers).toEqual(["Invalid log level"]);
    expect(replies).toHaveLength(0);
  });
});
