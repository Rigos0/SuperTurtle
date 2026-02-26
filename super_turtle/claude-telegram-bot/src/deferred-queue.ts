import type { Context } from "grammy";
import { session } from "./session";
import { auditLog, startTypingIndicator } from "./utils";
import { isAnyDriverRunning, runMessageWithActiveDriver } from "./handlers/driver-routing";
import { StreamingState, createStatusCallback } from "./handlers/streaming";

export interface DeferredMessage {
  text: string;
  userId: number;
  username: string;
  chatId: number;
  source: "voice";
  enqueuedAt: number;
}

const MAX_QUEUE_PER_CHAT = 10;
const DEDUPE_WINDOW_MS = 5000;

const queues = new Map<number, DeferredMessage[]>();
const drainingChats = new Set<number>();

export function enqueueDeferredMessage(item: DeferredMessage): number {
  const queue = queues.get(item.chatId) || [];
  const last = queue[queue.length - 1];
  if (
    last &&
    last.text.trim() === item.text.trim() &&
    item.enqueuedAt - last.enqueuedAt <= DEDUPE_WINDOW_MS
  ) {
    queues.set(item.chatId, queue);
    return queue.length;
  }

  queue.push(item);
  if (queue.length > MAX_QUEUE_PER_CHAT) {
    queue.shift();
  }

  queues.set(item.chatId, queue);
  return queue.length;
}

export function dequeueDeferredMessage(chatId: number): DeferredMessage | undefined {
  const queue = queues.get(chatId);
  if (!queue || queue.length === 0) {
    return undefined;
  }

  const next = queue.shift();
  if (queue.length === 0) {
    queues.delete(chatId);
  } else {
    queues.set(chatId, queue);
  }
  return next;
}

export function getDeferredQueueSize(chatId: number): number {
  return queues.get(chatId)?.length || 0;
}

export async function drainDeferredQueue(ctx: Context, chatId: number): Promise<void> {
  if (drainingChats.has(chatId) || isAnyDriverRunning()) {
    return;
  }

  drainingChats.add(chatId);
  try {
    while (!isAnyDriverRunning()) {
      const next = dequeueDeferredMessage(chatId);
      if (!next) {
        break;
      }

      const stopProcessing = session.startProcessing();
      const typing = startTypingIndicator(ctx);
      session.typingController = typing;

      try {
        const state = new StreamingState();
        const statusCallback = createStatusCallback(ctx, state);
        const response = await runMessageWithActiveDriver({
          message: next.text,
          username: next.username,
          userId: next.userId,
          chatId: next.chatId,
          ctx,
          statusCallback,
        });

        await auditLog(
          next.userId,
          next.username,
          next.source === "voice" ? "VOICE_QUEUED" : "TEXT_QUEUED",
          next.text,
          response
        );
      } catch (error) {
        const message = String(error).toLowerCase();
        if (!message.includes("abort") && !message.includes("cancel")) {
          await ctx.reply(`❌ Error: ${String(error).slice(0, 200)}`);
        }
        break;
      } finally {
        stopProcessing();
        typing.stop();
        session.typingController = null;
      }
    }
  } finally {
    drainingChats.delete(chatId);
  }
}
