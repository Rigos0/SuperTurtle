const assert = require("assert");
const fs = require("fs");
const os = require("os");
const { resolve } = require("path");

const { readSession, writeSession } = require("../bin/cloud.js");

const tmpDir = fs.mkdtempSync(resolve(os.tmpdir(), "superturtle-cloud-session-size-race-"));
const sessionPath = resolve(tmpDir, "cloud-session.json");
const writeEnv = {
  ...process.env,
  SUPERTURTLE_CLOUD_SESSION_PATH: sessionPath,
};
const env = {
  ...writeEnv,
  SUPERTURTLE_CLOUD_SESSION_MAX_BYTES: "160",
};

const originalReadSync = fs.readSync;
let injectedOversize = false;
let oversizedOffset = 0;

try {
  writeSession(
    {
      access_token: "access-abc",
      refresh_token: "refresh-def",
      control_plane: "https://api.superturtle.dev",
    },
    writeEnv
  );

  const oversizedPayload = Buffer.from(
    `${JSON.stringify({
      schema_version: 1,
      access_token: "access-abc",
      refresh_token: "refresh-def",
      control_plane: "https://api.superturtle.dev",
      padding: "x".repeat(512),
    })}\n`,
    "utf-8"
  );

  fs.readSync = function patchedReadSync(fd, buffer, offset, length, position) {
    if (!injectedOversize && position == null) {
      injectedOversize = true;
    }
    if (injectedOversize) {
      if (oversizedOffset >= oversizedPayload.length) {
        return 0;
      }
      const bytesToCopy = Math.min(length, oversizedPayload.length - oversizedOffset);
      oversizedPayload.copy(buffer, offset, oversizedOffset, oversizedOffset + bytesToCopy);
      oversizedOffset += bytesToCopy;
      return bytesToCopy;
    }
    return originalReadSync.call(fs, fd, buffer, offset, length, position);
  };

  assert.throws(
    () => readSession(env),
    /Hosted session file .* exceeds the configured size limit of 160 bytes/i
  );
  assert.ok(injectedOversize, "expected test to inject an oversized session read after the initial size check");
} finally {
  fs.readSync = originalReadSync;
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
