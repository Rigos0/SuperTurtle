import { afterAll, describe, expect, it, mock } from "bun:test";

mock.module("./config", () => ({
  WORKING_DIR: "/tmp",
  DASHBOARD_ENABLED: false,
  DASHBOARD_AUTH_TOKEN: "dashboard-secret",
  DASHBOARD_BIND_ADDR: "127.0.0.1",
  DASHBOARD_PORT: 4173,
}));

mock.module("./cron", () => ({
  getJobs: () => [],
}));

mock.module("./handlers/commands", () => ({
  parseCtlListOutput: () => [],
  getSubTurtleElapsed: async () => "0",
}));

const { isAuthorized, safeSubstring } = await import("./dashboard");

afterAll(() => {
  mock.restore();
});

describe("isAuthorized()", () => {
  it("accepts token in query string", () => {
    const request = new Request("http://localhost/dashboard?token=dashboard-secret");
    expect(isAuthorized(request)).toBe(true);
  });

  it("accepts token in Authorization header", () => {
    const request = new Request("http://localhost/dashboard", {
      headers: { Authorization: "Bearer dashboard-secret" },
    });
    expect(isAuthorized(request)).toBe(true);
  });

  it("rejects missing token", () => {
    const request = new Request("http://localhost/dashboard");
    expect(isAuthorized(request)).toBe(false);
  });

  it("rejects incorrect token", () => {
    const request = new Request("http://localhost/dashboard?token=wrong-token");
    expect(isAuthorized(request)).toBe(false);
  });
});

describe("safeSubstring()", () => {
  it("leaves short strings unchanged", () => {
    expect(safeSubstring("short", 10)).toBe("short");
  });

  it("truncates long strings with an ellipsis", () => {
    expect(safeSubstring("abcdefghijklmnopqrstuvwxyz", 5)).toBe("abcde...");
  });

  it("handles empty strings and maxLen=0", () => {
    expect(safeSubstring("", 5)).toBe("");
    expect(safeSubstring("abcdef", 0)).toBe("...");
  });
});
