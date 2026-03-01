import { describe, expect, it } from "bun:test";
import { join, resolve } from "path";
import { ALLOWED_PATHS, BLOCKED_PATTERNS, RATE_LIMIT_ENABLED, RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW } from "./config";
import { checkCommandSafety, isAuthorized, isPathAllowed, rateLimiter } from "./security";

describe("RateLimiter.check()", () => {
  it("allows fresh requests", () => {
    const userId = 101;
    expect(rateLimiter.check(userId)[0]).toBe(true);
  });

  it("enforces the configured burst limit when enabled", () => {
    const userId = 102;

    if (!RATE_LIMIT_ENABLED) {
      expect(rateLimiter.check(userId)[0]).toBe(true);
      return;
    }

    for (let i = 0; i < RATE_LIMIT_REQUESTS; i += 1) {
      expect(rateLimiter.check(userId)[0]).toBe(true);
    }

    const denied = rateLimiter.check(userId);
    expect(denied[0]).toBe(false);
    expect(denied[1]).toBeGreaterThan(0);
  });
});

describe("RateLimiter.getStatus()", () => {
  it("reports configured capacity and refill rate", () => {
    const userId = 103;
    const status = rateLimiter.getStatus(userId);

    expect(status.max).toBe(RATE_LIMIT_REQUESTS);
    expect(status.refillRate).toBe(RATE_LIMIT_REQUESTS / RATE_LIMIT_WINDOW);
    expect(status.tokens).toBeGreaterThanOrEqual(0);
    expect(status.tokens).toBeLessThanOrEqual(RATE_LIMIT_REQUESTS);
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

  it("blocks blocked-pattern commands when patterns match", () => {
    const rmRoot = checkCommandSafety("rm -rf /");
    const hasRmRootPattern = BLOCKED_PATTERNS.some((pattern) => new RegExp(pattern.regex, "i").test("rm -rf /"));

    if (hasRmRootPattern) {
      expect(rmRoot[0]).toBe(false);
      expect(rmRoot[1]).toContain("Blocked pattern");
    } else {
      expect(rmRoot[0]).toBe(true);
    }
  });

  it("handles empty and very long commands", () => {
    expect(checkCommandSafety("")).toEqual([true, ""]);

    const longCommand = `echo ${"x".repeat(10_000)}`;
    expect(checkCommandSafety(longCommand)).toEqual([true, ""]);
  });
});

describe("isPathAllowed()", () => {
  it("allows paths inside configured allowed roots", () => {
    const allowedBase = ALLOWED_PATHS[0] || process.cwd();
    expect(isPathAllowed(join(allowedBase, "project", "file.txt"))).toBe(true);
  });

  it("rejects paths clearly outside allowed roots (except root-wide configs)", () => {
    const allowedBase = resolve(ALLOWED_PATHS[0] || process.cwd());
    const outsidePath = "/definitely-not-an-allowed-path/subdir/file.txt";
    const isRootWide = allowedBase === "/";

    expect(isPathAllowed(outsidePath)).toBe(isRootWide);
  });
});
