#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const { once } = require("events");
const { resolve } = require("path");
const { spawn } = require("child_process");

const REPO_ROOT = resolve(__dirname, "..", "..");
const AGENT_PATH = resolve(REPO_ROOT, "super_turtle", "bin", "runtime-ownership-agent.js");

function writeSession(path, controlPlane) {
  fs.writeFileSync(
    path,
    `${JSON.stringify(
      {
        schema_version: 1,
        control_plane: controlPlane,
        access_token: "access-abc",
        refresh_token: "refresh-abc",
        expires_at: "2999-03-13T00:00:00Z",
        created_at: "2026-03-12T00:00:00Z",
        last_sync_at: "2026-03-12T00:00:00Z",
      },
      null,
      2
    )}\n`
  );
}

async function testRuntimeOwnershipAgentReleasesLeaseOnSighup(tmpDir) {
  fs.mkdirSync(tmpDir, { recursive: true });
  const sessionPath = resolve(tmpDir, "cloud-session.json");
  const leaseFile = resolve(tmpDir, "cloud-runtime-lease.json");
  fs.writeFileSync(leaseFile, '{"lease":"active"}\n');

  let releaseCalls = 0;
  let releasePayload = null;

  const server = http.createServer((req, res) => {
    const authorize = req.headers.authorization;
    assert.strictEqual(authorize, "Bearer access-abc");

    if (req.method === "POST" && req.url === "/v1/cli/runtime/lease/heartbeat") {
      req.resume();
      req.on("end", () => {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            lease: {
              lease_id: "lease_test",
              lease_epoch: 7,
              runtime_id: "runtime_test",
              owner_type: "local",
              owner_hostname: "test-host",
              owner_pid: 4321,
              acquired_at: "2026-03-12T10:00:00Z",
              heartbeat_at: "2026-03-12T10:00:15Z",
              expires_at: "2026-03-12T10:01:00Z",
              metadata: {},
            },
          })
        );
      });
      return;
    }

    if (req.method === "POST" && req.url === "/v1/cli/runtime/lease/release") {
      releaseCalls += 1;
      let body = "";
      req.setEncoding("utf-8");
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        releasePayload = JSON.parse(body);
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            released: true,
            lease: {
              lease_id: "lease_test",
              lease_epoch: 7,
              runtime_id: "runtime_test",
              owner_type: "local",
              owner_hostname: "test-host",
              owner_pid: 4321,
              acquired_at: "2026-03-12T10:00:00Z",
              heartbeat_at: "2026-03-12T10:00:15Z",
              expires_at: "2026-03-12T10:01:00Z",
              metadata: {},
            },
          })
        );
      });
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });

  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  writeSession(sessionPath, `http://127.0.0.1:${address.port}`);

  const child = spawn(
    "node",
    [
      AGENT_PATH,
      "--tmux-session",
      "superturtle-test",
      "--runtime-id",
      "runtime_test",
      "--lease-id",
      "lease_test",
      "--lease-epoch",
      "7",
      "--lease-file",
      leaseFile,
    ],
    {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        SUPERTURTLE_CLOUD_SESSION_PATH: sessionPath,
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk.toString("utf-8");
  });

  try {
    await new Promise((resolveWait) => setTimeout(resolveWait, 200));
    assert.strictEqual(child.exitCode, null, `agent exited before SIGHUP, stderr:\n${stderr}`);
    child.kill("SIGHUP");
    const [code, signal] = await once(child, "close");
    assert.strictEqual(code, 0, `expected clean SIGHUP shutdown, got stderr:\n${stderr}`);
    assert.strictEqual(signal, null);
    assert.strictEqual(releaseCalls, 1, "expected hosted lease release on SIGHUP shutdown");
    assert.deepStrictEqual(releasePayload, {
      lease_id: "lease_test",
      lease_epoch: 7,
      runtime_id: "runtime_test",
    });
    assert.ok(!fs.existsSync(leaseFile), "expected lease file to be removed during shutdown");
  } finally {
    if (!child.killed) {
      child.kill("SIGKILL");
    }
    server.close();
  }
}

async function main() {
  const tmpDir = fs.realpathSync(fs.mkdtempSync(resolve(os.tmpdir(), "superturtle-runtime-ownership-agent-")));
  try {
    await testRuntimeOwnershipAgentReleasesLeaseOnSighup(tmpDir);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error));
  process.exit(1);
});
