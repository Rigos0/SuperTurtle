#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const { resolve } = require("path");
const { spawn, spawnSync } = require("child_process");
const { Sandbox } = require("e2b");

const REPO_ROOT = resolve(__dirname, "..", "..");
const HELPER_PATH = resolve(REPO_ROOT, "super_turtle", "bin", "teleport-e2b.js");
const RUN_LIVE_TESTS = process.env.SUPERTURTLE_RUN_LIVE_E2B_TESTS === "1";
const TELEPORT_TEMPLATE = process.env.SUPERTURTLE_TELEPORT_E2B_TEMPLATE?.trim() || null;
const SANDBOX_TIMEOUT_MS = 5 * 60 * 1000;
const HELPER_TIMEOUT_MS = 60 * 1000;
const REMOTE_DIR = "/tmp/superturtle-live-smoke";
const REMOTE_FILE = `${REMOTE_DIR}/handoff.txt`;
const REMOTE_PROJECT_ROOT = `${REMOTE_DIR}/project`;
const REMOTE_HOME = "/home/user";
const TEMP_SCRIPT_PREFIX = "superturtle-teleport-";

function skip(message) {
  console.log(`[skip] ${message}`);
  process.exit(0);
}

function runHelper(args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn("node", [HELPER_PATH, ...args], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        ...(options.env || {}),
      },
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let finished = false;
    const timeout = setTimeout(() => {
      if (finished) {
        return;
      }
      finished = true;
      child.kill("SIGKILL");
      rejectRun(new Error(`helper timed out after ${HELPER_TIMEOUT_MS}ms: ${args.join(" ")}`));
    }, HELPER_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", (error) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timeout);
      rejectRun(error);
    });
    child.on("close", (code) => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timeout);
      resolveRun({ code, stdout, stderr });
    });

    child.stdin.end(options.stdin || "");
  });
}

async function createSandbox() {
  if (TELEPORT_TEMPLATE) {
    return Sandbox.create(TELEPORT_TEMPLATE, { timeoutMs: SANDBOX_TIMEOUT_MS });
  }
  return Sandbox.create({ timeoutMs: SANDBOX_TIMEOUT_MS });
}

async function main() {
  if (!RUN_LIVE_TESTS) {
    skip("set SUPERTURTLE_RUN_LIVE_E2B_TESTS=1 to run the live E2B smoke test");
  }
  if (!process.env.E2B_API_KEY) {
    skip("E2B_API_KEY is not set");
  }

  const tmpDir = fs.mkdtempSync(resolve(os.tmpdir(), "superturtle-teleport-e2b-live-"));
  const sourcePath = resolve(tmpDir, "handoff.txt");
  const archiveSourceDir = resolve(tmpDir, "archive-source");
  const archivePath = resolve(tmpDir, "repo.tar.gz");
  const authArchiveSourceDir = resolve(tmpDir, "auth-archive-source");
  const authArchivePath = resolve(tmpDir, "auth-bootstrap.tar.gz");
  const payload = `semantic handoff ${Date.now()}\n`;
  fs.writeFileSync(sourcePath, payload);
  fs.mkdirSync(resolve(archiveSourceDir, "runtime-import"), { recursive: true });
  fs.writeFileSync(resolve(archiveSourceDir, "runtime-import", "handoff.txt"), payload);
  fs.writeFileSync(resolve(archiveSourceDir, "README.md"), "sandbox cutover smoke\n");
  fs.mkdirSync(resolve(authArchiveSourceDir, ".superturtle", "managed-runtime"), { recursive: true });
  fs.mkdirSync(resolve(authArchiveSourceDir, ".codex"), { recursive: true });
  fs.writeFileSync(
    resolve(authArchiveSourceDir, ".superturtle", "managed-runtime", "claude-access-token.txt"),
    "claude-live-token\n"
  );
  fs.writeFileSync(resolve(authArchiveSourceDir, ".codex", "auth.json"), '{"token":"codex-live"}\n');
  const archiveResult = spawnSync("tar", ["-czf", archivePath, "-C", archiveSourceDir, "."], {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
  assert.strictEqual(archiveResult.status, 0, archiveResult.stderr.toString("utf-8"));
  const authArchiveResult = spawnSync("tar", ["-czf", authArchivePath, "-C", authArchiveSourceDir, "."], {
    cwd: REPO_ROOT,
    stdio: "pipe",
  });
  assert.strictEqual(authArchiveResult.status, 0, authArchiveResult.stderr.toString("utf-8"));

  let sandbox = null;
  try {
    sandbox = await createSandbox();
    const sandboxId = sandbox.sandboxId || sandbox.id;
    assert.ok(sandboxId, "expected a live sandbox id");

    const uploadResult = await runHelper([
      "upload-file",
      "--sandbox-id",
      sandboxId,
      "--source",
      sourcePath,
      "--destination",
      REMOTE_FILE,
    ]);
    assert.strictEqual(uploadResult.code, 0, uploadResult.stderr);

    const uploadedPayload = await sandbox.files.read(REMOTE_FILE);
    assert.strictEqual(uploadedPayload, payload);

    const syncResult = await runHelper([
      "sync-archive",
      "--sandbox-id",
      sandboxId,
      "--source",
      archivePath,
      "--remote-root",
      REMOTE_PROJECT_ROOT,
      "--archive-path",
      "/tmp/superturtle-live-sync.tar.gz",
    ]);
    assert.strictEqual(syncResult.code, 0, syncResult.stderr);

    const syncedPayload = await sandbox.files.read(`${REMOTE_PROJECT_ROOT}/runtime-import/handoff.txt`);
    assert.strictEqual(syncedPayload, payload);
    const syncedReadme = await sandbox.files.read(`${REMOTE_PROJECT_ROOT}/README.md`);
    assert.strictEqual(syncedReadme, "sandbox cutover smoke\n");

    const extractClaudeResult = await runHelper([
      "extract-archive",
      "--sandbox-id",
      sandboxId,
      "--source",
      authArchivePath,
      "--destination-root",
      REMOTE_PROJECT_ROOT,
      "--archive-path",
      "/tmp/superturtle-live-auth-project.tar.gz",
    ]);
    assert.strictEqual(extractClaudeResult.code, 0, extractClaudeResult.stderr);
    const extractedClaudeToken = await sandbox.files.read(
      `${REMOTE_PROJECT_ROOT}/.superturtle/managed-runtime/claude-access-token.txt`
    );
    assert.strictEqual(extractedClaudeToken, "claude-live-token\n");

    const extractCodexResult = await runHelper([
      "extract-archive",
      "--sandbox-id",
      sandboxId,
      "--source",
      authArchivePath,
      "--destination-root",
      REMOTE_HOME,
      "--archive-path",
      "/tmp/superturtle-live-auth-home.tar.gz",
    ]);
    assert.strictEqual(extractCodexResult.code, 0, extractCodexResult.stderr);
    const extractedCodexAuth = await sandbox.files.read(`${REMOTE_HOME}/.codex/auth.json`);
    assert.strictEqual(extractedCodexAuth, '{"token":"codex-live"}\n');

    const scriptBody = [
      "set -euo pipefail",
      "pwd",
      "printf 'args=%s,%s\\n' \"$1\" \"$2\"",
      "test -f runtime-import/handoff.txt",
      "cat runtime-import/handoff.txt",
      "",
    ].join("\n");
    const runResult = await runHelper(
      [
        "run-script",
        "--sandbox-id",
        sandboxId,
        "--cwd",
        REMOTE_PROJECT_ROOT,
        "--timeout-ms",
        "20000",
        "--",
        "bash",
        "-s",
        "--",
        "alpha",
        "beta",
      ],
      { stdin: scriptBody }
    );

    assert.strictEqual(runResult.code, 0, runResult.stderr);
    assert.match(runResult.stdout, new RegExp(`^${REMOTE_PROJECT_ROOT}$`, "m"));
    assert.match(runResult.stdout, /^args=alpha,beta$/m);
    assert.match(runResult.stdout, new RegExp(payload.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "m"));

    const tmpEntries = await sandbox.files.list("/tmp");
    assert.ok(
      tmpEntries.every(
        (entry) =>
          entry.name !== undefined &&
          !String(entry.name).startsWith(TEMP_SCRIPT_PREFIX) &&
          String(entry.name) !== "superturtle-live-sync.tar.gz" &&
          String(entry.name) !== "superturtle-live-auth-project.tar.gz" &&
          String(entry.name) !== "superturtle-live-auth-home.tar.gz"
      ),
      "expected helper temp scripts to be cleaned up from /tmp"
    );
  } finally {
    if (sandbox) {
      try {
        await sandbox.kill();
      } catch {}
    }
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
