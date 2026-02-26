import { describe, expect, it } from "bun:test";
import { buildCronScheduledPrompt, SCHEDULED_PROMPT_INSTRUCTION } from "./cron-scheduled-prompt";

describe("buildCronScheduledPrompt", () => {
  it("appends instruction when prompt has no scheduled notice", () => {
    const input = "send a turtle check-in";
    const output = buildCronScheduledPrompt(input);

    expect(output).toBe(`${input}\n\n${SCHEDULED_PROMPT_INSTRUCTION}`);
  });

  it("does not append when prompt already includes scheduled notice", () => {
    const input = '🔔 Scheduled:\nSend a turtle and say nice work.';
    expect(buildCronScheduledPrompt(input)).toBe(input);
  });

  it("does not append when instruction is already present", () => {
    const input = `reminder\n\n${SCHEDULED_PROMPT_INSTRUCTION}`;
    expect(buildCronScheduledPrompt(input)).toBe(input);
  });
});
