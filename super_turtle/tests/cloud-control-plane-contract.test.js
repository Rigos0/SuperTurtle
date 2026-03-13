const assert = require("assert");

const {
  assertManagedInstanceTransition,
  assertProvisioningJobTransition,
  validateCliCloudStatusResponse,
  validateCliTeleportTargetResponse,
  validateCliTokenResponse,
  validateCliWhoAmIResponse,
} = require("../bin/cloud-control-plane-contract.js");

(() => {
  const whoami = validateCliWhoAmIResponse({
    user: {
      id: "user_123",
      email: "user@example.com",
      created_at: "2026-03-12T10:00:00Z",
    },
    workspace: {
      slug: "acme",
    },
    identities: [
      {
        id: "ident_123",
        provider: "github",
        provider_user_id: "octocat",
        email: "user@example.com",
        created_at: "2026-03-12T10:00:00Z",
      },
    ],
    session: {
      id: "sess_123",
      state: "active",
      scopes: ["cloud:read", "teleport:write"],
      created_at: "2026-03-12T10:00:00Z",
      expires_at: "2026-03-12T12:00:00Z",
    },
    entitlement: {
      plan: "managed",
      state: "active",
      subscription_id: "sub_123",
      current_period_end: "2026-04-12T10:00:00Z",
      cancel_at_period_end: false,
    },
  });
  assert.strictEqual(whoami.identities[0].provider, "github");
  assert.strictEqual(whoami.session.state, "active");

  const token = validateCliTokenResponse({
    access_token: "access_123",
    refresh_token: "refresh_123",
    expires_at: "2026-03-12T12:00:00Z",
    user: {
      id: "user_123",
      email: "user@example.com",
    },
    entitlement: {
      plan: "managed",
      state: "active",
    },
    instance: {
      id: "inst_123",
      provider: "gcp",
      state: "running",
      region: "us-central1",
      zone: "us-central1-a",
      hostname: "managed-123.internal",
      last_seen_at: "2026-03-12T10:00:00Z",
    },
    provisioning_job: {
      id: "job_123",
      kind: "provision",
      state: "succeeded",
      attempt: 1,
      created_at: "2026-03-12T09:59:00Z",
      started_at: "2026-03-12T09:59:30Z",
      updated_at: "2026-03-12T10:00:00Z",
      completed_at: "2026-03-12T10:00:00Z",
    },
  });
  assert.strictEqual(token.instance.provider, "gcp");
  assert.strictEqual(token.provisioning_job.kind, "provision");

  const cloudStatus = validateCliCloudStatusResponse({
    instance: {
      id: "inst_123",
      provider: "gcp",
      state: "suspended",
      region: "us-central1",
      hostname: "managed-123.internal",
      resume_requested_at: "2026-03-12T11:00:00Z",
    },
    provisioning_job: {
      id: "job_456",
      kind: "resume",
      state: "running",
      attempt: 2,
      updated_at: "2026-03-12T11:00:05Z",
    },
    audit_log: [
      {
        id: "audit_123",
        actor_type: "system",
        actor_id: "control-plane",
        action: "instance.resume_requested",
        target_type: "managed_instance",
        target_id: "inst_123",
        created_at: "2026-03-12T11:00:05Z",
        metadata: {
          reason: "cli-login",
        },
      },
    ],
  });
  assert.strictEqual(cloudStatus.audit_log[0].action, "instance.resume_requested");

  const e2bTeleportTarget = validateCliTeleportTargetResponse({
    instance: {
      id: "inst_e2b",
      provider: "e2b",
      state: "running",
      sandbox_id: "sandbox_123",
      template_id: "template_teleport_v1",
      last_seen_at: "2026-03-12T10:00:00Z",
    },
    transport: "e2b",
    sandbox_id: "sandbox_123",
    template_id: "template_teleport_v1",
    project_root: "/home/user/agentic",
    sandbox_metadata: {
      account_id: "acct_123",
      sandbox_role: "managed_runtime",
    },
    audit_log: [],
  });
  assert.strictEqual(e2bTeleportTarget.transport, "e2b");
  assert.strictEqual(e2bTeleportTarget.project_root, "/home/user/agentic");
  assert.strictEqual(e2bTeleportTarget.sandbox_id, "sandbox_123");

  assert.doesNotThrow(() => assertManagedInstanceTransition("requested", "provisioning"));
  assert.doesNotThrow(() => assertManagedInstanceTransition("suspended", "running"));
  assert.doesNotThrow(() => assertProvisioningJobTransition("queued", "running"));
  assert.doesNotThrow(() => assertProvisioningJobTransition("failed", "queued"));

  assert.throws(
    () =>
      validateCliWhoAmIResponse({
        identities: [
          {
            id: "ident_123",
            provider: "gitlab",
            provider_user_id: "octocat",
          },
        ],
      }),
    /provider/i
  );

  assert.throws(
    () =>
      validateCliCloudStatusResponse({
        instance: {
          id: "inst_123",
          provider: "gcp",
          state: "booting",
        },
      }),
    /state/i
  );

  assert.throws(
    () =>
      validateCliTokenResponse({
        access_token: "access_123",
        provisioning_job: {
          id: "job_123",
          kind: "resume",
          state: "running",
          updated_at: "not-a-date",
        },
      }),
    /updated_at/i
  );

  assert.throws(
    () =>
      validateCliTeleportTargetResponse({
        instance: {
          id: "inst_e2b",
          provider: "e2b",
          state: "running",
        },
        transport: "e2b",
        template_id: "template_teleport_v1",
        project_root: "/home/user/agentic",
      }),
    /sandbox_id/i
  );

  assert.throws(
    () => assertManagedInstanceTransition("running", "requested"),
    /Invalid managed-instance transition/i
  );

  assert.throws(
    () => assertProvisioningJobTransition("succeeded", "running"),
    /Invalid provisioning-job transition/i
  );
})();
