/**
 * /model command handler — switch model and effort level.
 */

import type { Context } from "grammy";
import { session, getAvailableModels, EFFORT_DISPLAY, type EffortLevel } from "../../session";
import { codexSession } from "../../codex-session";
import { ALLOWED_USERS, CODEX_AVAILABLE } from "../../config";
import { isAuthorized } from "../../security";
import { getCodexUnavailableMessage } from "./shared";

/**
 * /model - Show current model and let user switch model/effort.
 * Routes to Claude or Codex model selection based on activeDriver.
 */
export async function handleModel(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  if (session.activeDriver === "codex" && !CODEX_AVAILABLE) {
    session.activeDriver = "claude";
    await ctx.reply(`${getCodexUnavailableMessage()}\nUsing Claude model controls.`);
  }

  // Route based on active driver
  if (session.activeDriver === "codex") {
    return handleCodexModel(ctx);
  }

  // Claude model selection
  const models = getAvailableModels();
  const currentModel = models.find((m) => m.value === session.model);
  const currentEffort = EFFORT_DISPLAY[session.effort];

  // Model buttons — one per row
  const modelButtons = models.map((m) => [{
    text: `${m.value === session.model ? "✔ " : ""}${m.displayName}`,
    callback_data: `model:${m.value}`,
  }]);

  // Effort buttons — Haiku doesn't support effort
  const isHaiku = session.model.includes("haiku");
  const effortButtons = isHaiku
    ? []
    : [(Object.entries(EFFORT_DISPLAY) as [EffortLevel, string][]).map(
        ([level, label]) => ({
          text: `${level === session.effort ? "✔ " : ""}${label}`,
          callback_data: `effort:${level}`,
        })
      )];

  const modelName = currentModel?.displayName || session.model;
  const modelDesc = currentModel?.description ? ` — ${currentModel.description}` : "";

  await ctx.reply(
    `<b>Model:</b> ${modelName}${modelDesc}\n` +
      `<b>Effort:</b> ${currentEffort}\n\n` +
      `Select model or effort level:`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [...modelButtons, ...effortButtons],
      },
    }
  );
}

/**
 * Codex model selection (for /model when on Codex driver).
 */
async function handleCodexModel(ctx: Context): Promise<void> {
  if (!CODEX_AVAILABLE) {
    await ctx.reply(getCodexUnavailableMessage());
    return;
  }

  const { getAvailableCodexModelsLive } = await import("../../codex-session");

  const models = await getAvailableCodexModelsLive();
  const currentModel = models.find((m) => m.value === codexSession.model);
  const currentEffort = codexSession.reasoningEffort;

  // Model buttons — one per row
  const modelButtons = models.map((m) => [{
    text: `${m.value === codexSession.model ? "✔ " : ""}${m.displayName}`,
    callback_data: `codex_model:${m.value}`,
  }]);

  // Reasoning effort buttons for Codex
  const effortLevels: Array<[string, string]> = [
    ["minimal", "Minimal"],
    ["low", "Low"],
    ["medium", "Medium (default)"],
    ["high", "High"],
    ["xhigh", "X-High (deepest)"],
  ];

  const effortButtons = [effortLevels.map(([level, label]) => ({
    text: `${level === currentEffort ? "✔ " : ""}${label}`,
    callback_data: `codex_effort:${level}`,
  }))];

  const modelName = currentModel?.displayName || codexSession.model;
  const modelDesc = currentModel?.description ? ` — ${currentModel.description}` : "";

  await ctx.reply(
    `<b>Codex Model:</b> ${modelName}${modelDesc}\n` +
      `<b>Reasoning Effort:</b> ${currentEffort}\n\n` +
      `Select model or reasoning effort:`,
    {
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [...modelButtons, ...effortButtons],
      },
    }
  );
}
