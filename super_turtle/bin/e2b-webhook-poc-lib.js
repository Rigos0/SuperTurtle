"use strict";

const fs = require("fs");
const os = require("os");
const { dirname, join, resolve } = require("path");
const crypto = require("crypto");

const TELEPORT_STATE_RELATIVE_PATH = join(".superturtle", "teleport-state.json");
const LEGACY_POC_STATE_RELATIVE_PATH = join(".superturtle", "e2b-webhook-poc.json");
const PROJECT_CONFIG_RELATIVE_PATH = join(".superturtle", "project.json");
const PROJECT_ENV_RELATIVE_PATH = join(".superturtle", ".env");
const DEFAULT_PORT = 3000;
const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_HEALTH_PATH = "/healthz";
const DEFAULT_REMOTE_HOME = "/home/user";
const DEFAULT_LOG_PATH = "/tmp/superturtle-e2b-bot.log";
const DEFAULT_PID_PATH = "/tmp/superturtle-e2b-bot.pid";
const DEFAULT_ARCHIVE_PATH = "/tmp/superturtle-e2b-project.tgz";
const DEFAULT_OWNER_MODE = "local";

function normalizeExistingPath(path) {
  try {
    return fs.realpathSync(path);
  } catch {
    return resolve(path);
  }
}

function findUpwards(startDir, relativePath) {
  let current = normalizeExistingPath(startDir);
  while (true) {
    const candidate = resolve(current, relativePath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function findGitRoot(startDir) {
  let current = normalizeExistingPath(startDir);
  while (true) {
    const gitPath = resolve(current, ".git");
    if (fs.existsSync(gitPath)) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

function getBoundProjectRoot(startDir) {
  const configPath = findUpwards(startDir, PROJECT_CONFIG_RELATIVE_PATH);
  if (configPath) {
    try {
      const parsed = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      if (parsed && typeof parsed.repo_root === "string" && parsed.repo_root.trim()) {
        return normalizeExistingPath(parsed.repo_root.trim());
      }
    } catch {}
    return dirname(dirname(configPath));
  }

  const envPath = findUpwards(startDir, PROJECT_ENV_RELATIVE_PATH);
  if (envPath) {
    return dirname(dirname(envPath));
  }

  const gitRoot = findGitRoot(startDir);
  if (gitRoot) {
    return gitRoot;
  }

  return normalizeExistingPath(startDir);
}

function getStateFilePath(projectRoot) {
  return resolve(projectRoot, TELEPORT_STATE_RELATIVE_PATH);
}

function getLegacyPocStateFilePath(projectRoot) {
  return resolve(projectRoot, LEGACY_POC_STATE_RELATIVE_PATH);
}

function loadPocState(projectRoot) {
  const statePath = getStateFilePath(projectRoot);
  if (fs.existsSync(statePath)) {
    return JSON.parse(fs.readFileSync(statePath, "utf-8"));
  }
  const legacyStatePath = getLegacyPocStateFilePath(projectRoot);
  if (!fs.existsSync(legacyStatePath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(legacyStatePath, "utf-8"));
}

function savePocState(projectRoot, state) {
  const statePath = getStateFilePath(projectRoot);
  fs.mkdirSync(dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`, "utf-8");
  return statePath;
}

function parseDotEnv(content) {
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

function loadProjectEnv(projectRoot) {
  const envPath = resolve(projectRoot, PROJECT_ENV_RELATIVE_PATH);
  if (!fs.existsSync(envPath)) {
    throw new Error(`Missing project env file at ${envPath}. Run 'superturtle init' first.`);
  }
  return parseDotEnv(fs.readFileSync(envPath, "utf-8"));
}

function loadRuntimeEnv(projectRoot) {
  try {
    return loadProjectEnv(projectRoot);
  } catch {
    return Object.fromEntries(
      Object.entries(process.env).filter(([, value]) => typeof value === "string")
    );
  }
}

function randomToken(length = 24) {
  return crypto.randomBytes(length).toString("hex");
}

function normalizePath(pathname) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalized.replace(/\/{2,}/g, "/");
}

function buildPocConfig(projectRoot, options = {}, existingState = null) {
  const repoName = projectRoot.split("/").filter(Boolean).pop() || "project";
  const port = Number.parseInt(String(options.port || existingState?.port || DEFAULT_PORT), 10);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid port ${String(options.port || existingState?.port || DEFAULT_PORT)}.`);
  }

  const timeoutMs = Number.parseInt(
    String(options.timeoutMs || existingState?.timeoutMs || DEFAULT_TIMEOUT_MS),
    10
  );
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`Invalid timeoutMs ${String(options.timeoutMs || existingState?.timeoutMs || DEFAULT_TIMEOUT_MS)}.`);
  }

  const healthPath = normalizePath(
    options.healthPath || existingState?.healthPath || DEFAULT_HEALTH_PATH
  );
  const remoteRoot = options.remoteRoot || existingState?.remoteRoot || `${DEFAULT_REMOTE_HOME}/${repoName}`;
  const remoteBotDir = `${remoteRoot}/super_turtle/claude-telegram-bot`;
  const webhookSecret = options.webhookSecret || existingState?.webhookSecret || randomToken(16);
  const webhookPath = normalizePath(
    options.webhookPath ||
      existingState?.webhookPath ||
      `/telegram/webhook/${randomToken(8)}`
  );
  const logPath = options.logPath || existingState?.logPath || DEFAULT_LOG_PATH;
  const pidPath = options.pidPath || existingState?.pidPath || DEFAULT_PID_PATH;
  const archivePath = options.archivePath || existingState?.archivePath || DEFAULT_ARCHIVE_PATH;

  return {
    port,
    timeoutMs,
    healthPath,
    remoteRoot,
    remoteBotDir,
    webhookSecret,
    webhookPath,
    logPath,
    pidPath,
    archivePath,
  };
}

function buildWebhookUrl(host, webhookPath) {
  return `https://${host}${normalizePath(webhookPath)}`;
}

function buildHealthUrl(host, healthPath) {
  return `https://${host}${normalizePath(healthPath)}`;
}

function buildRemoteEnv(projectEnv, remoteRoot, webhookUrl, webhookSecret, port, healthPath) {
  const env = {
    ...projectEnv,
    CLAUDE_WORKING_DIR: remoteRoot,
    SUPERTURTLE_RUNTIME_ROLE: "teleport-remote",
    TELEGRAM_TRANSPORT: "webhook",
    TELEGRAM_WEBHOOK_REGISTER: "false",
    TELEGRAM_WEBHOOK_URL: webhookUrl,
    TELEGRAM_WEBHOOK_SECRET: webhookSecret,
    TELEGRAM_WEBHOOK_HEALTH_PATH: healthPath,
    PORT: String(port),
    TURTLE_GREETINGS: "false",
  };

  const requiredKeys = ["TELEGRAM_BOT_TOKEN", "TELEGRAM_ALLOWED_USERS"];
  for (const key of requiredKeys) {
    if (!env[key] || !String(env[key]).trim()) {
      throw new Error(`Missing required env ${key} in project config.`);
    }
  }

  return env;
}

function buildStateRecord(projectRoot, sandboxId, host, config, ownerMode = DEFAULT_OWNER_MODE) {
  return {
    version: 1,
    repoRoot: projectRoot,
    ownerMode,
    sandboxId,
    host,
    port: config.port,
    timeoutMs: config.timeoutMs,
    remoteRoot: config.remoteRoot,
    remoteBotDir: config.remoteBotDir,
    webhookPath: config.webhookPath,
    webhookSecret: config.webhookSecret,
    webhookUrl: buildWebhookUrl(host, config.webhookPath),
    healthPath: config.healthPath,
    healthUrl: buildHealthUrl(host, config.healthPath),
    logPath: config.logPath,
    pidPath: config.pidPath,
    archivePath: config.archivePath,
    updatedAt: new Date().toISOString(),
  };
}

function formatStateSummary(state) {
  const lines = [
    `Owner mode: ${state.ownerMode || DEFAULT_OWNER_MODE}`,
    `Sandbox: ${state.sandboxId}`,
    `Webhook URL: ${state.webhookUrl}`,
    `Health URL: ${state.healthUrl}`,
    `Remote root: ${state.remoteRoot}`,
    `Remote bot dir: ${state.remoteBotDir}`,
    `Remote log: ${state.logPath}`,
  ];
  if (state.updatedAt) {
    lines.push(`Updated: ${state.updatedAt}`);
  }
  return lines.join("\n");
}

function shellEscape(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function buildRemoteBootstrapCommand(config) {
  const bunInstallSnippet =
    "if ! command -v bun >/dev/null 2>&1; then " +
    "curl -fsSL https://bun.sh/install | bash >/tmp/superturtle-e2b-bun-install.log 2>&1; " +
    "fi; " +
    "export PATH=\"$HOME/.bun/bin:$PATH\"";

  return [
    "set -euo pipefail",
    bunInstallSnippet,
    `rm -rf ${shellEscape(config.remoteRoot)}`,
    `mkdir -p ${shellEscape(config.remoteRoot)}`,
    `tar -xzf ${shellEscape(config.archivePath)} -C ${shellEscape(config.remoteRoot)}`,
    `mkdir -p ${shellEscape(`${config.remoteRoot}/.superturtle`)}`,
    `cd ${shellEscape(config.remoteBotDir)}`,
    "bun install --frozen-lockfile || bun install",
  ].join(" && ");
}

function buildRemoteStartCommand(config) {
  return [
    "set -euo pipefail",
    "export PATH=\"$HOME/.bun/bin:$PATH\"",
    `cd ${shellEscape(config.remoteBotDir)}`,
    `if [ -f ${shellEscape(config.pidPath)} ]; then kill "$(cat ${shellEscape(config.pidPath)})" >/dev/null 2>&1 || true; rm -f ${shellEscape(config.pidPath)}; fi`,
    `: > ${shellEscape(config.logPath)}`,
    `echo $$ > ${shellEscape(config.pidPath)}`,
    `exec bun run src/index.ts >> ${shellEscape(config.logPath)} 2>&1`,
  ].join(" && ");
}

async function importSandbox() {
  try {
    return await import("@e2b/code-interpreter");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load the E2B SDK (${message}). Run 'cd super_turtle && bun install' first.`
    );
  }
}

function createArchiveBuffer(projectRoot) {
  const { spawnSync } = require("child_process");
  const tarArgs = [
    "-czf",
    "-",
    "--exclude=.git",
    "--exclude=.env",
    "--exclude=node_modules",
    "--exclude=.venv",
    "--exclude=.subturtles",
    "--exclude=.superturtle",
    "--exclude=*.log",
    ".",
  ];

  const proc = spawnSync("tar", tarArgs, {
    cwd: projectRoot,
    encoding: null,
    maxBuffer: 512 * 1024 * 1024,
    env: {
      ...process.env,
      COPYFILE_DISABLE: "1",
    },
  });

  if (proc.error) {
    throw new Error(`Failed to create project archive: ${proc.error.message}`);
  }
  if (proc.status !== 0) {
    const stderr = proc.stderr ? proc.stderr.toString("utf-8") : "";
    throw new Error(`Failed to create project archive: ${stderr.trim() || "tar exited non-zero."}`);
  }

  return proc.stdout;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${url}: ${typeof payload === "string" ? payload : JSON.stringify(payload)}`);
  }
  return payload;
}

async function setTelegramWebhook(botToken, webhookUrl, webhookSecret, options = {}) {
  const endpoint = `https://api.telegram.org/bot${botToken}/setWebhook`;
  return fetchJson(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: webhookSecret,
      drop_pending_updates: Boolean(options.dropPendingUpdates),
    }),
  });
}

async function deleteTelegramWebhook(botToken, options = {}) {
  const endpoint = `https://api.telegram.org/bot${botToken}/deleteWebhook`;
  return fetchJson(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      drop_pending_updates: Boolean(options.dropPendingUpdates),
    }),
  });
}

async function getTelegramWebhookInfo(botToken) {
  const endpoint = `https://api.telegram.org/bot${botToken}/getWebhookInfo`;
  return fetchJson(endpoint, { method: "GET" });
}

async function waitForHealth(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: "GET" });
      if (response.ok) {
        return true;
      }
      lastError = new Error(`health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((nextResolve) => setTimeout(nextResolve, 1000));
  }

  throw new Error(
    `Timed out waiting for sandbox health at ${url}: ${lastError instanceof Error ? lastError.message : String(lastError)}`
  );
}

async function lookupSandboxInfo(Sandbox, sandboxId) {
  const paginator = await Sandbox.list();
  while (paginator.hasNext) {
    const items = await paginator.nextItems();
    const match = items.find((item) => item.sandboxId === sandboxId);
    if (match) {
      return match;
    }
  }
  return null;
}

function isMissingSandboxError(error) {
  if (!error) return false;
  const name = typeof error.name === "string" ? error.name : "";
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  return (
    name === "NotFoundError" ||
    (normalized.includes("sandbox") && normalized.includes("not found"))
  );
}

function requireProjectState(projectRoot) {
  const state = loadPocState(projectRoot);
  if (!state) {
    throw new Error(`No local teleport state found at ${getStateFilePath(projectRoot)}.`);
  }
  return state;
}

function saveStateWithOwner(projectRoot, state, ownerMode) {
  const nextState = {
    ...state,
    ownerMode,
    updatedAt: new Date().toISOString(),
  };
  savePocState(projectRoot, nextState);
  return nextState;
}

async function launchTeleportRuntime(projectRoot, options = {}) {
  const projectEnv = loadProjectEnv(projectRoot);
  const existingState = loadPocState(projectRoot);
  const config = buildPocConfig(projectRoot, options, existingState);
  const archiveBuffer = createArchiveBuffer(projectRoot);
  const { Sandbox } = await importSandbox();

  const sandboxId = options["sandbox-id"] || existingState?.sandboxId || null;
  let sandbox = null;
  if (sandboxId) {
    try {
      sandbox = await Sandbox.connect(sandboxId, { timeoutMs: config.timeoutMs });
    } catch (error) {
      if (!isMissingSandboxError(error)) {
        throw error;
      }
    }
  }
  if (!sandbox) {
    sandbox = await Sandbox.create({
      timeoutMs: config.timeoutMs,
      lifecycle: {
        onTimeout: "pause",
        autoResume: true,
      },
    });
  }

  const host = sandbox.getHost(config.port);
  const webhookUrl = buildWebhookUrl(host, config.webhookPath);
  const healthUrl = buildHealthUrl(host, config.healthPath);
  const remoteEnv = buildRemoteEnv(
    projectEnv,
    config.remoteRoot,
    webhookUrl,
    config.webhookSecret,
    config.port,
    config.healthPath
  );

  await sandbox.files.write(config.archivePath, archiveBuffer);
  await sandbox.commands.run(buildRemoteBootstrapCommand(config), {
    envs: remoteEnv,
    timeoutMs: 10 * 60 * 1000,
  });
  await sandbox.commands.run(buildRemoteStartCommand(config), {
    envs: remoteEnv,
    background: true,
    timeoutMs: 10 * 60 * 1000,
  });
  await waitForHealth(healthUrl, 90 * 1000);

  const state = buildStateRecord(projectRoot, sandbox.sandboxId, host, config, DEFAULT_OWNER_MODE);
  savePocState(projectRoot, state);
  return state;
}

async function getTeleportStatus(projectRoot) {
  const state = requireProjectState(projectRoot);
  const runtimeEnv = loadRuntimeEnv(projectRoot);
  const { Sandbox } = await importSandbox();
  const info = await lookupSandboxInfo(Sandbox, state.sandboxId);
  let health = "unknown";

  if (info?.state === "paused") {
    health = "skipped while paused";
  } else {
    try {
      await waitForHealth(state.healthUrl, 5 * 1000);
      health = "ok";
    } catch (error) {
      health = error instanceof Error ? error.message : String(error);
    }
  }

  const webhookInfo = await getTelegramWebhookInfo(runtimeEnv.TELEGRAM_BOT_TOKEN);
  return { state, info, health, webhookInfo };
}

async function setRemoteWebhook(projectRoot, options = {}) {
  const state = requireProjectState(projectRoot);
  const runtimeEnv = loadRuntimeEnv(projectRoot);
  await setTelegramWebhook(runtimeEnv.TELEGRAM_BOT_TOKEN, state.webhookUrl, state.webhookSecret, {
    dropPendingUpdates: Boolean(options.dropPendingUpdates),
  });

  const webhookInfo = await getTelegramWebhookInfo(runtimeEnv.TELEGRAM_BOT_TOKEN);
  const currentUrl = webhookInfo?.result?.url || "";
  if (currentUrl !== state.webhookUrl) {
    await deleteTelegramWebhook(runtimeEnv.TELEGRAM_BOT_TOKEN, {
      dropPendingUpdates: false,
    });
    throw new Error(`Webhook ownership verification failed. Expected ${state.webhookUrl} but Telegram reports ${currentUrl || "<unset>"}.`);
  }

  return {
    state: saveStateWithOwner(projectRoot, state, "remote"),
    webhookInfo,
  };
}

async function clearRemoteWebhook(projectRoot, options = {}) {
  const state = loadPocState(projectRoot);
  const runtimeEnv = loadRuntimeEnv(projectRoot);
  await deleteTelegramWebhook(runtimeEnv.TELEGRAM_BOT_TOKEN, {
    dropPendingUpdates: Boolean(options.dropPendingUpdates),
  });
  const webhookInfo = await getTelegramWebhookInfo(runtimeEnv.TELEGRAM_BOT_TOKEN);
  const currentUrl = webhookInfo?.result?.url || "";
  if (currentUrl) {
    throw new Error(`Webhook delete verification failed. Telegram still reports ${currentUrl}.`);
  }
  return {
    state: state ? saveStateWithOwner(projectRoot, state, "local") : null,
    webhookInfo,
  };
}

async function reconcileTeleportOwnership(projectRoot) {
  const state = loadPocState(projectRoot);
  if (!state || state.ownerMode !== "remote") {
    return state;
  }

  const runtimeEnv = loadRuntimeEnv(projectRoot);
  const webhookInfo = await getTelegramWebhookInfo(runtimeEnv.TELEGRAM_BOT_TOKEN);
  const currentUrl = webhookInfo?.result?.url || "";
  if (currentUrl === state.webhookUrl) {
    return state;
  }

  return saveStateWithOwner(projectRoot, state, "local");
}

async function pauseTeleportSandbox(projectRoot) {
  const state = requireProjectState(projectRoot);
  const { Sandbox } = await importSandbox();
  const info = await lookupSandboxInfo(Sandbox, state.sandboxId);
  if (info?.state === "paused") {
    return state;
  }
  const sandbox = await Sandbox.connect(state.sandboxId, { timeoutMs: state.timeoutMs || 60_000 });
  await sandbox.pause();
  return state;
}

async function resumeTeleportSandbox(projectRoot) {
  const state = requireProjectState(projectRoot);
  const { Sandbox } = await importSandbox();
  await Sandbox.connect(state.sandboxId, { timeoutMs: state.timeoutMs || 60_000 });
  await waitForHealth(state.healthUrl, 90 * 1000);
  return state;
}

async function tailTeleportLogs(projectRoot, lines = 50) {
  const state = requireProjectState(projectRoot);
  const { Sandbox } = await importSandbox();
  const sandbox = await Sandbox.connect(state.sandboxId, { timeoutMs: state.timeoutMs || 60_000 });
  return sandbox.commands.run(`tail -n ${lines} ${JSON.stringify(state.logPath)}`, {
    timeoutMs: 30_000,
  });
}

module.exports = {
  DEFAULT_ARCHIVE_PATH,
  DEFAULT_HEALTH_PATH,
  DEFAULT_LOG_PATH,
  DEFAULT_PORT,
  DEFAULT_PID_PATH,
  DEFAULT_TIMEOUT_MS,
  TELEPORT_STATE_RELATIVE_PATH,
  buildHealthUrl,
  buildRemoteBootstrapCommand,
  buildPocConfig,
  buildRemoteEnv,
  buildRemoteStartCommand,
  buildStateRecord,
  buildWebhookUrl,
  formatStateSummary,
  getBoundProjectRoot,
  getLegacyPocStateFilePath,
  getStateFilePath,
  getTelegramWebhookInfo,
  clearRemoteWebhook,
  createArchiveBuffer,
  deleteTelegramWebhook,
  getTeleportStatus,
  importSandbox,
  launchTeleportRuntime,
  loadPocState,
  loadProjectEnv,
  loadRuntimeEnv,
  lookupSandboxInfo,
  isMissingSandboxError,
  parseDotEnv,
  pauseTeleportSandbox,
  reconcileTeleportOwnership,
  resumeTeleportSandbox,
  savePocState,
  setRemoteWebhook,
  setTelegramWebhook,
  tailTeleportLogs,
  waitForHealth,
};
