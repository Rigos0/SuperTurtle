import { describe, expect, it } from "bun:test";
import { isStopIntent } from "./utils";

describe("isStopIntent", () => {
  it("matches direct stop commands", () => {
    expect(isStopIntent("stop")).toBe(true);
    expect(isStopIntent("Stop.")).toBe(true);
    expect(isStopIntent("please pause now")).toBe(true);
    expect(isStopIntent("halt this")).toBe(true);
  });

  it("does not match regular sentences", () => {
    expect(isStopIntent("how to stop docker container")).toBe(false);
    expect(isStopIntent("unstoppable force")).toBe(false);
    expect(isStopIntent("please continue")).toBe(false);
  });
});
