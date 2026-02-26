/**
 * Claude Telegram Bot - TypeScript/Bun Edition
 *
 * Control Claude Code from your phone via Telegram.
 */

import { run, sequentialize } from "@grammyjs/runner";
import { WORKING_DIR, ALLOWED_USERS, RESTART_FILE } from "./config";
import { unlinkSync, readFileSync, existsSync } from "fs";
import {
  handleStart,
  handleNew,
  handleStop,
  handleStatus,
  handleUsage,
  handleCodexQuota,
  handleContext,
  handleModel,
  handleSwitch,
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
import { buildSessionOverviewLines } from "./handlers/commands";
import { resetAllDriverSessions } from "./handlers/commands";
import { session } from "./session";
import { getDueJobs, getJobs, advanceRecurringJob, removeJob } from "./cron";
import { bot } from "./bot";
import { isAnyDriverRunning, isLikelyQuotaOrLimitError, runMessageWithDriver } from "./handlers/driver-routing";
import { StreamingState, createSilentStatusCallback, createStatusCallback } from "./handlers/streaming";
import { getSilentNotificationText } from "./silent-notifications";
import type { DriverId } from "./drivers/types";

// Re-export for any existing consumers
export { bot };

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function summarizeCronError(error: unknown): string {
  const message = getErrorMessage(error)
    .replace(/\s+/g, " ")
    .trim();
  return message.length > 300 ? `${message.slice(0, 297)}...` : message;
}

function extractCheckedSubturtleName(prompt: string): string | null {
  const match = prompt.match(/^\[SILENT CHECK-IN\]\s+Check SubTurtle\s+([a-zA-Z0-9._-]+):/m);
  return match?.[1] || null;
}

function isSubturtleRunning(name: string): boolean {
  const ctlPath = `${WORKING_DIR}/super_turtle/subturtle/ctl`;
  const proc = Bun.spawnSync([ctlPath, "status", name], { cwd: WORKING_DIR });
  const output = proc.stdout.toString();
  return output.includes("running as");
}

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
    // Voice notes bypass queue so they can transcribe/interrupt while a turn is running
    if (ctx.message?.voice) {
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
bot.command("codex-quota", handleCodexQuota);
bot.command("context", handleContext);
bot.command("model", handleModel);
bot.command("switch", handleSwitch);
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
 * Timer loop that checks for due cron jobs every 10 seconds.
 * Non-silent jobs are routed through handleText (same path as user text),
 * except BOT_MESSAGE_ONLY jobs which are sent directly to Telegram.
 * Silent jobs run in the background and only notify Telegram if the captured
 * assistant response contains marker events (completion/error/milestone, etc.).
 * The job is removed/advanced BEFORE execution so a crash never causes retries.
 * Failures are logged and reported to Telegram (no retry).
 */
const startCronTimer = () => {
  const BOT_MESSAGE_ONLY_PREFIX = "BOT_MESSAGE_ONLY:";

  setInterval(async () => {
    try {
      // Skip if a query is already running
      if (isAnyDriverRunning()) {
        return;
      }

      const dueJobs = getDueJobs();
      if (dueJobs.length === 0) {
        return;
      }

      for (const job of dueJobs) {
        // Re-check session before each job — the previous job may have started it
        if (isAnyDriverRunning()) {
          break;
        }

        // Remove/advance the job BEFORE executing so a crash doesn't cause retries
        if (job.type === "recurring") {
          advanceRecurringJob(job.id);
        } else {
          removeJob(job.id);
        }

        const userId = ALLOWED_USERS[0];
        const chatId: number | undefined = job.chat_id ?? userId;

        try {
          // Bail if no allowed users are configured — can't authenticate
          if (ALLOWED_USERS.length === 0) {
            console.error(`Cron job ${job.id} skipped: ALLOWED_USERS is empty`);
            continue;
          }
          const resolvedUserId = userId!;
          // Default chat_id to the first allowed user — single-chat bots never need to specify it
          const resolvedChatId: number = chatId!;

          if (job.prompt.startsWith(BOT_MESSAGE_ONLY_PREFIX)) {
            const message = job.prompt.slice(BOT_MESSAGE_ONLY_PREFIX.length);
            if (message.trim().length === 0) {
              console.warn(`Cron job ${job.id} skipped: BOT_MESSAGE_ONLY payload is empty`);
              continue;
            }
            await bot.api.sendMessage(resolvedChatId, message);
            continue;
          }

          const createCronContext = (text: string): import("grammy").Context =>
            ({
              from: { id: resolvedUserId, username: "cron", is_bot: false, first_name: "Cron" },
              chat: { id: resolvedChatId, type: "private" },
              message: {
                text,
                message_id: 0,
                date: Math.floor(Date.now() / 1000),
                chat: { id: resolvedChatId, type: "private" },
              },
              reply: async (replyText: string, opts?: unknown) => {
                return bot.api.sendMessage(resolvedChatId, replyText, opts as Parameters<typeof bot.api.sendMessage>[2]);
              },
              replyWithChatAction: async (action: string) => {
                await bot.api.sendChatAction(resolvedChatId, action as Parameters<typeof bot.api.sendChatAction>[1]);
              },
              replyWithSticker: async (sticker: unknown) => {
                // @ts-expect-error minimal shim for sticker sending
                return bot.api.sendSticker(resolvedChatId, sticker);
              },
              api: bot.api,
            }) as unknown as import("grammy").Context;

          if (job.silent) {
            const cronCtx = createCronContext(job.prompt);
            let keepTyping = true;
            const typingController = {
              stop: () => {
                keepTyping = false;
              },
            };
            session.typingController = typingController;
            const stopProcessing = session.startProcessing();

            const typingLoop = (async () => {
              while (keepTyping) {
                try {
                  await bot.api.sendChatAction(resolvedChatId, "typing");
                } catch (error) {
                  console.debug("Silent cron typing indicator failed:", error);
                }
                await Bun.sleep(4000);
              }
            })();

            try {
              const primaryDriver: DriverId = session.activeDriver;
              const fallbackDriver: DriverId = primaryDriver === "codex" ? "claude" : "codex";
              const state = new StreamingState();
              const statusCallback = createSilentStatusCallback(cronCtx, state);

              let response = "";
              let driverUsed: DriverId = primaryDriver;
              let fallbackAttempted = false;

              try {
                response = await runMessageWithDriver(primaryDriver, {
                  message: job.prompt,
                  username: "cron",
                  userId: resolvedUserId,
                  chatId: resolvedChatId,
                  ctx: cronCtx,
                  statusCallback,
                });
              } catch (error) {
                if (!isLikelyQuotaOrLimitError(error)) {
                  throw error;
                }
                fallbackAttempted = true;
                response = await runMessageWithDriver(fallbackDriver, {
                  message: job.prompt,
                  username: "cron",
                  userId: resolvedUserId,
                  chatId: resolvedChatId,
                  ctx: cronCtx,
                  statusCallback,
                });
                driverUsed = fallbackDriver;
              }

              console.log(
                `[cron:${job.id}] primary_driver=${primaryDriver} fallback_attempted=${fallbackAttempted} driver_used=${driverUsed}`
              );

              const notificationText = getSilentNotificationText(state.getSilentCapturedText(), response);
              if (notificationText) {
                await bot.api.sendMessage(resolvedChatId, notificationText);
              }

              const subturtleName = extractCheckedSubturtleName(job.prompt);
              if (subturtleName && job.type === "recurring") {
                const running = isSubturtleRunning(subturtleName);
                const recurringStillExists = getJobs().some((j) => j.id === job.id);
                if (!running && recurringStillExists) {
                  removeJob(job.id);
                  await bot.api.sendMessage(
                    resolvedChatId,
                    `⚠️ SubTurtle ${subturtleName} is not running but cron ${job.id} was still active. I removed that recurring cron to prevent repeat loops.`
                  );
                }
              }
            } finally {
              typingController.stop();
              await typingLoop;
              stopProcessing();
              session.typingController = null;
            }
          } else {
            // Append instruction so the agent opens its reply with a scheduled notice
            const injectedPrompt = `${job.prompt}\n\n(This is a scheduled message. Start your response with "🔔 Scheduled:" on its own line before anything else.)`;
            const cronCtx = createCronContext(injectedPrompt);
            const primaryDriver: DriverId = session.activeDriver;
            const fallbackDriver: DriverId = primaryDriver === "codex" ? "claude" : "codex";
            const state = new StreamingState();
            const statusCallback = createStatusCallback(cronCtx, state);

            try {
              await runMessageWithDriver(primaryDriver, {
                message: injectedPrompt,
                username: "cron",
                userId: resolvedUserId,
                chatId: resolvedChatId,
                ctx: cronCtx,
                statusCallback,
              });
            } catch (error) {
              if (!isLikelyQuotaOrLimitError(error)) {
                throw error;
              }
              await runMessageWithDriver(fallbackDriver, {
                message: injectedPrompt,
                username: "cron",
                userId: resolvedUserId,
                chatId: resolvedChatId,
                ctx: cronCtx,
                statusCallback,
              });
            }
          }
        } catch (error) {
          // No retries — report failure and continue with future jobs
          const errorSummary = summarizeCronError(error);
          console.error(`Cron job ${job.id} failed (no retry): ${errorSummary}`);

          if (chatId) {
            try {
              const quotaHint = isLikelyQuotaOrLimitError(errorSummary)
                ? "\nLikely cause: selected meta-agent driver hit a usage/quota limit."
                : "";
              await bot.api.sendMessage(
                chatId,
                `❌ Scheduled job failed (${job.id}).\n${errorSummary}${quotaHint}`
              );
            } catch (notifyError) {
              const notifySummary = summarizeCronError(notifyError);
              console.error(
                `Failed to notify Telegram about cron error for ${job.id}: ${notifySummary}`
              );
            }
          }
        }
      }
    } catch (error) {
      console.error("Cron timer loop error:", error);
    }
  }, 10000); // 10 seconds
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
startCronTimer();

// Drop any messages that arrived while the bot was offline
await bot.api.deleteWebhook({ drop_pending_updates: true });

// Check for pending restart message to update
if (existsSync(RESTART_FILE)) {
  try {
    const data = JSON.parse(readFileSync(RESTART_FILE, "utf-8"));
    const age = Date.now() - data.timestamp;

    // Only update if restart was recent (within 30 seconds)
    if (age < 30000 && data.chat_id && data.message_id) {
      // Edit the "Restarting..." message to show completion
      await bot.api.editMessageText(
        data.chat_id,
        data.message_id,
        "✅ Bot restarted"
      );

      await resetAllDriverSessions();

      // Send startup message with the same standardized overview format.
      const lines = await buildSessionOverviewLines("Bot restarted");
      await bot.api.sendMessage(data.chat_id, lines.join("\n"), { parse_mode: "HTML" });
    }
    unlinkSync(RESTART_FILE);
  } catch (e) {
    console.warn("Failed to update restart message:", e);
    // Attempt cleanup of restart file; ignore if it doesn't exist or unlink fails
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
