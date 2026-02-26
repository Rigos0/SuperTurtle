const SCHEDULED_NOTICE_PREFIX = "🔔 Scheduled:";

export const SCHEDULED_PROMPT_INSTRUCTION =
  '(This is a scheduled message. Start your response with "🔔 Scheduled:" on its own line before anything else.)';

export function buildCronScheduledPrompt(prompt: string): string {
  if (prompt.includes(SCHEDULED_NOTICE_PREFIX) || prompt.includes(SCHEDULED_PROMPT_INSTRUCTION)) {
    return prompt;
  }
  return `${prompt}\n\n${SCHEDULED_PROMPT_INSTRUCTION}`;
}
