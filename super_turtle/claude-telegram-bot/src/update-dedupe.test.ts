import { describe, expect, it } from "bun:test";
import { UpdateDedupeCache, extractUpdateDedupeKeys } from "./update-dedupe";

describe("extractUpdateDedupeKeys", () => {
  it("extracts update + message fingerprint keys", () => {
    const keys = extractUpdateDedupeKeys({
      update_id: 10,
      message: {
        message_id: 55,
        chat: { id: 1234 },
      },
    });

    expect(keys).toEqual(["upd:10", "msg:1234:55"]);
  });

  it("extracts update + callback fingerprint keys", () => {
    const keys = extractUpdateDedupeKeys({
      update_id: 11,
      callback_query: {
        id: "cb-1",
        data: "confirm",
      },
    });

    expect(keys).toEqual(["upd:11", "cb:cb-1"]);
  });

  it("ignores unsupported update payloads", () => {
    const keys = extractUpdateDedupeKeys({
      update_id: 12,
    });
    expect(keys).toEqual([]);
  });
});

describe("UpdateDedupeCache", () => {
  it("suppresses duplicate message updates", () => {
    const dedupe = new UpdateDedupeCache({ ttlMs: 60_000, maxEntries: 100 });
    const first = {
      update_id: 100,
      message: {
        message_id: 1,
        chat: { id: 999 },
      },
    };
    const replayed = {
      update_id: 101,
      message: {
        message_id: 1,
        chat: { id: 999 },
      },
    };

    expect(dedupe.isDuplicateUpdate(first, 1_000)).toBe(false);
    expect(dedupe.isDuplicateUpdate(replayed, 1_100)).toBe(true);
  });

  it("suppresses duplicate callback updates", () => {
    const dedupe = new UpdateDedupeCache({ ttlMs: 60_000, maxEntries: 100 });
    const first = {
      update_id: 200,
      callback_query: {
        id: "abc123",
        data: "askuser:1:0",
      },
    };
    const replayed = {
      update_id: 201,
      callback_query: {
        id: "abc123",
        data: "askuser:1:0",
      },
    };

    expect(dedupe.isDuplicateUpdate(first, 2_000)).toBe(false);
    expect(dedupe.isDuplicateUpdate(replayed, 2_001)).toBe(true);
  });

  it("expires dedupe keys after TTL", () => {
    const dedupe = new UpdateDedupeCache({ ttlMs: 50, maxEntries: 100 });
    const update = {
      update_id: 300,
      message: {
        message_id: 9,
        chat: { id: 700 },
      },
    };

    expect(dedupe.isDuplicateUpdate(update, 10_000)).toBe(false);
    expect(dedupe.isDuplicateUpdate(update, 10_020)).toBe(true);
    expect(dedupe.isDuplicateUpdate(update, 10_071)).toBe(false);
  });

  it("keeps tracked keys bounded by maxEntries", () => {
    const dedupe = new UpdateDedupeCache({ ttlMs: 60_000, maxEntries: 4 });

    dedupe.isDuplicateUpdate(
      { update_id: 1, message: { message_id: 1, chat: { id: 1 } } },
      1_000
    );
    dedupe.isDuplicateUpdate(
      { update_id: 2, message: { message_id: 2, chat: { id: 1 } } },
      1_001
    );
    dedupe.isDuplicateUpdate(
      { update_id: 3, message: { message_id: 3, chat: { id: 1 } } },
      1_002
    );

    expect(dedupe.getTrackedKeyCount()).toBeLessThanOrEqual(4);
  });
});
