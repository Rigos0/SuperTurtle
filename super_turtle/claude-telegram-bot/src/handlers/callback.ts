/**
 * Callback query handler for Claude Telegram Bot.
 *
 * Handles inline keyboard button presses (ask_user MCP integration).
 */

import type { Context } from "grammy";
import { unlinkSync, readFileSync, existsSync } from "fs";
import { session, getAvailableModels, EFFORT_DISPLAY, type EffortLevel } from "../session";
import { codexSession } from "../codex-session";
import { ALLOWED_USERS, WORKING_DIR, TELEGRAM_SAFE_LIMIT } from "../config";
import { isAuthorized } from "../security";
import { auditLog, startTypingIndicator } from "../utils";
import { StreamingState, createStatusCallback } from "./streaming";
import { escapeHtml } from "../formatting";
import { removeJob } from "../cron";

/**
 * Handle callback queries from inline keyboards.
 */
export async function handleCallback(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || "unknown";
  const chatId = ctx.chat?.id;
  const callbackData = ctx.callbackQuery?.data;

  if (!userId || !chatId || !callbackData) {
    await ctx.answerCallbackQuery();
    return;
  }

  // 1. Authorization check
  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.answerCallbackQuery({ text: "Unauthorized" });
    return;
  }

  // 2. Handle model selection: model:{model_id}
  if (callbackData.startsWith("model:")) {
    const modelId = callbackData.replace("model:", "");
    const models = getAvailableModels();
    const model = models.find((m) => m.value === modelId);
    if (model) {
      session.model = modelId;
      // Reset effort to high if switching to Haiku (no effort support)
      if (modelId.includes("haiku")) {
        session.effort = "high";
      }
      const effortStr = modelId.includes("haiku") ? "" : ` | ${EFFORT_DISPLAY[session.effort]} effort`;
      await ctx.editMessageText(`<b>Model:</b> ${model.displayName}${effortStr}`, { parse_mode: "HTML" });
      await ctx.answerCallbackQuery({ text: `Switched to ${model.displayName}` });
    } else {
      await ctx.answerCallbackQuery({ text: "Unknown model" });
    }
    return;
  }

  // 3. Handle effort selection: effort:{level}
  if (callbackData.startsWith("effort:")) {
    const effort = callbackData.replace("effort:", "") as EffortLevel;
    if (effort in EFFORT_DISPLAY) {
      session.effort = effort;
      const models = getAvailableModels();
      const model = models.find((m) => m.value === session.model);
      const modelName = model?.displayName || session.model;
      await ctx.editMessageText(`<b>Model:</b> ${modelName} | ${EFFORT_DISPLAY[effort]} effort`, { parse_mode: "HTML" });
      await ctx.answerCallbackQuery({ text: `Effort set to ${EFFORT_DISPLAY[effort]}` });
    } else {
      await ctx.answerCallbackQuery({ text: "Unknown effort level" });
    }
    return;
  }

  // 3b. Handle Codex model selection: codex_model:{model_id}
  if (callbackData.startsWith("codex_model:")) {
    const { getAvailableCodexModels } = await import("../codex-session");
    const modelId = callbackData.replace("codex_model:", "");
    const models = getAvailableCodexModels();
    const model = models.find((m) => m.value === modelId);

    if (model) {
      codexSession.model = modelId;
      await ctx.editMessageText(`<b>Codex Model:</b> ${model.displayName}\n<b>Reasoning Effort:</b> ${codexSession.reasoningEffort}`, { parse_mode: "HTML" });
      await ctx.answerCallbackQuery({ text: `Codex model set to ${model.displayName}` });
    } else {
      await ctx.answerCallbackQuery({ text: "Unknown Codex model" });
    }
    return;
  }

  // 3c. Handle Codex effort selection: codex_effort:{level}
  if (callbackData.startsWith("codex_effort:")) {
    const effort = callbackData.replace("codex_effort:", "") as any;
    const validEfforts = ["minimal", "low", "medium", "high", "xhigh"];

    if (validEfforts.includes(effort)) {
      codexSession.reasoningEffort = effort;
      const { getAvailableCodexModels } = await import("../codex-session");
      const models = getAvailableCodexModels();
      const model = models.find((m) => m.value === codexSession.model);
      const modelName = model?.displayName || codexSession.model;
      await ctx.editMessageText(`<b>Codex Model:</b> ${modelName}\n<b>Reasoning Effort:</b> ${effort}`, { parse_mode: "HTML" });
      await ctx.answerCallbackQuery({ text: `Codex reasoning effort set to ${effort}` });
    } else {
      await ctx.answerCallbackQuery({ text: "Unknown effort level" });
    }
    return;
  }

  // 4. Handle driver selection: switch:{driver}
  if (callbackData.startsWith("switch:")) {
    const driver = callbackData.replace("switch:", "") as "claude" | "codex";
    if (driver === "claude") {
      session.activeDriver = "claude";
      await ctx.editMessageText(`<b>Current driver:</b> claude 🔵`, { parse_mode: "HTML" });
      await ctx.answerCallbackQuery({ text: "Switched to Claude Code" });
    } else if (driver === "codex") {
      try {
        if (!codexSession.isActive) {
          await codexSession.startNewThread();
        }
        session.activeDriver = "codex";
        await ctx.editMessageText(`<b>Current driver:</b> codex 🟢`, { parse_mode: "HTML" });
        await ctx.answerCallbackQuery({ text: "Switched to Codex" });
      } catch (error) {
        await ctx.answerCallbackQuery({ text: `Codex error: ${String(error).slice(0, 50)}` });
      }
    } else {
      await ctx.answerCallbackQuery({ text: "Unknown driver" });
    }
    return;
  }

  // 5. Handle subturtle logs callbacks: subturtle_logs:{name}
  if (callbackData.startsWith("subturtle_logs:")) {
    await handleSubturtleLogsCallback(ctx, callbackData);
    return;
  }

  // 5. Handle subturtle stop callbacks: subturtle_stop:{name}
  if (callbackData.startsWith("subturtle_stop:")) {
    await handleSubturtleStopCallback(ctx, callbackData);
    return;
  }

  // 6. Handle cron cancel callbacks: cron_cancel:{job_id}
  if (callbackData.startsWith("cron_cancel:")) {
    await handleCronCancelCallback(ctx, callbackData);
    return;
  }

  // 7. Handle resume callbacks: resume:{session_id}
  if (callbackData.startsWith("resume:")) {
    await handleResumeCallback(ctx, callbackData);
    return;
  }

  // 7b. Handle Codex resume callbacks: codex_resume:{session_id}
  if (callbackData.startsWith("codex_resume:")) {
    await handleCodexResumeCallback(ctx, callbackData);
    return;
  }

  // 8. Parse callback data: askuser:{request_id}:{option_index}
  if (!callbackData.startsWith("askuser:")) {
    await ctx.answerCallbackQuery();
    return;
  }

  const parts = callbackData.split(":");
  if (parts.length !== 3) {
    await ctx.answerCallbackQuery({ text: "Invalid callback data" });
    return;
  }

  const requestId = parts[1]!;
  const optionIndex = parseInt(parts[2]!, 10);

  // 9. Load request file
  const requestFile = `/tmp/ask-user-${requestId}.json`;
  let requestData: {
    question: string;
    options: string[];
    status: string;
  };

  try {
    const file = Bun.file(requestFile);
    const text = await file.text();
    requestData = JSON.parse(text);
  } catch (error) {
    console.error(`Failed to load ask-user request ${requestId}:`, error);
    await ctx.answerCallbackQuery({ text: "Request expired or invalid" });
    return;
  }

  // 10. Get selected option
  if (optionIndex < 0 || optionIndex >= requestData.options.length) {
    await ctx.answerCallbackQuery({ text: "Invalid option" });
    return;
  }

  const selectedOption = requestData.options[optionIndex]!;

  // 11. Update the message to show selection
  try {
    await ctx.editMessageText(`✓ ${selectedOption}`);
  } catch (error) {
    console.debug("Failed to edit callback message:", error);
  }

  // 12. Answer the callback
  await ctx.answerCallbackQuery({
    text: `Selected: ${selectedOption.slice(0, 50)}`,
  });

  // 13. Delete request file
  try {
    unlinkSync(requestFile);
  } catch (error) {
    console.debug("Failed to delete request file:", error);
  }

  // 14. Send the choice to Claude as a message
  const message = selectedOption;

  // Interrupt any running query - button responses are always immediate
  if (session.isRunning) {
    console.log("Interrupting current query for button response");
    await session.stop();
    // Small delay to ensure clean interruption
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Start typing
  const typing = startTypingIndicator(ctx);

  // Create streaming state
  const state = new StreamingState();
  const statusCallback = createStatusCallback(ctx, state);

  try {
    const response = await session.sendMessageStreaming(
      message,
      username,
      userId,
      statusCallback,
      chatId,
      ctx
    );

    await auditLog(userId, username, "CALLBACK", message, response);
  } catch (error) {
    console.error("Error processing callback:", error);

    for (const toolMsg of state.toolMessages) {
      try {
        await ctx.api.deleteMessage(toolMsg.chat.id, toolMsg.message_id);
      } catch (error) {
        console.debug("Failed to delete tool message:", error);
      }
    }

    if (String(error).includes("abort") || String(error).includes("cancel")) {
      // Only show "Query stopped" if it was an explicit stop, not an interrupt from a new message
      const wasInterrupt = session.consumeInterruptFlag();
      if (!wasInterrupt) {
        await ctx.reply("🛑 Query stopped.");
      }
    } else {
      await ctx.reply(`❌ Error: ${String(error).slice(0, 200)}`);
    }
  } finally {
    typing.stop();
  }
}

/**
 * Handle subturtle logs callback (subturtle_logs:{name}).
 */
async function handleSubturtleLogsCallback(
  ctx: Context,
  callbackData: string
): Promise<void> {
  const name = callbackData.replace("subturtle_logs:", "");

  if (!name) {
    await ctx.answerCallbackQuery({ text: "Invalid SubTurtle name" });
    return;
  }

  const logFile = `${WORKING_DIR}/.subturtles/${name}/subturtle.log`;

  // Check if log file exists
  if (!existsSync(logFile)) {
    await ctx.answerCallbackQuery({ text: "Log file not found" });
    return;
  }

  try {
    const content = readFileSync(logFile, "utf-8");
    const lines = content.split("\n");
    const lastLines = lines.slice(-50).filter((line) => line.trim()).join("\n");

    if (!lastLines) {
      await ctx.reply(`📋 <b>Logs for ${escapeHtml(name)}</b>\n\n<code>No log content</code>`, {
        parse_mode: "HTML",
      });
      await ctx.answerCallbackQuery({ text: "Log is empty" });
      return;
    }

    // Chunk if needed (4000 char limit)
    const chunks: string[] = [];
    const maxChunkSize = TELEGRAM_SAFE_LIMIT - 100; // Leave room for formatting
    if (lastLines.length > maxChunkSize) {
      for (let i = 0; i < lastLines.length; i += maxChunkSize) {
        chunks.push(lastLines.slice(i, i + maxChunkSize));
      }
    } else {
      chunks.push(lastLines);
    }

    // Send first chunk with header
    for (let i = 0; i < chunks.length; i++) {
      const header =
        i === 0 ? `📋 <b>Logs for ${escapeHtml(name)}</b> (last ~50 lines)\n\n` : "";
      const footer = chunks.length > 1 && i < chunks.length - 1 ? "\n\n<i>... continued ...</i>" : "";
      await ctx.reply(`${header}<code>${escapeHtml(chunks[i]!)}</code>${footer}`, {
        parse_mode: "HTML",
      });
    }

    await ctx.answerCallbackQuery({ text: `Logs for ${name}` });
  } catch (error) {
    console.error(`Failed to read log file for ${name}:`, error);
    await ctx.answerCallbackQuery({ text: "Failed to read logs" });
  }
}

/**
 * Handle subturtle stop callback (subturtle_stop:{name}).
 */
async function handleSubturtleStopCallback(
  ctx: Context,
  callbackData: string
): Promise<void> {
  const name = callbackData.replace("subturtle_stop:", "");

  if (!name) {
    await ctx.answerCallbackQuery({ text: "Invalid SubTurtle name" });
    return;
  }

  try {
    const ctlPath = `${WORKING_DIR}/super_turtle/subturtle/ctl`;
    const proc = Bun.spawnSync([ctlPath, "stop", name], { cwd: WORKING_DIR });
    const output = proc.stdout.toString();

    // Check if the output indicates success
    const isSuccess = output.includes("stopped") || output.includes("killing");

    if (isSuccess) {
      await ctx.editMessageText(`✅ <b>${escapeHtml(name)}</b> stopped`, {
        parse_mode: "HTML",
      });
      await ctx.answerCallbackQuery({ text: `${name} stopped` });
    } else {
      await ctx.answerCallbackQuery({ text: `Failed to stop ${name}` });
    }
  } catch (error) {
    console.error(`Failed to stop SubTurtle ${name}:`, error);
    await ctx.answerCallbackQuery({ text: "Failed to stop SubTurtle" });
  }
}

/**
 * Handle resume session callback (resume:{session_id}).
 */
async function handleResumeCallback(
  ctx: Context,
  callbackData: string
): Promise<void> {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || "unknown";
  const chatId = ctx.chat?.id;
  const sessionId = callbackData.replace("resume:", "");

  if (!sessionId || !userId || !chatId) {
    await ctx.answerCallbackQuery({ text: "ID sessione non valido" });
    return;
  }

  // Check if session is already active
  if (session.isActive) {
    await ctx.answerCallbackQuery({ text: "Sessione già attiva" });
    return;
  }

  // Resume the selected session
  const [success, message] = session.resumeSession(sessionId);

  if (!success) {
    await ctx.answerCallbackQuery({ text: message, show_alert: true });
    return;
  }

  // Update the original message to show selection
  try {
    await ctx.editMessageText(`✅ ${message}`);
  } catch (error) {
    console.debug("Failed to edit resume message:", error);
  }
  await ctx.answerCallbackQuery({ text: "Sessione ripresa!" });

  // Send a hidden recap prompt to Claude
  const recapPrompt =
    "Please write a very concise recap of where we are in this conversation, to refresh my memory. Max 2-3 sentences.";

  const typing = startTypingIndicator(ctx);
  const state = new StreamingState();
  const statusCallback = createStatusCallback(ctx, state);

  try {
    await session.sendMessageStreaming(
      recapPrompt,
      username,
      userId,
      statusCallback,
      chatId,
      ctx
    );
  } catch (error) {
    console.error("Error getting recap:", error);
    // Don't show error to user - session is still resumed, recap just failed
  } finally {
    typing.stop();
  }
}

/**
 * Handle Codex resume session callback (codex_resume:{session_id}).
 */
async function handleCodexResumeCallback(
  ctx: Context,
  callbackData: string
): Promise<void> {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || "unknown";
  const chatId = ctx.chat?.id;
  const sessionId = callbackData.replace("codex_resume:", "");

  if (!sessionId || !userId || !chatId) {
    await ctx.answerCallbackQuery({ text: "Invalid session ID" });
    return;
  }

  // Check if Codex session is already active
  if (codexSession.isActive) {
    await ctx.answerCallbackQuery({ text: "Codex session already active" });
    return;
  }

  // Resume the selected Codex session
  const [success, message] = await codexSession.resumeSession(sessionId);

  if (!success) {
    await ctx.answerCallbackQuery({ text: message, show_alert: true });
    return;
  }

  // Update the original message to show selection
  try {
    await ctx.editMessageText(`✅ ${message}`);
  } catch (error) {
    console.debug("Failed to edit Codex resume message:", error);
  }
  await ctx.answerCallbackQuery({ text: "Codex session resumed!" });

  // Send a hidden recap prompt to Codex
  const recapPrompt =
    "Please write a very concise recap of where we are in this conversation, to refresh my memory. Max 2-3 sentences.";

  const typing = startTypingIndicator(ctx);
  const state = new StreamingState();
  const statusCallback = createStatusCallback(ctx, state);

  try {
    await codexSession.sendMessage(recapPrompt, statusCallback);
  } catch (error) {
    console.error("Error getting Codex recap:", error);
    // Don't show error to user - session is still resumed, recap just failed
  } finally {
    typing.stop();
  }
}

/**
 * Handle cron cancel callback (cron_cancel:{job_id}).
 */
async function handleCronCancelCallback(
  ctx: Context,
  callbackData: string
): Promise<void> {
  const jobId = callbackData.replace("cron_cancel:", "");

  if (!jobId) {
    await ctx.answerCallbackQuery({ text: "Invalid job ID" });
    return;
  }

  // Remove the job
  const success = removeJob(jobId);

  if (success) {
    // Update the message to show cancellation
    try {
      await ctx.editMessageText(`✅ Job cancelled`);
    } catch (error) {
      console.debug("Failed to edit callback message:", error);
    }
    await ctx.answerCallbackQuery({ text: "Job cancelled" });
  } else {
    await ctx.answerCallbackQuery({ text: "Job not found or already removed" });
  }
}
