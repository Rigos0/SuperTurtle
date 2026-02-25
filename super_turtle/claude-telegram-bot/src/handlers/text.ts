/**
 * Text message handler for Claude Telegram Bot.
 */

import type { Context, NextFunction } from "grammy";
import { session } from "../session";
import { codexSession } from "../codex-session";
import { ALLOWED_USERS } from "../config";
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
} from "./streaming";

export interface HandleTextOptions {
  silent?: boolean;
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

    if (session.isRunning) {
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

  // 9. Route to active driver (Claude or Codex)
  let response: string;

  if (session.activeDriver === "codex") {
    // Codex path with streaming
    const MAX_RETRIES = 1;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        response = await codexSession.sendMessage(
          message,
          statusCallback,
          undefined, // model - use Codex's saved preference
          undefined  // reasoningEffort - use Codex's saved preference
        );

        // 10. Audit log
        await auditLog(userId, username, "TEXT_CODEX", message, response);
        break; // Success - exit retry loop
      } catch (error) {
        const errorStr = String(error);
        const isCodexCrash = errorStr.includes("crashed") || errorStr.includes("failed");

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
        console.error("Error processing message:", error);

        // Check if it was a cancellation
        if (errorStr.includes("abort") || errorStr.includes("cancel")) {
          // Only show "Query stopped" if it was an explicit stop, not an interrupt from a new message
          const wasInterrupt = session.consumeInterruptFlag();
          if (!silent && !wasInterrupt) {
            await ctx.reply("🛑 Query stopped.");
          }
        } else {
          if (!silent) {
            await ctx.reply(`❌ Error: ${errorStr.slice(0, 200)}`);
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
        const errorStr = String(error);
        const isClaudeCodeCrash = errorStr.includes("exited with code");

        // Clean up any partial messages from this attempt
        for (const toolMsg of state.toolMessages) {
          try {
            await ctx.api.deleteMessage(toolMsg.chat.id, toolMsg.message_id);
          } catch {
            // Ignore cleanup errors
          }
        }

        // Retry on Claude Code crash (not user cancellation)
        if (isClaudeCodeCrash && attempt < MAX_RETRIES) {
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
        console.error("Error processing message:", error);

        // Check if it was a cancellation
        if (errorStr.includes("abort") || errorStr.includes("cancel")) {
          // Only show "Query stopped" if it was an explicit stop, not an interrupt from a new message
          const wasInterrupt = session.consumeInterruptFlag();
          if (!silent && !wasInterrupt) {
            await ctx.reply("🛑 Query stopped.");
          }
        } else {
          if (!silent) {
            await ctx.reply(`❌ Error: ${errorStr.slice(0, 200)}`);
          }
        }
        break; // Exit loop after handling error
      }
    }
  }

  // 11. Cleanup
  stopProcessing();
  typing.stop();
  session.typingController = null;
}
