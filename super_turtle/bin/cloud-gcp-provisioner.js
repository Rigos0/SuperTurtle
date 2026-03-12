const fs = require("fs");
const os = require("os");
const { execFile } = require("child_process");
const { promisify } = require("util");
const { resolve } = require("path");

const execFileAsync = promisify(execFile);

const DEFAULT_MACHINE_TYPE = "e2-standard-4";
const DEFAULT_BOOT_DISK_SIZE_GB = 50;
const DEFAULT_IMAGE_FAMILY = "debian-12";
const DEFAULT_IMAGE_PROJECT = "debian-cloud";
const HEARTBEAT_INTERVAL_SECONDS = 60;

function createGcpProvisioner(options = {}) {
  const projectId = requireNonEmptyString(options.projectId, "GCP provisioner projectId");
  const executor = options.executor || defaultExecutor;
  const hostnameDomain = normalizeOptionalString(options.hostnameDomain);
  const instanceTemplate = normalizeOptionalString(options.instanceTemplate);
  const machineType = normalizeOptionalString(options.machineType) || DEFAULT_MACHINE_TYPE;
  const bootDiskSizeGb = normalizePositiveInteger(options.bootDiskSizeGb, "GCP provisioner bootDiskSizeGb")
    || DEFAULT_BOOT_DISK_SIZE_GB;
  const imageFamily = normalizeOptionalString(options.imageFamily) || DEFAULT_IMAGE_FAMILY;
  const imageProject = normalizeOptionalString(options.imageProject) || DEFAULT_IMAGE_PROJECT;
  const network = normalizeOptionalString(options.network);
  const subnetwork = normalizeOptionalString(options.subnetwork);
  const serviceAccountEmail = normalizeOptionalString(options.serviceAccountEmail);
  const scopes = normalizeStringList(options.scopes);
  const tags = normalizeStringList(options.tags);
  const labels = normalizeStringMap(options.labels);

  return {
    async runJob({ job, instance, config, createId }) {
      if (!job || !instance || !config) {
        throw new Error("GCP provisioner requires job, instance, and config context.");
      }
      if (typeof createId !== "function") {
        throw new Error("GCP provisioner requires a createId helper.");
      }

      const zone = normalizeOptionalString(instance.zone) || normalizeOptionalString(config.zone);
      const region = normalizeOptionalString(instance.region) || normalizeOptionalString(config.region);
      if (!zone) {
        throw new Error("GCP provisioner requires a zone.");
      }
      if (!region) {
        throw new Error("GCP provisioner requires a region.");
      }

      const vmName = normalizeVmName(instance.vm_name || `st-${instance.id}`);
      const machineTokenId = instance.machine_token_id || `machine-${vmName}`;
      const machineAuthToken = instance.machine_auth_token || createId("machine");
      const resolvedHostnameDomain = hostnameDomain || normalizeOptionalString(config.hostnameDomain);
      if (!resolvedHostnameDomain) {
        throw new Error("GCP provisioner requires a hostname domain.");
      }
      const hostname = `${vmName}.${resolvedHostnameDomain}`;

      if (job.kind === "resume" && instance.vm_name) {
        await executor("gcloud", [
          "compute",
          "instances",
          "start",
          instance.vm_name,
          "--project",
          projectId,
          "--zone",
          zone,
        ]);
        return { region, zone, hostname, vm_name: instance.vm_name, machine_token_id: machineTokenId, machine_auth_token: machineAuthToken };
      }

      if (job.kind === "reprovision" && instance.vm_name) {
        await executor("gcloud", [
          "compute",
          "instances",
          "delete",
          instance.vm_name,
          "--project",
          projectId,
          "--zone",
          zone,
          "--quiet",
        ]);
      }

      const startupScript = buildStartupScript({
        controlPlaneOrigin: config.publicOrigin,
        heartbeatIntervalSeconds: HEARTBEAT_INTERVAL_SECONDS,
        machineAuthToken,
        region,
        vmName,
        zone,
      });
      const tempDir = fs.mkdtempSync(resolve(os.tmpdir(), "superturtle-gcp-startup-"));
      const startupScriptPath = resolve(tempDir, "startup-script.sh");

      try {
        fs.writeFileSync(startupScriptPath, startupScript, { mode: 0o700 });
        const args = buildCreateInstanceArgs({
          bootDiskSizeGb,
          hostname,
          imageFamily,
          imageProject,
          instanceId: instance.id,
          instanceTemplate,
          labels,
          machineType,
          machineTokenId,
          network,
          projectId,
          region,
          scopes,
          serviceAccountEmail,
          startupScriptPath,
          subnetwork,
          tags,
          userId: instance.user_id,
          vmName,
          zone,
        });
        await executor("gcloud", args);
      } finally {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }

      return {
        region,
        zone,
        hostname,
        vm_name: vmName,
        machine_token_id: machineTokenId,
        machine_auth_token: machineAuthToken,
      };
    },
  };
}

async function defaultExecutor(file, args) {
  await execFileAsync(file, args, { timeout: 120000, maxBuffer: 1024 * 1024 });
}

function buildCreateInstanceArgs(options) {
  const metadata = {
    "superturtle-instance-id": options.instanceId,
    "superturtle-machine-token-id": options.machineTokenId,
    "superturtle-managed": "true",
    "superturtle-region": options.region,
  };
  const mergedLabels = {
    ...options.labels,
    superturtle_managed: "true",
    superturtle_instance: normalizeLabelValue(options.instanceId),
    superturtle_user: normalizeLabelValue(options.userId),
  };

  const args = [
    "compute",
    "instances",
    "create",
    options.vmName,
    "--project",
    options.projectId,
    "--zone",
    options.zone,
    "--hostname",
    options.hostname,
    "--metadata",
    serializeMap(metadata),
    "--metadata-from-file",
    `startup-script=${options.startupScriptPath}`,
    "--labels",
    serializeMap(mergedLabels),
  ];

  if (options.instanceTemplate) {
    args.push("--source-instance-template", options.instanceTemplate);
  } else {
    args.push("--machine-type", options.machineType || DEFAULT_MACHINE_TYPE);
    args.push("--boot-disk-size", `${options.bootDiskSizeGb}GB`);
    args.push("--image-family", options.imageFamily);
    args.push("--image-project", options.imageProject);
  }

  if (options.network) {
    args.push("--network", options.network);
  }
  if (options.subnetwork) {
    args.push("--subnet", options.subnetwork);
  }
  if (options.serviceAccountEmail) {
    args.push("--service-account", options.serviceAccountEmail);
  }
  if (options.scopes.length > 0) {
    args.push("--scopes", options.scopes.join(","));
  }
  if (options.tags.length > 0) {
    args.push("--tags", options.tags.join(","));
  }

  return args;
}

function buildStartupScript(options) {
  const envFile = "/etc/superturtle-managed.env";
  const registerUrl = `${String(options.controlPlaneOrigin).replace(/\/+$/, "")}/v1/machine/register`;
  const heartbeatUrl = `${String(options.controlPlaneOrigin).replace(/\/+$/, "")}/v1/machine/heartbeat`;

  return `#!/bin/bash
set -euo pipefail

install -d -m 0755 /opt/superturtle-managed

cat > ${envFile} <<'EOF_ENV'
CONTROL_PLANE_REGISTER_URL=${shellEscape(registerUrl)}
CONTROL_PLANE_HEARTBEAT_URL=${shellEscape(heartbeatUrl)}
MACHINE_AUTH_TOKEN=${shellEscape(options.machineAuthToken)}
VM_NAME=${shellEscape(options.vmName)}
ZONE=${shellEscape(options.zone)}
REGION=${shellEscape(options.region)}
EOF_ENV
chmod 0600 ${envFile}

cat > /usr/local/bin/superturtle-machine-register <<'EOF_REGISTER'
#!/bin/bash
set -euo pipefail
source ${envFile}
hostname_fqdn="$(hostname -f 2>/dev/null || hostname)"
payload="$(printf '{"hostname":"%s","vm_name":"%s","zone":"%s","region":"%s"}' "$hostname_fqdn" "$VM_NAME" "$ZONE" "$REGION")"
curl --fail --silent --show-error --retry 5 --retry-delay 2 -X POST "$CONTROL_PLANE_REGISTER_URL" \\
  -H "Authorization: Bearer $MACHINE_AUTH_TOKEN" \\
  -H "Content-Type: application/json" \\
  --data "$payload"
EOF_REGISTER
chmod 0755 /usr/local/bin/superturtle-machine-register

cat > /usr/local/bin/superturtle-machine-heartbeat <<'EOF_HEARTBEAT'
#!/bin/bash
set -euo pipefail
source ${envFile}
payload="$(printf '{"health_status":"healthy","vm_name":"%s","zone":"%s","region":"%s","hostname":"%s"}' "$VM_NAME" "$ZONE" "$REGION" "$(hostname -f 2>/dev/null || hostname)")"
curl --fail --silent --show-error --retry 3 --retry-delay 2 -X POST "$CONTROL_PLANE_HEARTBEAT_URL" \\
  -H "Authorization: Bearer $MACHINE_AUTH_TOKEN" \\
  -H "Content-Type: application/json" \\
  --data "$payload"
EOF_HEARTBEAT
chmod 0755 /usr/local/bin/superturtle-machine-heartbeat

cat > /etc/systemd/system/superturtle-machine-heartbeat.service <<'EOF_SERVICE'
[Unit]
Description=SuperTurtle managed VM heartbeat
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/bin/superturtle-machine-heartbeat
EOF_SERVICE

cat > /etc/systemd/system/superturtle-machine-heartbeat.timer <<'EOF_TIMER'
[Unit]
Description=Run SuperTurtle managed VM heartbeat every ${options.heartbeatIntervalSeconds} seconds

[Timer]
OnBootSec=30s
OnUnitActiveSec=${options.heartbeatIntervalSeconds}s
Unit=superturtle-machine-heartbeat.service

[Install]
WantedBy=timers.target
EOF_TIMER

systemctl daemon-reload
systemctl enable --now superturtle-machine-heartbeat.timer
/usr/local/bin/superturtle-machine-register
/usr/local/bin/superturtle-machine-heartbeat
`;
}

function normalizeVmName(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .replace(/-{2,}/g, "-");
  const bounded = normalized.slice(0, 63);
  if (!bounded || !/^[a-z]/.test(bounded)) {
    throw new Error(`Invalid GCP VM name derived from ${JSON.stringify(value)}.`);
  }
  return bounded;
}

function normalizePositiveInteger(value, label) {
  if (value == null || value === "") {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function requireNonEmptyString(value, label) {
  const normalized = normalizeOptionalString(value);
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }
  return normalized;
}

function normalizeOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => normalizeOptionalString(entry))
    .filter(Boolean);
}

function normalizeStringMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  const normalized = {};
  for (const [key, entry] of Object.entries(value)) {
    const normalizedKey = normalizeLabelKey(key);
    const normalizedValue = normalizeLabelValue(entry);
    if (normalizedKey && normalizedValue) {
      normalized[normalizedKey] = normalizedValue;
    }
  }
  return normalized;
}

function normalizeLabelKey(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 63);
  return normalized || null;
}

function normalizeLabelValue(value) {
  const normalized = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_")
    .slice(0, 63);
  return normalized || "unknown";
}

function serializeMap(value) {
  return Object.entries(value)
    .map(([key, entry]) => `${key}=${String(entry)}`)
    .join(",");
}

function shellEscape(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
}

module.exports = {
  buildStartupScript,
  createGcpProvisioner,
};
