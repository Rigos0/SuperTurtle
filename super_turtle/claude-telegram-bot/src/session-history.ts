import type { InjectedArtifact } from "./injected-artifacts";
import { readTurnLogEntries, type TurnLogEntry } from "./turn-log";
import type { DriverId } from "./drivers/types";
import type { RecentMessage, SavedSession } from "./types";

export type SessionHistorySource = "saved-session" | "turn-log" | "codex-jsonl";
export type SessionHistoryCompleteness = "full" | "partial";

export interface SessionHistoryMessage {
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export interface SessionHistoryView {
  source: SessionHistorySource;
  completeness: SessionHistoryCompleteness;
  path: string | null;
  messages: SessionHistoryMessage[];
  injectedArtifacts: InjectedArtifact[];
  context: {
    claudeMdLoaded: boolean | null;
    metaSharedLoaded: boolean | null;
    datePrefixApplied: boolean | null;
  };
}

function mapPreviewToMessages(preview?: string): SessionHistoryMessage[] {
  if (!preview) return [];

  const lines = preview
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 2);

  const messages: SessionHistoryMessage[] = [];
  for (const line of lines) {
    if (line.startsWith("You: ")) {
      messages.push({
        role: "user",
        text: line.slice(5).trim(),
        timestamp: "",
      });
    } else if (line.startsWith("Assistant: ")) {
      messages.push({
        role: "assistant",
        text: line.slice(11).trim(),
        timestamp: "",
      });
    }
  }
  return messages;
}

function assistantTextForTurn(turn: TurnLogEntry): string {
  if (turn.response && turn.response.trim().length > 0) {
    return turn.response;
  }
  return turn.status === "completed"
    ? "(No assistant response captured.)"
    : `(No assistant response captured; status: ${turn.status})`;
}

export function buildSavedSessionHistory(saved: SavedSession | null | undefined): SessionHistoryView | null {
  if (!saved) return null;

  const messages = saved.recentMessages && saved.recentMessages.length > 0
    ? saved.recentMessages.map((message) => ({
        role: message.role,
        text: message.text,
        timestamp: message.timestamp,
      }))
    : mapPreviewToMessages(saved.preview);

  if (messages.length === 0) return null;

  return {
    source: "saved-session",
    completeness: "partial",
    path: null,
    messages,
    injectedArtifacts: [],
    context: {
      claudeMdLoaded: null,
      metaSharedLoaded: null,
      datePrefixApplied: null,
    },
  };
}

export function buildTurnLogHistory(
  driver: DriverId,
  sessionId: string,
  limit = 5000
): SessionHistoryView | null {
  const turns = readTurnLogEntries({
    driver,
    sessionId,
    limit,
  });
  if (turns.length === 0) return null;
  return buildTurnLogHistoryFromEntries(turns);
}

export function buildTurnLogHistoryFromEntries(turns: TurnLogEntry[]): SessionHistoryView | null {
  if (turns.length === 0) return null;

  const messages: SessionHistoryMessage[] = [];
  for (const turn of turns) {
    if (turn.originalMessage) {
      messages.push({
        role: "user",
        text: turn.originalMessage,
        timestamp: turn.startedAt,
      });
    }
    messages.push({
      role: "assistant",
      text: assistantTextForTurn(turn),
      timestamp: turn.completedAt || turn.startedAt,
    });
  }

  const firstTurn = turns[0]!;
  return {
    source: "turn-log",
    completeness: "full",
    path: null,
    messages,
    injectedArtifacts: firstTurn.injectedArtifacts || [],
    context: {
      claudeMdLoaded: firstTurn.context.claudeMdLoaded,
      metaSharedLoaded: firstTurn.context.metaSharedLoaded,
      datePrefixApplied: firstTurn.injections.datePrefixApplied,
    },
  };
}

export function buildExternalSessionHistory(input: {
  source: SessionHistorySource;
  path?: string | null;
  completeness?: SessionHistoryCompleteness;
  messages: SessionHistoryMessage[];
  injectedArtifacts?: InjectedArtifact[];
  context?: Partial<SessionHistoryView["context"]>;
}): SessionHistoryView | null {
  if (input.messages.length === 0) return null;
  return {
    source: input.source,
    completeness: input.completeness || "full",
    path: input.path || null,
    messages: input.messages,
    injectedArtifacts: input.injectedArtifacts || [],
    context: {
      claudeMdLoaded: input.context?.claudeMdLoaded ?? null,
      metaSharedLoaded: input.context?.metaSharedLoaded ?? null,
      datePrefixApplied: input.context?.datePrefixApplied ?? null,
    },
  };
}

export function toRecentMessages(
  history: SessionHistoryView,
  maxMessages: number,
  maxMessageText: number
): RecentMessage[] {
  return history.messages.slice(-maxMessages).map((message) => ({
    role: message.role,
    text: message.text.length > maxMessageText
      ? message.text.slice(0, maxMessageText - 3) + "..."
      : message.text,
    timestamp: message.timestamp || new Date().toISOString(),
  }));
}
