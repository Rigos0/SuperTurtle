import { afterEach, describe, expect, it } from "bun:test";
import { codexSession } from "../codex-session";
import { getDriver } from "../drivers/registry";
import { session } from "../session";
import { isAnyDriverRunning, stopActiveDriverQuery } from "./driver-routing";

const originalSessionDriver = session.activeDriver;

afterEach(() => {
  session.activeDriver = originalSessionDriver;
  (codexSession as unknown as { isQueryRunning: boolean }).isQueryRunning = false;
  (session as unknown as { _isProcessing: boolean })._isProcessing = false;
});

describe("driver routing", () => {
  it("treats Codex activity as running", () => {
    (session as unknown as { _isProcessing: boolean })._isProcessing = false;
    (codexSession as unknown as { isQueryRunning: boolean }).isQueryRunning = true;
    expect(isAnyDriverRunning()).toBe(true);
  });

  it("falls back to the other driver when active driver has nothing to stop", async () => {
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
});
