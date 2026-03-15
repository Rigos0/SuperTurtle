import { WORKING_DIR } from "./config";

const teleportLib = require("../../bin/e2b-webhook-poc-lib.js");

export type TeleportOwnerMode = "local" | "remote";
export type RuntimeRole = "local" | "teleport-remote";

export type TeleportState = {
  version: number;
  repoRoot: string;
  ownerMode?: TeleportOwnerMode;
  sandboxId: string;
  host: string;
  port: number;
  timeoutMs: number;
  remoteRoot: string;
  remoteBotDir: string;
  webhookPath: string;
  webhookSecret: string;
  webhookUrl: string;
  healthPath: string;
  healthUrl: string;
  logPath: string;
  pidPath: string;
  archivePath: string;
  updatedAt: string;
};

export const TELEPORT_CONTROL_MESSAGE =
  "This remote teleport runtime is control-only. Use /home to return Telegram ownership to your PC.";

export const TELEPORT_REMOTE_ALLOWED_COMMANDS = new Set([
  "home",
  "status",
  "looplogs",
  "pinologs",
  "debug",
  "restart",
]);

export async function launchTeleportRuntimeForCurrentProject(): Promise<TeleportState> {
  return teleportLib.launchTeleportRuntime(WORKING_DIR);
}

export async function activateTeleportOwnershipForCurrentProject(): Promise<{
  state: TeleportState;
  webhookInfo: { result?: { url?: string } };
}> {
  return teleportLib.setRemoteWebhook(WORKING_DIR);
}

export async function releaseTeleportOwnershipForCurrentProject(): Promise<{
  state: TeleportState | null;
  webhookInfo: { result?: { url?: string } };
}> {
  return teleportLib.clearRemoteWebhook(WORKING_DIR);
}

export async function reconcileTeleportOwnershipForCurrentProject(): Promise<TeleportState | null> {
  return teleportLib.reconcileTeleportOwnership(WORKING_DIR);
}

export function loadTeleportStateForCurrentProject(): TeleportState | null {
  return teleportLib.loadPocState(WORKING_DIR);
}
