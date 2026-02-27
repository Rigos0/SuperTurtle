import { describe, expect, it } from "bun:test";
import { resolve } from "path";

type ConfigProbeResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
};

type ConfigProbeOverrides = {
  codexEnabled?: string | undefined;
  metaCodexSandboxMode?: string | undefined;
  metaCodexApprovalPolicy?: string | undefined;
  metaCodexNetworkAccess?: string | undefined;
};

const configPath = resolve(import.meta.dir, "config.ts");

const MARKERS = {
  codexEnabled: "__CODEX_ENABLED__=",
  sandboxMode: "__META_CODEX_SANDBOX_MODE__=",
  approvalPolicy: "__META_CODEX_APPROVAL_POLICY__=",
  networkAccess: "__META_CODEX_NETWORK_ACCESS__=",
} as const;

async function probeConfig(overrides: ConfigProbeOverrides): Promise<ConfigProbeResult> {
  const env: Record<string, string> = {
    ...process.env,
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_ALLOWED_USERS: "123",
    CLAUDE_WORKING_DIR: process.cwd(),
  };

  const applyOverride = (envKey: string, value: string | undefined) => {
    if (value === undefined) {
      delete env[envKey];
      return;
    }
    env[envKey] = value;
  };

  applyOverride("CODEX_ENABLED", overrides.codexEnabled);
  applyOverride("META_CODEX_SANDBOX_MODE", overrides.metaCodexSandboxMode);
  applyOverride("META_CODEX_APPROVAL_POLICY", overrides.metaCodexApprovalPolicy);
  applyOverride("META_CODEX_NETWORK_ACCESS", overrides.metaCodexNetworkAccess);

  const script = `
    const config = await import(${JSON.stringify(configPath)});
    console.log(${JSON.stringify(MARKERS.codexEnabled)} + String(config.CODEX_ENABLED));
    console.log(${JSON.stringify(MARKERS.sandboxMode)} + String(config.META_CODEX_SANDBOX_MODE));
    console.log(${JSON.stringify(MARKERS.approvalPolicy)} + String(config.META_CODEX_APPROVAL_POLICY));
    console.log(${JSON.stringify(MARKERS.networkAccess)} + String(config.META_CODEX_NETWORK_ACCESS));
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

  return { exitCode, stdout, stderr };
}

function extractMarker(stdout: string, marker: string): string | null {
  const line = stdout
    .split("\n")
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(marker));

  return line ? line.slice(marker.length) : null;
}

describe("config defaults", () => {
  it("uses expected default runtime values when env vars are unset", async () => {
    const result = await probeConfig({
      codexEnabled: undefined,
      metaCodexSandboxMode: undefined,
      metaCodexApprovalPolicy: undefined,
      metaCodexNetworkAccess: undefined,
    });

    expect(result.exitCode).toBe(0);
    expect(extractMarker(result.stdout, MARKERS.codexEnabled)).toBe("false");
    expect(extractMarker(result.stdout, MARKERS.sandboxMode)).toBe("workspace-write");
    expect(extractMarker(result.stdout, MARKERS.approvalPolicy)).toBe("never");
    expect(extractMarker(result.stdout, MARKERS.networkAccess)).toBe("false");
  });
});

describe("config overrides", () => {
  it("accepts explicit valid Codex runtime policy values", async () => {
    const result = await probeConfig({
      codexEnabled: "true",
      metaCodexSandboxMode: "workspace-write",
      metaCodexApprovalPolicy: "on-request",
      metaCodexNetworkAccess: "false",
    });

    expect(result.exitCode).toBe(0);
    expect(extractMarker(result.stdout, MARKERS.codexEnabled)).toBe("true");
    expect(extractMarker(result.stdout, MARKERS.sandboxMode)).toBe("workspace-write");
    expect(extractMarker(result.stdout, MARKERS.approvalPolicy)).toBe("on-request");
    expect(extractMarker(result.stdout, MARKERS.networkAccess)).toBe("false");
  });

  it("falls back to safe defaults for invalid policy values", async () => {
    const result = await probeConfig({
      metaCodexSandboxMode: "invalid-mode",
      metaCodexApprovalPolicy: "always-ask",
      metaCodexNetworkAccess: "maybe",
    });

    expect(result.exitCode).toBe(0);
    expect(extractMarker(result.stdout, MARKERS.sandboxMode)).toBe("workspace-write");
    expect(extractMarker(result.stdout, MARKERS.approvalPolicy)).toBe("never");
    expect(extractMarker(result.stdout, MARKERS.networkAccess)).toBe("false");
  });
});
