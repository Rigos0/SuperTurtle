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
import { SUPERTURTLE_DATA_DIR } from "./config";
import type { DriverId, DriverRunSource } from "./drivers/types";

const CONDUCTOR_SCHEMA_VERSION = 1;
const META_AGENT_INBOX_STATES = new Set(["pending", "acknowledged", "suppressed"]);
const NON_INTERACTIVE_SOURCES = new Set<DriverRunSource>([
  "cron_silent",
  "cron_scheduled",
  "background_snapshot",
]);

export interface MetaAgentInboxItemRecord {
  kind?: string;
  schema_version?: number;
  id: string;
  chat_id?: number | null;
  worker_name?: string | null;
  run_id?: string | null;
  priority: string;
  category: string;
  title: string;
  text: string;
  delivery_state: string;
  source_event_id?: string | null;
  source_wakeup_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  delivery?: {
    acknowledged_at?: string | null;
    acknowledged_by_driver?: DriverId | null;
    acknowledged_by_turn_id?: string | null;
    acknowledged_by_session_id?: string | null;
  };
  metadata?: Record<string, unknown>;
}

interface BuildMetaAgentInboxPromptOptions {
  maxItems?: number;
}

interface EnsureMetaAgentInboxItemOptions {
  stateDir?: string;
  item: MetaAgentInboxItemRecord;
}

interface ListPendingMetaAgentInboxItemsOptions {
  stateDir?: string;
  chatId?: number;
  limit?: number;
}

interface AcknowledgeMetaAgentInboxItemsOptions {
  stateDir?: string;
  itemIds: string[];
  driver: DriverId;
  turnId: string;
  sessionId: string | null;
  acknowledgedAt?: string;
}

function statePaths(stateDir: string) {
  return {
    inboxDir: join(stateDir, "inbox"),
  };
}

function utcNowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function newItemId(): string {
  return `inbox_${randomBytes(6).toString("hex")}`;
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

function inboxPath(stateDir: string, itemId: string): string {
  return join(statePaths(stateDir).inboxDir, `${itemId}.json`);
}

function normalizeState(value: string | null | undefined): string {
  const normalized = value?.trim() || "pending";
  return META_AGENT_INBOX_STATES.has(normalized) ? normalized : "pending";
}

function normalizeItem(item: MetaAgentInboxItemRecord): MetaAgentInboxItemRecord {
  const now = utcNowIso();
  return {
    kind: "meta_agent_inbox_item",
    schema_version: CONDUCTOR_SCHEMA_VERSION,
    id: item.id?.trim() || newItemId(),
    chat_id: typeof item.chat_id === "number" && Number.isFinite(item.chat_id)
      ? item.chat_id
      : null,
    worker_name: typeof item.worker_name === "string" ? item.worker_name : null,
    run_id: typeof item.run_id === "string" ? item.run_id : null,
    priority: item.priority.trim(),
    category: item.category.trim(),
    title: item.title.trim(),
    text: item.text.trim(),
    delivery_state: normalizeState(item.delivery_state),
    source_event_id: typeof item.source_event_id === "string" ? item.source_event_id : null,
    source_wakeup_id: typeof item.source_wakeup_id === "string" ? item.source_wakeup_id : null,
    created_at: item.created_at || now,
    updated_at: item.updated_at || now,
    delivery: {
      acknowledged_at: item.delivery?.acknowledged_at || null,
      acknowledged_by_driver: item.delivery?.acknowledged_by_driver || null,
      acknowledged_by_turn_id: item.delivery?.acknowledged_by_turn_id || null,
      acknowledged_by_session_id: item.delivery?.acknowledged_by_session_id || null,
    },
    metadata: isObjectRecord(item.metadata) ? { ...item.metadata } : {},
  };
}

export function shouldInjectMetaAgentInbox(source: DriverRunSource): boolean {
  return !NON_INTERACTIVE_SOURCES.has(source);
}

export function ensureMetaAgentInboxItem(
  options: EnsureMetaAgentInboxItemOptions
): { item: MetaAgentInboxItemRecord; created: boolean } {
  const stateDir = options.stateDir || join(SUPERTURTLE_DATA_DIR, "state");
  const normalized = normalizeItem(options.item);
  const path = inboxPath(stateDir, normalized.id);
  const existing = readJsonObject<MetaAgentInboxItemRecord>(path);
  if (existing) {
    return { item: existing, created: false };
  }
  atomicWriteJson(path, normalized);
  return { item: normalized, created: true };
}

export function listPendingMetaAgentInboxItems(
  options: ListPendingMetaAgentInboxItemsOptions
): MetaAgentInboxItemRecord[] {
  const stateDir = options.stateDir || join(SUPERTURTLE_DATA_DIR, "state");
  const { inboxDir } = statePaths(stateDir);
  if (!existsSync(inboxDir)) return [];

  return readdirSync(inboxDir)
    .filter((name) => name.endsWith(".json"))
    .map((name) => readJsonObject<MetaAgentInboxItemRecord>(join(inboxDir, name)))
    .filter((item): item is MetaAgentInboxItemRecord => {
      if (!item) return false;
      if (normalizeState(item.delivery_state) !== "pending") return false;
      if (typeof options.chatId !== "number" || !Number.isFinite(options.chatId)) {
        return true;
      }
      return item.chat_id === null || item.chat_id === options.chatId;
    })
    .sort((left, right) => {
      const leftKey = left.created_at || "";
      const rightKey = right.created_at || "";
      if (leftKey !== rightKey) return leftKey.localeCompare(rightKey);
      return left.id.localeCompare(right.id);
    })
    .slice(0, options.limit || 6);
}

export function buildMetaAgentInboxPrompt(
  items: MetaAgentInboxItemRecord[],
  options: BuildMetaAgentInboxPromptOptions = {}
): string {
  const maxItems = options.maxItems || 6;
  const visibleItems = items.slice(0, maxItems);
  const hiddenCount = Math.max(0, items.length - visibleItems.length);
  const lines = [
    "<background-events>",
    "The following durable background SubTurtle events landed while you may have been busy with the user.",
    "Treat them as orchestration facts, not user chat. Update your internal state from them.",
    "Only mention them to the user if they are relevant to the current request or materially change what should happen next.",
    "",
  ];

  for (const item of visibleItems) {
    lines.push(
      `- [${item.priority}] ${item.title}`,
      `  Created: ${item.created_at || "(unknown)"}`,
      `  Details: ${item.text}`
    );
  }

  if (hiddenCount > 0) {
    lines.push("", `(${hiddenCount} additional background event(s) omitted for brevity.)`);
  }

  lines.push("</background-events>");
  return lines.join("\n");
}

export function injectMetaAgentInboxIntoPrompt(
  prompt: string,
  inboxText: string
): string {
  if (!inboxText.trim()) return prompt;
  const match = prompt.match(
    /^(?:<system-instructions>\n[\s\S]*?\n<\/system-instructions>\n\n)?(?:\[Current date\/time:[^\n]*\]\n\n)?/
  );
  const prefix = match?.[0] || "";
  if (!prefix) {
    return `${inboxText}\n\n${prompt}`;
  }
  const remainder = prompt.slice(prefix.length);
  return `${prefix}${inboxText}\n\n${remainder}`;
}

export function acknowledgeMetaAgentInboxItems(
  options: AcknowledgeMetaAgentInboxItemsOptions
): MetaAgentInboxItemRecord[] {
  const stateDir = options.stateDir || join(SUPERTURTLE_DATA_DIR, "state");
  const acknowledgedAt = options.acknowledgedAt || utcNowIso();
  const updatedItems: MetaAgentInboxItemRecord[] = [];

  for (const itemId of options.itemIds) {
    const path = inboxPath(stateDir, itemId);
    const existing = readJsonObject<MetaAgentInboxItemRecord>(path);
    if (!existing) continue;
    if (normalizeState(existing.delivery_state) !== "pending") continue;

    const updated = normalizeItem({
      ...existing,
      delivery_state: "acknowledged",
      updated_at: acknowledgedAt,
      delivery: {
        ...(existing.delivery || {}),
        acknowledged_at: acknowledgedAt,
        acknowledged_by_driver: options.driver,
        acknowledged_by_turn_id: options.turnId,
        acknowledged_by_session_id: options.sessionId,
      },
    });
    atomicWriteJson(path, updated);
    updatedItems.push(updated);
  }

  return updatedItems;
}
