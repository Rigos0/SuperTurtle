import { describe, expect, it } from "bun:test";
import { convertMarkdownToHtml } from "./formatting";

describe("convertMarkdownToHtml", () => {
  it("does not convert snake_case identifiers into broken italics", () => {
    const input = [
      "**MCP Tools (Telegram-specific):**",
      "• ✅ **bot_control** — session controls",
      "• ✅ **ask_user** — inline choices",
    ].join("\n");

    const html = convertMarkdownToHtml(input);

    expect(html).toContain("<b>bot_control</b>");
    expect(html).toContain("<b>ask_user</b>");
    expect(html).not.toContain("<b>bot<i>control</b>");
    expect(html).not.toContain("<b>ask</i>user</b>");
  });

  it("still supports explicit underscore italics", () => {
    const input = "This is _important_ and _very clear_.";
    const html = convertMarkdownToHtml(input);

    expect(html).toContain("<i>important</i>");
    expect(html).toContain("<i>very clear</i>");
  });
});
