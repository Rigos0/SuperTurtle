export function formatPricing(pricing: Record<string, unknown>): string {
  const amount = readNumber(pricing.amount);
  const perJob = readNumber(pricing.per_job);
  const unit = typeof pricing.unit === "string" ? pricing.unit : null;
  const currency =
    typeof pricing.currency === "string" ? pricing.currency.toUpperCase() : null;

  if (amount !== null) {
    const formattedAmount =
      currency && /^[A-Z]{3}$/.test(currency)
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency,
            maximumFractionDigits: 2,
          }).format(amount)
        : amount.toString();

    return unit ? `${formattedAmount} / ${unit}` : formattedAmount;
  }

  if (perJob !== null) {
    return `${perJob.toString()} / job`;
  }

  return "Custom pricing";
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  return null;
}
