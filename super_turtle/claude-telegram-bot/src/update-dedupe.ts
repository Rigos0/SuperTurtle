type ChatLike = {
  id?: number | string;
};

type MessageLike = {
  message_id?: number;
  chat?: ChatLike;
  from?: {
    id?: number;
  };
  date?: number;
  text?: string;
};

type CallbackQueryLike = {
  id?: string;
  from?: {
    id?: number;
  };
  data?: string;
  message?: MessageLike;
  inline_message_id?: string;
};

type UpdateLike = {
  update_id?: number;
  message?: MessageLike;
  callback_query?: CallbackQueryLike;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_ENTRIES = 10_000;

function toStableString(value: number | string | undefined): string {
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value;
  return "";
}

function getMessageFingerprint(message: MessageLike): string | null {
  const chatId = toStableString(message.chat?.id);
  const messageId = message.message_id;
  if (chatId && typeof messageId === "number") {
    return `msg:${chatId}:${messageId}`;
  }

  const fromId = message.from?.id;
  if (typeof fromId === "number" && typeof message.date === "number" && typeof message.text === "string") {
    return `msg_fallback:${fromId}:${message.date}:${message.text}`;
  }

  return null;
}

function getCallbackFingerprint(callback: CallbackQueryLike): string | null {
  if (typeof callback.id === "string" && callback.id.length > 0) {
    return `cb:${callback.id}`;
  }

  const fromId = callback.from?.id;
  const data = callback.data;
  if (typeof fromId !== "number" || typeof data !== "string") {
    return null;
  }

  if (typeof callback.inline_message_id === "string" && callback.inline_message_id.length > 0) {
    return `cb_fallback:inline:${fromId}:${callback.inline_message_id}:${data}`;
  }

  const msg = callback.message;
  const chatId = toStableString(msg?.chat?.id);
  const messageId = msg?.message_id;
  if (chatId && typeof messageId === "number") {
    return `cb_fallback:chat:${fromId}:${chatId}:${messageId}:${data}`;
  }

  return `cb_fallback:user:${fromId}:${data}`;
}

export function extractUpdateDedupeKeys(update: UpdateLike): string[] {
  const keys: string[] = [];
  const messageFingerprint = update.message ? getMessageFingerprint(update.message) : null;
  const callbackFingerprint = update.callback_query ? getCallbackFingerprint(update.callback_query) : null;
  const hasSupportedPayload = Boolean(messageFingerprint || callbackFingerprint);

  if (!hasSupportedPayload) {
    return keys;
  }

  if (typeof update.update_id === "number") {
    keys.push(`upd:${update.update_id}`);
  }
  if (messageFingerprint) {
    keys.push(messageFingerprint);
  }
  if (callbackFingerprint) {
    keys.push(callbackFingerprint);
  }
  return keys;
}

export class UpdateDedupeCache {
  private readonly ttlMs: number;
  private readonly maxEntries: number;
  private readonly seenUntilByKey = new Map<string, number>();

  constructor(opts?: { ttlMs?: number; maxEntries?: number }) {
    this.ttlMs = opts?.ttlMs ?? DEFAULT_TTL_MS;
    this.maxEntries = opts?.maxEntries ?? DEFAULT_MAX_ENTRIES;
  }

  isDuplicateUpdate(update: UpdateLike, nowMs = Date.now()): boolean {
    this.prune(nowMs);
    const keys = extractUpdateDedupeKeys(update);
    if (keys.length === 0) {
      return false;
    }

    const duplicate = keys.some((key) => {
      const expiresAt = this.seenUntilByKey.get(key);
      return typeof expiresAt === "number" && expiresAt > nowMs;
    });

    const expiresAt = nowMs + this.ttlMs;
    for (const key of keys) {
      this.seenUntilByKey.delete(key);
      this.seenUntilByKey.set(key, expiresAt);
    }
    this.enforceMaxEntries();

    return duplicate;
  }

  getTrackedKeyCount(): number {
    return this.seenUntilByKey.size;
  }

  private prune(nowMs: number): void {
    for (const [key, expiresAt] of this.seenUntilByKey) {
      if (expiresAt <= nowMs) {
        this.seenUntilByKey.delete(key);
      }
    }
    this.enforceMaxEntries();
  }

  private enforceMaxEntries(): void {
    while (this.seenUntilByKey.size > this.maxEntries) {
      const oldest = this.seenUntilByKey.keys().next().value;
      if (!oldest) break;
      this.seenUntilByKey.delete(oldest);
    }
  }
}
