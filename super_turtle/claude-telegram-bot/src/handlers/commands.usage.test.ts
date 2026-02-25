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
    OPENAI_ADMIN_KEY: "test-admin-key",
  };

  const script = `
    const marker = ${JSON.stringify(marker)};
    const modulePath = ${JSON.stringify(commandsPath)};

    Bun.spawnSync = () => ({
      stdout: Buffer.from(JSON.stringify({
        claudeAiOauth: { accessToken: "test-claude-token" },
      })),
      stderr: Buffer.from(""),
      success: true,
      exitCode: 0,
    });

    let codexFetchCalls = 0;
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

      if (url.includes("/v1/organization/usage/completions")) {
        codexFetchCalls += 1;
        return new Response(
          JSON.stringify({
            data: [
              {
                results: [
                  {
                    num_model_requests: 3,
                    input_tokens: 1200,
                    output_tokens: 800,
                    input_cached_tokens: 100,
                  },
                ],
              },
            ],
            has_more: false,
            next_page: null,
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
