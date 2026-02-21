import type { JobStatus } from "@/api/types";
import type { BadgeProps } from "@/components/ui/badge";

const STATUS_VARIANTS: Record<JobStatus, BadgeProps["variant"]> = {
  pending: "secondary",
  accepted: "default",
  rejected: "destructive",
  running: "default",
  completed: "outline",
  failed: "destructive",
};

export function statusBadgeVariant(status: JobStatus): BadgeProps["variant"] {
  return STATUS_VARIANTS[status] ?? "secondary";
}

export function formatJobStatus(status: JobStatus): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function formatDateTime(raw: string | null): string {
  if (!raw) {
    return "-";
  }

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatBytes(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "Unknown size";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(value: number | null): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return "-";
  }

  const totalSeconds = Math.round(value);
  if (totalSeconds < 60) {
    return `${totalSeconds}s`;
  }

  if (totalSeconds < 3600) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
