import { describe, expect, it, beforeAll, afterAll } from "bun:test";
import { join } from "path";
import { mkdirSync, writeFileSync, rmSync } from "fs";
import { DASHBOARD_AUTH_TOKEN, WORKING_DIR } from "./config";

const { isAuthorized, safeSubstring, computeProgressPct, jsonResponse, notFoundResponse, readFileOr, parseMetaFile, validateSubturtleName } = await import("./dashboard");

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

describe("computeProgressPct()", () => {
  it("returns 0 when total is zero", () => {
    expect(computeProgressPct(5, 0)).toBe(0);
  });

  it("returns rounded progress percent", () => {
    expect(computeProgressPct(3, 8)).toBe(38);
  });

  it("clamps to [0, 100]", () => {
    expect(computeProgressPct(-2, 5)).toBe(0);
    expect(computeProgressPct(9, 5)).toBe(100);
  });
});

describe("jsonResponse()", () => {
  it("returns JSON with correct content-type and status 200 by default", async () => {
    const res = jsonResponse({ ok: true });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(await res.json()).toEqual({ ok: true });
  });

  it("accepts a custom status code", () => {
    const res = jsonResponse({ error: "bad" }, 400);
    expect(res.status).toBe(400);
  });
});

describe("notFoundResponse()", () => {
  it("returns 404 with default message", async () => {
    const res = notFoundResponse();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Not found" });
  });

  it("accepts a custom message", async () => {
    const res = notFoundResponse("no such turtle");
    expect(await res.json()).toEqual({ error: "no such turtle" });
  });
});

describe("readFileOr()", () => {
  it("returns fallback for non-existent file", async () => {
    const result = await readFileOr("/tmp/__nonexistent_test_file__", "default");
    expect(result).toBe("default");
  });
});

describe("parseMetaFile()", () => {
  it("parses a standard subturtle.meta file", () => {
    const content = [
      "SPAWNED_AT=1772626337",
      "TIMEOUT_SECONDS=7200",
      "LOOP_TYPE=yolo",
      'SKILLS=["web"]',
      "WATCHDOG_PID=58912",
      "CRON_JOB_ID=1b61a7",
    ].join("\n");

    const meta = parseMetaFile(content);
    expect(meta.spawnedAt).toBe(1772626337);
    expect(meta.timeoutSeconds).toBe(7200);
    expect(meta.loopType).toBe("yolo");
    expect(meta.skills).toEqual(["web"]);
    expect(meta.watchdogPid).toBe(58912);
    expect(meta.cronJobId).toBe("1b61a7");
  });

  it("handles empty content", () => {
    const meta = parseMetaFile("");
    expect(meta.spawnedAt).toBeNull();
    expect(meta.loopType).toBeNull();
    expect(meta.skills).toEqual([]);
  });

  it("handles empty SKILLS array", () => {
    const meta = parseMetaFile("SKILLS=[]");
    expect(meta.skills).toEqual([]);
  });

  it("ignores comment lines and blank lines", () => {
    const content = "# comment\n\nLOOP_TYPE=slow\n";
    const meta = parseMetaFile(content);
    expect(meta.loopType).toBe("slow");
  });

  it("stores unknown keys in the result", () => {
    const meta = parseMetaFile("CUSTOM_KEY=hello");
    expect(meta.CUSTOM_KEY).toBe("hello");
  });
});

describe("validateSubturtleName()", () => {
  it("accepts valid names", () => {
    expect(validateSubturtleName("my-turtle")).toBe(true);
    expect(validateSubturtleName("dash-foundation")).toBe(true);
    expect(validateSubturtleName("test_123")).toBe(true);
  });

  it("rejects empty names", () => {
    expect(validateSubturtleName("")).toBe(false);
  });

  it("rejects names with path traversal", () => {
    expect(validateSubturtleName("../evil")).toBe(false);
    expect(validateSubturtleName("foo/../bar")).toBe(false);
  });

  it("rejects names with slashes", () => {
    expect(validateSubturtleName("foo/bar")).toBe(false);
    expect(validateSubturtleName("foo\\bar")).toBe(false);
  });

  it("rejects names starting with a dot", () => {
    expect(validateSubturtleName(".hidden")).toBe(false);
  });

  it("rejects excessively long names", () => {
    expect(validateSubturtleName("a".repeat(129))).toBe(false);
  });
});

/* ── Route table tests for /api/subturtles/:name and :name/logs ───── */

const { routes } = await import("./dashboard");

function findRoute(path: string) {
  for (const route of routes) {
    const match = path.match(route.pattern);
    if (match) return { handler: route.handler, match };
  }
  return null;
}

function makeReq(path: string): { req: Request; url: URL; } {
  const fullUrl = `http://localhost${path}`;
  return { req: new Request(fullUrl), url: new URL(fullUrl) };
}

describe("GET /api/subturtles/:name", () => {
  it("matches the route pattern", () => {
    const result = findRoute("/api/subturtles/my-turtle");
    expect(result).not.toBeNull();
    expect(result!.match[1]).toBe("my-turtle");
  });

  it("returns 404 for invalid name with path traversal", async () => {
    const result = findRoute("/api/subturtles/..%2Fevil");
    // The pattern matches, but handler should reject via validateSubturtleName
    if (result) {
      const { req, url } = makeReq("/api/subturtles/..%2Fevil");
      const res = await result.handler(req, url, result.match);
      expect(res.status).toBe(404);
      const body = await res.json() as Record<string, unknown>;
      expect(body.error).toContain("Invalid");
    }
  });

  it("returns 404 for non-existent SubTurtle", async () => {
    // This will go through ctl list which won't find "__nonexistent__"
    const result = findRoute("/api/subturtles/__nonexistent_test_turtle__");
    expect(result).not.toBeNull();
    const { req, url } = makeReq("/api/subturtles/__nonexistent_test_turtle__");
    const res = await result!.handler(req, url, result!.match);
    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("SubTurtle not found");
  });
});

describe("GET /api/subturtles/:name/logs", () => {
  it("matches the route pattern", () => {
    const result = findRoute("/api/subturtles/my-turtle/logs");
    expect(result).not.toBeNull();
    expect(result!.match[1]).toBe("my-turtle");
  });

  it("does not match the detail route", () => {
    // /logs path should match the logs route, not the detail route
    const logsResult = findRoute("/api/subturtles/my-turtle/logs");
    expect(logsResult).not.toBeNull();
    // Verify it matched the logs pattern (has /logs suffix)
    expect(logsResult!.match[0]).toContain("/logs");
  });

  it("returns 404 for invalid name", async () => {
    const result = findRoute("/api/subturtles/..%2Fevil/logs");
    if (result) {
      const { req, url } = makeReq("/api/subturtles/..%2Fevil/logs");
      const res = await result.handler(req, url, result.match);
      expect(res.status).toBe(404);
      const body = await res.json() as Record<string, unknown>;
      expect(body.error).toContain("Invalid");
    }
  });

  it("returns 404 for non-existent SubTurtle (no pid or log)", async () => {
    const result = findRoute("/api/subturtles/__nonexistent_test_turtle__/logs");
    expect(result).not.toBeNull();
    const { req, url } = makeReq("/api/subturtles/__nonexistent_test_turtle__/logs");
    const res = await result!.handler(req, url, result!.match);
    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("SubTurtle not found");
  });

  // Test with a real log file in the .subturtles directory
  const testTurtleName = "__test_logs_turtle__";
  const testDir = join(WORKING_DIR, ".subturtles", testTurtleName);

  beforeAll(() => {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, "subturtle.pid"), "99999");
    writeFileSync(join(testDir, "subturtle.log"), "line1\nline2\nline3\n");
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it("returns log lines for existing SubTurtle with log file", async () => {
    const result = findRoute(`/api/subturtles/${testTurtleName}/logs`);
    expect(result).not.toBeNull();
    const { req, url } = makeReq(`/api/subturtles/${testTurtleName}/logs?lines=10`);
    const res = await result!.handler(req, url, result!.match);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.name).toBe(testTurtleName);
    expect(body.lines).toBeInstanceOf(Array);
    expect((body.lines as string[]).length).toBeGreaterThan(0);
    expect(body.totalLines).toBeGreaterThanOrEqual(3);
  });
});

/* ── Route table tests for /api/cron ──────────────────────────────── */

describe("GET /api/cron", () => {
  it("matches the route pattern", () => {
    const result = findRoute("/api/cron");
    expect(result).not.toBeNull();
  });

  it("returns 200 with jobs array", async () => {
    const result = findRoute("/api/cron");
    expect(result).not.toBeNull();
    const { req, url } = makeReq("/api/cron");
    const res = await result!.handler(req, url, result!.match);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.generatedAt).toBeDefined();
    expect(body.jobs).toBeInstanceOf(Array);
  });
});

describe("GET /api/cron/:id", () => {
  it("matches the route pattern", () => {
    const result = findRoute("/api/cron/abc123");
    expect(result).not.toBeNull();
    expect(result!.match[1]).toBe("abc123");
  });

  it("does not match the list route", () => {
    // /api/cron should match the list route, not the detail route
    const listResult = findRoute("/api/cron");
    expect(listResult).not.toBeNull();
    expect(listResult!.match[0]).toBe("/api/cron");
  });

  it("returns 404 for non-existent cron job", async () => {
    const result = findRoute("/api/cron/__nonexistent_job_id__");
    expect(result).not.toBeNull();
    const { req, url } = makeReq("/api/cron/__nonexistent_job_id__");
    const res = await result!.handler(req, url, result!.match);
    expect(res.status).toBe(404);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBe("Cron job not found");
  });
});

/* ── Route table tests for /api/session ───────────────────────────── */

describe("GET /api/session", () => {
  it("matches the route pattern", () => {
    const result = findRoute("/api/session");
    expect(result).not.toBeNull();
  });

  it("returns 200 with session state fields", async () => {
    const result = findRoute("/api/session");
    expect(result).not.toBeNull();
    const { req, url } = makeReq("/api/session");
    const res = await result!.handler(req, url, result!.match);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.generatedAt).toBeDefined();
    expect(typeof body.model).toBe("string");
    expect(typeof body.modelDisplayName).toBe("string");
    expect(typeof body.effort).toBe("string");
    expect(typeof body.activeDriver).toBe("string");
    expect(typeof body.isRunning).toBe("boolean");
    expect(typeof body.isActive).toBe("boolean");
  });
});

/* ── Route table tests for /api/context ───────────────────────────── */

describe("GET /api/context", () => {
  it("matches the route pattern", () => {
    const result = findRoute("/api/context");
    expect(result).not.toBeNull();
  });

  it("returns 200 with context fields", async () => {
    const result = findRoute("/api/context");
    expect(result).not.toBeNull();
    const { req, url } = makeReq("/api/context");
    const res = await result!.handler(req, url, result!.match);
    expect(res.status).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.generatedAt).toBeDefined();
    expect(typeof body.claudeMd).toBe("string");
    expect(typeof body.claudeMdPath).toBe("string");
    expect(typeof body.claudeMdExists).toBe("boolean");
    expect(typeof body.metaPrompt).toBe("string");
    expect(typeof body.metaPromptSource).toBe("string");
    expect(typeof body.metaPromptExists).toBe("boolean");
    expect(typeof body.agentsMdExists).toBe("boolean");
  });
});
