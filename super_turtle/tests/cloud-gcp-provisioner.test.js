const assert = require("assert");
const fs = require("fs");

const { createGcpProvisioner } = require("../bin/cloud-gcp-provisioner.js");
const { createRuntime } = require("../bin/cloud-control-plane-runtime.js");

async function run() {
  const calls = [];
  const provisioner = createGcpProvisioner({
    projectId: "managed-prod",
    network: "default",
    subnetwork: "default-us-central1",
    serviceAccountEmail: "vm@managed-prod.iam.gserviceaccount.com",
    tags: ["superturtle-managed", "teleport"],
    labels: { environment: "prod" },
    executor: async (file, args) => {
      const record = { file, args: [...args] };
      const startupFlagIndex = args.indexOf("--metadata-from-file");
      if (startupFlagIndex >= 0) {
        const startupSpec = args[startupFlagIndex + 1];
        const startupPath = startupSpec.slice(startupSpec.indexOf("=") + 1);
        record.startupScript = fs.readFileSync(startupPath, "utf-8");
      }
      calls.push(record);
    },
  });

  const provisionResult = await provisioner.runJob({
    job: { id: "job_1", kind: "provision" },
    instance: { id: "inst_123", user_id: "user_123" },
    config: {
      publicOrigin: "https://api.superturtle.dev",
      region: "us-central1",
      zone: "us-central1-a",
      hostnameDomain: "managed.superturtle.internal",
    },
    createId(prefix) {
      return `${prefix}_generated`;
    },
  });

  assert.strictEqual(provisionResult.vm_name, "st-inst-123");
  assert.strictEqual(provisionResult.hostname, "st-inst-123.managed.superturtle.internal");
  assert.strictEqual(provisionResult.machine_token_id, "machine-st-inst-123");
  assert.strictEqual(provisionResult.machine_auth_token, "machine_generated");
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].file, "gcloud");
  assert.deepStrictEqual(calls[0].args.slice(0, 4), ["compute", "instances", "create", "st-inst-123"]);
  assert.match(calls[0].args.join(" "), /--project managed-prod/);
  assert.match(calls[0].args.join(" "), /--zone us-central1-a/);
  assert.match(calls[0].args.join(" "), /--network default/);
  assert.match(calls[0].args.join(" "), /--subnet default-us-central1/);
  assert.match(calls[0].args.join(" "), /--service-account vm@managed-prod\.iam\.gserviceaccount\.com/);
  assert.match(calls[0].args.join(" "), /--tags superturtle-managed,teleport/);
  assert.match(calls[0].args.join(" "), /--labels environment=prod,/);
  assert.match(calls[0].startupScript, /\/v1\/machine\/register/);
  assert.match(calls[0].startupScript, /\/v1\/machine\/heartbeat/);
  assert.match(calls[0].startupScript, /superturtle-machine-heartbeat\.timer/);
  assert.match(calls[0].startupScript, /machine_generated/);

  calls.length = 0;
  const resumeResult = await provisioner.runJob({
    job: { id: "job_2", kind: "resume" },
    instance: {
      id: "inst_123",
      user_id: "user_123",
      vm_name: "existing-vm",
      machine_token_id: "machine-existing",
      machine_auth_token: "machine-auth-existing",
    },
    config: {
      publicOrigin: "https://api.superturtle.dev",
      region: "us-central1",
      zone: "us-central1-b",
      hostnameDomain: "managed.superturtle.internal",
    },
    createId() {
      return "unused";
    },
  });
  assert.strictEqual(resumeResult.vm_name, "existing-vm");
  assert.strictEqual(resumeResult.machine_auth_token, "machine-auth-existing");
  assert.strictEqual(calls.length, 1);
  assert.deepStrictEqual(calls[0].args, [
    "compute",
    "instances",
    "start",
    "existing-vm",
    "--project",
    "managed-prod",
    "--zone",
    "us-central1-b",
  ]);

  calls.length = 0;
  const reprovisionResult = await provisioner.runJob({
    job: { id: "job_3", kind: "reprovision" },
    instance: {
      id: "inst_123",
      user_id: "user_123",
      vm_name: "existing-vm",
    },
    config: {
      publicOrigin: "https://api.superturtle.dev",
      region: "us-central1",
      zone: "us-central1-c",
      hostnameDomain: "managed.superturtle.internal",
    },
    createId(prefix) {
      return `${prefix}_rotated`;
    },
  });
  assert.strictEqual(reprovisionResult.machine_auth_token, "machine_rotated");
  assert.strictEqual(calls.length, 2);
  assert.deepStrictEqual(calls[0].args, [
    "compute",
    "instances",
    "delete",
    "existing-vm",
    "--project",
    "managed-prod",
    "--zone",
    "us-central1-c",
    "--quiet",
  ]);
  assert.deepStrictEqual(calls[1].args.slice(0, 4), ["compute", "instances", "create", "existing-vm"]);

  const runtime = createRuntime({
    statePath: "/tmp/superturtle-gcp-runtime-test.json",
    gcp: {
      projectId: "managed-prod",
      executor: async () => {},
    },
  });
  assert.strictEqual(typeof runtime.provisioner.runJob, "function");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
