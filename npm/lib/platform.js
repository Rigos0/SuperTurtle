"use strict";

const PLATFORM_MAP = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows"
};

const ARCH_MAP = {
  x64: "amd64",
  arm64: "arm64"
};

function resolveTarget(platform = process.platform, arch = process.arch) {
  const os = PLATFORM_MAP[platform];
  if (!os) {
    throw new Error(
      `unsupported platform "${platform}". Supported platforms: ${Object.keys(PLATFORM_MAP).join(", ")}`
    );
  }

  const mappedArch = ARCH_MAP[arch];
  if (!mappedArch) {
    throw new Error(
      `unsupported architecture "${arch}". Supported architectures: ${Object.keys(ARCH_MAP).join(", ")}`
    );
  }

  return { os, arch: mappedArch };
}

function binaryFilename(target) {
  const extension = target.os === "windows" ? ".exe" : "";
  return `agnt-${target.os}-${target.arch}${extension}`;
}

module.exports = {
  resolveTarget,
  binaryFilename
};
