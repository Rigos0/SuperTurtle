import { afterEach, describe, expect, it, mock } from "bun:test";

type ReplyRecord = {
  text: string;
};

function makeCtx(messageText: string) {
  const replies: ReplyRecord[] = [];
  const setMyCommandsCalls: Array<Array<{ command: string; description: string }>> = [];
  return {
    ctx: {
      from: { id: 123 },
      chat: { id: 456 },
      message: { text: messageText },
      api: {
        async deleteMessage() {},
        async setMyCommands(commands: Array<{ command: string; description: string }>) {
          setMyCommandsCalls.push(commands);
        },
      },
      reply: async (text: string) => {
        replies.push({ text });
        return {
          chat: { id: 456 },
          message_id: replies.length,
        };
      },
    },
    replies,
    setMyCommandsCalls,
  };
}

async function loadCommandsModuleForRole(
  role: "local" | "teleport-remote",
  teleportOverrides: Record<string, unknown>
) {
  const actualConfig = await import("../config");
  mock.module("../config", () => ({
    ...actualConfig,
    ALLOWED_USERS: [123],
    SUPERTURTLE_RUNTIME_ROLE: role,
  }));

  mock.module("../teleport", () => ({
    TELEPORT_CONTROL_MESSAGE:
      "This remote teleport runtime is control-only. Use /home to return Telegram ownership to your PC.",
    TELEPORT_REMOTE_ALLOWED_COMMANDS: new Set([
      "home",
      "status",
      "looplogs",
      "pinologs",
      "debug",
      "restart",
    ]),
    loadTeleportStateForCurrentProject: () => null,
    recentlyReturnedHome: () => false,
    reconcileTeleportOwnershipForCurrentProject: async () => null,
    launchTeleportRuntimeForCurrentProject: async () => ({
      sandboxId: "sbx_123",
      webhookUrl: "https://example.test/telegram/webhook/demo",
    }),
    activateTeleportOwnershipForCurrentProject: async () => ({
      state: {
        sandboxId: "sbx_123",
        webhookUrl: "https://example.test/telegram/webhook/demo",
      },
    }),
    releaseTeleportOwnershipForCurrentProject: async () => ({
      state: null,
    }),
    ...teleportOverrides,
  }));

  return import(`./commands.ts?teleport-test=${role}-${Date.now()}-${Math.random()}`);
}

afterEach(() => {
  mock.restore();
});

describe("teleport commands", () => {
  it("launches remote ownership from the local runtime", async () => {
    const { handleTeleport } = await loadCommandsModuleForRole("local", {});
    const { ctx, replies, setMyCommandsCalls } = makeCtx("/teleport");

    await handleTeleport(ctx as never);

    expect(replies.some((reply) => reply.text.includes("✅ Teleported to E2B."))).toBe(true);
    expect(setMyCommandsCalls.at(-1)?.map((entry) => entry.command)).toContain("home");
  });

  it("returns an already-remote message when teleport is called from E2B", async () => {
    const { handleTeleport } = await loadCommandsModuleForRole("teleport-remote", {});
    const { ctx, replies } = makeCtx("/teleport");

    await handleTeleport(ctx as never);

    expect(replies).toEqual([
      { text: "ℹ️ Already running in E2B webhook mode. Use /home to return ownership to your PC." },
    ]);
  });

  it("releases webhook ownership from the remote runtime", async () => {
    const { handleHome } = await loadCommandsModuleForRole("teleport-remote", {});
    const { ctx, replies, setMyCommandsCalls } = makeCtx("/home");

    await handleHome(ctx as never);

    expect(replies.some((reply) => reply.text.includes("✅ Telegram ownership returned"))).toBe(true);
    expect(setMyCommandsCalls.at(-1)?.map((entry) => entry.command)).toContain("teleport");
  });

  it("reports that local runtime is already home", async () => {
    const { handleHome } = await loadCommandsModuleForRole("local", {});
    const { ctx, replies } = makeCtx("/home");

    await handleHome(ctx as never);

    expect(replies).toEqual([
      { text: "ℹ️ This turtle is already local. Use /teleport to move Telegram ownership to E2B." },
    ]);
  });

  it("treats a just-finished remote return as already completed on local /home", async () => {
    const { handleHome } = await loadCommandsModuleForRole("local", {
      recentlyReturnedHome: () => true,
      loadTeleportStateForCurrentProject: () => ({
        ownerMode: "local",
        updatedAt: new Date().toISOString(),
      }),
    });
    const { ctx, replies } = makeCtx("/home");

    await handleHome(ctx as never);

    expect(replies).toEqual([
      { text: "✅ Telegram ownership already returned to the local polling turtle." },
    ]);
  });
});
