#!/usr/bin/env node
"use strict";

const { basename, resolve } = require("path");
const {
  clearRemoteWebhook,
  formatStateSummary,
  getBoundProjectRoot,
  getTeleportStatus,
  launchTeleportRuntime,
  loadPocState,
  pauseTeleportSandbox,
  resumeTeleportSandbox,
  setRemoteWebhook,
  tailTeleportLogs,
} = require("./e2b-webhook-poc-lib.js");

function parseArgs(argv) {
  const args = argv.slice(2);
  const command = args[0] || "help";
  const options = {};

  for (let i = 1; i < args.length; i += 1) {
    const token = args[i];
    if (!token.startsWith("--")) {
      continue;
    }
    const key = token.slice(2);
    const next = args[i + 1];
    if (next && !next.startsWith("--")) {
      options[key] = next;
      i += 1;
    } else {
      options[key] = "true";
    }
  }

  return { command, options };
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable ${name}.`);
  }
  return value.trim();
}

function projectRootFromOptions(options) {
  return getBoundProjectRoot(options.cwd || process.cwd());
}

function printHelp() {
  console.log(`Usage: node super_turtle/bin/e2b-webhook-poc.js <command> [options]

Commands:
  launch            Create or reuse one sandbox, sync repo, and start the bot
  status            Show local POC state, sandbox state, health, and Telegram webhook info
  pause             Pause the sandbox
  resume            Resume the sandbox with Sandbox.connect()
  set-webhook       Register Telegram webhook to the saved sandbox URL
  delete-webhook    Delete Telegram webhook
  logs              Print the last N lines from the remote bot log

Common options:
  --sandbox-id <id>           Reuse an existing sandbox
  --port <port>               Remote bot port (default: 3000)
  --timeout-ms <ms>           Sandbox timeout before auto-pause
  --remote-root <path>        Remote project root (default: /home/user/<repo>)
  --remote-mode <mode>        Remote runtime mode: control | agent
  --webhook-path <path>       Telegram webhook path inside the sandbox
  --webhook-secret <secret>   Telegram webhook secret token
  --drop-pending-updates      Apply Telegram drop_pending_updates when changing webhook
  --lines <n>                 Number of log lines for logs (default: 50)
`);
}

async function launch(options) {
  const projectRoot = projectRootFromOptions(options);
  const state = await launchTeleportRuntime(projectRoot, {
    port: options.port,
    timeoutMs: options["timeout-ms"],
    remoteRoot: options["remote-root"],
    remoteMode: options["remote-mode"],
    webhookPath: options["webhook-path"],
    webhookSecret: options["webhook-secret"],
    healthPath: options["health-path"],
    readyPath: options["ready-path"],
    "sandbox-id": options["sandbox-id"],
  });

  console.log(formatStateSummary(state));
  console.log(`Ready check passed: ${state.readyUrl || state.healthUrl}`);
}

async function status(options) {
  const projectRoot = projectRootFromOptions(options);
  const result = await getTeleportStatus(projectRoot);
  const { state, info, health, readiness, webhookInfo } = result;

  console.log(formatStateSummary(state));
  console.log(`Sandbox state: ${info?.state || "unknown"}`);
  console.log(`Health: ${health}`);
  console.log(`Readiness: ${readiness}`);
  if (webhookInfo?.result) {
    console.log(`Telegram webhook URL: ${webhookInfo.result.url || "<unset>"}`);
    console.log(`Telegram pending updates: ${String(webhookInfo.result.pending_update_count || 0)}`);
    if (webhookInfo.result.last_error_message) {
      console.log(`Telegram last error: ${webhookInfo.result.last_error_message}`);
    }
  }
}

async function pauseSandbox(options) {
  const projectRoot = projectRootFromOptions(options);
  const state = await pauseTeleportSandbox(projectRoot);
  console.log(`Paused sandbox: ${state.sandboxId}`);
}

async function resumeSandbox(options) {
  const projectRoot = projectRootFromOptions(options);
  const state = await resumeTeleportSandbox(projectRoot);
  console.log(`Resumed sandbox: ${state.sandboxId}`);
}

async function setWebhook(options) {
  const projectRoot = projectRootFromOptions(options);
  const { state } = await setRemoteWebhook(projectRoot, {
    dropPendingUpdates: options["drop-pending-updates"] === "true",
  });
  console.log(`Set Telegram webhook: ${state.webhookUrl}`);
}

async function deleteWebhook(options) {
  const projectRoot = projectRootFromOptions(options);
  await clearRemoteWebhook(projectRoot, {
    dropPendingUpdates: options["drop-pending-updates"] === "true",
  });
  console.log("Deleted Telegram webhook");
}

async function logs(options) {
  const projectRoot = projectRootFromOptions(options);
  const state = loadPocState(projectRoot);
  if (!state) {
    throw new Error("No local E2B webhook POC state file found.");
  }
  const lines = Number.parseInt(String(options.lines || 50), 10);
  if (!Number.isInteger(lines) || lines <= 0) {
    throw new Error(`Invalid --lines value: ${String(options.lines || 50)}`);
  }

  const result = await tailTeleportLogs(projectRoot, lines);
  process.stdout.write(result.stdout || "");
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
}

async function main() {
  const { command, options } = parseArgs(process.argv);

  if (command === "help" || command === "--help" || command === "-h") {
    printHelp();
    return;
  }

  requireEnv("E2B_API_KEY");

  switch (command) {
    case "launch":
      await launch(options);
      return;
    case "status":
      await status(options);
      return;
    case "pause":
      await pauseSandbox(options);
      return;
    case "resume":
      await resumeSandbox(options);
      return;
    case "set-webhook":
      await setWebhook(options);
      return;
    case "delete-webhook":
      await deleteWebhook(options);
      return;
    case "logs":
      await logs(options);
      return;
    default:
      printHelp();
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
