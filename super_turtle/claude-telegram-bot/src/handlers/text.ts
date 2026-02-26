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
    // Kill typing indicator immediately so the bot stops showing "typing..."
    session.stopTyping();
    await getCurrentDriver().stop();
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

      if (driver.isCrashError(error) && attempt < MAX_RETRIES) {
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

  // 11. Cleanup
  stopProcessing();
  typing.stop();
  session.typingController = null;
  await drainDeferredQueue(ctx, chatId);
}
