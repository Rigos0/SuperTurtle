import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import { dirname, join } from "path";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();

type CommandsModule = typeof import("./commands");

const workingDir = process.env.CLAUDE_WORKING_DIR || process.cwd();
const authorizedUserId = Number(
  (process.env.TELEGRAM_ALLOWED_USERS || "123").split(",")[0]?.trim() || "123"
);
const originalSpawnSync = Bun.spawnSync;

async function loadActualConfig() {
  return import(`../config.ts?commands-subturtle-config=${Date.now()}-${Math.random()}`);
}

async function loadCommandsModule(): Promise<CommandsModule> {
  return import(`./commands.ts?commands-subturtle=${Date.now()}-${Math.random()}`);
}

async function handleSubturtleForTest(ctx: any) {
  const { handleSubturtle } = await loadCommandsModule();
  return handleSubturtle(ctx);
}

async function syncLiveSubturtleBoardForTest(api: any, chatId: number, options?: any) {
  const { syncLiveSubturtleBoard } = await loadCommandsModule();
  return syncLiveSubturtleBoard(api, chatId, options);
}

beforeEach(async () => {
  const actualConfig = await loadActualConfig();
  mock.module("../config", () => ({
    ...actualConfig,
    TELEGRAM_TOKEN: "test-token",
    ALLOWED_USERS: [authorizedUserId],
    WORKING_DIR: workingDir,
    SUPERTURTLE_DATA_DIR: join(workingDir, ".superturtle"),
  }));
});

afterEach(() => {
  Bun.spawnSync = originalSpawnSync;
  mock.restore();
});

describe("/subturtle", () => {
  it("renders the live board as compact running-worker blocks", async () => {
    const workdir = workingDir;
    const boardPath = join(
      workdir,
      ".superturtle/state/telegram/subturtle-boards",
      `${authorizedUserId}.json`
    );
    rmSync(boardPath, { force: true });
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
    const pins: Array<{ chatId: number; messageId: number }> = [];

    const ctx = {
      from: { id: authorizedUserId },
      chat: { id: authorizedUserId },
      api: {
        sendMessage: async (
          _chatId: number,
          text: string,
          extra?: { parse_mode?: string; reply_markup?: unknown }
        ) => {
          replies.push({ text, extra });
          return { message_id: 501, chat: { id: authorizedUserId } };
        },
        editMessageText: async (
          _chatId: number,
          _messageId: number,
          text: string,
          extra?: { parse_mode?: string; reply_markup?: unknown }
        ) => {
          replies.push({ text, extra });
        },
        pinChatMessage: async (chatId: number, messageId: number) => {
          pins.push({ chatId, messageId });
        },
      },
      reply: async (text: string, extra?: { parse_mode?: string; reply_markup?: unknown }) => {
        replies.push({ text, extra });
      },
    } as any;

    try {
      await handleSubturtleForTest(ctx);
    } finally {
      if (hadRootState) {
        writeFileSync(rootStatePath, originalRootState);
      } else {
        rmSync(rootStatePath, { force: true });
      }
      rmSync(turtleDir, { recursive: true, force: true });
    }

    expect(replies).toHaveLength(1);

    const text = replies[0]!.text;
    expect(text).toContain(`🟢 <b>${turtleName}</b>`);
    expect(text).toContain("yolo-codex");
    expect(text).not.toContain("9m left");
    expect(text).toContain("Add /subs aliases and summarize backlog state.");
    expect(text).toContain("1/3 done");
    expect(text).not.toContain("Tail raw logs here");
    expect(text).not.toContain("<b>Root</b>");
    expect(text).not.toContain("https://example.trycloudflare.com");
    expect(text).not.toContain("<b>worker-2</b>");
    expect(text).not.toContain("Current:");
    expect(text).not.toContain("<b>→</b>");

    const keyboard = (
      replies[0]!.extra?.reply_markup as {
        inline_keyboard?: Array<Array<{ text?: string; callback_data?: string }>>;
      }
    )?.inline_keyboard;
    expect(Array.isArray(keyboard)).toBe(true);
    expect(keyboard?.flat().some((button) => button.text === "📝 Tasks")).toBe(true);
    expect(keyboard?.flat().some((button) => button.text === "📜 Logs")).toBe(true);
    expect(keyboard?.flat().some((button) => button.text === "🛑 Stop")).toBe(true);
    expect(keyboard?.flat().some((button) => button.callback_data === "sub_board_refresh")).toBe(false);
    expect(keyboard?.flat().some((button) => button.callback_data === `sub_board_pick:${turtleName}`)).toBe(false);
    expect(keyboard?.flat().some((button) => button.callback_data === `sub_board_bl:${turtleName}:0`)).toBe(true);
    expect(keyboard?.flat().some((button) => button.callback_data === `sub_board_lg:${turtleName}:0`)).toBe(true);
    expect(keyboard?.flat().some((button) => button.callback_data === `sub_board_stop:${turtleName}`)).toBe(true);
    expect(keyboard?.flat().some((button) => button.callback_data === `subturtle_stop:${turtleName}`)).toBe(false);
    expect(keyboard?.flat().some((button) => button.callback_data === `subturtle_logs:${turtleName}`)).toBe(false);
    expect(keyboard?.flat().some((button) => button.callback_data === `sub_bl:${turtleName}:0`)).toBe(false);
    expect(keyboard?.flat().some((button) => button.callback_data === `sub_lg:${turtleName}:0`)).toBe(false);
    expect(pins).toEqual([{ chatId: authorizedUserId, messageId: 501 }]);

    const trackedBoard = JSON.parse(readFileSync(boardPath, "utf-8"));
    expect(trackedBoard.chat_id).toBe(authorizedUserId);
    expect(trackedBoard.message_id).toBe(501);
    rmSync(boardPath, { force: true });
  });

  it("paginates running subturtle picker buttons three at a time", async () => {
    const workdir = workingDir;
    const chatId = authorizedUserId + 1;
    const boardPath = join(
      workdir,
      ".superturtle/state/telegram/subturtle-boards",
      `${chatId}.json`
    );
    rmSync(boardPath, { force: true });
    const turtleNames = ["sub-1", "sub-2", "sub-3", "sub-4"];
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
      chat: { id: chatId },
      api: {
        sendMessage: async (
          _chatId: number,
          text: string,
          extra?: { parse_mode?: string; reply_markup?: unknown }
        ) => {
          replies.push({ text, extra });
          return { message_id: 601, chat: { id: chatId } };
        },
        editMessageText: async (
          _chatId: number,
          _messageId: number,
          text: string,
          extra?: { parse_mode?: string; reply_markup?: unknown }
        ) => {
          replies.push({ text, extra });
        },
        pinChatMessage: async () => {},
      },
      reply: async (text: string, extra?: { parse_mode?: string; reply_markup?: unknown }) => {
        replies.push({ text, extra });
      },
    } as any;

    try {
      await handleSubturtleForTest(ctx);
    } finally {
      for (const name of turtleNames) {
        rmSync(join(workdir, ".superturtle/subturtles", name), { recursive: true, force: true });
      }
      rmSync(boardPath, { force: true });
    }

    const keyboard = (replies[0]!.extra?.reply_markup as { inline_keyboard?: Array<Array<{ callback_data?: string }>> })?.inline_keyboard || [];
    expect(keyboard.flat().some((button) => button.callback_data === "sub_board_refresh")).toBe(false);
    expect(keyboard.flat().filter((button) => button.callback_data?.startsWith("sub_board_pick:"))).toHaveLength(4);
    expect(keyboard.flat().some((button) => button.callback_data === "sub_board_pick:sub-1")).toBe(true);
    expect(keyboard.flat().some((button) => button.callback_data === "sub_board_pick:sub-4")).toBe(true);
    expect(replies[0]!.text).not.toContain("page 1/2");
  });

  it("skips redundant live board edits when nothing changed recently", async () => {
    const workdir = workingDir;
    const chatId = authorizedUserId + 2;
    const boardPath = join(
      workdir,
      ".superturtle/state/telegram/subturtle-boards",
      `${chatId}.json`
    );
    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      if (Array.isArray(cmd) && String(cmd[0]).endsWith("/subturtle/ctl") && cmd[1] === "list") {
        return {
          stdout: Buffer.from("  worker-a      running  yolo-codex   (PID 12345)   9m left       Same task"),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }

      return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
    }) as typeof Bun.spawnSync;

    try {
      const first = await syncLiveSubturtleBoardForTest({
        sendMessage: async () => ({ message_id: 701, chat: { id: chatId } }),
        editMessageText: async () => {},
        pinChatMessage: async () => {},
      }, chatId, { force: true, pin: true, disableNotification: true });

      let edited = 0;
      const second = await syncLiveSubturtleBoardForTest({
        sendMessage: async () => ({ message_id: 702, chat: { id: chatId } }),
        editMessageText: async () => {
          edited += 1;
        },
        pinChatMessage: async () => {},
      }, chatId, { pin: true, disableNotification: true });

      expect(first.status).toBe("created");
      expect(second.status).toBe("unchanged");
      expect(edited).toBe(0);
    } finally {
      rmSync(boardPath, { force: true });
    }
  });

  it("unpins an unchanged board when no workers are running", async () => {
    const workdir = workingDir;
    const chatId = authorizedUserId + 21;
    const boardPath = join(
      workdir,
      ".superturtle/state/telegram/subturtle-boards",
      `${chatId}.json`
    );
    rmSync(boardPath, { force: true });
    mkdirSync(dirname(boardPath), { recursive: true });
    writeFileSync(
      boardPath,
      JSON.stringify({
        chat_id: chatId,
        message_id: 731,
        last_render_hash: "28b3cd8ce5ec336c47af1462763213578abc4636",
        last_rendered_at: "2026-03-19T00:00:00Z",
        created_at: "2026-03-19T00:00:00Z",
        updated_at: new Date().toISOString(),
        current_view: { kind: "board" },
      })
    );

    const unpinned: Array<{ chatId: number; messageId?: number }> = [];
    let edited = 0;
    let sent = 0;

    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      if (Array.isArray(cmd) && String(cmd[0]).endsWith("/subturtle/ctl") && cmd[1] === "list") {
        return {
          stdout: Buffer.from("No SubTurtles found."),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }

      return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
    }) as typeof Bun.spawnSync;

    try {
      const result = await syncLiveSubturtleBoardForTest({
        sendMessage: async () => {
          sent += 1;
          return { message_id: 732, chat: { id: chatId } };
        },
        editMessageText: async () => {
          edited += 1;
        },
        unpinChatMessage: async (targetChatId: number, messageId?: number) => {
          unpinned.push({ chatId: targetChatId, messageId });
        },
      }, chatId, { pin: true, disableNotification: true });

      expect(result.status).toBe("unchanged");
      expect(result.messageId).toBe(731);
      expect(edited).toBe(0);
      expect(unpinned).toEqual([{ chatId, messageId: 731 }]);
      expect(sent).toBe(0);

      const trackedBoard = JSON.parse(readFileSync(boardPath, "utf-8"));
      expect(trackedBoard.message_id).toBe(731);
      expect(trackedBoard.current_view).toEqual({ kind: "board" });
    } finally {
      rmSync(boardPath, { force: true });
    }
  });

  it("does not auto-create a board when no workers are running", async () => {
    const workdir = workingDir;
    const chatId = authorizedUserId + 3;
    const boardPath = join(
      workdir,
      ".superturtle/state/telegram/subturtle-boards",
      `${chatId}.json`
    );
    rmSync(boardPath, { force: true });
    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      if (Array.isArray(cmd) && String(cmd[0]).endsWith("/subturtle/ctl") && cmd[1] === "list") {
        return {
          stdout: Buffer.from("No SubTurtles found."),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }
      return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
    }) as typeof Bun.spawnSync;

    try {
      const result = await syncLiveSubturtleBoardForTest({
        sendMessage: async () => ({ message_id: 801, chat: { id: chatId } }),
        editMessageText: async () => {},
        pinChatMessage: async () => {},
        unpinChatMessage: async () => {},
      }, chatId, { pin: true, disableNotification: true, createIfMissing: false });

      expect(result.status).toBe("skipped");
      expect(existsSync(boardPath)).toBe(false);
    } finally {
      rmSync(boardPath, { force: true });
    }
  });

  it("auto-creates a board when workers are already running", async () => {
    const workdir = workingDir;
    const chatId = authorizedUserId + 4;
    const boardPath = join(
      workdir,
      ".superturtle/state/telegram/subturtle-boards",
      `${chatId}.json`
    );
    rmSync(boardPath, { force: true });
    const pins: Array<{ chatId: number; messageId: number }> = [];

    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      if (Array.isArray(cmd) && String(cmd[0]).endsWith("/subturtle/ctl") && cmd[1] === "list") {
        return {
          stdout: Buffer.from("  worker-a      running  yolo-codex   (PID 12345)   9m left       Same task"),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }
      return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
    }) as typeof Bun.spawnSync;

    try {
      const result = await syncLiveSubturtleBoardForTest({
        sendMessage: async () => ({ message_id: 851, chat: { id: chatId } }),
        editMessageText: async () => {},
        pinChatMessage: async (targetChatId: number, messageId: number) => {
          pins.push({ chatId: targetChatId, messageId });
        },
      }, chatId, { pin: true, disableNotification: true });

      expect(result.status).toBe("created");
      expect(pins).toEqual([{ chatId, messageId: 851 }]);
      expect(existsSync(boardPath)).toBe(true);
    } finally {
      rmSync(boardPath, { force: true });
    }
  });

  it("unpins an existing board when no workers remain", async () => {
    const workdir = workingDir;
    const chatId = authorizedUserId + 5;
    const boardPath = join(
      workdir,
      ".superturtle/state/telegram/subturtle-boards",
      `${chatId}.json`
    );
    rmSync(boardPath, { force: true });
    mkdirSync(dirname(boardPath), { recursive: true });
    writeFileSync(
      boardPath,
      JSON.stringify({
        chat_id: chatId,
        message_id: 901,
        last_render_hash: "old",
        last_rendered_at: "2026-03-19T00:00:00Z",
        created_at: "2026-03-19T00:00:00Z",
        updated_at: "2026-03-19T00:00:00Z",
        current_view: { kind: "board" },
      })
    );

    let unpinned: Array<{ chatId: number; messageId?: number }> = [];

    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      if (Array.isArray(cmd) && String(cmd[0]).endsWith("/subturtle/ctl") && cmd[1] === "list") {
        return {
          stdout: Buffer.from("No SubTurtles found."),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }
      return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
    }) as typeof Bun.spawnSync;

    try {
      const result = await syncLiveSubturtleBoardForTest({
        sendMessage: async () => ({ message_id: 902, chat: { id: chatId } }),
        editMessageText: async () => {},
        pinChatMessage: async () => {},
        unpinChatMessage: async (targetChatId: number, messageId?: number) => {
          unpinned.push({ chatId: targetChatId, messageId });
        },
      }, chatId, { pin: true, disableNotification: true });

      expect(result.status).toBe("updated");
      expect(unpinned).toEqual([{ chatId, messageId: 901 }]);
    } finally {
      rmSync(boardPath, { force: true });
    }
  });

  it("unpins the old tracked board before recreating it", async () => {
    const workdir = workingDir;
    const chatId = authorizedUserId + 6;
    const boardPath = join(
      workdir,
      ".superturtle/state/telegram/subturtle-boards",
      `${chatId}.json`
    );
    rmSync(boardPath, { force: true });
    mkdirSync(dirname(boardPath), { recursive: true });
    writeFileSync(
      boardPath,
      JSON.stringify({
        chat_id: chatId,
        message_id: 951,
        last_render_hash: "old",
        last_rendered_at: "2026-03-19T00:00:00Z",
        created_at: "2026-03-19T00:00:00Z",
        updated_at: "2026-03-19T00:00:00Z",
        current_view: { kind: "board" },
      })
    );

    const pins: Array<{ chatId: number; messageId: number }> = [];
    const unpinned: Array<{ chatId: number; messageId?: number }> = [];
    const deleted: Array<{ chatId: number; messageId: number }> = [];

    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      if (Array.isArray(cmd) && String(cmd[0]).endsWith("/subturtle/ctl") && cmd[1] === "list") {
        return {
          stdout: Buffer.from("  worker-a      running  yolo-codex   (PID 12345)   9m left       Same task"),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }
      return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
    }) as typeof Bun.spawnSync;

    try {
      const result = await syncLiveSubturtleBoardForTest({
        sendMessage: async () => ({ message_id: 952, chat: { id: chatId } }),
        editMessageText: async () => {
          throw new Error("message can't be edited");
        },
        pinChatMessage: async (targetChatId: number, messageId: number) => {
          pins.push({ chatId: targetChatId, messageId });
        },
        unpinChatMessage: async (targetChatId: number, messageId?: number) => {
          unpinned.push({ chatId: targetChatId, messageId });
        },
        deleteMessage: async (targetChatId: number, messageId: number) => {
          deleted.push({ chatId: targetChatId, messageId });
        },
      }, chatId, { force: true, pin: true, disableNotification: true });

      expect(result.status).toBe("created");
      expect(unpinned).toEqual([{ chatId, messageId: 951 }]);
      expect(deleted).toEqual([{ chatId, messageId: 951 }]);
      expect(pins).toEqual([{ chatId, messageId: 952 }]);
    } finally {
      rmSync(boardPath, { force: true });
    }
  });

  it("edits the callback-target board message instead of creating a duplicate when the stored record drifted", async () => {
    const workdir = workingDir;
    const chatId = authorizedUserId + 7;
    const boardPath = join(
      workdir,
      ".superturtle/state/telegram/subturtle-boards",
      `${chatId}.json`
    );
    rmSync(boardPath, { force: true });
    mkdirSync(dirname(boardPath), { recursive: true });
    writeFileSync(
      boardPath,
      JSON.stringify({
        chat_id: chatId,
        message_id: 991,
        last_render_hash: "old",
        last_rendered_at: "2026-03-19T00:00:00Z",
        created_at: "2026-03-19T00:00:00Z",
        updated_at: "2026-03-19T00:00:00Z",
        current_view: { kind: "board" },
      })
    );

    const pins: Array<{ chatId: number; messageId: number }> = [];
    const unpinned: Array<{ chatId: number; messageId?: number }> = [];
    const deleted: Array<{ chatId: number; messageId: number }> = [];
    let sent = 0;
    let edited: Array<{ chatId: number; messageId: number }> = [];

    Bun.spawnSync = ((cmd: unknown, opts?: unknown) => {
      if (Array.isArray(cmd) && String(cmd[0]).endsWith("/subturtle/ctl") && cmd[1] === "list") {
        return {
          stdout: Buffer.from("  worker-a      running  yolo-codex   (PID 12345)   9m left       Same task"),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        } as ReturnType<typeof Bun.spawnSync>;
      }
      return originalSpawnSync(cmd as Parameters<typeof Bun.spawnSync>[0], opts as Parameters<typeof Bun.spawnSync>[1]);
    }) as typeof Bun.spawnSync;

    try {
      const result = await syncLiveSubturtleBoardForTest({
        sendMessage: async () => {
          sent += 1;
          return { message_id: 993, chat: { id: chatId } };
        },
        editMessageText: async (targetChatId: number, messageId: number) => {
          edited.push({ chatId: targetChatId, messageId });
        },
        pinChatMessage: async (targetChatId: number, messageId: number) => {
          pins.push({ chatId: targetChatId, messageId });
        },
        unpinChatMessage: async (targetChatId: number, messageId?: number) => {
          unpinned.push({ chatId: targetChatId, messageId });
        },
        deleteMessage: async (targetChatId: number, messageId: number) => {
          deleted.push({ chatId: targetChatId, messageId });
        },
      }, chatId, {
        force: true,
        pin: true,
        disableNotification: true,
        view: { kind: "detail", name: "worker-a" },
        targetMessageId: 992,
        allowCreateOnEditFailure: false,
      });

      expect(result.status).toBe("updated");
      expect(result.messageId).toBe(992);
      expect(sent).toBe(0);
      expect(edited).toEqual([{ chatId, messageId: 992 }]);
      expect(pins).toEqual([{ chatId, messageId: 992 }]);
      expect(unpinned).toEqual([{ chatId, messageId: 991 }]);
      expect(deleted).toEqual([{ chatId, messageId: 991 }]);

      const trackedBoard = JSON.parse(readFileSync(boardPath, "utf-8"));
      expect(trackedBoard.message_id).toBe(992);
      expect(trackedBoard.current_view).toEqual({ kind: "detail", name: "worker-a" });
    } finally {
      rmSync(boardPath, { force: true });
    }
  });
});
