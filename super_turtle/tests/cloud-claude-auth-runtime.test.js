const assert = require("assert");
const fs = require("fs");
const os = require("os");
const { resolve } = require("path");

const {
  CONTROL_PLANE_WRITE_SCOPE,
  createDefaultState,
  createRuntime,
  readState,
  requestClaudeProviderStatus,
  setupClaudeProviderAuth,
  writeState,
} = require("../bin/cloud-control-plane-runtime.js");

function createSeedState() {
  const state = createDefaultState();
  state.users.push({
    id: "user_123",
    email: "user@example.com",
    created_at: "2026-03-12T10:00:00Z",
  });
  state.identities.push({
    id: "ident_123",
    user_id: "user_123",
    provider: "github",
    provider_user_id: "github_123",
    email: "user@example.com",
    created_at: "2026-03-12T10:00:00Z",
    last_used_at: null,
  });
  state.sessions.push({
    id: "sess_123",
    user_id: "user_123",
    state: "active",
    access_token: "access_123",
    refresh_token: "refresh_123",
    scopes: [CONTROL_PLANE_WRITE_SCOPE],
    created_at: "2026-03-12T10:00:00Z",
    expires_at: "2026-03-12T11:00:00Z",
    last_authenticated_at: "2026-03-12T10:00:00Z",
  });
  state.entitlements.push({
    user_id: "user_123",
    plan: "managed",
    state: "active",
    subscription_id: "sub_123",
    current_period_end: "2026-04-12T10:00:00Z",
    cancel_at_period_end: false,
  });
  return state;
}

async function run() {
  const tmpDir = fs.mkdtempSync(resolve(os.tmpdir(), "superturtle-claude-auth-runtime-"));
  const statePath = resolve(tmpDir, "control-plane-state.json");
  writeState(statePath, createSeedState());

  const runtime = createRuntime({
    statePath,
    now: (() => {
      const values = [
        "2026-03-12T10:00:00Z",
        "2026-03-12T10:00:01Z",
        "2026-03-12T10:00:02Z",
        "2026-03-12T10:00:03Z",
      ];
      let index = 0;
      return () => values[Math.min(index++, values.length - 1)];
    })(),
    claude: {
      authAdapter: {
        async validateAccessToken({ accessToken }) {
          if (accessToken === "claude-valid-token") {
            return { valid: true, accountEmail: "claude-user@example.com" };
          }
          return { valid: false, errorCode: "invalid_claude_credentials" };
        },
      },
    },
  });

  const initialStatus = requestClaudeProviderStatus(runtime, "access_123");
  assert.strictEqual(initialStatus.status, 200);
  assert.strictEqual(initialStatus.data.provider, "claude");
  assert.strictEqual(initialStatus.data.configured, false);
  assert.strictEqual(initialStatus.data.credential, null);

  const configured = await setupClaudeProviderAuth(runtime, "access_123", {
    access_token: "claude-valid-token",
  });
  assert.strictEqual(configured.status, 200);
  assert.strictEqual(configured.data.configured, true);
  assert.strictEqual(configured.data.credential.provider, "claude");
  assert.strictEqual(configured.data.credential.state, "valid");
  assert.strictEqual(configured.data.credential.account_email, "claude-user@example.com");

  const persisted = readState(statePath);
  assert.strictEqual(persisted.provider_credentials.length, 1);
  assert.strictEqual(persisted.provider_credentials[0].user_id, "user_123");
  assert.strictEqual(persisted.provider_credentials[0].provider, "claude");
  assert.strictEqual(persisted.provider_credentials[0].access_token, "claude-valid-token");
  assert.match(
    JSON.stringify(persisted.audit_log),
    /provider_credential\.claude_configured/,
    "expected Claude provider configuration to be written to the audit log"
  );

  const rejected = await setupClaudeProviderAuth(runtime, "access_123", {
    access_token: "claude-invalid-token",
  });
  assert.strictEqual(rejected.status, 422);

  const persistedAfterReject = readState(statePath);
  assert.strictEqual(
    persistedAfterReject.provider_credentials[0].access_token,
    "claude-valid-token",
    "expected rejected setup attempts not to overwrite the last valid user-scoped Claude token"
  );
  assert.match(
    JSON.stringify(persistedAfterReject.audit_log),
    /provider_credential\.claude_validation_rejected/,
    "expected rejected Claude validation attempts to be written to the audit log"
  );
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
