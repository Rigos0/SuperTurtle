import { formatPricing } from "./pricing";

describe("formatPricing", () => {
  it("formats amount with currency", () => {
    expect(formatPricing({ amount: 9.99, currency: "USD" })).toBe("$9.99");
  });

  it("formats amount with currency and unit", () => {
    expect(formatPricing({ amount: 5, currency: "USD", unit: "job" })).toBe(
      "$5.00 / job",
    );
  });

  it("formats amount without currency", () => {
    expect(formatPricing({ amount: 42 })).toBe("42");
  });

  it("formats amount without currency but with unit", () => {
    expect(formatPricing({ amount: 10, unit: "request" })).toBe(
      "10 / request",
    );
  });

  it("formats per_job pricing", () => {
    expect(formatPricing({ per_job: 25 })).toBe("25 / job");
  });

  it("returns custom pricing for empty object", () => {
    expect(formatPricing({})).toBe("Custom pricing");
  });

  it("returns custom pricing when values are non-numeric", () => {
    expect(formatPricing({ amount: "free" })).toBe("Custom pricing");
  });

  it("ignores invalid currency codes", () => {
    expect(formatPricing({ amount: 10, currency: "toolong" })).toBe("10");
  });

  it("prefers amount over per_job", () => {
    expect(formatPricing({ amount: 5, per_job: 10 })).toBe("5");
  });
});
