/**
 * Claude Telegram Bot - TypeScript/Bun Edition
 *
 * Control Claude Code from your phone via Telegram.
 */

import { run, sequentialize } from "@grammyjs/runner";
import { WORKING_DIR, ALLOWED_USERS, RESTART_FILE } from "./config";
import { unlinkSync, readFileSync, existsSync, writeFileSync, openSync, closeSync } from "fs";
import {
  handleNew,
  handleStatus,
  handleUsage,
  handleContext,
  handleModel,
  handleSwitch,
  handleResume,
  handleRestart,
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
import { startDashboardServer } from "./dashboard";
import {
  beginBackgroundRun,
  endBackgroundRun,
  isAnyDriverRunning,
  isBackgroundRunActive,
  isLikelyCancellationError,
  isLikelyQuotaOrLimitError,
  preemptBackgroundRunForUserPriority,
  runMessageWithDriver,
  wasBackgroundRunPreempted,
} from "./handlers/driver-routing";
import { StreamingState, createSilentStatusCallback, createStatusCallback } from "./handlers/streaming";
import { getSilentNotificationText } from "./silent-notifications";
import type { DriverId } from "./drivers/types";
import { isStopIntent } from "./utils";
import {
  dequeuePreparedSnapshot,
  enqueuePreparedSnapshot,
  getPreparedSnapshotCount,
} from "./cron-supervision-queue";
import { buildCronScheduledPrompt } from "./cron-scheduled-prompt";
import { UpdateDedupeCache } from "./update-dedupe";
import { startTurtleGreetings } from "./turtle-greetings";

// Re-export for any existing consumers
export { bot };

const INSTANCE_LOCK_FILE = "/tmp/claude-telegram-bot.instance.lock";
const RUN_STATE_DIR = `${WORKING_DIR}/super_turtle/state`;
const RUN_STATE_WRITER = `${RUN_STATE_DIR}/run_state_writer.py`;
const RUN_STATE_LEDGER = `${RUN_STATE_DIR}/runs.jsonl`;
const SUBTURTLE_VENV_PYTHON = `${WORKING_DIR}/super_turtle/subturtle/.venv/bin/python3`;
const telegramUpdateDedupe = new UpdateDedupeCache();

interface RunLedgerEntry {
  timestamp: string;
  runName: string;
  event: string;
  status: string;
}

function chooseRunStatePythonBinary(): string {
  return existsSync(SUBTURTLE_VENV_PYTHON) ? SUBTURTLE_VENV_PYTHON : "python3";
}

function parseRunLedgerEntries(rawLedger: string): RunLedgerEntry[] {
  const entries: RunLedgerEntry[] = [];
  const lines = rawLedger
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line);
      if (!parsed || typeof parsed !== "object") continue;

      const runName = typeof parsed.run_name === "string" ? parsed.run_name.trim() : "";
      const event = typeof parsed.event === "string" ? parsed.event.trim() : "";
      const timestamp = typeof parsed.timestamp === "string" ? parsed.timestamp.trim() : "";
      const status = typeof parsed.status === "string" ? parsed.status.trim() : "";
      if (!runName || !event) continue;

      entries.push({
        timestamp,
        runName,
        event,
        status,
      });
    } catch {
      continue;
    }
  }

  return entries;
}

function buildActiveRunLines(entries: RunLedgerEntry[]): string[] {
  const latestByRun = new Map<string, RunLedgerEntry>();
  for (const entry of entries) {
    latestByRun.set(entry.runName, entry);
  }

  return Array.from(latestByRun.values())
    .filter((entry) => entry.status.toLowerCase() === "running")
    .sort((a, b) => a.runName.localeCompare(b.runName))
    .map((entry) => {
      const when = entry.timestamp || "unknown time";
      return `${entry.runName} (last event: ${entry.event} at ${when})`;
    });
}

function isMilestoneEntry(entry: RunLedgerEntry): boolean {
  const event = entry.event.toLowerCase();
  const status = entry.status.toLowerCase();
  return (
    event.includes("milestone") ||
    event === "complete" ||
    event === "completed" ||
    event === "completion" ||
    status === "complete" ||
    status === "completed" ||
    status === "done"
  );
}

function buildRecentMilestoneLines(entries: RunLedgerEntry[]): string[] {
  const lines: string[] = [];
  for (let idx = entries.length - 1; idx >= 0; idx--) {
    const entry = entries[idx]!;
    if (!isMilestoneEntry(entry)) continue;

    const statusPart = entry.status ? ` (${entry.status})` : "";
    const when = entry.timestamp || "unknown time";
    lines.push(`${entry.runName}: ${entry.event}${statusPart} at ${when}`);
    if (lines.length >= 5) break;
  }
  return lines;
}

function summarizeProcessFailure(proc: {
  exitCode: number;
  stderr: Uint8Array;
  stdout: Uint8Array;
}): string {
  const stderr = proc.stderr.toString().replace(/\s+/g, " ").trim();
  const stdout = proc.stdout.toString().replace(/\s+/g, " ").trim();
  const detail = stderr || stdout || "no output";
  return `exit=${proc.exitCode} ${detail}`.slice(0, 240);
}

function refreshHandoffSummaryFromRunLedger(): string | null {
  if (!existsSync(RUN_STATE_WRITER)) {
    return `handoff refresh skipped: missing ${RUN_STATE_WRITER}`;
  }

  let entries: RunLedgerEntry[] = [];
  try {
    const rawLedger = existsSync(RUN_STATE_LEDGER) ? readFileSync(RUN_STATE_LEDGER, "utf-8") : "";
    entries = parseRunLedgerEntries(rawLedger);
  } catch (error) {
    return `handoff refresh skipped: failed reading run ledger (${summarizeCronError(error)})`;
  }

  const activeRuns = buildActiveRunLines(entries);
  const milestones = buildRecentMilestoneLines(entries);
  const args = [
    chooseRunStatePythonBinary(),
    RUN_STATE_WRITER,
    "--state-dir",
    RUN_STATE_DIR,
    "update-handoff",
  ];

  for (const activeRun of activeRuns) {
    args.push("--active-run", activeRun);
  }
  for (const milestone of milestones) {
    args.push("--milestone", milestone);
  }
  args.push("--note", "Auto-refreshed by cron check-ins from runs.jsonl.");

  const updateProc = Bun.spawnSync(args, { cwd: WORKING_DIR });
  if (updateProc.exitCode !== 0) {
    return `handoff refresh failed: ${summarizeProcessFailure(updateProc)}`;
  }
  return null;
}

function acquireInstanceLockOrExit(): () => void {
  const thisPid = process.pid;

  const isPidAlive = (pid: number): boolean => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };

  const writeLock = () => {
    const fd = openSync(INSTANCE_LOCK_FILE, "wx");
    writeFileSync(fd, String(thisPid));
    closeSync(fd);
  };

  try {
    writeLock();
  } catch {
    let holderPid = Number.NaN;
    try {
      holderPid = Number.parseInt(readFileSync(INSTANCE_LOCK_FILE, "utf-8").trim(), 10);
    } catch {
      // unreadable lockfile - retry with overwrite semantics below
    }

    if (Number.isFinite(holderPid) && holderPid > 0 && isPidAlive(holderPid)) {
      console.error(
        `[startup] Another bot instance is already running (PID ${holderPid}). Exiting to avoid Telegram getUpdates 409 conflict.`
      );
      process.exit(1);
    }

    // stale lock; replace it
    try { unlinkSync(INSTANCE_LOCK_FILE); } catch {}
    writeLock();
  }

  const release = () => {
    try {
      const holderPid = Number.parseInt(readFileSync(INSTANCE_LOCK_FILE, "utf-8").trim(), 10);
      if (holderPid === thisPid) {
        unlinkSync(INSTANCE_LOCK_FILE);
      }
    } catch {
      // ignore cleanup failures
    }
  };

  return release;
}

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

function isAllowedInteractiveUpdate(ctx: import("grammy").Context): boolean {
  const userId = ctx.from?.id;
  if (!userId || !ALLOWED_USERS.includes(userId)) {
    return false;
  }
  return Boolean(ctx.message || ctx.callbackQuery);
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

function shouldPrepareSilentSubturtleSnapshot(job: {
  prompt: string;
  silent?: boolean;
}): string | null {
  if (!job.silent) return null;
  return extractCheckedSubturtleName(job.prompt);
}

async function prepareSubturtleSnapshot(
  jobId: string,
  prompt: string,
  chatId: number,
  subturtleName: string
) {
  const prepErrors: string[] = [];

  const handoffRefreshError = refreshHandoffSummaryFromRunLedger();
  if (handoffRefreshError) {
    prepErrors.push(handoffRefreshError);
  }

  const ctlPath = `${WORKING_DIR}/super_turtle/subturtle/ctl`;
  const statusProc = Bun.spawnSync([ctlPath, "status", subturtleName], {
    cwd: WORKING_DIR,
  });
  const statusOutput = statusProc.stdout.toString().trim() || statusProc.stderr.toString().trim();
  if (statusProc.exitCode !== 0) {
    prepErrors.push(`ctl status exit=${statusProc.exitCode}`);
  }

  const statePath = `${WORKING_DIR}/.subturtles/${subturtleName}/CLAUDE.md`;
  let stateExcerpt = "";
  try {
    const stateText = await Bun.file(statePath).text();
    stateExcerpt = stateText.slice(0, 12_000);
  } catch (error) {
    prepErrors.push(`state read failed: ${String(error).slice(0, 160)}`);
    stateExcerpt = "(failed to read state file)";
  }

  const gitProc = Bun.spawnSync(["git", "log", "--oneline", "-10"], {
    cwd: WORKING_DIR,
  });
  const gitLog = gitProc.stdout.toString().trim() || gitProc.stderr.toString().trim();
  if (gitProc.exitCode !== 0) {
    prepErrors.push(`git log exit=${gitProc.exitCode}`);
  }

  const tunnelPath = `${WORKING_DIR}/.subturtles/${subturtleName}/.tunnel-url`;
  let tunnelUrl: string | null = null;
  try {
    const txt = (await Bun.file(tunnelPath).text()).trim();
    tunnelUrl = txt || null;
  } catch {
    tunnelUrl = null;
  }

  return enqueuePreparedSnapshot({
    jobId,
    subturtleName,
    chatId,
    sourcePrompt: prompt,
    preparedAtMs: Date.now(),
    statusOutput,
    stateExcerpt,
    gitLog,
    tunnelUrl,
    prepErrors,
  });
}

function buildPreparedSnapshotPrompt(snapshot: {
  subturtleName: string;
  sourcePrompt: string;
  preparedAtMs: number;
  statusOutput: string;
  stateExcerpt: string;
  gitLog: string;
  tunnelUrl: string | null;
  prepErrors: string[];
  snapshotSeq: number;
}): string {
  const preparedAt = new Date(snapshot.preparedAtMs).toISOString();
  const prepErrors = snapshot.prepErrors.length > 0
    ? snapshot.prepErrors.map((e) => `- ${e}`).join("\n")
    : "- none";
  const tunnelLine = snapshot.tunnelUrl ? snapshot.tunnelUrl : "(none)";

  return [
    `[SILENT CHECK-IN SNAPSHOT] SubTurtle ${snapshot.subturtleName}`,
    `Snapshot seq: ${snapshot.snapshotSeq}`,
    `Prepared at (UTC): ${preparedAt}`,
    "",
    "Original cron prompt:",
    snapshot.sourcePrompt,
    "",
    "Prepared data:",
    `<ctl_status>`,
    snapshot.statusOutput || "(empty)",
    `</ctl_status>`,
    "",
    `<state_excerpt>`,
    snapshot.stateExcerpt || "(empty)",
    `</state_excerpt>`,
    "",
    `<git_log>`,
    snapshot.gitLog || "(empty)",
    `</git_log>`,
    "",
    `<tunnel_url>`,
    tunnelLine,
    `</tunnel_url>`,
    "",
    "<prep_errors>",
    prepErrors,
    "</prep_errors>",
    "",
    "Decide if this is notable for the user.",
    "If no notable event, respond exactly: [SILENT]",
    "If notable, include one marker and concise update: 🎉 or ⚠️ or ❌ or 🚀 or 🔗.",
  ].join("\n");
}

async function drainPreparedSnapshotsWhenIdle(): Promise<void> {
  if (ALLOWED_USERS.length === 0) return;
  if (isAnyDriverRunning()) return;
  while (!isAnyDriverRunning()) {
    const snapshot = dequeuePreparedSnapshot();
    if (!snapshot) break;

    const cronCtx = ({
      from: { id: ALLOWED_USERS[0]!, username: "cron", is_bot: false, first_name: "Cron" },
      chat: { id: snapshot.chatId, type: "private" },
      message: {
        text: "",
        message_id: 0,
        date: Math.floor(Date.now() / 1000),
        chat: { id: snapshot.chatId, type: "private" },
      },
      reply: async (replyText: string, opts?: unknown) => {
        return bot.api.sendMessage(snapshot.chatId, replyText, opts as Parameters<typeof bot.api.sendMessage>[2]);
      },
      replyWithChatAction: async (action: string) => {
        await bot.api.sendChatAction(snapshot.chatId, action as Parameters<typeof bot.api.sendChatAction>[1]);
      },
      replyWithSticker: async (sticker: unknown) => {
        // @ts-expect-error minimal shim for sticker sending
        return bot.api.sendSticker(snapshot.chatId, sticker);
      },
      api: bot.api,
    }) as unknown as import("grammy").Context;

    const primaryDriver: DriverId = session.activeDriver;
    const fallbackDriver: DriverId = primaryDriver === "codex" ? "claude" : "codex";
    const state = new StreamingState();
    const statusCallback = createSilentStatusCallback(cronCtx, state);
    let response = "";

    beginBackgroundRun();
    try {
      if (wasBackgroundRunPreempted()) {
        console.log(`[snapshot:${snapshot.jobId}] skipped before start due to user-priority preemption`);
        continue;
      }

      try {
        response = await runMessageWithDriver(primaryDriver, {
          message: buildPreparedSnapshotPrompt(snapshot),
          username: "cron",
          userId: ALLOWED_USERS[0]!,
          chatId: snapshot.chatId,
          ctx: cronCtx,
          statusCallback,
        });
      } catch (error) {
        if (!isLikelyQuotaOrLimitError(error)) {
          throw error;
        }
        response = await runMessageWithDriver(fallbackDriver, {
          message: buildPreparedSnapshotPrompt(snapshot),
          username: "cron",
          userId: ALLOWED_USERS[0]!,
          chatId: snapshot.chatId,
          ctx: cronCtx,
          statusCallback,
        });
      }

      const notificationText = getSilentNotificationText(state.getSilentCapturedText(), response);
      if (notificationText) {
        await bot.api.sendMessage(snapshot.chatId, notificationText);
      }
    } catch (error) {
      if (wasBackgroundRunPreempted() && isLikelyCancellationError(error)) {
        console.log(`[snapshot:${snapshot.jobId}] preempted by interactive update`);
        continue;
      }
      const errorSummary = summarizeCronError(error);
      await bot.api.sendMessage(
        snapshot.chatId,
        `❌ Background check failed (${snapshot.jobId}).\n${errorSummary}`
      );
    } finally {
      endBackgroundRun();
    }
  }
}

// Drop duplicate Telegram updates before any handler side effects run.
bot.use(async (ctx, next) => {
  if (!telegramUpdateDedupe.isDuplicateUpdate(ctx.update)) {
    await next();
    return;
  }

  if (ctx.callbackQuery) {
    try {
      await ctx.answerCallbackQuery();
    } catch {
      // ignore duplicate callback ack errors
    }
  }
});

// User updates should preempt low-priority cron/background work.
bot.use(async (ctx, next) => {
  if (isAllowedInteractiveUpdate(ctx) && isBackgroundRunActive()) {
    const interrupted = await preemptBackgroundRunForUserPriority();
    if (interrupted) {
      console.log("Preempted background run to prioritize interactive user update");
    }
  }
  await next();
});

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
    // Stop intents bypass queue so they can cancel work immediately
    if (ctx.message?.text && isStopIntent(ctx.message.text)) {
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

bot.command("new", handleNew);
bot.command("status", handleStatus);
bot.command("usage", handleUsage);
bot.command("context", handleContext);
bot.command("model", handleModel);
bot.command("switch", handleSwitch);
bot.command("resume", handleResume);
bot.command("sub", handleSubturtle);
bot.command("subs", handleSubturtle);
bot.command("subtitles", handleSubturtle);
bot.command("subturtle", handleSubturtle);
bot.command("restart", handleRestart);
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
      const dueJobs = getDueJobs();
      if (dueJobs.length === 0) {
        await drainPreparedSnapshotsWhenIdle();
        return;
      }

      for (const job of dueJobs) {
        const subturtleNameForPrep = shouldPrepareSilentSubturtleSnapshot(job);

        // Re-check session before each job — the previous job may have started it
        if (isAnyDriverRunning() && !subturtleNameForPrep) {
          continue;
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

          if (subturtleNameForPrep) {
            const snapshot = await prepareSubturtleSnapshot(
              job.id,
              job.prompt,
              resolvedChatId,
              subturtleNameForPrep
            );
            if (!job.silent) {
              await bot.api.sendMessage(
                resolvedChatId,
                `🔄 Background check prepared for ${subturtleNameForPrep} (snapshot #${snapshot.snapshotSeq}, queue=${getPreparedSnapshotCount()}). I will process it when the current reply is idle.`
              );
            }
            continue;
          }

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
            beginBackgroundRun();
            try {
              if (wasBackgroundRunPreempted()) {
                console.log(`[cron:${job.id}] skipped before start due to user-priority preemption`);
                continue;
              }

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
            } catch (error) {
              if (
                wasBackgroundRunPreempted() &&
                isLikelyCancellationError(error)
              ) {
                console.log(`[cron:${job.id}] preempted by interactive update`);
                continue;
              }
              throw error;
            } finally {
              endBackgroundRun();
            }
          } else {
            // Append instruction so the agent opens its reply with a scheduled notice.
            // Guard against double-injecting when the prompt already contains it.
            const injectedPrompt = buildCronScheduledPrompt(job.prompt);
            const cronCtx = createCronContext(injectedPrompt);
            beginBackgroundRun();
            try {
              if (wasBackgroundRunPreempted()) {
                console.log(`[cron:${job.id}] skipped before start due to user-priority preemption`);
                continue;
              }
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
            } catch (error) {
              if (
                wasBackgroundRunPreempted() &&
                isLikelyCancellationError(error)
              ) {
                console.log(`[cron:${job.id}] preempted by interactive update`);
                continue;
              }
              throw error;
            } finally {
              endBackgroundRun();
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
      await drainPreparedSnapshotsWhenIdle();
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

const releaseInstanceLock = acquireInstanceLockOrExit();

// Get bot info first
const botInfo = await bot.api.getMe();
console.log(`Bot started: @${botInfo.username}`);

// Start cron timer
startCronTimer();
if (process.env.TURTLE_GREETINGS !== "false" && ALLOWED_USERS.length > 0) {
  startTurtleGreetings(bot, ALLOWED_USERS[0]!);
  console.log("Turtle greetings enabled (8am/8pm Europe/Prague)");
}
startDashboardServer();

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
      try {
        await bot.api.editMessageText(
          data.chat_id,
          data.message_id,
          "✅ Bot restarted"
        );
      } catch (error) {
        const msg = String(error).toLowerCase();
        if (!msg.includes("message is not modified")) {
          throw error;
        }
      }

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
  releaseInstanceLock();
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
