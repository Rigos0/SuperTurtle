/**
 * Claude Telegram Bot - TypeScript/Bun Edition
 *
 * Control Claude Code from your phone via Telegram.
 */

import { Bot } from "grammy";
import { run, sequentialize } from "@grammyjs/runner";
import { TELEGRAM_TOKEN, WORKING_DIR, ALLOWED_USERS, RESTART_FILE } from "./config";
import { unlinkSync, readFileSync, existsSync } from "fs";
import {
  handleStart,
  handleNew,
  handleStop,
  handleStatus,
  handleUsage,
  handleContext,
  handleModel,
  handleResume,
  handleRestart,
  handleRetry,
  handleSubturtle,
  handleCron,
  handleText,
  handleVoice,
  handlePhoto,
  handleDocument,
  handleAudio,
  handleVideo,
  handleCallback,
} from "./handlers";
import { session } from "./session";
import { getDueJobs, advanceRecurringJob, removeJob } from "./cron";
import { StreamingState, createStatusCallback } from "./handlers/streaming";

// Create bot instance
export const bot = new Bot(TELEGRAM_TOKEN);

// Sequentialize non-command messages per user (prevents race conditions)
// Commands bypass sequentialization so they work immediately
bot.use(
  sequentialize((ctx) => {
    // Commands are not sequentialized - they work immediately
    if (ctx.message?.text?.startsWith("/")) {
      return undefined;
    }
    // Messages with ! prefix bypass queue (interrupt)
    if (ctx.message?.text?.startsWith("!")) {
      return undefined;
    }
    // Messages starting with "stop" bypass queue (acts like /stop)
    if (ctx.message?.text?.toLowerCase().trimStart().startsWith("stop")) {
      return undefined;
    }
    // Callback queries (button clicks) are not sequentialized
    if (ctx.callbackQuery) {
      return undefined;
    }
    // Other messages are sequentialized per chat
    return ctx.chat?.id.toString();
  })
);

// ============== Command Handlers ==============

bot.command("start", handleStart);
bot.command("new", handleNew);
bot.command("stop", handleStop);
bot.command("status", handleStatus);
bot.command("usage", handleUsage);
bot.command("context", handleContext);
bot.command("model", handleModel);
bot.command("resume", handleResume);
bot.command("subturtle", handleSubturtle);
bot.command("restart", handleRestart);
bot.command("retry", handleRetry);
bot.command("cron", handleCron);

// ============== Message Handlers ==============

// Text messages
bot.on("message:text", handleText);

// Voice messages
bot.on("message:voice", handleVoice);

// Photo messages
bot.on("message:photo", handlePhoto);

// Document messages
bot.on("message:document", handleDocument);

// Audio messages
bot.on("message:audio", handleAudio);

// Video messages (regular videos and video notes)
bot.on("message:video", handleVideo);
bot.on("message:video_note", handleVideo);

// ============== Callback Queries ==============

bot.on("callback_query:data", handleCallback);

// ============== Error Handler ==============

bot.catch((err) => {
  console.error("Bot error:", err);
});

// ============== Cron Timer Loop ==============

/**
 * Build a minimal Grammy Context-like object from bot.api + chat_id.
 * Just enough surface area for startTypingIndicator and createStatusCallback.
 */
function makeCronContext(chatId: number) {
  return {
    chat: { id: chatId },
    reply: async (text: string, opts?: Record<string, unknown>) => {
      return bot.api.sendMessage(chatId, text, opts as Parameters<typeof bot.api.sendMessage>[2]);
    },
    replyWithChatAction: async (action: string) => {
      await bot.api.sendChatAction(chatId, action as Parameters<typeof bot.api.sendChatAction>[1]);
    },
    replyWithSticker: async (sticker: unknown) => {
      // @ts-expect-error minimal shim
      return bot.api.sendSticker(chatId, sticker);
    },
    api: bot.api,
  } as unknown as import("grammy").Context;
}

/**
 * Timer loop that checks for due cron jobs every 10 seconds.
 * For each due job:
 * 1. Sends a typing indicator (like normal messages)
 * 2. Injects the prompt through session.sendMessageStreaming
 * 3. Uses the real StreamingState/createStatusCallback for proper output
 * 4. Updates/removes the job from store
 */
const startCronTimer = () => {
  setInterval(async () => {
    try {
      // Skip if a query is already running
      if (session.isRunning) {
        return;
      }

      const dueJobs = getDueJobs();
      if (dueJobs.length === 0) {
        return;
      }

      for (const job of dueJobs) {
        // Build a fake ctx for this chat
        const ctx = makeCronContext(job.chat_id);

        // Start typing indicator (same loop as normal messages)
        let typingRunning = true;
        const typingLoop = async () => {
          while (typingRunning) {
            try {
              await bot.api.sendChatAction(job.chat_id, "typing");
            } catch (e) {
              console.debug("Cron typing indicator failed:", e);
            }
            await Bun.sleep(4000);
          }
        };
        typingLoop();

        try {
          // Send indicator message
          const promptPreview = job.prompt.slice(0, 80);
          await bot.api.sendMessage(
            job.chat_id,
            `🔔 Scheduled: ${promptPreview}${job.prompt.length > 80 ? "..." : ""}`
          );

          // Use the real streaming callback (HTML formatting, throttled edits, etc.)
          const state = new StreamingState();
          const statusCallback = createStatusCallback(ctx, state);

          // Mark processing so concurrent cron ticks don't overlap
          const stopProcessing = session.startProcessing();

          try {
            // Inject the prompt through session.sendMessageStreaming
            await session.sendMessageStreaming(
              job.prompt,
              "cron",
              0,
              statusCallback,
              job.chat_id,
              ctx
            );
          } finally {
            stopProcessing();
          }

          // Update or remove the job
          if (job.type === "recurring") {
            advanceRecurringJob(job.id);
          } else {
            removeJob(job.id);
          }
        } catch (error) {
          console.error(`Failed to execute cron job ${job.id}:`, error);
          try {
            await bot.api.sendMessage(
              job.chat_id,
              `❌ Scheduled job failed: ${String(error).slice(0, 100)}`
            );
          } catch {
            // Ignore error sending failure notification
          }
        } finally {
          typingRunning = false;
        }
      }
    } catch (error) {
      console.error("Cron timer loop error:", error);
    }
  }, 10000); // 10 seconds
};

// Start the cron timer when bot is ready
const startCronTimerWhenReady = () => {
  startCronTimer();
};

// ============== Startup ==============

console.log("=".repeat(50));
console.log("Claude Telegram Bot - TypeScript Edition");
console.log("=".repeat(50));
console.log(`Working directory: ${WORKING_DIR}`);
console.log(`Allowed users: ${ALLOWED_USERS.length}`);
console.log("Starting bot...");

// Get bot info first
const botInfo = await bot.api.getMe();
console.log(`Bot started: @${botInfo.username}`);

// Start cron timer
startCronTimerWhenReady();

// Drop any messages that arrived while the bot was offline
await bot.api.deleteWebhook({ drop_pending_updates: true });

// Check for pending restart message to update
if (existsSync(RESTART_FILE)) {
  try {
    const data = JSON.parse(readFileSync(RESTART_FILE, "utf-8"));
    const age = Date.now() - data.timestamp;

    // Only update if restart was recent (within 30 seconds)
    if (age < 30000 && data.chat_id && data.message_id) {
      await bot.api.editMessageText(
        data.chat_id,
        data.message_id,
        "✅ Bot restarted"
      );
    }
    unlinkSync(RESTART_FILE);
  } catch (e) {
    console.warn("Failed to update restart message:", e);
    try { unlinkSync(RESTART_FILE); } catch {}
  }
}

// Start with concurrent runner (commands work immediately)
// Retry forever on getUpdates failures (e.g. network drop during sleep)
const runner = run(bot, {
  runner: {
    maxRetryTime: Infinity,
    retryInterval: "exponential",
  },
});

// Graceful shutdown
const stopRunner = () => {
  if (runner.isRunning()) {
    console.log("Stopping bot...");
    runner.stop();
  }
};

process.on("SIGINT", () => {
  console.log("Received SIGINT");
  stopRunner();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Received SIGTERM");
  stopRunner();
  process.exit(0);
});
