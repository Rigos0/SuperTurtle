import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { join } from "path";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();

const { handleSubturtle } = await import("./commands");
const { ALLOWED_USERS, WORKING_DIR } = await import("../config");
const authorizedUserId =
  ALLOWED_USERS[0] ??
  Number((process.env.TELEGRAM_ALLOWED_USERS || "123").split(",")[0]?.trim() || "123");

describe("/subturtle", () => {
  it("shows parsed sub state and root summary instead of raw task text", async () => {
    const workdir = WORKING_DIR;
    const turtleName = "test-sub-ux";
    const turtleDir = join(workdir, ".superturtle/subturtles", turtleName);
    mkdirSync(turtleDir, { recursive: true });
    const rootStatePath = join(workdir, "CLAUDE.md");
    const hadRootState = existsSync(rootStatePath);
    const originalRootState = hadRootState ? readFileSync(rootStatePath, "utf-8") : "";

    writeFileSync(
      rootStatePath,
      [
        "## Current Task",
        "Keep root summary available.",
        "",
        "## Backlog",
        "- [x] Root seed",
        "- [ ] Another root item <- current",
      ].join("\n")
    );
    writeFileSync(
      join(turtleDir, "CLAUDE.md"),
      [
        "## Current Task",
        "Add /subs aliases and summarize backlog state.",
        "",
        "## Backlog",
        "- [x] Locate /sub command handler",
        "- [ ] Add aliases <- current",
        "- [ ] Replace logs output",
      ].join("\n")
    );

    const originalSpawnSync = Bun.spawnSync;

    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      if (Array.isArray(cmd) && String(cmd[0]).endsWith("/subturtle/ctl") && cmd[1] === "list") {
        const output = [
          `  ${turtleName}      running  yolo-codex   (PID 12345)   9m left       Tail raw logs here [skills: ["frontend"]]`,
          "                 → https://example.trycloudflare.com",
          "  worker-2        stopped                                             (no task)",
        ].join("\n");

        return {
          stdout: Buffer.from(output),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }

      return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
    }) as typeof Bun.spawnSync;

    const replies: Array<{ text: string; extra?: { parse_mode?: string; reply_markup?: unknown } }> = [];

    const ctx = {
      from: { id: authorizedUserId },
      reply: async (text: string, extra?: { parse_mode?: string; reply_markup?: unknown }) => {
        replies.push({ text, extra });
      },
    } as any;

    try {
      await handleSubturtle(ctx);
    } finally {
      Bun.spawnSync = originalSpawnSync;
      if (hadRootState) {
        writeFileSync(rootStatePath, originalRootState);
      } else {
        rmSync(rootStatePath, { force: true });
      }
      rmSync(turtleDir, { recursive: true, force: true });
    }

    expect(replies).toHaveLength(1);

    const text = replies[0]!.text;
    expect(text).toContain("<b>Root</b>");
    expect(text).toContain(`<b>${turtleName}</b>`);
    expect(text).toContain("9m left");
    expect(text).toContain("Add /subs aliases and summarize backlog state.");
    expect(text).toContain("1/3 done");
    expect(text).not.toContain("Tail raw logs here");
    expect(text).toContain("https://example.trycloudflare.com");
    expect(text).toContain("<b>worker-2</b>");
    expect(text).not.toContain("<b>→</b>");

    const keyboard = (replies[0]!.extra?.reply_markup as { inline_keyboard?: Array<Array<{ callback_data?: string }>> })?.inline_keyboard;
    expect(Array.isArray(keyboard)).toBe(true);
    expect(keyboard?.flat().some((button) => button.callback_data === `sub_pick:${turtleName}:0`)).toBe(true);
    expect(keyboard?.flat().some((button) => button.callback_data === `subturtle_stop:${turtleName}`)).toBe(false);
    expect(keyboard?.flat().some((button) => button.callback_data === `subturtle_logs:${turtleName}`)).toBe(false);
    expect(keyboard?.flat().some((button) => button.callback_data === `sub_bl:${turtleName}:0`)).toBe(false);
    expect(keyboard?.flat().some((button) => button.callback_data === `sub_lg:${turtleName}:0`)).toBe(false);
  });

  it("paginates running subturtle picker buttons three at a time", async () => {
    const workdir = WORKING_DIR;
    const turtleNames = ["sub-1", "sub-2", "sub-3", "sub-4"];
    const originalSpawnSync = Bun.spawnSync;
    const replies: Array<{ text: string; extra?: { parse_mode?: string; reply_markup?: unknown } }> = [];

    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      if (Array.isArray(cmd) && String(cmd[0]).endsWith("/subturtle/ctl") && cmd[1] === "list") {
        const output = turtleNames
          .map((name, idx) => `  ${name}      running  yolo-codex   (PID ${12340 + idx})   9m left       Task ${idx + 1}`)
          .join("\n");

        return {
          stdout: Buffer.from(output),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }

      return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
    }) as typeof Bun.spawnSync;

    const ctx = {
      from: { id: authorizedUserId },
      reply: async (text: string, extra?: { parse_mode?: string; reply_markup?: unknown }) => {
        replies.push({ text, extra });
      },
    } as any;

    try {
      await handleSubturtle(ctx);
    } finally {
      Bun.spawnSync = originalSpawnSync;
      for (const name of turtleNames) {
        rmSync(join(workdir, ".superturtle/subturtles", name), { recursive: true, force: true });
      }
    }

    const keyboard = (replies[0]!.extra?.reply_markup as { inline_keyboard?: Array<Array<{ callback_data?: string }>> })?.inline_keyboard || [];
    expect(keyboard.flat().filter((button) => button.callback_data?.startsWith("sub_pick:"))).toHaveLength(3);
    expect(keyboard.flat().some((button) => button.callback_data === "sub_pick:sub-1:0")).toBe(true);
    expect(keyboard.flat().some((button) => button.callback_data === "sub_pick:sub-3:0")).toBe(true);
    expect(keyboard.flat().some((button) => button.callback_data === "sub_pick:sub-4:0")).toBe(false);
    expect(keyboard.flat().some((button) => button.callback_data === "sub_menu:1")).toBe(true);
    expect(replies[0]!.text).toContain("page 1/2");
  });
});
