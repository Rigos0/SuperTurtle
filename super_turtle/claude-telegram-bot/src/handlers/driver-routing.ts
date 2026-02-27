import type { Context } from "grammy";
import { getCurrentDriver, getDriver } from "../drivers/registry";
import type { DriverId } from "../drivers/types";
import { session } from "../session";
import { codexSession } from "../codex-session";
import type { StatusCallback } from "../types";
import { isSpawnOrchestrationToolStatus } from "./streaming";

export interface DriverMessageInput {
  message: string;
  username: string;
  userId: number;
  chatId: number;
  ctx: Context;
  statusCallback: StatusCallback;
}

const MAX_RETRIES = 1;

function buildStallRecoveryPrompt(originalMessage: string): string {
  return `The previous response stream stalled before completion while handling this request.
Continue from current repository/runtime state and finish the task safely.
Before making changes, verify what already happened (for example existing files, running processes, or prior command effects).
Do not blindly repeat side-effecting operations that may have already succeeded.

Original request:
${originalMessage}`;
}

export function isLikelyQuotaOrLimitError(error: unknown): boolean {
  const text = String(error).toLowerCase();
  return (
    text.includes("quota") ||
    text.includes("usage") ||
    text.includes("rate limit") ||
    text.includes("limit reached") ||
    text.includes("insufficient")
  );
}

export async function runMessageWithActiveDriver(
  input: DriverMessageInput
): Promise<string> {
  return runMessageWithDriver(session.activeDriver, input);
}

export async function runMessageWithDriver(
  driverId: DriverId,
  input: DriverMessageInput
): Promise<string> {
  const driver = getDriver(driverId);
  let message = input.message;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let sawToolUse = false;
    let sawSpawnOrchestration = false;

    const trackingStatusCallback: StatusCallback = async (
      type,
      content,
      segmentId
    ) => {
      if (type === "tool") {
        sawToolUse = true;
        if (isSpawnOrchestrationToolStatus(content)) {
          sawSpawnOrchestration = true;
        }
      }
      await input.statusCallback(type, content, segmentId);
    };

    try {
      return await driver.runMessage({
        ...input,
        message,
        statusCallback: trackingStatusCallback,
      });
    } catch (error) {
      if (attempt >= MAX_RETRIES) {
        throw error;
      }

      if (driver.isStallError(error)) {
        if (sawSpawnOrchestration) {
          // Skip automatic retry to avoid duplicate SubTurtle spawns.
          throw error;
        }

        if (!sawToolUse) {
          await driver.kill();
        } else {
          message = buildStallRecoveryPrompt(message);
        }
        continue;
      }

      if (driver.isCrashError(error) && !sawToolUse) {
        await driver.kill();
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unexpected driver retry state");
}

export function isActiveDriverSessionActive(): boolean {
  return getCurrentDriver().getStatusSnapshot().isActive;
}

export function getDriverAuditType(baseType: string): string {
  return session.activeDriver === "codex" ? `${baseType}_CODEX` : baseType;
}

export function isAnyDriverRunning(): boolean {
  return session.isRunning || codexSession.isRunning;
}

export async function stopActiveDriverQuery(): Promise<"stopped" | "pending" | false> {
  const current = getCurrentDriver();
  const currentResult = await current.stop();
  if (currentResult) {
    return currentResult;
  }

  const fallbackDriverId: DriverId = session.activeDriver === "codex" ? "claude" : "codex";
  return getDriver(fallbackDriverId).stop();
}
