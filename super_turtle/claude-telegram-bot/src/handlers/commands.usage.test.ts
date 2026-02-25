import { describe, expect, it } from "bun:test";
import { resolve } from "path";

type UsageProbePayload = {
  replyCount: number;
  replyText: string;
  parseMode?: string;
  codexFetchCalls: number;
};

type UsageProbeResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  payload: UsageProbePayload | null;
};

const commandsPath = resolve(import.meta.dir, "commands.ts");
const marker = "__USAGE_PROBE__=";

async function probeUsage(codexEnabled: "true" | "false"): Promise<UsageProbeResult> {
  const env: Record<string, string> = {
    ...process.env,
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_ALLOWED_USERS: "123",
    CLAUDE_WORKING_DIR: process.cwd(),
    CODEX_ENABLED: codexEnabled,
    HOME: process.env.HOME || "/tmp",
  };

  const script = `
    const marker = ${JSON.stringify(marker)};
    const modulePath = ${JSON.stringify(commandsPath)};

    let codexFetchCalls = 0;

    const originalSpawnSync = Bun.spawnSync;
    Bun.spawnSync = (cmd, opts) => {
      if (Array.isArray(cmd) && cmd[0] === "security") {
        // Mock security find-generic-password for Claude token
        return {
          stdout: Buffer.from(JSON.stringify({
            claudeAiOauth: { accessToken: "test-claude-token" },
          })),
          stderr: Buffer.from(""),
          success: true,
          exitCode: 0,
        };
      }

      if (Array.isArray(cmd) && cmd[0] === "codex") {
        // Mock codex exec /stats command to fail, forcing fallback to history file
        codexFetchCalls += 1;
        return {
          stdout: Buffer.from(""),
          stderr: Buffer.from("error"),
          success: false,
          exitCode: 1,
        };
      }

      // Fallback to original if not mocked
      return originalSpawnSync(cmd, opts);
    };

    const originalFile = Bun.file;
    Bun.file = (path) => {
      // Handle all types of paths (string, BunFile, etc.)
      const pathStr = typeof path === "string" ? path : String(path);
      if (pathStr && pathStr.includes(".codex/history.jsonl")) {
        // Return mock history file with recent entries (within 7 days)
        const now = Math.floor(Date.now() / 1000);
        const mockHistory = [
          JSON.stringify({ session_id: "sess-1", ts: now - 100000, text: "Hello world test" }),
          JSON.stringify({ session_id: "sess-1", ts: now - 50000, text: "Another test message with more words" }),
          JSON.stringify({ session_id: "sess-2", ts: now - 1000, text: "Third session test" }),
        ].join("\\n");

        return {
          text: async () => mockHistory,
        };
      }
      return originalFile(path);
    };

    globalThis.fetch = async (input) => {
      const url = typeof input === "string" ? input : input.url;

      if (url.includes("api.anthropic.com/api/oauth/usage")) {
        return new Response(
          JSON.stringify({
            five_hour: { utilization: 42, resets_at: "2026-02-25T18:00:00Z" },
          }),
          { status: 200 }
        );
      }

      return new Response("not found", { status: 404 });
    };

    const { handleUsage } = await import(modulePath);

    const replies = [];
    const ctx = {
      from: { id: 123 },
      reply: async (text, extra) => {
        replies.push({ text, parseMode: extra?.parse_mode });
      },
    };

    await handleUsage(ctx);

    const payload = {
      replyCount: replies.length,
      replyText: replies[0]?.text || "",
      parseMode: replies[0]?.parseMode,
      codexFetchCalls,
    };

    console.log(marker + JSON.stringify(payload));
  `;

  const proc = Bun.spawn({
    cmd: ["bun", "-e", script],
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  const payloadLine = stdout
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith(marker));

  const payload = payloadLine
    ? (JSON.parse(payloadLine.slice(marker.length)) as UsageProbePayload)
    : null;

  return { exitCode, stdout, stderr, payload };
}

describe("/usage command with CODEX_ENABLED variations", () => {
  it("returns Claude section only when CODEX_ENABLED=false", async () => {
    const result = await probeUsage("false");
    expect(result.exitCode).toBe(0);
    expect(result.payload).not.toBeNull();
    expect(result.payload?.replyCount).toBe(1);
    expect(result.payload?.parseMode).toBe("HTML");
    expect(result.payload?.replyText).toContain("<b>Usage</b>");
    expect(result.payload?.replyText).toContain("<b>Claude usage</b>");
    expect(result.payload?.replyText).not.toContain("<b>Codex usage</b>");
    expect(result.payload?.codexFetchCalls).toBe(0);
  });

  it("returns Claude and Codex sections when CODEX_ENABLED=true", async () => {
    const result = await probeUsage("true");
    expect(result.exitCode).toBe(0);
    expect(result.payload).not.toBeNull();
    expect(result.payload?.replyCount).toBe(1);
    expect(result.payload?.parseMode).toBe("HTML");
    expect(result.payload?.replyText).toContain("<b>Usage</b>");
    expect(result.payload?.replyText).toContain("<b>Claude usage</b>");
    expect(result.payload?.replyText).toContain("<b>Codex usage</b>");
    expect(result.payload?.replyText).toContain("Codex (last 7 days)");
    expect(result.payload?.codexFetchCalls).toBeGreaterThan(0);
  });
});
