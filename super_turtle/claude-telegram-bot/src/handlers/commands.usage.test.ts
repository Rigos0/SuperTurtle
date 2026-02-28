import { describe, expect, it } from "bun:test";
import { resolve } from "path";

process.env.TELEGRAM_BOT_TOKEN ||= "test-token";
process.env.TELEGRAM_ALLOWED_USERS ||= "123";
process.env.CLAUDE_WORKING_DIR ||= process.cwd();

const { formatUnifiedUsage } = await import("./commands");

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
    const originalSpawn = Bun.spawn;

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

      // Fallback to original if not mocked
      return originalSpawnSync(cmd, opts);
    };

    Bun.spawn = (cmd, opts) => {
      const cmdPath = Array.isArray(cmd) ? cmd[0] : cmd;

      if (cmdPath && cmdPath.includes("codex") && Array.isArray(cmd) && cmd[1] === "app-server") {
        // Mock codex app-server JSON-RPC responses
        codexFetchCalls += 1;

        // Combine all responses into a single newline-delimited JSON output
        const initResponse = JSON.stringify({ jsonrpc: "2.0", id: 1, result: {} });
        const rateLimitsResponse = JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          result: {
            rateLimits: {
              limitId: "codex",
              primary: {
                usedPercent: 70,
                windowDurationMins: 300,
                resetsAt: Math.floor(Date.now() / 1000) + 5400,
              },
              secondary: {
                usedPercent: 60,
                windowDurationMins: 10080,
                resetsAt: Math.floor(Date.now() / 1000) + 172800,
              },
              planType: "pro",
            },
          },
        });

        const encoder = new TextEncoder();
        const fullOutput = encoder.encode(initResponse + "\\n" + rateLimitsResponse + "\\n");

        let dataReturned = false;

        return {
          stdin: {
            write: () => {},
            end: () => {},
          },
          stdout: {
            getReader: () => ({
              read: async () => {
                if (!dataReturned) {
                  dataReturned = true;
                  return { done: false, value: fullOutput };
                }
                return { done: true, value: undefined };
              },
              releaseLock: () => {},
            }),
          },
          kill: () => {},
        };
      }

      // Fallback to original if not mocked
      return originalSpawn(cmd, opts);
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
    cmd: ["bun", "--no-env-file", "-e", script],
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

describe("formatUnifiedUsage", () => {
  it("shows unknown Claude status when usage lines are empty", () => {
    const output = formatUnifiedUsage([], [], false);

    expect(output).toContain("❓ <b>Claude Code</b>");
    expect(output).toContain("<i>No usage data available</i>");
    expect(output).not.toContain("✅ <b>Claude Code</b>");
  });

  it("shows unknown Codex status and partial summary when Codex data is empty", () => {
    const output = formatUnifiedUsage(["▓▓▓░░░░ 42% Session"], [], true);

    expect(output).toContain("❓ <b>Codex</b>");
    expect(output).toContain("<i>No quota data available</i>");
    expect(output).toContain("❓ <b>Status:</b> Partial data — check above");
    expect(output).not.toContain("✅ <b>Status:</b> All services operating normally");
  });

  it("escapes Codex plan type in HTML output", () => {
    const output = formatUnifiedUsage(
      ["▓▓▓░░░░ 42% Session"],
      ["__CODEX_PLAN_TYPE__<script>alert(1)</script>", "<code>████░░░░░░</code> 70% window"],
      true
    );

    expect(output).toContain("<b>Codex (&lt;script&gt;alert(1)&lt;/script&gt;)</b>");
    expect(output).not.toContain("<b>Codex (<script>alert(1)</script>)</b>");
  });
});

describe("/usage command with CODEX_ENABLED variations", () => {
  it("returns Claude section only when CODEX_ENABLED=false", async () => {
    const result = await probeUsage("false");
    if (result.exitCode !== 0) {
      throw new Error(`Probe failed (CODEX_ENABLED=false):\n${result.stderr || result.stdout}`);
    }
    expect(result.payload).not.toBeNull();
    expect(result.payload?.replyCount).toBe(1);
    expect(result.payload?.parseMode).toBe("HTML");
    expect(result.payload?.replyText).toContain("<b>Claude Code</b>");
    expect(result.payload?.replyText).not.toContain("<b>Codex</b>");
    expect(result.payload?.replyText).toContain("✅ <b>Status:</b> Claude Code operating normally");
    expect(result.payload?.codexFetchCalls).toBe(0);
  });

  it("returns Claude and Codex sections with status indicators when CODEX_ENABLED=true", async () => {
    const result = await probeUsage("true");
    if (result.exitCode !== 0) {
      throw new Error(`Probe failed (CODEX_ENABLED=true):\n${result.stderr || result.stdout}`);
    }
    expect(result.payload).not.toBeNull();
    expect(result.payload?.replyCount).toBe(1);
    expect(result.payload?.parseMode).toBe("HTML");
    expect(result.payload?.replyText).toContain("<b>Claude Code</b>");
    expect(result.payload?.replyText).toContain("<b>Codex (pro)</b>");
    expect(result.payload?.replyText).toMatch(/\d+%.*window/);
    expect(result.payload?.replyText).toContain("Resets");

    const hasStatusIndicator = result.payload?.replyText.includes("✅ <b>Status:</b>") ||
                                result.payload?.replyText.includes("⚠️ <b>Status:</b>") ||
                                result.payload?.replyText.includes("🔴 <b>Status:</b>");
    expect(hasStatusIndicator).toBe(true);
    expect(result.payload?.codexFetchCalls).toBeGreaterThan(0);
  });
});
