import { statusBadgeVariant, formatJobStatus, formatDateTime, formatBytes, formatDuration } from "./jobs";

describe("statusBadgeVariant", () => {
  it("returns secondary for pending", () => {
    expect(statusBadgeVariant("pending")).toBe("secondary");
  });

  it("returns default for accepted", () => {
    expect(statusBadgeVariant("accepted")).toBe("default");
  });

  it("returns destructive for rejected", () => {
    expect(statusBadgeVariant("rejected")).toBe("destructive");
  });

  it("returns default for running", () => {
    expect(statusBadgeVariant("running")).toBe("default");
  });

  it("returns outline for completed", () => {
    expect(statusBadgeVariant("completed")).toBe("outline");
  });

  it("returns destructive for failed", () => {
    expect(statusBadgeVariant("failed")).toBe("destructive");
  });
});

describe("formatJobStatus", () => {
  it("capitalizes first letter", () => {
    expect(formatJobStatus("pending")).toBe("Pending");
    expect(formatJobStatus("completed")).toBe("Completed");
    expect(formatJobStatus("running")).toBe("Running");
  });
});

describe("formatDateTime", () => {
  it("returns dash for null", () => {
    expect(formatDateTime(null)).toBe("-");
  });

  it("returns raw string for invalid date", () => {
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
  });

  it("formats valid ISO date", () => {
    const result = formatDateTime("2024-06-15T10:30:00Z");
    expect(result).toBeTruthy();
    expect(result).not.toBe("-");
    expect(result).not.toBe("2024-06-15T10:30:00Z");
  });
});

describe("formatBytes", () => {
  it("returns Unknown size for null", () => {
    expect(formatBytes(null)).toBe("Unknown size");
  });

  it("returns Unknown size for negative", () => {
    expect(formatBytes(-1)).toBe("Unknown size");
  });

  it("returns Unknown size for NaN", () => {
    expect(formatBytes(NaN)).toBe("Unknown size");
  });

  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(2048)).toBe("2.0 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1048576)).toBe("1.0 MB");
  });

  it("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
});

describe("formatDuration", () => {
  it("returns dash for null", () => {
    expect(formatDuration(null)).toBe("-");
  });

  it("returns dash for negative", () => {
    expect(formatDuration(-5)).toBe("-");
  });

  it("returns dash for NaN", () => {
    expect(formatDuration(NaN)).toBe("-");
  });

  it("formats seconds", () => {
    expect(formatDuration(45)).toBe("45s");
  });

  it("formats zero seconds", () => {
    expect(formatDuration(0)).toBe("0s");
  });

  it("formats minutes", () => {
    expect(formatDuration(120)).toBe("2m");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(90)).toBe("1m 30s");
  });

  it("formats hours", () => {
    expect(formatDuration(3600)).toBe("1h");
  });

  it("formats hours and minutes", () => {
    expect(formatDuration(3900)).toBe("1h 5m");
  });
});
