import { describe, expect, it } from "bun:test";
import { DASHBOARD_AUTH_TOKEN } from "./config";

const { isAuthorized, safeSubstring } = await import("./dashboard");

const hasAuthToken = DASHBOARD_AUTH_TOKEN.length > 0;
const validToken = hasAuthToken ? DASHBOARD_AUTH_TOKEN : "any-token";

describe("isAuthorized()", () => {
  it("accepts token in query string", () => {
    const request = new Request(`http://localhost/dashboard?token=${encodeURIComponent(validToken)}`);
    expect(isAuthorized(request)).toBe(true);
  });

  it("accepts token in x-dashboard-token header", () => {
    const request = new Request("http://localhost/dashboard", {
      headers: { "x-dashboard-token": validToken },
    });
    expect(isAuthorized(request)).toBe(true);
  });

  it("accepts token in Authorization header", () => {
    const request = new Request("http://localhost/dashboard", {
      headers: { Authorization: `Bearer ${validToken}` },
    });
    expect(isAuthorized(request)).toBe(true);
  });

  it("handles missing token based on auth mode", () => {
    const request = new Request("http://localhost/dashboard");
    expect(isAuthorized(request)).toBe(!hasAuthToken);
  });

  it("handles incorrect token based on auth mode", () => {
    const request = new Request("http://localhost/dashboard?token=wrong-token");
    expect(isAuthorized(request)).toBe(!hasAuthToken);
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
