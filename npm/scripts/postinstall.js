#!/usr/bin/env node
"use strict";

const path = require("node:path");
const packageJSON = require("../package.json");
const { DEFAULT_BASE_URL, installBinary } = require("../lib/install");

async function main() {
  if (process.env.AGNT_SKIP_DOWNLOAD === "1") {
    process.stdout.write("Skipping agnt binary download (AGNT_SKIP_DOWNLOAD=1).\n");
    return;
  }

  const rootDir = path.resolve(__dirname, "..");
  const destinationPath = await installBinary({
    rootDir,
    version: packageJSON.version,
    releaseTag: process.env.AGNT_BINARY_RELEASE_TAG,
    baseURL: process.env.AGNT_BINARY_BASE_URL || DEFAULT_BASE_URL,
    binaryURL: process.env.AGNT_BINARY_URL,
    sourcePath: process.env.AGNT_BINARY_PATH
  });

  process.stdout.write(`Installed agnt binary to ${destinationPath}\n`);
}

main().catch((error) => {
  process.stderr.write(`Failed to install agnt binary: ${error.message}\n`);
  process.exit(1);
});
