#!/usr/bin/env node
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const { resolveTarget, binaryFilename } = require("../lib/platform");

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

let target;
try {
  target = resolveTarget();
} catch (error) {
  fail(error.message);
}

const executablePath = path.join(__dirname, "..", "runtime", binaryFilename(target));
if (!fs.existsSync(executablePath)) {
  fail("agnt binary is not installed. Reinstall the npm package to trigger postinstall.");
}

const child = spawn(executablePath, process.argv.slice(2), {
  stdio: "inherit"
});

child.on("error", (error) => {
  fail(`failed to execute agnt binary: ${error.message}`);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
