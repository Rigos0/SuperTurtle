import type { Context } from "grammy";
import { getCurrentDriver, getDriver } from "../drivers/registry";
import type { DriverId } from "../drivers/types";
import { session } from "../session";
import type { StatusCallback } from "../types";

export interface DriverMessageInput {
  message: string;
  username: string;
  userId: number;
  chatId: number;
  ctx: Context;
  statusCallback: StatusCallback;
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
  return getDriver(driverId).runMessage(input);
}

export function isActiveDriverSessionActive(): boolean {
  return getCurrentDriver().getStatusSnapshot().isActive;
}

export function getDriverAuditType(baseType: string): string {
  return session.activeDriver === "codex" ? `${baseType}_CODEX` : baseType;
}

export function isAnyDriverRunning(): boolean {
  return session.isRunning;
}

export async function stopActiveDriverQuery(): Promise<"stopped" | "pending" | false> {
  return getCurrentDriver().stop();
}
