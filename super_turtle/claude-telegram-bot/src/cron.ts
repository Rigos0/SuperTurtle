/**
 * Persistent job store for scheduled cron jobs.
 *
 * Jobs are stored in a JSON file and loaded/saved synchronously.
 * Each job has an ID, prompt, chat_id, type (one-shot or recurring),
 * fire_at timestamp, optional interval_ms for recurring jobs,
 * and optional silent flag for background-only processing.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { cronLog } from "./logger";

// Job type definition
export interface CronJob {
  id: string;
  prompt: string;
  chat_id?: number; // optional — defaults to ALLOWED_USERS[0] at fire time
  type: "one-shot" | "recurring";
  interval_ms: number | null;
  silent?: boolean; // optional — true means job output should stay silent unless notable
  fire_at: number; // milliseconds since epoch
  created_at: string; // ISO 8601 format
}

// Path to the job store
const CRON_JOBS_FILE = join(import.meta.dir, "../cron-jobs.json");

let jobsCache: CronJob[] = [];

function normalizeJob(raw: unknown): CronJob {
  if (!raw || typeof raw !== "object") {
    throw new Error("Job is not an object");
  }

  const value = raw as Record<string, unknown>;

  if (typeof value.id !== "string") {
    throw new Error("Job id must be a string");
  }
  if (typeof value.prompt !== "string") {
    throw new Error("Job prompt must be a string");
  }
  if (value.type !== "one-shot" && value.type !== "recurring") {
    throw new Error("Job type must be one-shot or recurring");
  }
  if (typeof value.fire_at !== "number") {
    throw new Error("Job fire_at must be a number");
  }
  if (typeof value.created_at !== "string") {
    throw new Error("Job created_at must be a string");
  }

  const chatId = typeof value.chat_id === "number" ? value.chat_id : undefined;
  const interval =
    typeof value.interval_ms === "number" || value.interval_ms === null
      ? value.interval_ms
      : null;
  const silent = typeof value.silent === "boolean" ? value.silent : undefined;

  return {
    id: value.id,
    prompt: value.prompt,
    chat_id: chatId,
    type: value.type,
    interval_ms: interval,
    silent,
    fire_at: value.fire_at,
    created_at: value.created_at,
  };
}

/**
 * Load jobs from the persistent store.
 * Always reads from disk so external writes (e.g. from the meta agent) are picked up.
 */
export function loadJobs(): CronJob[] {
  try {
    if (existsSync(CRON_JOBS_FILE)) {
      const content = readFileSync(CRON_JOBS_FILE, "utf-8");
      // Only update cache on successful parse — don't wipe jobs on corrupt file
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed)) {
        throw new Error("Cron jobs file must contain an array");
      }
      jobsCache = parsed
        .map((job, index) => {
          try {
            return normalizeJob(job);
          } catch (error) {
            cronLog.warn({ index, err: error }, "Skipping invalid cron job while loading jobs");
            return null;
          }
        })
        .filter((job): job is CronJob => job !== null);
    } else {
      jobsCache = [];
    }
  } catch (error) {
    cronLog.error({ err: error }, "Failed to load cron jobs (keeping existing cache)");
    // Leave jobsCache as-is so in-memory jobs survive a transient read/parse error
  }

  return jobsCache;
}

/**
 * Save jobs to the persistent store.
 */
export function saveJobs(): void {
  // Intentionally throws — callers must handle so job mutations aren't silently lost
  writeFileSync(CRON_JOBS_FILE, JSON.stringify(jobsCache, null, 2));
}

/**
 * Add a new job to the store.
 * Computes fire_at from delay_ms or interval_ms.
 * Saves immediately.
 */
export function addJob(
  prompt: string,
  chat_id: number,
  type: "one-shot" | "recurring",
  delay_ms?: number,
  interval_ms?: number,
  silent?: boolean
): CronJob {
  // Load existing jobs if not already loaded
  loadJobs();

  // Generate unique ID (simple: timestamp + random)
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Compute fire_at
  let fire_at = Date.now();
  if (delay_ms) {
    fire_at = Date.now() + delay_ms;
  } else if (interval_ms && type === "recurring") {
    fire_at = Date.now() + interval_ms;
  }

  const job: CronJob = {
    id,
    prompt,
    chat_id,
    type,
    interval_ms: interval_ms || null,
    silent: silent === true ? true : undefined,
    fire_at,
    created_at: new Date().toISOString(),
  };

  jobsCache.push(job);
  saveJobs();

  return job;
}

/**
 * Remove a job from the store by ID.
 * Saves immediately.
 */
export function removeJob(id: string): boolean {
  loadJobs();

  const index = jobsCache.findIndex((job) => job.id === id);
  if (index === -1) {
    return false;
  }

  jobsCache.splice(index, 1);
  saveJobs();

  return true;
}

/**
 * Get all jobs.
 */
export function getJobs(): CronJob[] {
  loadJobs();
  return [...jobsCache];
}

/**
 * Get jobs that are due to fire (fire_at <= now).
 */
export function getDueJobs(): CronJob[] {
  loadJobs();

  const now = Date.now();
  return jobsCache.filter((job) => job.fire_at <= now);
}

/**
 * Advance a recurring job's fire_at time.
 * Called after a recurring job fires.
 * Saves immediately.
 */
export function advanceRecurringJob(id: string): boolean {
  loadJobs();

  const job = jobsCache.find((j) => j.id === id);
  if (!job || job.type !== "recurring" || !job.interval_ms) {
    return false;
  }

  // Snap to the next interval after now to avoid pile-up if bot was down
  job.fire_at = Math.max(Date.now(), job.fire_at) + job.interval_ms;
  saveJobs();

  return true;
}

/**
 * Force reload of jobs from disk.
 * Kept for API compatibility; loadJobs() always reads from disk now.
 */
export function reloadJobs(): CronJob[] {
  return loadJobs();
}
