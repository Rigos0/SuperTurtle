import { describe, expect, it } from "bun:test";
import { handleProcessingError } from "./media-group";

describe("handleProcessingError", () => {
  it("keeps inline keyboard messages during cleanup", async () => {
    const deleted: number[] = [];
    const replies: string[] = [];

    const ctx = {
      api: {
        deleteMessage: async (_chatId: number, messageId: number) => {
          deleted.push(messageId);
        },
      },
      reply: async (text: string) => {
        replies.push(text);
      },
    } as any;

    const toolMessages = [
      {
        chat: { id: 123 },
        message_id: 1,
      },
      {
        chat: { id: 123 },
        message_id: 2,
        reply_markup: {
          inline_keyboard: [[{ text: "Option A", callback_data: "askuser:1:0" }]],
        },
      },
    ] as any[];

    await handleProcessingError(ctx, new Error("boom"), toolMessages);

    expect(deleted).toEqual([1]);
    expect(replies.some((text) => text.includes("❌ Error:"))).toBeTrue();
  });
});
