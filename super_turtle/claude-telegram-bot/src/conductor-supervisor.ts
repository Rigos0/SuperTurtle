import { randomBytes } from "crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "fs";
import { dirname, join } from "path";
import { spawnSync } from "bun";
import { ALLOWED_USERS, CTL_PATH, SUPERTURTLE_DATA_DIR, WORKING_DIR } from "./config";
import { ensureMetaAgentInboxItem } from "./conductor-inbox";

export interface WorkerStateRecord {
  kind?: string;
  schema_version?: number;
  worker_name: string;
  run_id?: string | null;
  lifecycle_state: string;
  workspace?: string | null;
  loop_type?: string | null;
  pid?: number | null;
  timeout_seconds?: number | null;
  cron_job_id?: string | null;
  current_task?: string | null;
  stop_reason?: string | null;
  completion_requested_at?: string | null;
  terminal_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  last_event_id?: string | null;
  last_event_at?: string | null;
  checkpoint?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface WakeupDeliveryRecord {
  attempts?: number;
  last_attempt_at?: string | null;
  sent_at?: string | null;
  failed_at?: string | null;
  suppressed_at?: string | null;
}

export interface WakeupRecord {
  kind?: string;
  schema_version?: number;
  id: string;
  worker_name: string;
  run_id?: string | null;
  reason_event_id?: string | null;
  category: string;
  delivery_state: string;
  summary: string;
  created_at?: string | null;
  updated_at?: string | null;
  delivery?: WakeupDeliveryRecord;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface WorkerEventRecord {
  kind: "worker_event";
  schema_version: number;
  id: string;
  timestamp: string;
  worker_name: string;
  run_id?: string | null;
  event_type: string;
  emitted_by: "supervisor";
  lifecycle_state?: string | null;
  idempotency_key?: string | null;
  payload: Record<string, unknown>;
}

export interface SupervisorTickResult {
  sent: number;
  skipped: number;
  errors: number;
  reconciled: number;
}

export interface ProcessConductorWakeupsOptions {
  stateDir?: string;
  workingDir?: string;
  ctlPath?: string;
  defaultChatId?: number | null;
  listJobs: () => Array<{ id: string }>;
  removeJob: (id: string) => boolean;
  sendMessage: (chatId: number, text: string) => Promise<void>;
  isWorkerRunning?: (workerName: string) => boolean;
  nowIso?: () => string;
}

const CONDUCTOR_SCHEMA_VERSION = 1;
const EVENT_EMITTED_BY = "supervisor";

function utcNowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function newRecordId(prefix: string): string {
  return `${prefix}_${randomBytes(6).toString("hex")}`;
}

function atomicWriteText(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  const tmpPath = `${path}.${process.pid}.${Date.now()}.${randomBytes(4).toString("hex")}.tmp`;
  writeFileSync(tmpPath, content, "utf-8");
  renameSync(tmpPath, path);
}

function atomicWriteJson(path: string, payload: unknown): void {
  atomicWriteText(path, `${JSON.stringify(payload, null, 2)}\n`);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readJsonObject<T>(path: string): T | null {
  if (!existsSync(path)) return null;
  try {
    const parsed = JSON.parse(readFileSync(path, "utf-8"));
    return isObjectRecord(parsed) ? (parsed as T) : null;
  } catch {
    return null;
  }
}

function appendJsonl(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload)}\n`, {
    encoding: "utf-8",
    flag: "a",
  });
}

function statePaths(stateDir: string) {
  return {
    baseDir: stateDir,
    eventsPath: join(stateDir, "events.jsonl"),
    workersDir: join(stateDir, "workers"),
    wakeupsDir: join(stateDir, "wakeups"),
  };
}

function loadPendingWakeups(stateDir: string): WakeupRecord[] {
  const { wakeupsDir } = statePaths(stateDir);
  if (!existsSync(wakeupsDir)) return [];

  return readdirSync(wakeupsDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJsonObject<WakeupRecord>(join(wakeupsDir, name)))
    .filter((value): value is WakeupRecord => value !== null && value.delivery_state === "pending")
    .sort((a, b) => {
      const left = a.created_at || "";
      const right = b.created_at || "";
      if (left !== right) return left.localeCompare(right);
      return a.id.localeCompare(b.id);
    });
}

function loadWorkerState(stateDir: string, workerName: string): WorkerStateRecord | null {
  const { workersDir } = statePaths(stateDir);
  return readJsonObject<WorkerStateRecord>(join(workersDir, `${workerName}.json`));
}

function writeWorkerState(stateDir: string, workerState: WorkerStateRecord): void {
  const { workersDir } = statePaths(stateDir);
  atomicWriteJson(join(workersDir, `${workerState.worker_name}.json`), workerState);
}

function writeWakeup(stateDir: string, wakeup: WakeupRecord): void {
  const { wakeupsDir } = statePaths(stateDir);
  atomicWriteJson(join(wakeupsDir, `${wakeup.id}.json`), wakeup);
}

function appendWorkerEvent(
  stateDir: string,
  workerState: WorkerStateRecord | null,
  workerName: string,
  eventType: string,
  lifecycleState: string | null,
  payload: Record<string, unknown>,
  timestamp: string
): WorkerEventRecord {
  const event: WorkerEventRecord = {
    kind: "worker_event",
    schema_version: CONDUCTOR_SCHEMA_VERSION,
    id: newRecordId("evt"),
    timestamp,
    worker_name: workerName,
    run_id: workerState?.run_id ?? null,
    event_type: eventType,
    emitted_by: EVENT_EMITTED_BY,
    lifecycle_state: lifecycleState,
    idempotency_key: null,
    payload,
  };
  appendJsonl(statePaths(stateDir).eventsPath, event);
  return event;
}

function parseCompletedBacklogItems(stateText: string): string[] {
  const lines = stateText.split(/\r?\n/);
  const items: string[] = [];
  let inBacklog = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!inBacklog) {
      if (trimmed.toLowerCase() === "# backlog") {
        inBacklog = true;
      }
      continue;
    }

    if (trimmed.startsWith("#")) {
      break;
    }

    const match = line.match(/^\s*-\s*\[x\]\s+(.*\S)\s*$/i);
    if (!match) continue;
    items.push(match[1]!.replace(/\s*<-\s*current\s*$/i, "").trim());
  }

  return items;
}

function readWorkspaceStateText(workerState: WorkerStateRecord | null): string | null {
  const workspace = workerState?.workspace;
  if (!workspace) return null;
  const statePath = join(workspace, "CLAUDE.md");
  if (!existsSync(statePath)) return null;
  try {
    return readFileSync(statePath, "utf-8");
  } catch {
    return null;
  }
}

function buildNotificationText(
  wakeup: WakeupRecord,
  workerState: WorkerStateRecord | null,
  stateText: string | null
): string {
  const workerName = wakeup.worker_name;
  const currentTask = workerState?.current_task?.trim();
  const payloadKind = typeof wakeup.payload?.kind === "string" ? wakeup.payload.kind : "";

  if (payloadKind === "completion_requested") {
    const completedItems = stateText ? parseCompletedBacklogItems(stateText).slice(0, 6) : [];
    const lines = [`🎉 Finished: ${workerName}`];
    if (completedItems.length > 0) {
      lines.push(...completedItems.map((item) => `✓ ${item}`));
    } else if (currentTask) {
      lines.push(`Completed: ${currentTask}`);
    } else {
      lines.push("Work completed and cleanup verified.");
    }
    return lines.join("\n");
  }

  if (payloadKind === "fatal_error") {
    const errorMessage =
      typeof wakeup.payload?.message === "string" ? wakeup.payload.message.trim() : "";
    const lines = [`❌ SubTurtle ${workerName} failed.`];
    if (currentTask) lines.push(`Task: ${currentTask}`);
    if (errorMessage) lines.push(`Error: ${errorMessage}`);
    return lines.join("\n");
  }

  if (payloadKind === "timeout") {
    const lines = [`❌ SubTurtle ${workerName} timed out.`];
    if (currentTask) lines.push(`Task: ${currentTask}`);
    return lines.join("\n");
  }

  const marker =
    wakeup.category === "critical"
      ? "❌"
      : wakeup.category === "notable"
        ? "🔔"
        : "ℹ️";
  return `${marker} ${wakeup.summary}`.trim();
}

function buildMetaAgentInboxTitle(
  wakeup: WakeupRecord,
  workerState: WorkerStateRecord | null
): string {
  const workerName = wakeup.worker_name;
  const payloadKind = typeof wakeup.payload?.kind === "string" ? wakeup.payload.kind : "";
  if (payloadKind === "completion_requested") {
    return `SubTurtle ${workerName} completed`;
  }
  if (payloadKind === "fatal_error") {
    return `SubTurtle ${workerName} failed`;
  }
  if (payloadKind === "timeout") {
    return `SubTurtle ${workerName} timed out`;
  }
  return workerState?.lifecycle_state
    ? `SubTurtle ${workerName} update (${workerState.lifecycle_state})`
    : `SubTurtle ${workerName} update`;
}

function buildMetaAgentInboxText(
  wakeup: WakeupRecord,
  workerState: WorkerStateRecord | null,
  stateText: string | null,
  chatId: number | null
): string {
  const payloadKind = typeof wakeup.payload?.kind === "string" ? wakeup.payload.kind : "";
  const lines: string[] = [];

  if (workerState?.lifecycle_state) {
    lines.push(`Lifecycle: ${workerState.lifecycle_state}`);
  }
  if (workerState?.current_task?.trim()) {
    lines.push(`Task: ${workerState.current_task.trim()}`);
  }
  if (payloadKind === "completion_requested") {
    const completedItems = stateText ? parseCompletedBacklogItems(stateText).slice(0, 4) : [];
    if (completedItems.length > 0) {
      lines.push(`Completed items: ${completedItems.join(" | ")}`);
    } else {
      lines.push("Completion was reconciled and cleanup verified.");
    }
  } else if (payloadKind === "fatal_error") {
    const errorMessage =
      typeof wakeup.payload?.message === "string" ? wakeup.payload.message.trim() : "";
    if (errorMessage) {
      lines.push(`Error: ${errorMessage}`);
    }
  } else if (payloadKind === "timeout") {
    lines.push("Worker exceeded its timeout and was reconciled as timed out.");
  } else {
    lines.push(wakeup.summary);
  }

  if (chatId !== null) {
    lines.push(`User notification chat: ${chatId}`);
  }
  lines.push(`Wakeup: ${wakeup.id}`);
  return lines.join("\n");
}

function defaultIsWorkerRunning(ctlPath: string, workingDir: string, workerName: string): boolean {
  const proc = spawnSync({
    cmd: [ctlPath, "status", workerName],
    cwd: workingDir,
    stdout: "pipe",
    stderr: "pipe",
  });
  const output = `${proc.stdout?.toString() || ""}\n${proc.stderr?.toString() || ""}`;
  return output.includes("running as");
}

function deriveChatId(
  wakeup: WakeupRecord,
  defaultChatId: number | null | undefined
): number | null {
  const maybeMetadataChatId = isObjectRecord(wakeup.metadata)
    ? wakeup.metadata.chat_id
    : undefined;
  if (typeof maybeMetadataChatId === "number" && Number.isFinite(maybeMetadataChatId)) {
    return maybeMetadataChatId;
  }
  return typeof defaultChatId === "number" && Number.isFinite(defaultChatId)
    ? defaultChatId
    : null;
}

function supervisorMetadata(workerState: WorkerStateRecord | null): Record<string, unknown> {
  const metadata = isObjectRecord(workerState?.metadata) ? workerState!.metadata! : {};
  return isObjectRecord(metadata.supervisor) ? { ...metadata.supervisor } : {};
}

function mergeMetadata(
  workerState: WorkerStateRecord | null,
  supervisorPatch: Record<string, unknown>
): Record<string, unknown> {
  const metadata = isObjectRecord(workerState?.metadata) ? { ...workerState!.metadata! } : {};
  const existingSupervisor = isObjectRecord(metadata.supervisor)
    ? { ...metadata.supervisor }
    : {};
  metadata.supervisor = { ...existingSupervisor, ...supervisorPatch };
  return metadata;
}

function isWakeupReady(
  wakeup: WakeupRecord,
  running: boolean
): boolean {
  const payloadKind = typeof wakeup.payload?.kind === "string" ? wakeup.payload.kind : "";
  if (payloadKind === "completion_requested" || payloadKind === "fatal_error" || payloadKind === "timeout") {
    return !running;
  }
  return true;
}

function updateWakeupDelivery(
  wakeup: WakeupRecord,
  deliveryState: string,
  now: string,
  options: {
    incrementAttempts?: boolean;
    sentAt?: string | null;
  } = {}
): WakeupRecord {
  const delivery = isObjectRecord(wakeup.delivery) ? { ...wakeup.delivery } : {};
  if (options.incrementAttempts) {
    delivery.attempts = (typeof delivery.attempts === "number" ? delivery.attempts : 0) + 1;
  }
  delivery.last_attempt_at = now;
  if (options.sentAt !== undefined) {
    delivery.sent_at = options.sentAt;
  }

  return {
    ...wakeup,
    delivery_state: deliveryState,
    updated_at: now,
    delivery,
  };
}

export async function processPendingConductorWakeups(
  options: ProcessConductorWakeupsOptions
): Promise<SupervisorTickResult> {
  const stateDir = options.stateDir || join(SUPERTURTLE_DATA_DIR, "state");
  const workingDir = options.workingDir || WORKING_DIR;
  const ctlPath = options.ctlPath || CTL_PATH;
  const nowIso = options.nowIso || utcNowIso;
  const isWorkerRunning =
    options.isWorkerRunning || ((workerName: string) => defaultIsWorkerRunning(ctlPath, workingDir, workerName));
  const cronJobIds = new Set(options.listJobs().map((job) => job.id));
  const result: SupervisorTickResult = { sent: 0, skipped: 0, errors: 0, reconciled: 0 };

  for (const wakeup of loadPendingWakeups(stateDir)) {
    const now = nowIso();
    const workerState = loadWorkerState(stateDir, wakeup.worker_name);
    const running = isWorkerRunning(wakeup.worker_name);
    if (!isWakeupReady(wakeup, running)) {
      result.skipped += 1;
      continue;
    }

    let workingState = workerState ? { ...workerState } : null;
    const supervisor = supervisorMetadata(workingState);
    const cronJobId = workingState?.cron_job_id?.trim();
    const hadCron = Boolean(cronJobId && cronJobIds.has(cronJobId));

    try {
      if (hadCron && !supervisor.cron_removed_at && cronJobId) {
        const removed = options.removeJob(cronJobId);
        if (removed) {
          cronJobIds.delete(cronJobId);
          const cronRemovedEvent = appendWorkerEvent(
            stateDir,
            workingState,
            wakeup.worker_name,
            "worker.cron_removed",
            workingState?.lifecycle_state || null,
            { cron_job_id: cronJobId },
            now
          );
          if (workingState) {
            workingState = {
              ...workingState,
              updated_at: now,
              updated_by: EVENT_EMITTED_BY,
              last_event_id: cronRemovedEvent.id,
              last_event_at: cronRemovedEvent.timestamp,
              metadata: mergeMetadata(workingState, {
                cron_removed_at: now,
                cron_removed_event_id: cronRemovedEvent.id,
              }),
            };
          }
          result.reconciled += 1;
        }
      }

      const payloadKind = typeof wakeup.payload?.kind === "string" ? wakeup.payload.kind : "";
      if (workingState && !supervisor.cleanup_verified_at) {
        const cleanupVerifiedEvent = appendWorkerEvent(
          stateDir,
          workingState,
          wakeup.worker_name,
          "worker.cleanup_verified",
          workingState.lifecycle_state,
          {
            running: false,
            cron_removed: !cronJobId || !cronJobIds.has(cronJobId),
            wakeup_id: wakeup.id,
          },
          now
        );
        workingState = {
          ...workingState,
          updated_at: now,
          updated_by: EVENT_EMITTED_BY,
          last_event_id: cleanupVerifiedEvent.id,
          last_event_at: cleanupVerifiedEvent.timestamp,
          metadata: mergeMetadata(workingState, {
            cleanup_verified_at: now,
            cleanup_verified_event_id: cleanupVerifiedEvent.id,
          }),
        };
        result.reconciled += 1;
      }

      if (workingState && payloadKind === "completion_requested" && supervisor.resolved_terminal_state !== "completed") {
        const completedEvent = appendWorkerEvent(
          stateDir,
          workingState,
          wakeup.worker_name,
          "worker.completed",
          "completed",
          { wakeup_id: wakeup.id },
          now
        );
        workingState = {
          ...workingState,
          lifecycle_state:
            workingState.lifecycle_state === "archived" ? "archived" : "completed",
          stop_reason: "completed",
          terminal_at: workingState.terminal_at || now,
          updated_at: now,
          updated_by: EVENT_EMITTED_BY,
          last_event_id: completedEvent.id,
          last_event_at: completedEvent.timestamp,
          metadata: mergeMetadata(workingState, {
            resolved_terminal_state: "completed",
            reconciled_at: now,
            resolution_event_id: completedEvent.id,
          }),
        };
        result.reconciled += 1;
      }

      if (workingState && payloadKind === "fatal_error" && supervisor.resolved_terminal_state !== "failed") {
        const failedEvent = appendWorkerEvent(
          stateDir,
          workingState,
          wakeup.worker_name,
          "worker.failed",
          "failed",
          { wakeup_id: wakeup.id, reason: "fatal_error" },
          now
        );
        workingState = {
          ...workingState,
          lifecycle_state: "failed",
          stop_reason: workingState.stop_reason || "fatal_error",
          terminal_at: workingState.terminal_at || now,
          updated_at: now,
          updated_by: EVENT_EMITTED_BY,
          last_event_id: failedEvent.id,
          last_event_at: failedEvent.timestamp,
          metadata: mergeMetadata(workingState, {
            resolved_terminal_state: "failed",
            reconciled_at: now,
            resolution_event_id: failedEvent.id,
          }),
        };
        result.reconciled += 1;
      }

      if (workingState && payloadKind === "timeout" && supervisor.resolved_terminal_state !== "timed_out") {
        workingState = {
          ...workingState,
          lifecycle_state: "timed_out",
          terminal_at: workingState.terminal_at || now,
          updated_at: now,
          updated_by: EVENT_EMITTED_BY,
          metadata: mergeMetadata(workingState, {
            resolved_terminal_state: "timed_out",
            reconciled_at: now,
          }),
        };
      }

      if (workingState) {
        writeWorkerState(stateDir, workingState);
      }

      const chatId = deriveChatId(wakeup, options.defaultChatId ?? ALLOWED_USERS[0] ?? null);
      const stateText = readWorkspaceStateText(workingState);
      if (wakeup.category !== "silent") {
        const inboxTitle = buildMetaAgentInboxTitle(wakeup, workingState);
        const inboxText = buildMetaAgentInboxText(wakeup, workingState, stateText, chatId);
        const { item: inboxItem, created } = ensureMetaAgentInboxItem({
          stateDir,
          item: {
            id: `inbox_${wakeup.id}`,
            chat_id: chatId,
            worker_name: wakeup.worker_name,
            run_id: workingState?.run_id ?? wakeup.run_id ?? null,
            priority: wakeup.category,
            category: typeof wakeup.payload?.kind === "string" ? wakeup.payload.kind : wakeup.category,
            title: inboxTitle,
            text: inboxText,
            delivery_state: "pending",
            source_event_id: workingState?.last_event_id ?? wakeup.reason_event_id ?? null,
            source_wakeup_id: wakeup.id,
            created_at: now,
            updated_at: now,
            delivery: {},
            metadata: {
              lifecycle_state: workingState?.lifecycle_state ?? null,
            },
          },
        });
        if (created) {
          const inboxEvent = appendWorkerEvent(
            stateDir,
            workingState,
            wakeup.worker_name,
            "worker.inbox_enqueued",
            workingState?.lifecycle_state || null,
            { inbox_id: inboxItem.id, wakeup_id: wakeup.id, chat_id: chatId },
            now
          );
          if (workingState) {
            workingState = {
              ...workingState,
              updated_at: now,
              updated_by: EVENT_EMITTED_BY,
              last_event_id: inboxEvent.id,
              last_event_at: inboxEvent.timestamp,
            };
            writeWorkerState(stateDir, workingState);
          }
          result.reconciled += 1;
        }
      }

      if (chatId === null) {
        result.skipped += 1;
        continue;
      }

      const processingWakeup = updateWakeupDelivery(wakeup, "processing", now, {
        incrementAttempts: true,
      });
      writeWakeup(stateDir, processingWakeup);

      const notificationText = buildNotificationText(processingWakeup, workingState, stateText);
      await options.sendMessage(chatId, notificationText);

      const notificationEvent = appendWorkerEvent(
        stateDir,
        workingState,
        wakeup.worker_name,
        "worker.notification_sent",
        workingState?.lifecycle_state || null,
        { wakeup_id: wakeup.id, category: wakeup.category, chat_id: chatId },
        now
      );
      if (workingState) {
        writeWorkerState(stateDir, {
          ...workingState,
          updated_at: now,
          updated_by: EVENT_EMITTED_BY,
          last_event_id: notificationEvent.id,
          last_event_at: notificationEvent.timestamp,
        });
      }

      writeWakeup(
        stateDir,
        updateWakeupDelivery(processingWakeup, "sent", now, { sentAt: now })
      );
      result.sent += 1;
    } catch {
      writeWakeup(stateDir, updateWakeupDelivery(wakeup, "pending", now, {
        incrementAttempts: true,
      }));
      result.errors += 1;
    }
  }

  return result;
}

export { parseCompletedBacklogItems, buildNotificationText };
