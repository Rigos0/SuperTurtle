import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const packageRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(packageRoot, "..");
const packageJson = JSON.parse(
  fs.readFileSync(path.join(packageRoot, "package.json"), "utf-8")
);

function parseCsv(rawValue) {
  if (!rawValue || typeof rawValue !== "string") {
    return [];
  }
  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function uniq(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function parsePositiveInt(rawValue, fallback) {
  if (rawValue == null || rawValue === "") {
    return fallback;
  }
  const parsed = Number.parseInt(String(rawValue), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer but received ${String(rawValue)}.`);
  }
  return parsed;
}

const runtimeVersion = packageJson.version;
const templateName =
  process.env.SUPERTURTLE_E2B_TEMPLATE_NAME?.trim() || "superturtle-managed-runtime";
const templateVersionTag =
  process.env.SUPERTURTLE_E2B_TEMPLATE_VERSION?.trim() || `v${runtimeVersion}`;
const templateChannelTag =
  process.env.SUPERTURTLE_E2B_TEMPLATE_CHANNEL?.trim() || "latest";
const buildTags = uniq([
  templateVersionTag,
  templateChannelTag,
  ...parseCsv(process.env.SUPERTURTLE_E2B_TEMPLATE_TAGS),
]);
const bunVersion = process.env.SUPERTURTLE_E2B_BUN_VERSION?.trim() || "1.3.5";
const claudeCodeVersion =
  process.env.SUPERTURTLE_CLAUDE_CODE_VERSION?.trim() || "2.1.76";
const codexInstallSpec = process.env.SUPERTURTLE_CODEX_INSTALL_SPEC?.trim() || "@openai/codex";
const runtimeInstallSpec =
  process.env.SUPERTURTLE_RUNTIME_INSTALL_SPEC?.trim() || `superturtle@${runtimeVersion}`;
const cpuCount = parsePositiveInt(process.env.SUPERTURTLE_E2B_TEMPLATE_CPU, 2);
const memoryMB = parsePositiveInt(process.env.SUPERTURTLE_E2B_TEMPLATE_MEMORY_MB, 2048);

export const templateConfig = {
  packageRoot,
  repoRoot,
  runtimeVersion,
  runtimeInstallSpec,
  templateName,
  templateVersionTag,
  templateChannelTag,
  buildTags,
  bunVersion,
  claudeCodeVersion,
  codexInstallSpec,
  cpuCount,
  memoryMB,
};

