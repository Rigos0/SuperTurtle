import { describe, expect, it } from "bun:test";

import { resolveRemoteAgentDriverDecision } from "./remote-agent-driver";

describe("resolveRemoteAgentDriverDecision", () => {
  it("accepts Codex when the remote runtime exposes Codex", () => {
    expect(
      resolveRemoteAgentDriverDecision({
        driver: "codex",
        claudeCliAvailable: true,
        codexAvailable: true,
        codexUnavailableReason: null,
      })
    ).toEqual({
      ok: true,
      driver: "codex",
      startupMessage: "Starting in teleport-remote agent mode with Codex as the active driver",
    });
  });

  it("fails Codex startup with the Codex readiness body when Codex is unavailable", () => {
    expect(
      resolveRemoteAgentDriverDecision({
        driver: "codex",
        claudeCliAvailable: true,
        codexAvailable: false,
        codexUnavailableReason: "Codex is disabled in config (CODEX_ENABLED=false).",
      })
    ).toEqual({
      ok: false,
      driver: "codex",
      errorMessage:
        "Remote agent mode requires Codex inside E2B. Codex is disabled in config (CODEX_ENABLED=false).",
      readinessBody:
        "remote-agent-codex-unavailable: Codex is disabled in config (CODEX_ENABLED=false).",
    });
  });

  it("accepts Claude when the remote runtime exposes Claude Code", () => {
    expect(
      resolveRemoteAgentDriverDecision({
        driver: "claude",
        claudeCliAvailable: true,
        codexAvailable: false,
        codexUnavailableReason: "Codex is disabled in config (CODEX_ENABLED=false).",
      })
    ).toEqual({
      ok: true,
      driver: "claude",
      startupMessage: "Starting in teleport-remote agent mode with Claude as the active driver",
    });
  });

  it("fails Claude startup with the Claude readiness body when Claude CLI is unavailable", () => {
    expect(
      resolveRemoteAgentDriverDecision({
        driver: "claude",
        claudeCliAvailable: false,
        codexAvailable: true,
        codexUnavailableReason: null,
      })
    ).toEqual({
      ok: false,
      driver: "claude",
      errorMessage:
        "Remote agent mode requires Claude Code inside E2B. Claude CLI is unavailable.",
      readinessBody: "remote-agent-claude-unavailable: Claude CLI is unavailable.",
    });
  });
});
