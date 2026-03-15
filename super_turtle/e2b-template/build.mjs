import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Template, defaultBuildLogger } from "e2b";
import { templateConfig } from "./config.mjs";
import { template } from "./template.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function loadDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex <= 0) {
      continue;
    }
    const key = trimmed.slice(0, equalsIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }
    let value = trimmed.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnvFile(path.join(repoRoot, ".env"));
loadDotEnvFile(path.join(repoRoot, ".superturtle", ".env"));

if (!process.env.E2B_API_KEY) {
  throw new Error("Missing E2B_API_KEY. Set it in the environment or repo .env before building.");
}

const buildName = templateConfig.templateName;
const buildOptions = {
  cpuCount: templateConfig.cpuCount,
  memoryMB: templateConfig.memoryMB,
  tags: templateConfig.buildTags,
  onBuildLogs: defaultBuildLogger(),
};

const buildInfo = await Template.build(template, buildName, buildOptions);

console.log("\nTemplate published.");
console.log(`Name: ${buildInfo.name}`);
console.log(`Template ID: ${buildInfo.templateId}`);
console.log(`Build ID: ${buildInfo.buildId}`);
console.log(`Tags: ${buildInfo.tags.join(", ")}`);

