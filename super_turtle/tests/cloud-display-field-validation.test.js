const assert = require("assert");
const fs = require("fs");
const os = require("os");
const { resolve } = require("path");

const { fetchCloudStatus, fetchWhoAmI, pollLogin, readSession } = require("../bin/cloud.js");

const originalFetch = global.fetch;

function responseJson(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json" },
  });
}

(async () => {
  const tmpDir = fs.mkdtempSync(resolve(os.tmpdir(), "superturtle-cloud-display-"));
  const sessionPath = resolve(tmpDir, "cloud-session.json");
  const env = {
    SUPERTURTLE_CLOUD_URL: "https://api.superturtle.dev",
    SUPERTURTLE_CLOUD_SESSION_PATH: sessionPath,
  };

  try {
    global.fetch = async function patchedFetch(url) {
      const target = String(url);
      if (target.endsWith("/v1/cli/login/poll")) {
        return responseJson({
          access_token: "access-abc",
          refresh_token: "refresh-def",
          expires_at: "2999-03-12T10:00:00Z",
          user: { id: "user_123", email: "user@example.com\n" },
        });
      }
      if (target.endsWith("/v1/cli/session")) {
        return responseJson({
          user: { id: "user_123", email: "user@example.com" },
          workspace: { slug: " acme " },
          entitlement: { plan: "managed", state: "active" },
        });
      }
      if (target.endsWith("/v1/cli/cloud/status")) {
        return responseJson({
          instance: {
            id: "inst_123",
            state: "running",
            region: "us-central1",
            hostname: "managed-123.internal\r\nsecond-line",
          },
          provisioning_job: {
            state: "running",
            updated_at: "2026-03-12T09:59:00Z",
          },
        });
      }
      throw new Error(`Unexpected URL: ${url}`);
    };

    await assert.rejects(
      () =>
        pollLogin(
          {
            device_code: "dev-code-123",
            interval_ms: 1,
          },
          { timeoutMs: 3000 },
          env
        ),
      /Hosted login completion returned an invalid user.email/i
    );

    await assert.rejects(
      () =>
        fetchWhoAmI(
          {
            access_token: "access-abc",
            control_plane: "https://api.superturtle.dev",
          },
          env
        ),
      /Hosted session lookup returned an invalid workspace.slug/i
    );

    await assert.rejects(
      () =>
        fetchCloudStatus(
          {
            access_token: "access-abc",
            control_plane: "https://api.superturtle.dev",
          },
          env
        ),
      /Hosted cloud status lookup returned an invalid instance.hostname/i
    );

    fs.writeFileSync(
      sessionPath,
      `${JSON.stringify({
        access_token: "access-abc",
        refresh_token: "refresh-def",
        control_plane: "https://api.superturtle.dev",
        user: { id: "user_123", email: "user@example.com" },
        entitlement: { plan: "managed", state: "active\npending" },
      }, null, 2)}\n`
    );
    assert.throws(
      () => readSession(env),
      /Hosted session file .* invalid entitlement.state/i
    );
  } finally {
    global.fetch = originalFetch;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
