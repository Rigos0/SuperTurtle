#!/usr/bin/env node

const fs = require("fs");
const { spawnSync } = require("child_process");
const {
  heartbeatRuntimeLease,
  isRetryableCloudError,
  persistSessionIfChanged,
  readSession,
  releaseRuntimeLease,
} = require("./cloud");

const HEARTBEAT_INTERVAL_MS = 15 * 1000;
const MAX_CONSECUTIVE_FAILURES = 3;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  let session = readSession();
  if (!session?.access_token) {
    console.error("[runtime-lease] hosted session missing; stopping ownership agent");
    return;
  }

  let shuttingDown = false;
  let consecutiveFailures = 0;

  const cleanup = async () => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    try {
      session = readSession() || session;
      if (session?.access_token) {
        await releaseRuntimeLease(
          session,
          {
            lease_id: options.leaseId,
            lease_epoch: options.leaseEpoch,
            runtime_id: options.runtimeId,
          },
          process.env
        );
      }
    } catch {}

    if (options.leaseFile) {
      try {
        fs.unlinkSync(options.leaseFile);
      } catch {}
    }
  };

  const stopTmux = (reason) => {
    console.error(`[runtime-lease] ${reason}`);
    try {
      spawnSync("tmux", ["kill-session", "-t", options.tmuxSession], { stdio: "ignore" });
    } catch {}
  };

  const shutdownAndExit = () => {
    cleanup().finally(() => process.exit(0));
  };

  process.on("SIGINT", shutdownAndExit);
  process.on("SIGTERM", shutdownAndExit);
  process.on("SIGHUP", shutdownAndExit);
  process.on("exit", () => {
    if (options.leaseFile) {
      try {
        fs.unlinkSync(options.leaseFile);
      } catch {}
    }
  });

  for (;;) {
    try {
      const result = await heartbeatRuntimeLease(
        session,
        {
          lease_id: options.leaseId,
          lease_epoch: options.leaseEpoch,
          runtime_id: options.runtimeId,
          ttl_seconds: 45,
        },
        process.env
      );
      session = persistSessionIfChanged(session, result.session, process.env);
      consecutiveFailures = 0;
    } catch (error) {
      if (error && typeof error === "object" && error.session) {
        session = persistSessionIfChanged(session, error.session, process.env);
      }

      const status = error && typeof error === "object" ? error.status : undefined;
      const payload = error && typeof error === "object" ? error.payload : null;

      if (status === 409) {
        const owner = payload && typeof payload === "object" ? payload.lease : null;
        stopTmux(
          `ownership lost to another runtime${owner?.runtime_id ? ` (${owner.runtime_id})` : ""}; stopping tmux session ${options.tmuxSession}`
        );
        await cleanup();
        process.exit(1);
      }

      if (status === 401 || status === 403) {
        stopTmux(`hosted session rejected (${status}); stopping tmux session ${options.tmuxSession}`);
        await cleanup();
        process.exit(1);
      }

      if (!isRetryableCloudError(error)) {
        stopTmux(
          `non-retryable runtime lease error: ${error instanceof Error ? error.message : String(error)}`
        );
        await cleanup();
        process.exit(1);
      }

      consecutiveFailures += 1;
      console.error(
        `[runtime-lease] transient heartbeat failure ${consecutiveFailures}/${MAX_CONSECUTIVE_FAILURES}: ${error instanceof Error ? error.message : String(error)}`
      );
      if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
        stopTmux(
          `lease heartbeat failed ${consecutiveFailures} times; stopping tmux session ${options.tmuxSession}`
        );
        await cleanup();
        process.exit(1);
      }
    }

    await sleep(HEARTBEAT_INTERVAL_MS);
  }
}

function parseArgs(args) {
  const parsed = {
    leaseEpoch: null,
    leaseFile: null,
    leaseId: null,
    runtimeId: null,
    tmuxSession: null,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const value = args[index + 1];
    if ((arg === "--tmux-session" || arg === "--runtime-id" || arg === "--lease-id" || arg === "--lease-epoch" || arg === "--lease-file") && (!value || value.startsWith("--"))) {
      throw new Error(`Missing value for ${arg}`);
    }
    if (arg === "--tmux-session") {
      parsed.tmuxSession = value;
      index += 1;
      continue;
    }
    if (arg === "--runtime-id") {
      parsed.runtimeId = value;
      index += 1;
      continue;
    }
    if (arg === "--lease-id") {
      parsed.leaseId = value;
      index += 1;
      continue;
    }
    if (arg === "--lease-epoch") {
      parsed.leaseEpoch = Number(value);
      index += 1;
      continue;
    }
    if (arg === "--lease-file") {
      parsed.leaseFile = value;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!parsed.tmuxSession || !parsed.runtimeId || !parsed.leaseId || !Number.isInteger(parsed.leaseEpoch)) {
    throw new Error("Usage: runtime-ownership-agent --tmux-session <name> --runtime-id <id> --lease-id <id> --lease-epoch <n> [--lease-file <path>]");
  }

  return parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
