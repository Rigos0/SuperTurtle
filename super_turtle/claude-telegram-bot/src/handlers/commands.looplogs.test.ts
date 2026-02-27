import { describe, expect, it } from "bun:test";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();

const { handleLooplogs, MAIN_LOOP_LOG_PATH } = await import("./commands");

const authorizedUserId = Number((process.env.TELEGRAM_ALLOWED_USERS || "123").split(",")[0]?.trim() || "123");

describe("/looplogs", () => {
  it("returns the tailed main-loop logs", async () => {
    const expectedLogText = Array.from({ length: 50 }, (_, i) => `line ${i + 1}`).join("\n");
    const originalSpawnSync = Bun.spawnSync;
    const spawnedCommands: string[][] = [];

    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      const parts = Array.isArray(cmd) ? cmd.map((part) => String(part)) : [String(cmd)];
      spawnedCommands.push(parts);
      if (parts[0] === "tail") {
        return {
          stdout: Buffer.from(expectedLogText),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }
      return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
    }) as typeof Bun.spawnSync;

    const replies: string[] = [];
    const ctx = {
      from: { id: authorizedUserId },
      reply: async (text: string) => {
        replies.push(text);
      },
    } as any;

    try {
      await handleLooplogs(ctx);
    } finally {
      Bun.spawnSync = originalSpawnSync;
    }

    expect(spawnedCommands.some((parts) => parts[0] === "tail" && parts[1] === "-n" && parts[2] === "50")).toBe(true);
    expect(spawnedCommands.some((parts) => parts.includes(MAIN_LOOP_LOG_PATH))).toBe(true);
    expect(replies).toEqual([expectedLogText]);
  });

  it("returns an actionable error when the log file is missing", async () => {
    const originalSpawnSync = Bun.spawnSync;
    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      const parts = Array.isArray(cmd) ? cmd.map((part) => String(part)) : [String(cmd)];
      if (parts[0] === "tail") {
        return {
          stdout: Buffer.from(""),
          stderr: Buffer.from(`tail: ${MAIN_LOOP_LOG_PATH}: No such file or directory`),
          success: false,
          exitCode: 1,
        } as ReturnType<typeof Bun.spawnSync>;
      }
      return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
    }) as typeof Bun.spawnSync;

    const replies: string[] = [];
    const ctx = {
      from: { id: authorizedUserId },
      reply: async (text: string) => {
        replies.push(text);
      },
    } as any;

    try {
      await handleLooplogs(ctx);
    } finally {
      Bun.spawnSync = originalSpawnSync;
    }

    expect(replies).toHaveLength(1);
    expect(replies[0]).toContain(`Cannot read main loop log at ${MAIN_LOOP_LOG_PATH}`);
    expect(replies[0]).toContain("bun run start");
  });
});
