import { describe, expect, it } from "bun:test";
import {
  clearPreparedSnapshots,
  dequeuePreparedSnapshot,
  enqueuePreparedSnapshot,
  getPreparedSnapshotCount,
} from "./cron-supervision-queue";

function clearQueue(): void {
  clearPreparedSnapshots();
}

describe("cron supervision queue", () => {
  it("preserves FIFO ordering", () => {
    clearQueue();
    const base = {
      chatId: 1,
      sourcePrompt: "p",
      preparedAtMs: 1000,
      statusOutput: "ok",
      stateExcerpt: "state",
      gitLog: "log",
      tunnelUrl: null,
      prepErrors: [] as string[],
    };

    enqueuePreparedSnapshot({ ...base, jobId: "job-a", subturtleName: "a" });
    enqueuePreparedSnapshot({ ...base, jobId: "job-b", subturtleName: "b" });

    expect(dequeuePreparedSnapshot()?.jobId).toBe("job-a");
    expect(dequeuePreparedSnapshot()?.jobId).toBe("job-b");
    clearQueue();
  });

  it("limits snapshots per job to 20", () => {
    clearQueue();
    const base = {
      chatId: 1,
      sourcePrompt: "p",
      statusOutput: "ok",
      stateExcerpt: "state",
      gitLog: "log",
      tunnelUrl: null,
      prepErrors: [] as string[],
    };

    for (let i = 0; i < 25; i++) {
      enqueuePreparedSnapshot({
        ...base,
        jobId: "job-cap",
        subturtleName: "cap",
        preparedAtMs: 2000 + i,
      });
    }

    expect(getPreparedSnapshotCount()).toBe(20);
    expect(dequeuePreparedSnapshot()?.snapshotSeq).toBe(6);
    clearQueue();
  });

  it("can clear all prepared snapshots", () => {
    clearQueue();
    enqueuePreparedSnapshot({
      jobId: "job-x",
      subturtleName: "x",
      chatId: 1,
      sourcePrompt: "p",
      preparedAtMs: 1,
      statusOutput: "ok",
      stateExcerpt: "s",
      gitLog: "g",
      tunnelUrl: null,
      prepErrors: [],
    });
    expect(getPreparedSnapshotCount()).toBe(1);
    clearPreparedSnapshots();
    expect(getPreparedSnapshotCount()).toBe(0);
  });
});
