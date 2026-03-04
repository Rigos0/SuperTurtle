/**
 * Bot instance — extracted to its own module to avoid circular imports.
 *
 * index.ts imports handlers → handlers import bot. If bot lived in index.ts,
 * that would be a circular dependency. This module breaks the cycle.
 */

import { Bot } from "grammy";
import { TELEGRAM_TOKEN } from "./config";

export const bot = new Bot(TELEGRAM_TOKEN);
