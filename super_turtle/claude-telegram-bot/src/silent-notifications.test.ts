import { describe, expect, it } from "bun:test";
import {
  SILENT_NOTIFICATION_MARKERS,
  getSilentNotificationText,
} from "./silent-notifications";

describe("getSilentNotificationText", () => {
  it("returns null for silent progress updates without markers", () => {
    const result = getSilentNotificationText(
      "SubTurtle still progressing, no blockers.",
      ""
    );
    expect(result).toBeNull();
  });

  it("returns captured output when it includes a marker", () => {
    const result = getSilentNotificationText(
      "🎉 SubTurtle finished and tests passed.",
      "fallback response"
    );
    expect(result).toBe("🎉 SubTurtle finished and tests passed.");
  });

  it("falls back to final response text when capture is empty", () => {
    const result = getSilentNotificationText("", "⚠️ SubTurtle is stuck.");
    expect(result).toBe("⚠️ SubTurtle is stuck.");
  });

  it("keeps all expected notification markers", () => {
    expect(SILENT_NOTIFICATION_MARKERS).toEqual([
      "🎉",
      "⚠️",
      "⚠",
      "❌",
      "🚀",
      "🔔",
    ]);
  });
});
