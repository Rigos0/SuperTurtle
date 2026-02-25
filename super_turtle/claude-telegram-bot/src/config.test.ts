import { describe, expect, it } from "bun:test";
import { resolve } from "path";

type ConfigProbeResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

const configPath = resolve(import.meta.dir, "config.ts");
const marker = "__CODEX_ENABLED__=";

async function probeCodexEnabled(
  codexEnabled: string | undefined
): Promise<ConfigProbeResult> {
  const env: Record<string, string> = {
    ...process.env,
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_ALLOWED_USERS: "123",
    CLAUDE_WORKING_DIR: process.cwd(),
  };

  if (codexEnabled === undefined) {
    delete env.CODEX_ENABLED;
  } else {
    env.CODEX_ENABLED = codexEnabled;
  }

  const script = `
    const config = await import(${JSON.stringify(configPath)});
    console.log(${JSON.stringify(marker)} + String(config.CODEX_ENABLED));
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

  return { exitCode, stdout, stderr };
}

function extractCodexEnabled(stdout: string): string | null {
  const line = stdout
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(marker));

  return line ? line.slice(marker.length) : null;
}

describe("config CODEX_ENABLED", () => {
  it("defaults to false when CODEX_ENABLED is unset", async () => {
    const result = await probeCodexEnabled(undefined);
    expect(result.exitCode).toBe(0);
    expect(extractCodexEnabled(result.stdout)).toBe("false");
  });

  it("loads true when CODEX_ENABLED=true", async () => {
    const result = await probeCodexEnabled("true");
    expect(result.exitCode).toBe(0);
    expect(extractCodexEnabled(result.stdout)).toBe("true");
  });

  it("loads false when CODEX_ENABLED=false", async () => {
    const result = await probeCodexEnabled("false");
    expect(result.exitCode).toBe(0);
    expect(extractCodexEnabled(result.stdout)).toBe("false");
  });
});
