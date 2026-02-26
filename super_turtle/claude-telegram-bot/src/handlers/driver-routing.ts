import type { Context } from "grammy";
import { DRIVER_ABSTRACTION_V1 } from "../config";
import { codexSession, mapThinkingToReasoningEffort } from "../codex-session";
import { getCurrentDriver } from "../drivers/registry";
import { session } from "../session";
import type { StatusCallback } from "../types";
import {
  checkPendingAskUserRequests,
  checkPendingBotControlRequests,
  checkPendingSendTurtleRequests,
} from "./streaming";

export interface DriverMessageInput {
  message: string;
  username: string;
  userId: number;
  chatId: number;
  ctx: Context;
  statusCallback: StatusCallback;
}

async function flushCodexMcpRequests(ctx: Context, chatId: number): Promise<void> {
  // Small delay to let MCP servers write files
  await new Promise((resolve) => setTimeout(resolve, 200));

  for (let attempt = 0; attempt < 3; attempt++) {
    const buttonsSent = await checkPendingAskUserRequests(ctx, chatId);
    if (buttonsSent) break;
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const photoSent = await checkPendingSendTurtleRequests(ctx, chatId);
    if (photoSent) break;
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const handled = await checkPendingBotControlRequests(session, chatId);
    if (handled) break;
    if (attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

export async function runMessageWithActiveDriver(
  input: DriverMessageInput
): Promise<string> {
  if (DRIVER_ABSTRACTION_V1) {
    return getCurrentDriver().runMessage(input);
  }

  if (session.activeDriver === "codex") {
    const reasoningEffort = mapThinkingToReasoningEffort(input.message);
    const response = await codexSession.sendMessage(
      input.message,
      input.statusCallback,
      undefined,
      reasoningEffort
    );
    await flushCodexMcpRequests(input.ctx, input.chatId);
    return response;
  }

  return session.sendMessageStreaming(
    input.message,
    input.username,
    input.userId,
    input.statusCallback,
    input.chatId,
    input.ctx
  );
}

export function isActiveDriverSessionActive(): boolean {
  if (DRIVER_ABSTRACTION_V1) {
    return getCurrentDriver().getStatusSnapshot().isActive;
  }
  return session.activeDriver === "codex" ? codexSession.isActive : session.isActive;
}

export function getDriverAuditType(baseType: string): string {
  return session.activeDriver === "codex" ? `${baseType}_CODEX` : baseType;
}

export function isAnyDriverRunning(): boolean {
  return session.isRunning || codexSession.isRunning;
}

export async function stopActiveDriverQuery(): Promise<"stopped" | "pending" | false> {
  if (DRIVER_ABSTRACTION_V1) {
    return getCurrentDriver().stop();
  }

  if (session.activeDriver === "codex") {
    return codexSession.stop();
  }

  return session.stop();
}
