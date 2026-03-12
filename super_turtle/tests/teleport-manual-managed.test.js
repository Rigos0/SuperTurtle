#!/usr/bin/env node

const assert = require("assert");
const fs = require("fs");
const http = require("http");
const os = require("os");
const { resolve } = require("path");
const { spawn } = require("child_process");

const REPO_ROOT = resolve(__dirname, "..", "..");
const SCRIPT_PATH = resolve(REPO_ROOT, "super_turtle", "scripts", "teleport-manual.sh");

function runScript(env) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn("bash", [SCRIPT_PATH, "--managed", "--dry-run"], {
      cwd: REPO_ROOT,
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

function writeExecutable(path, body) {
  fs.writeFileSync(path, body, { mode: 0o755 });
}

async function main() {
  const tmpDir = fs.mkdtempSync(resolve(os.tmpdir(), "superturtle-teleport-managed-"));
  const fakeBinDir = resolve(tmpDir, "bin");
  fs.mkdirSync(fakeBinDir, { recursive: true });
  const sshLogPath = resolve(tmpDir, "ssh.log");
  const rsyncLogPath = resolve(tmpDir, "rsync.log");
  const sessionPath = resolve(tmpDir, "cloud-session.json");

  writeExecutable(
    resolve(fakeBinDir, "ssh"),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> ${JSON.stringify(sshLogPath)}
cat >/dev/null
`
  );
  writeExecutable(
    resolve(fakeBinDir, "rsync"),
    `#!/usr/bin/env bash
set -euo pipefail
printf '%s\n' "$*" >> ${JSON.stringify(rsyncLogPath)}
`
  );
  writeExecutable(
    resolve(fakeBinDir, "bun"),
    `#!/usr/bin/env bash
set -euo pipefail
exit 0
`
  );

  fs.writeFileSync(
    sessionPath,
    `${JSON.stringify(
      {
        schema_version: 1,
        control_plane: "http://127.0.0.1:1",
        access_token: "access-abc",
        refresh_token: "refresh-abc",
        expires_at: "2026-03-13T00:00:00Z",
        created_at: "2026-03-12T00:00:00Z",
        last_sync_at: "2026-03-12T00:00:00Z",
      },
      null,
      2
    )}\n`
  );

  let resumeCalls = 0;
  let statusCalls = 0;
  let targetCalls = 0;

  const server = http.createServer((req, res) => {
    const authorize = req.headers.authorization;
    assert.strictEqual(authorize, "Bearer access-abc");

    if (req.method === "GET" && req.url === "/v1/cli/teleport/target") {
      targetCalls += 1;
      res.writeHead(targetCalls >= 2 ? 200 : 409, { "content-type": "application/json" });
      res.end(
        JSON.stringify(
          targetCalls >= 2
            ? {
                instance: {
                  id: "inst_123",
                  provider: "gcp",
                  state: "running",
                  region: "us-central1",
                  zone: "us-central1-b",
                  hostname: "vm-ready.managed.superturtle.internal",
                  vm_name: "vm-ready",
                  machine_token_id: "machine-token-123",
                  last_seen_at: "2026-03-12T10:00:00Z",
                  resume_requested_at: "2026-03-12T09:58:00Z",
                },
                ssh_target: "superturtle@vm-ready.managed.superturtle.internal",
                remote_root: "/srv/superturtle",
                audit_log: [],
              }
            : { error: "managed_instance_not_running" }
        )
      );
      return;
    }

    if (req.method === "POST" && req.url === "/v1/cli/cloud/instance/resume") {
      resumeCalls += 1;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          instance: {
            id: "inst_123",
            provider: "gcp",
            state: "provisioning",
            region: "us-central1",
            zone: "us-central1-b",
            hostname: null,
            vm_name: "vm-ready",
            machine_token_id: null,
            last_seen_at: null,
            resume_requested_at: "2026-03-12T09:58:00Z",
          },
          provisioning_job: {
            id: "job_123",
            kind: "resume",
            state: "queued",
            attempt: 1,
            created_at: "2026-03-12T09:58:00Z",
            started_at: null,
            updated_at: "2026-03-12T09:58:00Z",
            completed_at: null,
            error_code: null,
            error_message: null,
          },
          audit_log: [],
        })
      );
      return;
    }

    if (req.method === "GET" && req.url === "/v1/cli/cloud/status") {
      statusCalls += 1;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          instance: {
            id: "inst_123",
            provider: "gcp",
            state: statusCalls >= 2 ? "running" : "provisioning",
            region: "us-central1",
            zone: "us-central1-b",
            hostname: statusCalls >= 2 ? "vm-ready.managed.superturtle.internal" : null,
            vm_name: "vm-ready",
            machine_token_id: statusCalls >= 2 ? "machine-token-123" : null,
            last_seen_at: statusCalls >= 2 ? "2026-03-12T10:00:00Z" : null,
            resume_requested_at: "2026-03-12T09:58:00Z",
          },
          provisioning_job: {
            id: "job_123",
            kind: "resume",
            state: statusCalls >= 2 ? "succeeded" : "running",
            attempt: 1,
            created_at: "2026-03-12T09:58:00Z",
            started_at: "2026-03-12T09:58:10Z",
            updated_at: "2026-03-12T09:58:20Z",
            completed_at: statusCalls >= 2 ? "2026-03-12T09:58:30Z" : null,
            error_code: null,
            error_message: null,
          },
          audit_log: [],
        })
      );
      return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });

  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  const session = JSON.parse(fs.readFileSync(sessionPath, "utf-8"));
  session.control_plane = baseUrl;
  fs.writeFileSync(sessionPath, `${JSON.stringify(session, null, 2)}\n`);

  try {
    const result = await runScript({
      ...process.env,
      PATH: `${fakeBinDir}:${process.env.PATH}`,
      SUPERTURTLE_CLOUD_SESSION_PATH: sessionPath,
      SUPERTURTLE_TELEPORT_INSTANCE_READY_TIMEOUT_MS: "5000",
      SUPERTURTLE_TELEPORT_INSTANCE_READY_POLL_INTERVAL_MS: "10",
    });

    assert.strictEqual(result.code, 0, result.stderr);
    assert.match(result.stdout, /\[teleport\] ssh target: superturtle@vm-ready\.managed\.superturtle\.internal/);
    assert.match(result.stdout, /\[teleport\] remote root: \/srv\/superturtle/);
    assert.match(result.stdout, /\[teleport\] dry-run complete/);
    assert.match(result.stderr, /managed instance is not ready; requesting resume/i);
    assert.match(result.stderr, /waiting for managed instance to become ready/i);
    assert.strictEqual(resumeCalls, 1);
    assert.ok(statusCalls >= 2, `expected at least two status polls but saw ${statusCalls}`);
    assert.strictEqual(targetCalls, 2);
    assert.match(fs.readFileSync(sshLogPath, "utf-8"), /superturtle@vm-ready\.managed\.superturtle\.internal/);
    assert.match(fs.readFileSync(rsyncLogPath, "utf-8"), /superturtle@vm-ready\.managed\.superturtle\.internal:\/srv\/superturtle\//);
  } finally {
    server.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
