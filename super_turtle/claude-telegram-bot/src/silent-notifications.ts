/**
 * Marker-based filtering for silent cron outputs.
 *
 * Silent runs should only surface assistant text that contains notable events.
 */

export const SILENT_NOTIFICATION_MARKERS = [
  "🎉",
  "⚠️",
  "⚠",
  "❌",
  "🚀",
  "🔔",
] as const;

/**
 * Returns the text that should be forwarded to Telegram for a silent cron run.
 * Prefers captured streamed output; falls back to final response text.
 */
export function getSilentNotificationText(
  capturedText: string | null | undefined,
  responseText: string | null | undefined
): string | null {
  const preferred = (capturedText ?? "").trim();
  const fallback = (responseText ?? "").trim();
  const output = preferred || fallback;

  if (!output) {
    return null;
  }

  const hasMarker = SILENT_NOTIFICATION_MARKERS.some((marker) =>
    output.includes(marker)
  );

  return hasMarker ? output : null;
}
