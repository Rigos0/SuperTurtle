"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const http = require("node:http");
const { resolveTarget, binaryFilename } = require("../lib/platform");
const { buildBinaryURL, installBinary } = require("../lib/install");

test("resolveTarget maps supported OS/arch combinations", () => {
  assert.deepEqual(resolveTarget("darwin", "arm64"), { os: "darwin", arch: "arm64" });
  assert.deepEqual(resolveTarget("linux", "x64"), { os: "linux", arch: "amd64" });
  assert.deepEqual(resolveTarget("win32", "x64"), { os: "windows", arch: "amd64" });
});

test("resolveTarget rejects unsupported platform and architecture", () => {
  assert.throws(() => resolveTarget("freebsd", "x64"), /unsupported platform/);
  assert.throws(() => resolveTarget("linux", "ia32"), /unsupported architecture/);
});

test("binaryFilename adds .exe suffix for windows", () => {
  assert.equal(binaryFilename({ os: "windows", arch: "amd64" }), "agnt-windows-amd64.exe");
  assert.equal(binaryFilename({ os: "linux", arch: "arm64" }), "agnt-linux-arm64");
});

test("buildBinaryURL normalizes trailing slashes", () => {
  assert.equal(
    buildBinaryURL({
      baseURL: "https://example.com/releases/download/",
      releaseTag: "v0.1.0",
      filename: "agnt-linux-amd64"
    }),
    "https://example.com/releases/download/v0.1.0/agnt-linux-amd64"
  );
});

test("installBinary copies a local binary", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agnt-npm-copy-"));

  try {
    const sourcePath = path.join(tempDir, "source-agnt");
    const sourcePayload = "#!/bin/sh\necho agnt\n";
    await fs.writeFile(sourcePath, sourcePayload, "utf8");

    const destinationPath = await installBinary({
      rootDir: tempDir,
      sourcePath,
      platform: "linux",
      arch: "x64"
    });

    const copiedPayload = await fs.readFile(destinationPath, "utf8");
    assert.equal(copiedPayload, sourcePayload);
    assert.equal(destinationPath, path.join(tempDir, "runtime", "agnt-linux-amd64"));
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("installBinary downloads from localhost over http", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agnt-npm-download-"));
  const payload = Buffer.from("agnt-binary-data");

  const server = http.createServer((request, response) => {
    if (request.url !== "/agnt-linux-amd64") {
      response.writeHead(404);
      response.end();
      return;
    }

    response.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(payload.length)
    });
    response.end(payload);
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();

  try {
    const destinationPath = await installBinary({
      rootDir: tempDir,
      platform: "linux",
      arch: "x64",
      binaryURL: `http://127.0.0.1:${port}/agnt-linux-amd64`
    });

    const downloadedPayload = await fs.readFile(destinationPath);
    assert.deepEqual(downloadedPayload, payload);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});

test("installBinary rejects non-localhost http URLs", async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "agnt-npm-http-"));

  try {
    await assert.rejects(
      installBinary({
        rootDir: tempDir,
        platform: "linux",
        arch: "x64",
        binaryURL: "http://example.com/agnt-linux-amd64"
      }),
      /https/
    );
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
});
