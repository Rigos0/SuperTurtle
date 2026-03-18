import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { codexSession } from "../codex-session";
import { getDriver } from "../drivers/registry";
import { session } from "../session";

type DriverRoutingModule = typeof import("./driver-routing");

async function loadDriverRoutingModule(): Promise<DriverRoutingModule> {
  return import(`./driver-routing.ts?driver-routing-test=${Date.now()}-${Math.random()}`);
}

const claudeDriver = getDriver("claude");
const codexDriver = getDriver("codex");
const originalSessionDriver = session.activeDriver;
const originalBunSleep = Bun.sleep;
const originalDateNow = Date.now;

// Re-assert the real driver registry before each test.
// Other test files may contaminate it via mock.module() + incomplete mock.restore().
beforeEach(() => {
  mock.module("../drivers/registry", () => ({
    getDriver: (id: string) => (id === "codex" ? codexDriver : claudeDriver),
    getCurrentDriver: () =>
      session.activeDriver === "codex" ? codexDriver : claudeDriver,
  }));
});

afterEach(() => {
  session.activeDriver = originalSessionDriver;
  (codexSession as unknown as { isQueryRunning: boolean }).isQueryRunning = false;
  (session as unknown as { _isProcessing: boolean })._isProcessing = false;
  (session as unknown as { isQueryRunning: boolean }).isQueryRunning = false;
  (session as unknown as { activeProcess: { kill: () => void } | null }).activeProcess = null;
  Bun.sleep = originalBunSleep;
  Date.now = originalDateNow;
  mock.restore();
});

describe("driver routing", () => {
  it("treats Codex activity as running", async () => {
    const { isAnyDriverRunning } = await loadDriverRoutingModule();
    (session as unknown as { _isProcessing: boolean })._isProcessing = false;
    (codexSession as unknown as { isQueryRunning: boolean }).isQueryRunning = true;
    expect(isAnyDriverRunning()).toBe(true);
  });

  it("falls back to the other driver when active driver has nothing to stop", async () => {
    const { stopActiveDriverQuery } = await loadDriverRoutingModule();
    const claudeDriver = getDriver("claude");
    const codexDriver = getDriver("codex");
    const originalClaudeStop = claudeDriver.stop;
    const originalCodexStop = codexDriver.stop;
    let claudeStops = 0;
    let codexStops = 0;

    claudeDriver.stop = async () => {
      claudeStops += 1;
      return false;
    };
    codexDriver.stop = async () => {
      codexStops += 1;
      return "stopped";
    };

    session.activeDriver = "claude";
    try {
      const result = await stopActiveDriverQuery();
      expect(result).toBe("stopped");
      expect(claudeStops).toBe(1);
      expect(codexStops).toBe(1);
    } finally {
      claudeDriver.stop = originalClaudeStop;
      codexDriver.stop = originalCodexStop;
    }
  });

  it("marks and preempts active background runs", async () => {
    const {
      beginBackgroundRun,
      endBackgroundRun,
      preemptBackgroundRunForUserPriority,
      wasBackgroundRunPreempted,
    } = await loadDriverRoutingModule();
    const claudeDriver = getDriver("claude");
    const originalClaudeStop = claudeDriver.stop;
    let stopCalls = 0;

    (session as unknown as { isQueryRunning: boolean }).isQueryRunning = true;
    beginBackgroundRun();
    claudeDriver.stop = async () => {
      stopCalls += 1;
      return "stopped";
    };

    try {
      const interrupted = await preemptBackgroundRunForUserPriority();
      expect(interrupted).toBe(true);
      expect(stopCalls).toBe(1);
      expect(wasBackgroundRunPreempted()).toBe(true);
    } finally {
      endBackgroundRun();
      claudeDriver.stop = originalClaudeStop;
      (session as unknown as { isQueryRunning: boolean }).isQueryRunning = false;
    }
  });

  it("force-resets stale running state when a stop never settles", async () => {
    const { stopActiveDriverQuery, isAnyDriverRunning } = await loadDriverRoutingModule();
    const originalClaudeStop = claudeDriver.stop;
    const killMock = mock(() => {});
    let now = 0;

    Bun.sleep = (async () => {}) as typeof Bun.sleep;
    Date.now = () => {
      now += 100;
      return now;
    };

    session.activeDriver = "claude";
    (session as unknown as { isQueryRunning: boolean }).isQueryRunning = true;
    (session as unknown as { activeProcess: { kill: () => void } | null }).activeProcess = {
      kill: killMock,
    };
    claudeDriver.stop = async () => "stopped";

    try {
      const result = await stopActiveDriverQuery();
      expect(result).toBe("stopped");
      expect(killMock).toHaveBeenCalledTimes(1);
      expect(isAnyDriverRunning()).toBe(false);
    } finally {
      claudeDriver.stop = originalClaudeStop;
    }
  });
});
