import type { MainProvider } from "./config";

export type RemoteAgentDriverDecision =
  | {
      ok: true;
      driver: MainProvider;
      startupMessage: string;
    }
  | {
      ok: false;
      driver: MainProvider;
      errorMessage: string;
      readinessBody: string;
    };

export function resolveRemoteAgentDriverDecision(input: {
  driver: MainProvider;
  claudeCliAvailable: boolean;
  codexAvailable: boolean;
  codexUnavailableReason: string | null;
}): RemoteAgentDriverDecision {
  if (input.driver === "codex") {
    if (!input.codexAvailable) {
      return {
        ok: false,
        driver: "codex",
        errorMessage:
          `Remote agent mode requires Codex inside E2B. ${input.codexUnavailableReason || "Codex is unavailable."}`,
        readinessBody:
          `remote-agent-codex-unavailable: ${input.codexUnavailableReason || "Codex is unavailable."}`,
      };
    }
    return {
      ok: true,
      driver: "codex",
      startupMessage: "Starting in teleport-remote agent mode with Codex as the active driver",
    };
  }

  if (!input.claudeCliAvailable) {
    return {
      ok: false,
      driver: "claude",
      errorMessage:
        "Remote agent mode requires Claude Code inside E2B. Claude CLI is unavailable.",
      readinessBody: "remote-agent-claude-unavailable: Claude CLI is unavailable.",
    };
  }

  return {
    ok: true,
    driver: "claude",
    startupMessage: "Starting in teleport-remote agent mode with Claude as the active driver",
  };
}
