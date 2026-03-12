const crypto = require("crypto");

const DEFAULT_SIGNATURE_TOLERANCE_SECONDS = 5 * 60;

function fail(message, code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function parseStripeSignatureHeader(headerValue) {
  if (typeof headerValue !== "string" || headerValue.trim().length === 0) {
    fail("Missing Stripe signature header.", "missing_signature");
  }

  const values = {
    timestamp: null,
    signatures: [],
  };

  for (const part of headerValue.split(",")) {
    const [rawKey, rawValue] = part.split("=", 2);
    const key = typeof rawKey === "string" ? rawKey.trim() : "";
    const value = typeof rawValue === "string" ? rawValue.trim() : "";
    if (!key || !value) {
      continue;
    }
    if (key === "t") {
      values.timestamp = value;
      continue;
    }
    if (key === "v1") {
      values.signatures.push(value);
    }
  }

  if (!values.timestamp || values.signatures.length === 0) {
    fail("Stripe signature header was incomplete.", "invalid_signature");
  }

  return values;
}

function verifyStripeWebhookSignature({ payload, signatureHeader, webhookSecret, now = Date.now() }) {
  if (typeof webhookSecret !== "string" || webhookSecret.trim().length === 0) {
    fail("Stripe webhook secret is not configured.", "missing_webhook_secret");
  }
  if (typeof payload !== "string" || payload.length === 0) {
    fail("Stripe webhook payload must be a non-empty string.", "invalid_payload");
  }

  const parsed = parseStripeSignatureHeader(signatureHeader);
  const timestampSeconds = Number(parsed.timestamp);
  if (!Number.isFinite(timestampSeconds)) {
    fail("Stripe signature timestamp was invalid.", "invalid_signature");
  }

  const currentSeconds = Math.floor(now / 1000);
  if (Math.abs(currentSeconds - timestampSeconds) > DEFAULT_SIGNATURE_TOLERANCE_SECONDS) {
    fail("Stripe signature timestamp was outside the tolerated window.", "signature_expired");
  }

  const signedPayload = `${parsed.timestamp}.${payload}`;
  const expectedSignature = crypto.createHmac("sha256", webhookSecret).update(signedPayload).digest("hex");
  const expectedBytes = Buffer.from(expectedSignature, "utf-8");

  const matched = parsed.signatures.some((candidate) => {
    const candidateBytes = Buffer.from(candidate, "utf-8");
    return candidateBytes.length === expectedBytes.length && crypto.timingSafeEqual(candidateBytes, expectedBytes);
  });

  if (!matched) {
    fail("Stripe signature verification failed.", "invalid_signature");
  }
}

function parseStripeWebhookEvent(payload) {
  let event;
  try {
    event = JSON.parse(payload);
  } catch {
    fail("Stripe webhook payload was not valid JSON.", "invalid_json");
  }

  if (!event || typeof event !== "object" || Array.isArray(event)) {
    fail("Stripe webhook payload must be a JSON object.", "invalid_event");
  }
  if (typeof event.id !== "string" || event.id.trim().length === 0) {
    fail("Stripe webhook event.id is required.", "invalid_event");
  }
  if (typeof event.type !== "string" || event.type.trim().length === 0) {
    fail("Stripe webhook event.type is required.", "invalid_event");
  }
  if (!event.data || typeof event.data !== "object" || Array.isArray(event.data)) {
    fail("Stripe webhook event.data is required.", "invalid_event");
  }
  if (!event.data.object || typeof event.data.object !== "object" || Array.isArray(event.data.object)) {
    fail("Stripe webhook event.data.object is required.", "invalid_event");
  }

  return event;
}

function readMetadataUserId(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }
  return typeof metadata.user_id === "string" && metadata.user_id.trim().length > 0 ? metadata.user_id.trim() : null;
}

function normalizePlan(value) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return "managed";
  }
  return value.trim();
}

function mapStripeSubscriptionStatus(status) {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "unpaid":
    case "paused":
      return "suspended";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "incomplete":
      return "inactive";
    default:
      return "inactive";
  }
}

function toIsoTimestamp(seconds) {
  if (!Number.isFinite(seconds)) {
    return null;
  }
  return new Date(seconds * 1000).toISOString();
}

function normalizeStripeWebhookEvent(event) {
  const object = event.data.object;
  if (event.type === "checkout.session.completed") {
    return {
      eventId: event.id,
      eventType: event.type,
      kind: "checkout_session",
      userId: readMetadataUserId(object.metadata),
      customerId: typeof object.customer === "string" && object.customer.trim().length > 0 ? object.customer : null,
      subscriptionId:
        typeof object.subscription === "string" && object.subscription.trim().length > 0
          ? object.subscription
          : null,
      checkoutSessionId: typeof object.id === "string" && object.id.trim().length > 0 ? object.id : null,
      plan: normalizePlan(object.metadata?.plan),
    };
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    const firstItem = Array.isArray(object.items?.data) ? object.items.data[0] : null;
    const price = firstItem && firstItem.price && typeof firstItem.price === "object" ? firstItem.price : null;
    return {
      eventId: event.id,
      eventType: event.type,
      kind: "subscription",
      userId: readMetadataUserId(object.metadata),
      customerId: typeof object.customer === "string" && object.customer.trim().length > 0 ? object.customer : null,
      subscriptionId: typeof object.id === "string" && object.id.trim().length > 0 ? object.id : null,
      checkoutSessionId: null,
      plan: normalizePlan(price?.lookup_key || price?.nickname || object.metadata?.plan),
      entitlementState: mapStripeSubscriptionStatus(object.status),
      currentPeriodEnd: toIsoTimestamp(object.current_period_end),
      cancelAtPeriodEnd: typeof object.cancel_at_period_end === "boolean" ? object.cancel_at_period_end : false,
    };
  }

  return {
    eventId: event.id,
    eventType: event.type,
    kind: "ignored",
  };
}

module.exports = {
  normalizeStripeWebhookEvent,
  parseStripeWebhookEvent,
  verifyStripeWebhookSignature,
};
