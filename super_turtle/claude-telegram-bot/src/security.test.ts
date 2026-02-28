import { afterAll, describe, expect, it, mock } from "bun:test";
import { mkdtempSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

const fixtureRoot = mkdtempSync(join(tmpdir(), "security-test-"));
const workingDir = join(fixtureRoot, "workspace");
const outsideDir = join(fixtureRoot, "outside");
const tempDir = join(fixtureRoot, "bot-temp");

mkdirSync(workingDir, { recursive: true });
mkdirSync(outsideDir, { recursive: true });
mkdirSync(tempDir, { recursive: true });

mock.module("./config", () => ({
  ALLOWED_PATHS: [workingDir],
  BLOCKED_PATTERNS: [
    { regex: "rm\\s+-[^\\s]*r[^\\s]*f[^\\s]*\\s+/(\\s|$)", label: "rm -rf / (root)" },
    { regex: "sudo\\s+rm\\b", label: "sudo rm" },
  ],
  RATE_LIMIT_ENABLED: true,
  RATE_LIMIT_REQUESTS: 2,
  RATE_LIMIT_WINDOW: 1,
  TEMP_PATHS: [`${tempDir}/`],
}));

const { checkCommandSafety, isAuthorized, isPathAllowed, rateLimiter } =
  await import("./security");

afterAll(() => {
  mock.restore();
});

describe("RateLimiter.check()", () => {
  it("allows fresh requests and eventually rejects rapid requests", () => {
    const userId = 101;

    expect(rateLimiter.check(userId)[0]).toBe(true);
    expect(rateLimiter.check(userId)[0]).toBe(true);

    const third = rateLimiter.check(userId);
    expect(third[0]).toBe(false);
    expect(third[1]).toBeGreaterThan(0);
  });

  it("refills after waiting and allows requests again", async () => {
    const userId = 102;

    expect(rateLimiter.check(userId)[0]).toBe(true);
    expect(rateLimiter.check(userId)[0]).toBe(true);
    expect(rateLimiter.check(userId)[0]).toBe(false);

    await Bun.sleep(700);
    expect(rateLimiter.check(userId)[0]).toBe(true);
  });
});

describe("RateLimiter.getStatus()", () => {
  it("returns correct remaining and total token counts", () => {
    const userId = 103;
    const initial = rateLimiter.getStatus(userId);

    expect(initial.max).toBe(2);
    expect(initial.tokens).toBe(2);
    expect(initial.refillRate).toBe(2);

    expect(rateLimiter.check(userId)[0]).toBe(true);
    const afterOne = rateLimiter.getStatus(userId);
    expect(afterOne.max).toBe(2);
    expect(afterOne.tokens).toBe(1);
  });
});

describe("isAuthorized()", () => {
  it("returns true for allowed users and false otherwise", () => {
    expect(isAuthorized(123, [123, 456])).toBe(true);
    expect(isAuthorized(999, [123, 456])).toBe(false);
    expect(isAuthorized(undefined, [123, 456])).toBe(false);
  });
});

describe("checkCommandSafety()", () => {
  it("allows safe commands", () => {
    expect(checkCommandSafety("ls")).toEqual([true, ""]);
    expect(checkCommandSafety("git status")).toEqual([true, ""]);
    expect(checkCommandSafety("npm test")).toEqual([true, ""]);
  });

  it("blocks dangerous command patterns", () => {
    const rmRoot = checkCommandSafety("rm -rf /");
    expect(rmRoot[0]).toBe(false);
    expect(rmRoot[1]).toContain("Blocked pattern");

    const sudoRm = checkCommandSafety("sudo rm -rf project");
    expect(sudoRm[0]).toBe(false);
    expect(sudoRm[1]).toContain("Blocked pattern");
  });

  it("handles empty and very long commands", () => {
    expect(checkCommandSafety("")).toEqual([true, ""]);

    const longCommand = `echo ${"x".repeat(10_000)}`;
    expect(checkCommandSafety(longCommand)).toEqual([true, ""]);
  });
});

describe("isPathAllowed()", () => {
  it("allows paths inside the working directory", () => {
    expect(isPathAllowed(join(workingDir, "project", "file.txt"))).toBe(true);
  });

  it("rejects paths outside the working directory", () => {
    expect(isPathAllowed(join(outsideDir, "secret.txt"))).toBe(false);
  });

  it("rejects traversal attempts", () => {
    expect(isPathAllowed("../../etc/passwd")).toBe(false);
  });
});
