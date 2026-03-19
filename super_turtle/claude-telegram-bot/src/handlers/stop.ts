import type { Context } from "grammy";
import { WORKING_DIR, CTL_PATH } from "../config";
import { session } from "../session";
import { stopActiveDriverQuery } from "./driver-routing";
import { clearDeferredQueue, suppressDrain } from "../deferred-queue";
import { cleanupToolMessages, clearStreamingState, getStreamingState } from "./streaming";
import { streamLog } from "../logger";
const stopLog = streamLog.child({ handler: "stop" });
const stopReplyHandledChats = new Set<number>();
const recentStopReplyExpiryByChat = new Map<number, number>();
const inFlightStopByChat = new Map<number, Promise<void>>();
const STOP_REPLY_DEDUPE_WINDOW_MS = 2_000;

export interface StopSubturtlesResult {
  attempted: string[];
  stopped: string[];
  failed: string[];
}

export interface StopAllRunningWorkResult extends StopSubturtlesResult {
  driverStopResult: "stopped" | "pending" | false;
  queueCleared: number;
}

function parseRunningSubturtleNames(output: string): string[] {
  const names = new Set<string>();

  for (const rawLine of output.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("→")) {
      continue;
    }

    const match = line.match(/^([a-zA-Z0-9._-]+)\s+running\b/);
    if (match?.[1]) {
      names.add(match[1]);
    }
  }

  return Array.from(names);
}

export function stopAllRunningSubturtles(): StopSubturtlesResult {
  let runningNames: string[] = [];

  try {
    const listProc = Bun.spawnSync([CTL_PATH, "list"], {
      cwd: WORKING_DIR,
      env: {
        ...process.env,
        SUPER_TURTLE_PROJECT_DIR: WORKING_DIR,
        CLAUDE_WORKING_DIR: WORKING_DIR,
      },
    });
    const listOutput = `${listProc.stdout.toString()}\n${listProc.stderr.toString()}`;
    runningNames = parseRunningSubturtleNames(listOutput);
  } catch (error) {
    stopLog.warn({ err: error }, "Failed to list running SubTurtles");
    return { attempted: [], stopped: [], failed: [] };
  }

  const stopped: string[] = [];
  const failed: string[] = [];

  for (const name of runningNames) {
    try {
      const stopProc = Bun.spawnSync([CTL_PATH, "stop", name], { cwd: WORKING_DIR });
      if (stopProc.exitCode === 0) {
        stopped.push(name);
      } else {
        failed.push(name);
      }
    } catch (error) {
      stopLog.warn({ err: error, name }, "Failed to stop SubTurtle");
      failed.push(name);
    }
  }

  return {
    attempted: runningNames,
    stopped,
    failed,
  };
}

async function performStop(
  chatId: number | undefined,
  stopSubturtles: boolean
): Promise<StopAllRunningWorkResult> {
  // Suppress drain FIRST — wins the race against finally-block drains
  // that fire when we kill the driver process below.
  if (chatId != null) {
    suppressDrain(chatId);
  }

  session.stopTyping();
  const driverStopResult = await stopActiveDriverQuery();
  const subturtleResult = stopSubturtles
    ? stopAllRunningSubturtles()
    : { attempted: [], stopped: [], failed: [] };
  const queueCleared = chatId != null ? clearDeferredQueue(chatId) : 0;

  return {
    driverStopResult,
    queueCleared,
    ...subturtleResult,
  };
}

export async function stopAllRunningWork(chatId?: number): Promise<StopAllRunningWorkResult> {
  return performStop(chatId, true);
}

export async function stopForegroundWork(chatId?: number): Promise<StopAllRunningWorkResult> {
  return performStop(chatId, false);
}

export function consumeHandledStopReply(chatId: number | undefined): boolean {
  if (chatId == null || !stopReplyHandledChats.has(chatId)) {
    return false;
  }
  stopReplyHandledChats.delete(chatId);
  return true;
}

function hasRecentStopReply(chatId: number, now = Date.now()): boolean {
  const expiresAt = recentStopReplyExpiryByChat.get(chatId);
  if (typeof expiresAt !== "number") {
    return false;
  }
  if (expiresAt <= now) {
    recentStopReplyExpiryByChat.delete(chatId);
    return false;
  }
  return true;
}

function markRecentStopReply(chatId: number, now = Date.now()): void {
  recentStopReplyExpiryByChat.set(chatId, now + STOP_REPLY_DEDUPE_WINDOW_MS);
}

/**
 * Unified user-facing stop handler for all stop entrypoints.
 * Stops the active foreground run and clears the queue, but leaves background
 * SubTurtles alone.
 */
export async function handleStop(ctx: Context, chatId: number): Promise<void> {
  if (hasRecentStopReply(chatId)) {
    stopLog.info({ chatId }, "Suppressed duplicate stop reply");
    return;
  }

  const inFlightStop = inFlightStopByChat.get(chatId);
  if (inFlightStop) {
    stopLog.info({ chatId }, "Joined in-flight stop request");
    await inFlightStop;
    return;
  }

  const stopPromise = (async () => {
    const state = getStreamingState(chatId);
    const result = await stopForegroundWork(chatId);
    const driverStopped = result.driverStopResult !== false;
    if (state) {
      await cleanupToolMessages(ctx, state);

      // Append an explicit stopped indicator to the last streamed text segment, if any.
      const segmentIds = driverStopped ? [...state.textMessages.keys()] : [];
      if (segmentIds.length > 0) {
        const lastSegmentId = Math.max(...segmentIds);
        const lastMsg = state.textMessages.get(lastSegmentId);
        const lastContent = state.lastContent.get(lastSegmentId);
        const suffix = "\n\n⏹ <i>Stopped</i>";

        if (
          lastMsg &&
          lastContent &&
          lastContent.trim().length > 0 &&
          !lastContent.includes("⏹ <i>Stopped</i>")
        ) {
          try {
            await ctx.api.editMessageText(
              lastMsg.chat.id,
              lastMsg.message_id,
              `${lastContent}${suffix}`,
              { parse_mode: "HTML" }
            );
          } catch {
            // Ignore edit failures (message deleted, unchanged, or invalid HTML)
          }
        }
      }
    }
    clearStreamingState(chatId);

    let message = "Nothing to stop.";
    if (driverStopped) {
      stopReplyHandledChats.add(chatId);
      message = "🛑 Stopped current work.";
      if (result.queueCleared > 0) {
        message =
          `🛑 Stopped current work. Cleared ${result.queueCleared} queued message` +
          `${result.queueCleared === 1 ? "" : "s"}.`;
      }
    } else if (result.queueCleared > 0) {
      message =
        `🛑 Cleared ${result.queueCleared} queued message` +
        `${result.queueCleared === 1 ? "" : "s"}.`;
    }

    stopLog.info(
      {
        chatId,
        stopSubturtles: false,
        driverStopResult: result.driverStopResult,
        subturtlesAttempted: result.attempted.length,
        subturtlesStopped: result.stopped.length,
        queueCleared: result.queueCleared,
      },
      "Stop executed"
    );

    await ctx.reply(message);
    markRecentStopReply(chatId);
  })();

  inFlightStopByChat.set(chatId, stopPromise);
  try {
    await stopPromise;
  } finally {
    if (inFlightStopByChat.get(chatId) === stopPromise) {
      inFlightStopByChat.delete(chatId);
    }
  }
}
