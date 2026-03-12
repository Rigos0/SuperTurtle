const assert = require("assert");
const fs = require("fs");
const os = require("os");
const { resolve } = require("path");

const { readSession } = require("../bin/cloud.js");

if (
  process.platform === "win32" ||
  typeof fs.constants?.O_NOFOLLOW !== "number" ||
  typeof fs.fchmodSync !== "function"
) {
  process.exit(0);
}

const tmpDir = fs.mkdtempSync(resolve(os.tmpdir(), "superturtle-cloud-session-permission-race-"));
const sessionPath = resolve(tmpDir, "cloud-session.json");
const redirectedPath = resolve(tmpDir, "redirected.json");
const env = {
  ...process.env,
  SUPERTURTLE_CLOUD_SESSION_PATH: sessionPath,
};

const originalOpenSync = fs.openSync;
let openCount = 0;
let redirectedMode = null;

try {
  fs.writeFileSync(
    sessionPath,
    `${JSON.stringify({
      schema_version: 1,
      access_token: "access-abc",
      refresh_token: "refresh-def",
      control_plane: "https://api.superturtle.dev",
      created_at: "2026-03-12T10:00:00Z",
      last_sync_at: "2026-03-12T10:00:00Z",
    }, null, 2)}\n`,
    "utf-8"
  );
  fs.chmodSync(sessionPath, 0o644);
  fs.writeFileSync(redirectedPath, "{\"access_token\":\"stolen\"}\n", "utf-8");
  redirectedMode = fs.statSync(redirectedPath).mode & 0o777;

  fs.openSync = function patchedOpenSync(path, flags, mode) {
    if (path === sessionPath) {
      openCount += 1;
      if (openCount === 2) {
        fs.unlinkSync(sessionPath);
        fs.symlinkSync(redirectedPath, sessionPath);
      }
    }
    return originalOpenSync.call(fs, path, flags, mode);
  };

  assert.throws(
    () => readSession(env),
    /Hosted session file at .* must be a regular file/i
  );
  assert.ok(fs.lstatSync(sessionPath).isSymbolicLink(), "expected permission hardening to refuse a swapped symlink");
  assert.strictEqual(
    fs.statSync(redirectedPath).mode & 0o777,
    redirectedMode,
    "expected permission repair to avoid mutating the redirected target"
  );
} finally {
  fs.openSync = originalOpenSync;
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
