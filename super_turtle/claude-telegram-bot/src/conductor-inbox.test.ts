import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import {
  acknowledgeMetaAgentInboxItems,
  buildMetaAgentInboxPrompt,
  ensureMetaAgentInboxItem,
  injectMetaAgentInboxIntoPrompt,
  listPendingMetaAgentInboxItems,
  shouldInjectMetaAgentInbox,
} from "./conductor-inbox";

const tempDirs: string[] = [];

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

function makeTempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "conductor-inbox-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("conductor inbox", () => {
  it("lists pending per-chat inbox items plus global items and can acknowledge them", () => {
    const baseDir = makeTempDir();
    const stateDir = join(baseDir, ".superturtle", "state");

    writeJson(join(stateDir, "inbox", "global.json"), {
      kind: "meta_agent_inbox_item",
      schema_version: 1,
      id: "global",
      chat_id: null,
      worker_name: "worker-global",
      priority: "notable",
      category: "completion_requested",
      title: "Global completion",
      text: "Global details",
      delivery_state: "pending",
      created_at: "2026-03-08T11:59:00Z",
      updated_at: "2026-03-08T11:59:00Z",
      delivery: {},
      metadata: {},
    });
    writeJson(join(stateDir, "inbox", "chat-123.json"), {
      kind: "meta_agent_inbox_item",
      schema_version: 1,
      id: "chat-123",
      chat_id: 123,
      worker_name: "worker-123",
      priority: "critical",
      category: "fatal_error",
      title: "Worker 123 failed",
      text: "Failure details",
      delivery_state: "pending",
      created_at: "2026-03-08T12:00:00Z",
      updated_at: "2026-03-08T12:00:00Z",
      delivery: {},
      metadata: {},
    });
    writeJson(join(stateDir, "inbox", "chat-999.json"), {
      kind: "meta_agent_inbox_item",
      schema_version: 1,
      id: "chat-999",
      chat_id: 999,
      worker_name: "worker-999",
      priority: "notable",
      category: "completion_requested",
      title: "Worker 999 completed",
      text: "Ignore me",
      delivery_state: "pending",
      created_at: "2026-03-08T12:01:00Z",
      updated_at: "2026-03-08T12:01:00Z",
      delivery: {},
      metadata: {},
    });
    writeJson(join(stateDir, "inbox", "acked.json"), {
      kind: "meta_agent_inbox_item",
      schema_version: 1,
      id: "acked",
      chat_id: 123,
      worker_name: "worker-acked",
      priority: "notable",
      category: "completion_requested",
      title: "Already acknowledged",
      text: "Already seen",
      delivery_state: "acknowledged",
      created_at: "2026-03-08T11:58:00Z",
      updated_at: "2026-03-08T12:02:00Z",
      delivery: {
        acknowledged_at: "2026-03-08T12:02:00Z",
      },
      metadata: {},
    });

    const items = listPendingMetaAgentInboxItems({
      stateDir,
      chatId: 123,
    });

    expect(items.map((item) => item.id)).toEqual(["global", "chat-123"]);

    const prompt = buildMetaAgentInboxPrompt(items);
    expect(prompt).toContain("<background-events>");
    expect(prompt).toContain("[notable] Global completion");
    expect(prompt).toContain("[critical] Worker 123 failed");

    const injectedPrompt = injectMetaAgentInboxIntoPrompt(
      "[Current date/time: Sunday, March 8, 2026 at 01:00 PM GMT+1]\n\nUser request",
      prompt
    );
    expect(injectedPrompt).toContain("[Current date/time: Sunday, March 8, 2026 at 01:00 PM GMT+1]");
    expect(injectedPrompt).toContain("<background-events>");
    expect(injectedPrompt).toContain("User request");

    const updated = acknowledgeMetaAgentInboxItems({
      stateDir,
      itemIds: items.map((item) => item.id),
      driver: "claude",
      turnId: "turn-1",
      sessionId: "session-1",
      acknowledgedAt: "2026-03-08T12:05:00Z",
    });

    expect(updated).toHaveLength(2);
    expect(listPendingMetaAgentInboxItems({ stateDir, chatId: 123 })).toEqual([]);

    const acknowledged = JSON.parse(
      readFileSync(join(stateDir, "inbox", "chat-123.json"), "utf-8")
    );
    expect(acknowledged.delivery_state).toBe("acknowledged");
    expect(acknowledged.delivery.acknowledged_by_turn_id).toBe("turn-1");
  });

  it("creates inbox items idempotently and injects only on interactive sources", () => {
    const baseDir = makeTempDir();
    const stateDir = join(baseDir, ".superturtle", "state");

    const first = ensureMetaAgentInboxItem({
      stateDir,
      item: {
        id: "inbox_wake-1",
        chat_id: 123,
        worker_name: "worker-a",
        run_id: "run-a",
        priority: "notable",
        category: "completion_requested",
        title: "Worker A completed",
        text: "Lifecycle: completed",
        delivery_state: "pending",
        created_at: "2026-03-08T12:00:00Z",
        updated_at: "2026-03-08T12:00:00Z",
        delivery: {},
        metadata: {},
      },
    });
    const second = ensureMetaAgentInboxItem({
      stateDir,
      item: {
        id: "inbox_wake-1",
        chat_id: 123,
        worker_name: "worker-a",
        run_id: "run-a",
        priority: "notable",
        category: "completion_requested",
        title: "Worker A completed",
        text: "Lifecycle: completed",
        delivery_state: "pending",
        created_at: "2026-03-08T12:00:00Z",
        updated_at: "2026-03-08T12:00:00Z",
        delivery: {},
        metadata: {},
      },
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(shouldInjectMetaAgentInbox("text")).toBe(true);
    expect(shouldInjectMetaAgentInbox("queue_voice")).toBe(true);
    expect(shouldInjectMetaAgentInbox("cron_silent")).toBe(false);
    expect(shouldInjectMetaAgentInbox("background_snapshot")).toBe(false);
  });

  it("skips pending inbox items from a worker's previous run", () => {
    const baseDir = makeTempDir();
    const stateDir = join(baseDir, ".superturtle", "state");

    writeJson(join(stateDir, "workers", "worker-a.json"), {
      kind: "worker_state",
      schema_version: 1,
      worker_name: "worker-a",
      run_id: "run-new",
      lifecycle_state: "running",
    });
    writeJson(join(stateDir, "inbox", "old-run.json"), {
      kind: "meta_agent_inbox_item",
      schema_version: 1,
      id: "old-run",
      chat_id: 123,
      worker_name: "worker-a",
      run_id: "run-old",
      priority: "notable",
      category: "worker_stuck",
      title: "Old worker stuck",
      text: "Ignore old run",
      delivery_state: "pending",
      created_at: "2026-03-08T11:59:00Z",
      updated_at: "2026-03-08T11:59:00Z",
      delivery: {},
      metadata: {},
    });
    writeJson(join(stateDir, "inbox", "new-run.json"), {
      kind: "meta_agent_inbox_item",
      schema_version: 1,
      id: "new-run",
      chat_id: 123,
      worker_name: "worker-a",
      run_id: "run-new",
      priority: "notable",
      category: "milestone_reached",
      title: "New worker milestone",
      text: "Keep this",
      delivery_state: "pending",
      created_at: "2026-03-08T12:00:00Z",
      updated_at: "2026-03-08T12:00:00Z",
      delivery: {},
      metadata: {},
    });

    const items = listPendingMetaAgentInboxItems({
      stateDir,
      chatId: 123,
    });

    expect(items.map((item) => item.id)).toEqual(["new-run"]);
  });
});
