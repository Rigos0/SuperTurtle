/**
 * Barrel re-export for all command handlers and shared utilities.
 *
 * Consumers can import from "./commands" (this directory) just as they
 * previously imported from the monolithic "./commands.ts" file.
 */

// ── Shared utilities ──
export {
  getCommandLines,
  getCodexUnavailableMessage,
  formatModelInfo,
  getSettingsOverviewLines,
  buildSessionOverviewLines,
  truncateText,
  chunkText,
  chunkLines,
} from "./shared";

// ── State parsing (Claude backlog / status) ──
export {
  type ClaudeStateSummary,
  type ClaudeBacklogItem,
  parseClaudeBacklogItems,
  parseClaudeStateSummary,
  readClaudeStateSummary,
  readClaudeBacklogItems,
  formatBacklogSummary,
} from "./state";

// ── SubTurtle utilities ──
export {
  type ListedSubTurtle,
  parseCtlListOutput,
  getSubTurtleElapsed,
  handleSubturtle,
} from "./subturtle";

// ── Usage utilities ──
export {
  getUsageLines,
  getCodexQuotaLines,
  formatUnifiedUsage,
  handleUsage,
} from "./usage";

// ── Loop logs ──
export { MAIN_LOOP_LOG_PATH, readMainLoopLogTail, handleLooplogs } from "./looplogs";

// ── Context ──
export { handleContext } from "./context";

// ── Command handlers ──
export { handleNew, resetAllDriverSessions } from "./new";
export { handleStatus } from "./status";
export { handleModel } from "./model";
export { handleSwitch } from "./switch";
export { handleResume } from "./resume";
export { handleRestart } from "./restart";
export { handleDebug } from "./debug";
export { handleCron } from "./cron";
