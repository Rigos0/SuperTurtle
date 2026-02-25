/**
 * Text message handler for Claude Telegram Bot.
 */

import type { Context, NextFunction } from "grammy";
import { session } from "../session";
import { codexSession, mapThinkingToReasoningEffort } from "../codex-session";
import { ALLOWED_USERS, DRIVER_ABSTRACTION_V1 } from "../config";
import { getCurrentDriver } from "../drivers/registry";
import { isAuthorized, rateLimiter } from "../security";
import {
  auditLog,
  auditLogRateLimit,
  checkInterrupt,
  startTypingIndicator,
} from "../utils";
import {
  StreamingState,
  createSilentStatusCallback,
  createStatusCallback,
  checkPendingAskUserRequests,
  checkPendingSendTurtleRequests,
  checkPendingBotControlRequests,
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

function isLikelyUsageLimitError(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes("usage limit") ||
    text.includes("rate limit") ||
    text.includes("quota") ||
    text.includes("limit reached") ||
    text.includes("insufficient") ||
    text.includes("billing")
  );
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
  if (message.toLowerCase().trimStart().startsWith("stop")) {
    // Kill typing indicator immediately so the bot stops showing "typing..."
    session.stopTyping();

    if (DRIVER_ABSTRACTION_V1) {
      await getCurrentDriver().stop();
    } else if (session.isRunning) {
      const result = await session.stop();
      if (result) {
        await Bun.sleep(100);
        session.clearStopRequested();
      }
    }
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

  if (DRIVER_ABSTRACTION_V1) {
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
  } else {
    // 9. Legacy driver-specific path
    let response: string;

    if (session.activeDriver === "codex") {
    // Codex path with streaming
      const MAX_RETRIES = 1;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          // Map thinking keywords to reasoning effort
          const reasoningEffort = mapThinkingToReasoningEffort(message);

          response = await codexSession.sendMessage(
            message,
            statusCallback,
            undefined, // model - use Codex's saved preference
            reasoningEffort // reasoningEffort - mapped from keywords
          );

          // Check for pending MCP requests (ask-user buttons, send-turtle stickers, bot-control responses)
          // These are written to /tmp by MCP servers during tool execution
          if (chatId) {
            // Small delay to let MCP servers write files
            await new Promise((resolve) => setTimeout(resolve, 200));

            // Check ask-user requests (may wait for user selection)
            for (let attempt = 0; attempt < 3; attempt++) {
              const buttonsSent = await checkPendingAskUserRequests(ctx, chatId);
              if (buttonsSent) break;
              if (attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
            }

            // Check send-turtle requests
            for (let attempt = 0; attempt < 3; attempt++) {
              const photoSent = await checkPendingSendTurtleRequests(ctx, chatId);
              if (photoSent) break;
              if (attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
            }

            // Check bot-control requests
            for (let attempt = 0; attempt < 3; attempt++) {
              const handled = await checkPendingBotControlRequests(session, chatId);
              if (handled) break;
              if (attempt < 2) {
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
            }
          }

          // 10. Audit log
          await auditLog(userId, username, "TEXT_CODEX", message, response);
          break; // Success - exit retry loop
        } catch (error) {
          const errorSummary = summarizeErrorMessage(error);
          const errorLower = errorSummary.toLowerCase();
          const isCodexCrash =
            errorLower.includes("crashed") || errorLower.includes("failed");

          // Clean up any partial messages from this attempt
          for (const toolMsg of state.toolMessages) {
            try {
              await ctx.api.deleteMessage(toolMsg.chat.id, toolMsg.message_id);
            } catch {
              // Ignore cleanup errors
            }
          }

          // Retry on Codex crash (not user cancellation)
          if (isCodexCrash && attempt < MAX_RETRIES) {
            console.log(
              `Codex crashed, retrying (attempt ${attempt + 2}/${MAX_RETRIES + 1})...`
            );
            await codexSession.kill(); // Clear corrupted session
            if (!silent) {
              await ctx.reply(`⚠️ Codex crashed, retrying...`);
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

          // Check if it was a cancellation
          if (errorLower.includes("abort") || errorLower.includes("cancel")) {
            // Only show "Query stopped" if it was an explicit stop, not an interrupt from a new message
            const wasInterrupt = session.consumeInterruptFlag();
            if (!silent && !wasInterrupt) {
              await ctx.reply("🛑 Query stopped.");
            }
          } else {
            if (!silent) {
              await ctx.reply(`❌ Error: ${errorSummary.slice(0, 200)}`);
            }
          }
          break; // Exit loop after handling error
        }
      }
    } else {
      // Claude path (original)
      const MAX_RETRIES = 1;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          response = await session.sendMessageStreaming(
            message,
            username,
            userId,
            statusCallback,
            chatId,
            ctx
          );

          // 10. Audit log
          await auditLog(userId, username, "TEXT", message, response);
          break; // Success - exit retry loop
        } catch (error) {
          const errorSummary = summarizeErrorMessage(error);
          const errorLower = errorSummary.toLowerCase();
          const isClaudeCodeCrash =
            errorLower.includes("exited with code") ||
            errorLower.includes("terminated by signal");
          const isUsageLimit = isLikelyUsageLimitError(errorLower);
          const isGenericExitCode1 = errorLower.includes("exited with code 1");

          // Clean up any partial messages from this attempt
          for (const toolMsg of state.toolMessages) {
            try {
              await ctx.api.deleteMessage(toolMsg.chat.id, toolMsg.message_id);
            } catch {
              // Ignore cleanup errors
            }
          }

          // Retry on likely transient Claude crashes, but not usage/quota failures
          if (
            isClaudeCodeCrash &&
            !isUsageLimit &&
            !isGenericExitCode1 &&
            attempt < MAX_RETRIES
          ) {
            console.log(
              `Claude Code crashed, retrying (attempt ${attempt + 2}/${MAX_RETRIES + 1})...`
            );
            await session.kill(); // Clear corrupted session
            if (!silent) {
              await ctx.reply(`⚠️ Claude crashed, retrying...`);
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

          // Check if it was a cancellation
          if (errorLower.includes("abort") || errorLower.includes("cancel")) {
            // Only show "Query stopped" if it was an explicit stop, not an interrupt from a new message
            const wasInterrupt = session.consumeInterruptFlag();
            if (!silent && !wasInterrupt) {
              await ctx.reply("🛑 Query stopped.");
            }
          } else {
            if (!silent) {
              if (isUsageLimit) {
                await ctx.reply("⚠️ Claude usage limit reached. Try again after your quota resets.");
              } else {
                await ctx.reply(`❌ Error: ${errorSummary.slice(0, 200)}`);
              }
            }
          }
          break; // Exit loop after handling error
        }
      }
    }
  }

  // 11. Cleanup
  stopProcessing();
  typing.stop();
  session.typingController = null;
}
