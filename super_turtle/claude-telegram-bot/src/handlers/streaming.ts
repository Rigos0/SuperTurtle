/**
 * Shared streaming callback for Claude Telegram Bot handlers.
 *
 * Provides a reusable status callback for streaming Claude responses.
 */

import type { Context } from "grammy";
import type { Message } from "grammy/types";
import { InlineKeyboard, InputFile } from "grammy";
import type { StatusCallback } from "../types";
import { convertMarkdownToHtml, escapeHtml } from "../formatting";
import {
  TELEGRAM_MESSAGE_LIMIT,
  TELEGRAM_SAFE_LIMIT,
  STREAMING_THROTTLE_MS,
  BUTTON_LABEL_MAX_LENGTH,
  WORKING_DIR,
} from "../config";
import type { ClaudeSession } from "../session";
import { bot } from "../bot";
import { getUsageLines, getCommandLines, formatModelInfo } from "./commands";

/**
 * Create inline keyboard for ask_user options.
 */
export function createAskUserKeyboard(
  requestId: string,
  options: string[]
): InlineKeyboard {
  const keyboard = new InlineKeyboard();
  for (let idx = 0; idx < options.length; idx++) {
    const option = options[idx]!;
    // Truncate long options for button display
    const display =
      option.length > BUTTON_LABEL_MAX_LENGTH
        ? option.slice(0, BUTTON_LABEL_MAX_LENGTH) + "..."
        : option;
    const callbackData = `askuser:${requestId}:${idx}`;
    keyboard.text(display, callbackData).row();
  }
  return keyboard;
}

/**
 * Check for pending ask-user requests and send inline keyboards.
 */
export async function checkPendingAskUserRequests(
  ctx: Context,
  chatId: number
): Promise<boolean> {
  const glob = new Bun.Glob("ask-user-*.json");
  let buttonsSent = false;

  for await (const filename of glob.scan({ cwd: "/tmp", absolute: false })) {
    const filepath = `/tmp/${filename}`;
    try {
      const file = Bun.file(filepath);
      const text = await file.text();
      const data = JSON.parse(text);

      // Only process pending requests for this chat
      if (data.status !== "pending") continue;
      if (String(data.chat_id) !== String(chatId)) continue;

      const question = data.question || "Please choose:";
      const options = data.options || [];
      const requestId = data.request_id || "";

      if (options.length > 0 && requestId) {
        const keyboard = createAskUserKeyboard(requestId, options);
        await ctx.reply(`❓ ${question}`, { reply_markup: keyboard });
        buttonsSent = true;

        // Mark as sent
        data.status = "sent";
        await Bun.write(filepath, JSON.stringify(data));
      }
    } catch (error) {
      console.warn(`Failed to process ask-user file ${filepath}:`, error);
    }
  }

  return buttonsSent;
}

/**
 * Check for pending send-turtle requests and send photos.
 */
export async function checkPendingSendTurtleRequests(
  ctx: Context,
  chatId: number
): Promise<boolean> {
  const glob = new Bun.Glob("send-turtle-*.json");
  let photoSent = false;

  for await (const filename of glob.scan({ cwd: "/tmp", absolute: false })) {
    const filepath = `/tmp/${filename}`;
    try {
      const file = Bun.file(filepath);
      const text = await file.text();
      const data = JSON.parse(text);

      // Only process pending requests for this chat
      if (data.status !== "pending") continue;
      if (String(data.chat_id) !== String(chatId)) continue;

      const url = data.url || "";
      const caption = data.caption || undefined;

      if (url) {
        try {
          // Download image and send as a sticker (renders smaller/cuter than photo)
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const buffer = Buffer.from(await response.arrayBuffer());
          const inputFile = new InputFile(buffer, "turtle.webp");
          await ctx.replyWithSticker(inputFile);
          // Send caption as a separate message if provided
          if (caption) await ctx.reply(caption);
        } catch (photoError) {
          // Photo send failed — try sending as a link instead
          console.warn(`Failed to send turtle photo, falling back to link:`, photoError);
          await ctx.reply(`🐢 ${url}${caption ? `\n${caption}` : ""}`);
        }
        photoSent = true;

        // Mark as sent
        data.status = "sent";
        await Bun.write(filepath, JSON.stringify(data));
      }
    } catch (error) {
      console.warn(`Failed to process send-turtle file ${filepath}:`, error);
    }
  }

  return photoSent;
}

/**
 * Check for pending bot-control requests, execute the action, and write
 * the result back so the MCP server's polling loop can pick it up.
 *
 * Unlike ask_user this does NOT break the event loop — Claude continues
 * after receiving the tool result.
 */
export async function checkPendingBotControlRequests(
  sessionObj: ClaudeSession,
  chatId: number,
): Promise<boolean> {
  const glob = new Bun.Glob("bot-control-*.json");
  let handled = false;

  for await (const filename of glob.scan({ cwd: "/tmp", absolute: false })) {
    const filepath = `/tmp/${filename}`;
    try {
      const file = Bun.file(filepath);
      const text = await file.text();
      const data = JSON.parse(text);

      // Only process pending requests for this chat
      if (data.status !== "pending") continue;
      if (String(data.chat_id) !== String(chatId)) continue;

      const action: string = data.action;
      const params: Record<string, string> = data.params || {};
      let result: string;

      try {
        result = await executeBotControlAction(sessionObj, action, params, chatId);
      } catch (err) {
        data.status = "error";
        data.error = String(err);
        await Bun.write(filepath, JSON.stringify(data, null, 2));
        handled = true;
        continue;
      }

      // Write result back for MCP server to pick up
      data.status = "completed";
      data.result = result;
      await Bun.write(filepath, JSON.stringify(data, null, 2));
      handled = true;
    } catch (error) {
      console.warn(`Failed to process bot-control file ${filepath}:`, error);
    }
  }

  return handled;
}

/**
 * Execute a single bot-control action and return a text result.
 */
async function executeBotControlAction(
  sessionObj: ClaudeSession,
  action: string,
  params: Record<string, string>,
  chatId?: number,
): Promise<string> {
  switch (action) {
    case "usage": {
      const lines = await getUsageLines();
      if (lines.length === 0) return "Failed to fetch usage data.";
      // Strip HTML tags but keep the unicode bar characters intact.
      // Wrap in a pre-formatted block so Claude passes it through verbatim.
      const plain = lines.map((l) => l.replace(/<[^>]+>/g, "")).join("\n\n");
      return `USAGE DATA (show this to the user as-is, in a code block):\n\n${plain}`;
    }

    case "switch_model": {
      const { getAvailableModels } = await import("../session");
      const models = getAvailableModels();

      if (params.model) {
        const requestedModel = params.model;
        const match = models.find(
          (m) =>
            m.value === requestedModel ||
            m.displayName.toLowerCase() === requestedModel.toLowerCase(),
        );
        if (!match) {
          const valid = models.map((m) => `${m.displayName} (${m.value})`).join(", ");
          return `Unknown model "${requestedModel}". Available: ${valid}`;
        }
        sessionObj.model = match.value;
      }

      if (params.effort) {
        const effort = params.effort.toLowerCase();
        if (!["low", "medium", "high"].includes(effort)) {
          return `Invalid effort "${params.effort}". Use: low, medium, high`;
        }
        sessionObj.effort = effort as "low" | "medium" | "high";
      }

      const currentModel = models.find((m) => m.value === sessionObj.model);
      const displayName = currentModel?.displayName || sessionObj.model;
      return `Model switched. Now using: ${displayName}, effort: ${sessionObj.effort}`;
    }

    case "new_session": {
      // Capture model info before kill (kill only clears sessionId, but be safe)
      const { modelName, effortStr } = formatModelInfo(sessionObj.model, sessionObj.effort);

      await sessionObj.stop();
      await sessionObj.kill();

      // Send command overview to the chat (same as /new)
      if (chatId) {
        try {
          const lines: string[] = [
            `<b>New session</b>\n`,
            `<b>Model:</b> ${modelName}${effortStr}`,
            `<b>Dir:</b> <code>${WORKING_DIR}</code>\n`,
          ];

          const usageLines = await getUsageLines();
          if (usageLines.length > 0) {
            lines.push(...usageLines, "");
          }

          lines.push(`<b>Commands:</b>`, ...getCommandLines());

          await bot.api.sendMessage(chatId, lines.join("\n"), { parse_mode: "HTML" });
        } catch (err) {
          console.warn("Failed to send new session overview:", err);
        }
      }

      return "Session cleared. Next message will start a fresh session.";
    }

    case "list_sessions": {
      const sessions = sessionObj.getSessionList();
      if (sessions.length === 0) return "No saved sessions.";

      const lines = sessions.map((s, i) => {
        const date = new Date(s.saved_at).toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        });
        return `${i + 1}. "${s.title}" (${date}) — ID: ${s.session_id.slice(0, 8)}...`;
      });
      return lines.join("\n");
    }

    case "resume_session": {
      const sessionId = params.session_id;
      if (!sessionId) return "Missing session_id parameter.";

      // Support both full ID and short prefix
      const sessions = sessionObj.getSessionList();
      const match = sessions.find(
        (s) => s.session_id === sessionId || s.session_id.startsWith(sessionId),
      );
      if (!match) return `No session found matching "${sessionId}".`;

      const [success, message] = sessionObj.resumeSession(match.session_id);
      return success ? `Resumed: "${match.title}"` : `Failed: ${message}`;
    }

    default:
      return `Unknown action: ${action}`;
  }
}

/**
 * Tracks state for streaming message updates.
 */
export class StreamingState {
  textMessages = new Map<number, Message>(); // segment_id -> telegram message
  toolMessages: Message[] = []; // ephemeral tool status messages
  lastEditTimes = new Map<number, number>(); // segment_id -> last edit time
  lastContent = new Map<number, string>(); // segment_id -> last sent content
}

/**
 * Format content for Telegram, ensuring it fits within the message limit.
 * Truncates raw content and re-converts if HTML output exceeds the limit.
 */
function formatWithinLimit(
  content: string,
  safeLimit: number = TELEGRAM_SAFE_LIMIT
): string {
  let display =
    content.length > safeLimit ? content.slice(0, safeLimit) + "..." : content;
  let formatted = convertMarkdownToHtml(display);

  // HTML tags can inflate content beyond the limit - shrink until it fits
  if (formatted.length > TELEGRAM_MESSAGE_LIMIT) {
    const ratio = TELEGRAM_MESSAGE_LIMIT / formatted.length;
    display = content.slice(0, Math.floor(safeLimit * ratio * 0.95)) + "...";
    formatted = convertMarkdownToHtml(display);
  }

  return formatted;
}

/**
 * Split long formatted content into chunks and send as separate messages.
 */
async function sendChunkedMessages(
  ctx: Context,
  content: string
): Promise<void> {
  // Split on markdown content first, then format each chunk
  for (let i = 0; i < content.length; i += TELEGRAM_SAFE_LIMIT) {
    const chunk = content.slice(i, i + TELEGRAM_SAFE_LIMIT);
    try {
      await ctx.reply(chunk, { parse_mode: "HTML" });
    } catch {
      // HTML failed (possibly broken tags from split) - try plain text
      try {
        await ctx.reply(chunk);
      } catch (plainError) {
        console.debug("Failed to send chunk:", plainError);
      }
    }
  }
}

/**
 * Create a status callback for streaming updates.
 */
export function createStatusCallback(
  ctx: Context,
  state: StreamingState
): StatusCallback {
  return async (statusType: string, content: string, segmentId?: number) => {
    try {
      if (statusType === "thinking") {
        // Show thinking inline, compact (first 500 chars)
        const preview =
          content.length > 500 ? content.slice(0, 500) + "..." : content;
        const escaped = escapeHtml(preview);
        const thinkingMsg = await ctx.reply(`🧠 <i>${escaped}</i>`, {
          parse_mode: "HTML",
        });
        state.toolMessages.push(thinkingMsg);
      } else if (statusType === "tool") {
        const toolMsg = await ctx.reply(content, { parse_mode: "HTML" });
        state.toolMessages.push(toolMsg);
      } else if (statusType === "text" && segmentId !== undefined) {
        const now = Date.now();
        const lastEdit = state.lastEditTimes.get(segmentId) || 0;

        if (!state.textMessages.has(segmentId)) {
          // New segment - create message
          const formatted = formatWithinLimit(content);
          try {
            const msg = await ctx.reply(formatted, { parse_mode: "HTML" });
            state.textMessages.set(segmentId, msg);
            state.lastContent.set(segmentId, formatted);
          } catch (htmlError) {
            // HTML parse failed, fall back to plain text
            console.debug("HTML reply failed, using plain text:", htmlError);
            const msg = await ctx.reply(formatted);
            state.textMessages.set(segmentId, msg);
            state.lastContent.set(segmentId, formatted);
          }
          state.lastEditTimes.set(segmentId, now);
        } else if (now - lastEdit > STREAMING_THROTTLE_MS) {
          // Update existing segment message (throttled)
          const msg = state.textMessages.get(segmentId)!;
          const formatted = formatWithinLimit(content);
          // Skip if content unchanged
          if (formatted === state.lastContent.get(segmentId)) {
            return;
          }
          try {
            await ctx.api.editMessageText(
              msg.chat.id,
              msg.message_id,
              formatted,
              {
                parse_mode: "HTML",
              }
            );
            state.lastContent.set(segmentId, formatted);
          } catch (error) {
            const errorStr = String(error);
            if (errorStr.includes("MESSAGE_TOO_LONG")) {
              // Skip this intermediate update - segment_end will chunk properly
              console.debug(
                "Streaming edit too long, deferring to segment_end"
              );
            } else {
              console.debug("HTML edit failed, trying plain text:", error);
              try {
                await ctx.api.editMessageText(
                  msg.chat.id,
                  msg.message_id,
                  formatted
                );
                state.lastContent.set(segmentId, formatted);
              } catch (editError) {
                console.debug("Edit message failed:", editError);
              }
            }
          }
          state.lastEditTimes.set(segmentId, now);
        }
      } else if (statusType === "segment_end" && segmentId !== undefined) {
        if (state.textMessages.has(segmentId) && content) {
          const msg = state.textMessages.get(segmentId)!;
          const formatted = convertMarkdownToHtml(content);

          // Skip if content unchanged
          if (formatted === state.lastContent.get(segmentId)) {
            return;
          }

          if (formatted.length <= TELEGRAM_MESSAGE_LIMIT) {
            try {
              await ctx.api.editMessageText(
                msg.chat.id,
                msg.message_id,
                formatted,
                {
                  parse_mode: "HTML",
                }
              );
            } catch (error) {
              const errorStr = String(error);
              if (errorStr.includes("MESSAGE_TOO_LONG")) {
                // HTML overhead pushed it over - delete and chunk
                try {
                  await ctx.api.deleteMessage(msg.chat.id, msg.message_id);
                } catch (delError) {
                  console.debug("Failed to delete for chunking:", delError);
                }
                await sendChunkedMessages(ctx, formatted);
              } else {
                console.debug("Failed to edit final message:", error);
              }
            }
          } else {
            // Too long - delete and split
            try {
              await ctx.api.deleteMessage(msg.chat.id, msg.message_id);
            } catch (error) {
              console.debug("Failed to delete message for splitting:", error);
            }
            await sendChunkedMessages(ctx, formatted);
          }
        }
      } else if (statusType === "done") {
        // Delete tool messages - text messages stay
        for (const toolMsg of state.toolMessages) {
          try {
            await ctx.api.deleteMessage(toolMsg.chat.id, toolMsg.message_id);
          } catch (error) {
            console.debug("Failed to delete tool message:", error);
          }
        }
      }
    } catch (error) {
      console.error("Status callback error:", error);
    }
  };
}
