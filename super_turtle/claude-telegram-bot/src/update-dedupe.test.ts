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

  it("extracts message fallback fingerprints when chat/message_id are unavailable", () => {
    const keys = extractUpdateDedupeKeys({
      update_id: 12,
      message: {
        from: { id: 77 },
        date: 1_700_000_000,
        text: "hello fallback",
      },
    });

    expect(keys).toEqual(["upd:12", "msg_fallback:77:1700000000:hello fallback"]);
  });

  it("extracts callback fallback fingerprints for inline callbacks", () => {
    const keys = extractUpdateDedupeKeys({
      update_id: 13,
      callback_query: {
        from: { id: 88 },
        data: "confirm",
        inline_message_id: "inline-42",
      },
    });

    expect(keys).toEqual(["upd:13", "cb_fallback:inline:88:inline-42:confirm"]);
  });

  it("extracts callback fallback fingerprints for chat-bound callbacks", () => {
    const keys = extractUpdateDedupeKeys({
      update_id: 14,
      callback_query: {
        from: { id: 89 },
        data: "confirm",
        message: {
          message_id: 12,
          chat: { id: -10012345 },
        },
      },
    });

    expect(keys).toEqual(["upd:14", "cb_fallback:chat:89:-10012345:12:confirm"]);
  });

  it("extracts callback fallback fingerprints with user-only context", () => {
    const keys = extractUpdateDedupeKeys({
      update_id: 15,
      callback_query: {
        from: { id: 99 },
        data: "confirm",
      },
    });

    expect(keys).toEqual(["upd:15", "cb_fallback:user:99:confirm"]);
  });

  it("ignores unsupported update payloads", () => {
    const keys = extractUpdateDedupeKeys({
      update_id: 16,
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

  it("treats repeated update_id values as duplicates", () => {
    const dedupe = new UpdateDedupeCache({ ttlMs: 60_000, maxEntries: 100 });
    const first = {
      update_id: 400,
      message: {
        message_id: 10,
        chat: { id: 321 },
      },
    };
    const replayedWithDifferentPayload = {
      update_id: 400,
      message: {
        message_id: 11,
        chat: { id: 321 },
      },
    };

    expect(dedupe.isDuplicateUpdate(first, 4_000)).toBe(false);
    expect(dedupe.isDuplicateUpdate(replayedWithDifferentPayload, 4_001)).toBe(true);
  });

  it("does not dedupe updates that have only update_id and no supported payload", () => {
    const dedupe = new UpdateDedupeCache({ ttlMs: 60_000, maxEntries: 100 });
    const unsupported = { update_id: 500 };

    expect(dedupe.isDuplicateUpdate(unsupported, 5_000)).toBe(false);
    expect(dedupe.isDuplicateUpdate(unsupported, 5_001)).toBe(false);
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
