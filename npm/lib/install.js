"use strict";

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");
const { pipeline } = require("node:stream/promises");
const { binaryFilename, resolveTarget } = require("./platform");

const DEFAULT_BASE_URL = "https://github.com/richardmladek/agentic/releases/download";

function binaryPath(rootDir, target) {
  return path.join(rootDir, "runtime", binaryFilename(target));
}

function buildBinaryURL({ baseURL = DEFAULT_BASE_URL, releaseTag, filename }) {
  const normalizedBaseURL = String(baseURL).replace(/\/+$/, "");
  return `${normalizedBaseURL}/${releaseTag}/${filename}`;
}

function isLocalhost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function requestModuleForURL(url) {
  if (url.protocol === "https:") {
    return https;
  }
  if (url.protocol === "http:" && isLocalhost(url.hostname)) {
    return http;
  }
  throw new Error('binary URL must use "https" (or "http" for localhost only)');
}

async function downloadToFile(urlString, destinationPath, redirectsLeft = 5) {
  if (redirectsLeft < 0) {
    throw new Error("too many redirects while downloading agnt binary");
  }

  const url = new URL(urlString);
  const transport = requestModuleForURL(url);

  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });

  try {
    await new Promise((resolve, reject) => {
      const request = transport.get(url, async (response) => {
        const isRedirect =
          response.statusCode === 301 ||
          response.statusCode === 302 ||
          response.statusCode === 303 ||
          response.statusCode === 307 ||
          response.statusCode === 308;

        if (isRedirect) {
          if (!response.headers.location) {
            response.resume();
            reject(new Error("redirect response missing location header"));
            return;
          }

          const redirectedURL = new URL(response.headers.location, url).toString();
          response.resume();
          try {
            await downloadToFile(redirectedURL, destinationPath, redirectsLeft - 1);
            resolve();
          } catch (error) {
            reject(error);
          }
          return;
        }

        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`failed to download agnt binary: HTTP ${response.statusCode || "unknown"}`));
          return;
        }

        const fileStream = fs.createWriteStream(destinationPath, { mode: 0o755 });
        pipeline(response, fileStream).then(resolve).catch(reject);
      });

      request.on("error", reject);
    });
  } catch (error) {
    await fs.promises.rm(destinationPath, { force: true });
    throw error;
  }
}

async function installBinary({
  rootDir = path.resolve(__dirname, ".."),
  version,
  baseURL = DEFAULT_BASE_URL,
  releaseTag,
  binaryURL,
  sourcePath,
  platform,
  arch
} = {}) {
  const target = resolveTarget(platform, arch);
  const destinationPath = binaryPath(rootDir, target);
  await fs.promises.mkdir(path.dirname(destinationPath), { recursive: true });

  if (sourcePath) {
    await fs.promises.copyFile(sourcePath, destinationPath);
  } else {
    const tag = releaseTag || (version ? `v${version}` : undefined);
    if (!binaryURL && !tag) {
      throw new Error("releaseTag, version, or binaryURL is required");
    }

    const url =
      binaryURL ||
      buildBinaryURL({
        baseURL,
        releaseTag: tag,
        filename: binaryFilename(target)
      });

    await downloadToFile(url, destinationPath);
  }

  if (target.os !== "windows") {
    await fs.promises.chmod(destinationPath, 0o755);
  }

  return destinationPath;
}

module.exports = {
  DEFAULT_BASE_URL,
  binaryPath,
  buildBinaryURL,
  installBinary
};
