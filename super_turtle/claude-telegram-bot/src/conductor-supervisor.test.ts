import { afterEach, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { dirname, join } from "path";
import {
  parseCompletedBacklogItems,
  processPendingConductorWakeups,
} from "./conductor-supervisor";

const tempDirs: string[] = [];

function writeJson(path: string, payload: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

function makeStateDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "conductor-supervisor-"));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("parseCompletedBacklogItems", () => {
  it("extracts checked backlog items and strips current markers", () => {
    const content = `
# Current task

Ship the feature

# Backlog
- [x] Implement API
- [x] Wire UI <- current
- [ ] Follow-up cleanup
`;

    expect(parseCompletedBacklogItems(content)).toEqual([
      "Implement API",
      "Wire UI",
    ]);
  });
});

describe("processPendingConductorWakeups", () => {
  it("reconciles completion wakeups directly from canonical state", async () => {
    const baseDir = makeStateDir();
    const stateDir = join(baseDir, ".superturtle", "state");
    const archiveWorkspace = join(baseDir, ".subturtles", ".archive", "worker-done");
    mkdirSync(join(stateDir, "workers"), { recursive: true });
    mkdirSync(join(stateDir, "wakeups"), { recursive: true });
    mkdirSync(archiveWorkspace, { recursive: true });

    writeFileSync(
      join(archiveWorkspace, "CLAUDE.md"),
      `# Current task

Ship the shipped thing

# Backlog
- [x] Implement API
- [x] Ship UI
- [ ] Follow-up cleanup
`,
      "utf-8"
    );

    writeJson(join(stateDir, "workers", "worker-done.json"), {
      kind: "worker_state",
      schema_version: 1,
      worker_name: "worker-done",
      run_id: "run-done",
      lifecycle_state: "archived",
      workspace: archiveWorkspace,
      cron_job_id: "cron-done",
      current_task: "Ship the shipped thing",
      metadata: {},
    });
    writeJson(join(stateDir, "wakeups", "wake-done.json"), {
      kind: "wakeup",
      schema_version: 1,
      id: "wake-done",
      worker_name: "worker-done",
      run_id: "run-done",
      category: "notable",
      delivery_state: "pending",
      summary: "worker done",
      created_at: "2026-03-08T00:00:00Z",
      updated_at: "2026-03-08T00:00:00Z",
      delivery: { attempts: 0 },
      payload: { kind: "completion_requested" },
      metadata: {},
    });

    const jobs = [{ id: "cron-done" }];
    const sentMessages: Array<{ chatId: number; text: string }> = [];

    const result = await processPendingConductorWakeups({
      stateDir,
      defaultChatId: 123,
      listJobs: () => [...jobs],
      removeJob: (id) => {
        const index = jobs.findIndex((job) => job.id === id);
        if (index === -1) return false;
        jobs.splice(index, 1);
        return true;
      },
      sendMessage: async (chatId, text) => {
        sentMessages.push({ chatId, text });
      },
      isWorkerRunning: () => false,
      nowIso: () => "2026-03-08T01:00:00Z",
    });

    expect(result.sent).toBe(1);
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0]?.text).toContain("🎉 Finished: worker-done");
    expect(sentMessages[0]?.text).toContain("✓ Implement API");
    expect(sentMessages[0]?.text).toContain("✓ Ship UI");
    expect(jobs).toHaveLength(0);

    const updatedWakeup = JSON.parse(
      readFileSync(join(stateDir, "wakeups", "wake-done.json"), "utf-8")
    );
    expect(updatedWakeup.delivery_state).toBe("sent");

    const updatedWorker = JSON.parse(
      readFileSync(join(stateDir, "workers", "worker-done.json"), "utf-8")
    );
    expect(updatedWorker.lifecycle_state).toBe("archived");
    expect(updatedWorker.metadata.supervisor.resolved_terminal_state).toBe("completed");

    const inboxItem = JSON.parse(
      readFileSync(join(stateDir, "inbox", "inbox_wake-done.json"), "utf-8")
    );
    expect(inboxItem.delivery_state).toBe("pending");
    expect(inboxItem.chat_id).toBe(123);
    expect(inboxItem.title).toContain("worker-done completed");

    const events = readFileSync(join(stateDir, "events.jsonl"), "utf-8");
    expect(events).toContain('"event_type":"worker.cron_removed"');
    expect(events).toContain('"event_type":"worker.cleanup_verified"');
    expect(events).toContain('"event_type":"worker.completed"');
    expect(events).toContain('"event_type":"worker.inbox_enqueued"');
    expect(events).toContain('"event_type":"worker.notification_sent"');
  });

  it("reconciles fatal worker wakeups into a failed state", async () => {
    const baseDir = makeStateDir();
    const stateDir = join(baseDir, ".superturtle", "state");
    const workspace = join(baseDir, ".subturtles", "worker-failed");
    mkdirSync(join(stateDir, "workers"), { recursive: true });
    mkdirSync(join(stateDir, "wakeups"), { recursive: true });
    mkdirSync(workspace, { recursive: true });

    writeFileSync(
      join(workspace, "CLAUDE.md"),
      `# Current task

Recover from a bad crash <- current
`,
      "utf-8"
    );

    writeJson(join(stateDir, "workers", "worker-failed.json"), {
      kind: "worker_state",
      schema_version: 1,
      worker_name: "worker-failed",
      run_id: "run-failed",
      lifecycle_state: "failure_pending",
      workspace,
      cron_job_id: "cron-failed",
      current_task: "Recover from a bad crash",
      stop_reason: "fatal_error",
      metadata: {},
    });
    writeJson(join(stateDir, "wakeups", "wake-failed.json"), {
      kind: "wakeup",
      schema_version: 1,
      id: "wake-failed",
      worker_name: "worker-failed",
      run_id: "run-failed",
      category: "critical",
      delivery_state: "pending",
      summary: "worker failed",
      created_at: "2026-03-08T00:00:00Z",
      updated_at: "2026-03-08T00:00:00Z",
      delivery: { attempts: 0 },
      payload: { kind: "fatal_error", message: "boom" },
      metadata: {},
    });

    const jobs = [{ id: "cron-failed" }];
    const sentMessages: string[] = [];

    const result = await processPendingConductorWakeups({
      stateDir,
      defaultChatId: 123,
      listJobs: () => [...jobs],
      removeJob: (id) => {
        const index = jobs.findIndex((job) => job.id === id);
        if (index === -1) return false;
        jobs.splice(index, 1);
        return true;
      },
      sendMessage: async (_chatId, text) => {
        sentMessages.push(text);
      },
      isWorkerRunning: () => false,
      nowIso: () => "2026-03-08T02:00:00Z",
    });

    expect(result.sent).toBe(1);
    expect(sentMessages[0]).toContain("❌ SubTurtle worker-failed failed.");
    expect(sentMessages[0]).toContain("Error: boom");

    const updatedWorker = JSON.parse(
      readFileSync(join(stateDir, "workers", "worker-failed.json"), "utf-8")
    );
    expect(updatedWorker.lifecycle_state).toBe("failed");
    expect(updatedWorker.metadata.supervisor.resolved_terminal_state).toBe("failed");

    const updatedWakeup = JSON.parse(
      readFileSync(join(stateDir, "wakeups", "wake-failed.json"), "utf-8")
    );
    expect(updatedWakeup.delivery_state).toBe("sent");

    const inboxItem = JSON.parse(
      readFileSync(join(stateDir, "inbox", "inbox_wake-failed.json"), "utf-8")
    );
    expect(inboxItem.title).toContain("worker-failed failed");
    expect(inboxItem.text).toContain("Error: boom");

    const events = readFileSync(join(stateDir, "events.jsonl"), "utf-8");
    expect(events).toContain('"event_type":"worker.failed"');
    expect(events).toContain('"event_type":"worker.inbox_enqueued"');
    expect(events).toContain('"event_type":"worker.notification_sent"');
  });
});
