/**
 * Text message handler for Claude Telegram Bot.
 */

import type { Context, NextFunction } from "grammy";
import { session } from "../session";
import { ALLOWED_USERS } from "../config";
import { getCurrentDriver } from "../drivers/registry";
import { isAuthorized, rateLimiter } from "../security";
import {
  auditLog,
  auditLogRateLimit,
  checkInterrupt,
  isStopIntent,
  startTypingIndicator,
} from "../utils";
import { drainDeferredQueue } from "../deferred-queue";
import { stopAllRunningWork } from "./stop";
import {
  StreamingState,
  createSilentStatusCallback,
  createStatusCallback,
  isAskUserPromptMessage,
} from "./streaming";

export interface HandleTextOptions {
  silent?: boolean;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function summarizeErrorMessage(error: unknown, maxLength = 240): string {
  const compact = getErrorMessage(error).replace(/\s+/g, " ").trim();
  return compact.length > maxLength
    ? `${compact.slice(0, maxLength - 3)}...`
    : compact;
}

function buildStallRecoveryPrompt(originalMessage: string): string {
  return `The previous response stream stalled before completion while handling this request.
Continue from current repository/runtime state and finish the task safely.
Before making changes, verify what already happened (for example existing files, running processes, or prior command effects).
Do not blindly repeat side-effecting operations that may have already succeeded.

Original request:
${originalMessage}`;
}

function buildSpawnOrchestrationRecoveryPrompt(originalMessage: string): string {
  return `The previous response stream stalled after SubTurtle spawn orchestration.
Continue from current repository/runtime state and finish the task safely.
Before taking any side-effecting action:
1) Run ./super_turtle/subturtle/ctl list and treat already-running SubTurtles as successfully spawned.
2) If any intended SubTurtles are missing, spawn only the missing ones.
3) Never re-run spawn commands for names that already exist or are running.
4) Report exact running names and any missing/failed names.

Original request:
${originalMessage}`;
}

/**
 * Handle incoming text messages.
 */
export async function handleText(
  ctx: Context,
  nextOrOptions?: NextFunction | HandleTextOptions
): Promise<void> {
  const options =
    typeof nextOrOptions === "function" || nextOrOptions === undefined
      ? {}
      : nextOrOptions;
  const silent = options.silent ?? false;
  const userId = ctx.from?.id;
  const username = ctx.from?.username || "unknown";
  const chatId = ctx.chat?.id;
  let message = ctx.message?.text;

  if (!userId || !message || !chatId) {
    return;
  }

  // 1. Authorization check
  if (!isAuthorized(userId, ALLOWED_USERS)) {
    if (!silent) {
      await ctx.reply("Unauthorized. Contact the bot owner for access.");
    }
    return;
  }

  // 1.5. Bare "stop" — intercept and abort (acts like /stop)
  if (isStopIntent(message)) {
    await stopAllRunningWork();
    // Don't send "stop" to Claude — just swallow it
    return;
  }

  // 2. Check for interrupt prefix
  message = await checkInterrupt(message);
  if (!message.trim()) {
    return;
  }

  // 3. Rate limit check
  const [allowed, retryAfter] = rateLimiter.check(userId);
  if (!allowed) {
    await auditLogRateLimit(userId, username, retryAfter!);
    if (!silent) {
      await ctx.reply(
        `⏳ Rate limited. Please wait ${retryAfter!.toFixed(1)} seconds.`
      );
    }
    return;
  }

  // 4. Store message for retry
  session.lastMessage = message;

  // 5. Set conversation title from first message (if new session)
  if (!session.isActive) {
    // Truncate title to ~50 chars
    const title =
      message.length > 50 ? message.slice(0, 47) + "..." : message;
    session.conversationTitle = title;
  }

  // 6. Mark processing started
  const stopProcessing = session.startProcessing();

  // 7. Start typing indicator
  const typing = startTypingIndicator(ctx);
  session.typingController = typing;

  // 8. Create streaming state and callback
  try {
    let state = new StreamingState();
    let statusCallback = silent
      ? createSilentStatusCallback(ctx, state)
      : createStatusCallback(ctx, state);

    // 9. Driver abstraction path
    const driver = getCurrentDriver();
    const MAX_RETRIES = 1;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await driver.runMessage({
          message,
          username,
          userId,
          chatId,
          ctx,
          statusCallback,
        });

        await auditLog(userId, username, driver.auditEvent, message, response);
        break;
      } catch (error) {
        const errorSummary = summarizeErrorMessage(error);
        // Clean up any partial messages from this attempt
        for (const toolMsg of state.toolMessages) {
          if (isAskUserPromptMessage(toolMsg)) continue;
          try {
            await ctx.api.deleteMessage(toolMsg.chat.id, toolMsg.message_id);
          } catch {
            // Ignore cleanup errors
          }
        }

        // Empty response from stale session — session was already cleared,
        // so retry will start a fresh session transparently.
        if (getErrorMessage(error).includes("Empty response from stale session") && attempt < MAX_RETRIES) {
          console.log(
            `Empty response from stale session, retrying with fresh session (attempt ${attempt + 2}/${MAX_RETRIES + 1})`
          );
          state = new StreamingState();
          statusCallback = silent
            ? createSilentStatusCallback(ctx, state)
            : createStatusCallback(ctx, state);
          continue;
        }

        if (driver.isStallError(error) && attempt < MAX_RETRIES) {
          if (state.sawSpawnOrchestration) {
            console.warn(`${driver.displayName} stream stalled after spawn orchestration; running safe continuation retry`);
            if (!silent) {
              await ctx.reply(
                `⚠️ ${driver.displayName} stream stalled after spawn orchestration. Resuming with state verification to avoid duplicate SubTurtle spawns.`
              );
            }
            message = buildSpawnOrchestrationRecoveryPrompt(message);
            state = new StreamingState();
            statusCallback = silent
              ? createSilentStatusCallback(ctx, state)
              : createStatusCallback(ctx, state);
            continue;
          }

          console.warn(
            `${driver.displayName} stream stalled, running one continuation attempt (attempt ${attempt + 2}/${MAX_RETRIES + 1})`
          );

          if (!silent) {
            await ctx.reply(
              state.sawToolUse
                ? `⚠️ ${driver.displayName} stream stalled mid-task, resuming from current state...`
                : `⚠️ ${driver.displayName} stream stalled, retrying...`
            );
          }

          if (!state.sawToolUse) {
            await driver.kill();
          } else {
            message = buildStallRecoveryPrompt(message);
          }

          state = new StreamingState();
          statusCallback = silent
            ? createSilentStatusCallback(ctx, state)
            : createStatusCallback(ctx, state);
          continue;
        }

        if (driver.isCrashError(error) && attempt < MAX_RETRIES && !state.sawToolUse) {
          console.log(
            `${driver.displayName} crashed, retrying (attempt ${attempt + 2}/${MAX_RETRIES + 1})...`
          );
          await driver.kill();
          if (!silent) {
            await ctx.reply(`⚠️ ${driver.displayName} crashed, retrying...`);
          }
          // Reset state for retry
          state = new StreamingState();
          statusCallback = silent
            ? createSilentStatusCallback(ctx, state)
            : createStatusCallback(ctx, state);
          continue;
        }

        if (driver.isCrashError(error) && state.sawToolUse) {
          console.warn(
            `${driver.displayName} crashed after tool execution; skipping automatic retry to avoid replaying side effects`
          );
        }

        // Final attempt failed or non-retryable error
        console.error(`Error processing message: ${errorSummary}`);

        if (driver.isCancellationError(error)) {
          const wasInterrupt = session.consumeInterruptFlag();
          if (!silent && !wasInterrupt) {
            await ctx.reply("🛑 Query stopped.");
          }
        } else if (!silent) {
          await ctx.reply(`❌ Error: ${errorSummary.slice(0, 200)}`);
        }
        break;
      }
    }
  } finally {
    // Keep processing state consistent even if error-path notifications fail.
    stopProcessing();
    typing.stop();
    session.typingController = null;
    await drainDeferredQueue(ctx, chatId);
  }
}
