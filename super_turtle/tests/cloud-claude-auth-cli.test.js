#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const { resolve } = require("path");
const { spawn } = require("child_process");

const CLI_PATH = resolve(__dirname, "..", "bin", "superturtle.js");
const tmpDir = fs.mkdtempSync(resolve(os.tmpdir(), "superturtle-claude-auth-cli-"));
const sessionPath = resolve(tmpDir, "cloud-session.json");

function runCli(args, env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn("node", [CLI_PATH, ...args], {
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf-8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf-8");
    });
    child.on("error", rejectRun);
    child.on("close", (code) => {
      resolveRun({ code, stdout, stderr });
    });
  });
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf-8")) : null;
    if (req.method === "GET" && req.url === "/v1/cli/providers/claude/status") {
      assert.strictEqual(req.headers.authorization, "Bearer access_123");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        provider: "claude",
        configured: true,
        credential: {
          id: "cred_123",
          provider: "claude",
          state: "valid",
          account_email: "claude-user@example.com",
          configured_at: "2026-03-12T10:00:00Z",
          last_validated_at: "2026-03-12T10:00:01Z",
          last_error_code: null,
          last_error_message: null,
        },
        audit_log: [],
      }));
      return;
    }

    if (req.method === "POST" && req.url === "/v1/cli/providers/claude/setup") {
      assert.strictEqual(req.headers.authorization, "Bearer access_123");
      assert.deepStrictEqual(body, {
        access_token: "claude-valid-token",
      });
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({
        provider: "claude",
        configured: true,
        credential: {
          id: "cred_123",
          provider: "claude",
          state: "valid",
          account_email: "claude-user@example.com",
          configured_at: "2026-03-12T10:00:00Z",
          last_validated_at: "2026-03-12T10:00:02Z",
          last_error_code: null,
          last_error_message: null,
        },
        audit_log: [],
      }));
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });
});

async function run() {
  await new Promise((resolveListen) => {
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const address = server.address();
  const env = {
    ...process.env,
    SUPERTURTLE_CLOUD_URL: `http://127.0.0.1:${address.port}`,
    SUPERTURTLE_CLOUD_SESSION_PATH: sessionPath,
    CLAUDE_TEST_TOKEN: "claude-valid-token",
  };

  fs.writeFileSync(
    sessionPath,
    JSON.stringify({
      schema_version: 1,
      control_plane: env.SUPERTURTLE_CLOUD_URL,
      access_token: "access_123",
      refresh_token: "refresh_123",
      expires_at: "2099-03-12T11:00:00Z",
      created_at: "2026-03-12T10:00:00Z",
      last_sync_at: "2026-03-12T10:00:00Z",
    }),
    { mode: 0o600 }
  );

  const status = await runCli(["cloud", "claude", "status"], env);
  assert.strictEqual(status.code, 0);
  assert.match(status.stdout, /Provider: claude/);
  assert.match(status.stdout, /Configured: yes/);
  assert.match(status.stdout, /Claude account: claude-user@example.com/);

  const setup = await runCli(["cloud", "claude", "setup", "--token-env", "CLAUDE_TEST_TOKEN"], env);
  assert.strictEqual(setup.code, 0);
  assert.match(setup.stdout, /Provider: claude/);
  assert.match(setup.stdout, /Configured: yes/);
  assert.match(setup.stdout, /Last validated: 2026-03-12T10:00:02Z/);
}

run()
  .then(() => new Promise((resolveClose) => server.close(resolveClose)))
  .catch((error) => {
    server.close(() => {
      console.error(error);
      process.exit(1);
    });
  });
