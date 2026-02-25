/**
 * Session management for Codex using the official Codex TypeScript SDK.
 *
 * CodexSession class manages Codex sessions with thread persistence.
 * Supports streaming responses with ThreadEvent processing.
 */

import { readFileSync } from "fs";
import { WORKING_DIR, META_PROMPT, MCP_SERVERS } from "./config";
import type { StatusCallback, McpServerConfig, SavedSession, SessionHistory } from "./types";

// Prefs file for Codex (separate from Claude)
const CODEX_PREFS_FILE = "/tmp/codex-telegram-prefs.json";
const CODEX_SESSION_FILE = "/tmp/codex-telegram-session.json";
const MAX_CODEX_SESSIONS = 5;

interface CodexPrefs {
  threadId?: string;
  createdAt?: string;
  model?: string;
  reasoningEffort?: CodexEffortLevel;
}

function loadCodexPrefs(): CodexPrefs {
  try {
    const text = readFileSync(CODEX_PREFS_FILE, "utf-8");
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function saveCodexPrefs(prefs: CodexPrefs): void {
  try {
    Bun.write(CODEX_PREFS_FILE, JSON.stringify(prefs, null, 2));
  } catch (error) {
    console.warn("Failed to save Codex preferences:", error);
  }
}

// Codex SDK types (from @openai/codex-sdk)
type ThreadEvent =
  | { type: "thread_started"; thread_id: string }
  | { type: "turn_started" }
  | { type: "turn_completed"; usage?: { input_tokens: number; output_tokens: number } }
  | { type: "turn_failed"; error: string }
  | { type: "item_started"; item_type: string }
  | { type: "item_updated"; item: Record<string, unknown> }
  | { type: "item_completed"; item: Record<string, unknown> }
  | { type: "thread_error"; error: string };

type StreamedTurn = {
  events: AsyncGenerator<ThreadEvent>;
};

type CodexTurn = {
  items?: Array<Record<string, unknown>>;
  finalResponse?: string;
  usage?: { input_tokens: number; output_tokens: number };
};

type CodexThread = {
  id: string | null;
  run(message: string): Promise<CodexTurn>;
  runStreamed(message: string, options?: { signal?: AbortSignal }): Promise<StreamedTurn>;
};

type CodexClient = {
  startThread(options?: {
    workingDirectory?: string;
    skipGitRepoCheck?: boolean;
    model?: string;
    modelReasoningEffort?: string;
  }): Promise<CodexThread>;
  resumeThread(threadId: string, options?: {
    model?: string;
    modelReasoningEffort?: string;
  }): Promise<CodexThread>;
};

type CodexCtor = new (options?: Record<string, unknown>) => CodexClient;

function formatCodexInitError(error: unknown): string {
  const message = String(error);
  if (
    message.includes("Cannot find module") ||
    message.includes("module not found")
  ) {
    return "Codex SDK is unavailable. Run `bun install` in super_turtle/claude-telegram-bot.";
  }
  return `Failed to initialize Codex SDK: ${message.slice(0, 160)}`;
}

/**
 * Check if MCP servers are already configured in ~/.codex/config.toml.
 * Returns true if any of our 3 servers are found.
 */
async function hasExistingMcpConfig(): Promise<boolean> {
  try {
    const homeDir = process.env.HOME || "";
    const configPath = `${homeDir}/.codex/config.toml`;
    const file = Bun.file(configPath);
    if (!(await file.exists())) {
      return false;
    }

    const content = await file.text();
    // Check for any of our MCP server names in the config
    const ourServers = ["send-turtle", "bot-control", "ask-user"];
    return ourServers.some((server) => content.includes(server));
  } catch {
    return false;
  }
}

/**
 * Convert MCP server config to Codex SDK format.
 * Codex config expects: { mcp_servers: { name: { command: ..., args: ... } } }
 */
function buildCodexMcpConfig(): Record<string, unknown> {
  const mcpServers: Record<string, Record<string, unknown>> = {};

  for (const [name, config] of Object.entries(MCP_SERVERS)) {
    if ("command" in config && "args" in config) {
      mcpServers[name] = {
        command: config.command,
        ...(config.args && { args: config.args }),
        ...(config.env && { env: config.env }),
      };
    }
  }

  return { mcp_servers: mcpServers };
}

/**
 * Determine Codex reasoning effort based on message keywords.
 * Maps thinking keywords to modelReasoningEffort levels.
 */
function mapThinkingToReasoningEffort(message: string): CodexEffortLevel {
  const msgLower = message.toLowerCase();

  // Check for "ultrathink" or "think hard" — deepest reasoning
  if (msgLower.includes("ultrathink") || msgLower.includes("think hard")) {
    return "xhigh";
  }

  // Check for "pensa bene" (Italian) — deep reasoning
  if (msgLower.includes("pensa bene")) {
    return "high";
  }

  // Check for "think" or "pensa" or "ragiona" — normal reasoning
  if (msgLower.includes("think") || msgLower.includes("pensa") || msgLower.includes("ragiona")) {
    return "high";
  }

  // Default — medium effort
  return "medium";
}

// Codex models available (as of Feb 2026)
export type CodexEffortLevel = "minimal" | "low" | "medium" | "high" | "xhigh";

export interface CodexModelInfo {
  value: string;
  displayName: string;
  description: string;
}

const AVAILABLE_CODEX_MODELS: CodexModelInfo[] = [
  { value: "gpt-5.3-codex", displayName: "GPT-5.3 Codex", description: "Most capable (recommended)" },
  { value: "gpt-5.3-codex-spark", displayName: "GPT-5.3 Codex Spark", description: "Fast, real-time (Pro)" },
  { value: "gpt-5.2-codex", displayName: "GPT-5.2 Codex", description: "Previous generation" },
];

export function getAvailableCodexModels(): CodexModelInfo[] {
  return AVAILABLE_CODEX_MODELS;
}

/**
 * Manages Codex sessions using the official Codex SDK.
 */
export class CodexSession {
  private codex: CodexClient | null = null;
  private thread: CodexThread | null = null;
  private threadId: string | null = null;
  private systemPromptPrepended = false;
  private _model: string;
  private _reasoningEffort: CodexEffortLevel;
  lastActivity: Date | null = null;
  lastError: string | null = null;
  lastErrorTime: Date | null = null;
  lastMessage: string | null = null;
  lastUsage: { input_tokens: number; output_tokens: number } | null = null;

  get model(): string { return this._model; }
  set model(value: string) {
    this._model = value;
    saveCodexPrefs({
      threadId: this.threadId || undefined,
      model: this._model,
      reasoningEffort: this._reasoningEffort,
      createdAt: new Date().toISOString(),
    });
  }

  get reasoningEffort(): CodexEffortLevel { return this._reasoningEffort; }
  set reasoningEffort(value: CodexEffortLevel) {
    this._reasoningEffort = value;
    saveCodexPrefs({
      threadId: this.threadId || undefined,
      model: this._model,
      reasoningEffort: this._reasoningEffort,
      createdAt: new Date().toISOString(),
    });
  }

  constructor() {
    // Load preferences
    const prefs = loadCodexPrefs();
    this._model = prefs.model || "gpt-5.3-codex";
    this._reasoningEffort = (prefs.reasoningEffort as CodexEffortLevel) || "medium";

    if (prefs.threadId) {
      this.threadId = prefs.threadId;
      console.log(
        `Loaded saved Codex thread: ${this.threadId.slice(0, 8)}...`
      );
    }

    if (prefs.model || prefs.reasoningEffort) {
      console.log(`Codex preferences: model=${this._model}, reasoningEffort=${this._reasoningEffort}`);
    }
  }

  private async ensureInitialized(): Promise<void> {
    if (this.codex) {
      return;
    }

    try {
      const module = (await import("@openai/codex-sdk")) as unknown as {
        Codex?: CodexCtor;
      };
      const CodexImpl = module.Codex;
      if (!CodexImpl) {
        throw new Error("Codex export not found in @openai/codex-sdk");
      }

      // Check if MCP servers are already configured in ~/.codex/config.toml
      const hasExisting = await hasExistingMcpConfig();
      if (hasExisting) {
        console.log("MCP servers found in ~/.codex/config.toml, using existing config");
        this.codex = new CodexImpl();
      } else {
        // Pass MCP config programmatically if not already configured
        console.log("Passing MCP servers via Codex constructor");
        const mcpConfig = buildCodexMcpConfig();
        this.codex = new CodexImpl({ config: mcpConfig });
      }
    } catch (error) {
      throw new Error(formatCodexInitError(error));
    }
  }

  /**
   * Start a new Codex thread.
   */
  async startNewThread(model?: string, reasoningEffort?: CodexEffortLevel): Promise<void> {
    await this.ensureInitialized();

    try {
      if (!this.codex) {
        throw new Error("Codex SDK client not initialized");
      }

      // Use provided model/effort or instance defaults
      const threadModel = model || this._model;
      const threadEffort = reasoningEffort || this._reasoningEffort;

      // Create new thread with working directory and model settings
      this.thread = await this.codex.startThread({
        workingDirectory: WORKING_DIR,
        skipGitRepoCheck: true,
        model: threadModel,
        modelReasoningEffort: threadEffort,
      });

      // Capture thread ID
      if (!this.thread) {
        throw new Error("Failed to create Codex thread");
      }

      this.threadId = this.thread.id;
      this.systemPromptPrepended = false; // Reset flag for new thread

      console.log(`Started new Codex thread: ${this.threadId?.slice(0, 8)}...`);

      // Save thread ID for persistence
      saveCodexPrefs({
        threadId: this.threadId || undefined,
        createdAt: new Date().toISOString(),
        model,
        reasoningEffort,
      });
    } catch (error) {
      console.error("Error starting Codex thread:", error);
      this.lastError = String(error).slice(0, 100);
      this.lastErrorTime = new Date();
      throw error;
    }
  }

  /**
   * Resume a saved Codex thread by ID.
   */
  async resumeThread(threadId: string, model?: string, reasoningEffort?: CodexEffortLevel): Promise<void> {
    await this.ensureInitialized();

    try {
      if (!this.codex) {
        throw new Error("Codex SDK client not initialized");
      }

      // Use provided model/effort or instance defaults
      const threadModel = model || this._model;
      const threadEffort = reasoningEffort || this._reasoningEffort;

      this.thread = await this.codex.resumeThread(threadId, {
        model: threadModel,
        modelReasoningEffort: threadEffort,
      });
      this.threadId = threadId;
      this.systemPromptPrepended = true; // Already sent in original thread

      console.log(`Resumed Codex thread: ${threadId.slice(0, 8)}...`);
    } catch (error) {
      console.error("Error resuming Codex thread:", error);
      this.lastError = String(error).slice(0, 100);
      this.lastErrorTime = new Date();
      throw error;
    }
  }

  /**
   * Send a message to the current Codex thread with streaming support.
   * Returns the final response text.
   *
   * On first message, prepends system prompt (META_SHARED.md content).
   * Uses thread.runStreamed() to process events in real-time via statusCallback.
   */
  async sendMessage(
    userMessage: string,
    statusCallback?: StatusCallback,
    model?: string,
    reasoningEffort?: CodexEffortLevel
  ): Promise<string> {
    if (!this.thread) {
      // Create thread if not already created
      await this.startNewThread(model, reasoningEffort);
      if (!this.thread) {
        throw new Error("Failed to create Codex thread");
      }
    }

    // Store for debugging
    this.lastMessage = userMessage;

    try {
      // Prepend system prompt to first message
      let messageToSend = userMessage;
      if (!this.systemPromptPrepended && META_PROMPT) {
        messageToSend = `<system-instructions>
${META_PROMPT}
</system-instructions>

${userMessage}`;
        this.systemPromptPrepended = true;
      }

      // Run with streaming
      const streamedTurn = await this.thread.runStreamed(messageToSend);

      // Process the event stream
      const responseParts: string[] = [];
      let currentSegmentId = 0;
      let currentSegmentText = "";
      let lastTextUpdate = 0;

      for await (const event of streamedTurn.events) {
        // Handle different event types
        if (event.type === "item_completed" && event.item) {
          const item = event.item as Record<string, unknown>;
          const itemType = item.type as string;

          // AgentMessageItem - text response
          if (itemType === "agent_message") {
            const message = item.message as Record<string, unknown>;
            const content = message.content as Array<Record<string, unknown>>;

            if (Array.isArray(content)) {
              for (const block of content) {
                if (block.type === "text") {
                  const text = String(block.text || "");
                  responseParts.push(text);
                  currentSegmentText += text;

                  // Stream text updates (throttled)
                  const now = Date.now();
                  if (now - lastTextUpdate > 500 && currentSegmentText.length > 20) {
                    if (statusCallback) {
                      await statusCallback("text", currentSegmentText, currentSegmentId);
                    }
                    lastTextUpdate = now;
                  }
                }
              }
            }
          }

          // ReasoningItem - thinking block
          if (itemType === "reasoning") {
            const thinking = String(item.reasoning || "");
            if (thinking && statusCallback) {
              console.log(`THINKING: ${thinking.slice(0, 100)}...`);
              await statusCallback("thinking", thinking);
            }
          }

          // McpToolCallItem - MCP tool call
          if (itemType === "mcp_tool_call") {
            const toolName = String(item.name || "");
            if (statusCallback) {
              console.log(`MCP TOOL: ${toolName}`);
              // MCP tools (ask-user, send-turtle, bot-control) are handled by their servers
              // We just log them here - actual Telegram interaction is handled by the servers
              // and then detected by handlers/streaming.ts functions
            }
          }

          // CommandExecutionItem - bash command execution
          if (itemType === "command_execution") {
            const command = String(item.command || "").slice(0, 100);
            if (statusCallback) {
              console.log(`COMMAND: ${command}`);
              await statusCallback("tool", `Bash: ${command}`);
            }
          }

          // FileChangeItem - file modifications
          if (itemType === "file_change") {
            const path = String(item.path || "");
            if (statusCallback && path) {
              console.log(`FILE: ${path}`);
              await statusCallback("tool", `File: ${path}`);
            }
          }

          // WebSearchItem - web search
          if (itemType === "web_search") {
            const query = String(item.query || "");
            if (statusCallback && query) {
              console.log(`SEARCH: ${query}`);
              await statusCallback("tool", `Search: ${query}`);
            }
          }

          // ErrorItem - error occurred
          if (itemType === "error") {
            const error = String(item.error || "Unknown error");
            if (statusCallback) {
              console.log(`ERROR: ${error}`);
              await statusCallback("tool", `Error: ${error}`);
            }
          }

          // TodoListItem - todo list (internal tracking, minimal display)
          if (itemType === "todo_list") {
            const todos = item.todos as Array<Record<string, unknown>> | undefined;
            const count = todos?.length || 0;
            if (statusCallback && count > 0) {
              console.log(`TODO LIST: ${count} items`);
              // Show minimal status - let Claude's text explain the todos
              await statusCallback("tool", `Todo: ${count} item${count > 1 ? "s" : ""}`);
            }
          }
        }

        // Handle turn completed - capture token usage
        if (event.type === "turn_completed" && event.usage) {
          this.lastUsage = event.usage;
          console.log(
            `Codex usage: in=${event.usage.input_tokens} out=${event.usage.output_tokens}`
          );
        }

        // Handle errors
        if (event.type === "turn_failed" || event.type === "thread_error") {
          const errorMsg = (event as any).error || "Unknown error";
          throw new Error(`Codex event error: ${errorMsg}`);
        }
      }

      // Emit final segment
      if (currentSegmentText && statusCallback) {
        await statusCallback("segment_end", currentSegmentText, currentSegmentId);
      }

      if (statusCallback) {
        await statusCallback("done", "");
      }

      this.lastActivity = new Date();
      this.lastError = null;
      this.lastErrorTime = null;

      // Save session for resumption later
      const title = userMessage.length > 50 ? userMessage.slice(0, 47) + "..." : userMessage;
      this.saveSession(title);

      return responseParts.join("") || "No response from Codex.";
    } catch (error) {
      console.error("Error sending message to Codex:", error);
      this.lastError = String(error).slice(0, 100);
      this.lastErrorTime = new Date();
      throw error;
    }
  }

  /**
   * Save current thread to multi-session history.
   */
  saveSession(title?: string): void {
    if (!this.threadId) return;

    try {
      // Load existing session history
      const history = this.loadSessionHistory();

      // Create new session entry
      const newSession: SavedSession = {
        session_id: this.threadId,
        saved_at: new Date().toISOString(),
        working_dir: WORKING_DIR,
        title: title || "Codex session",
      };

      // Remove any existing entry with same session_id (update in place)
      const existingIndex = history.sessions.findIndex(
        (s) => s.session_id === this.threadId
      );
      if (existingIndex !== -1) {
        history.sessions[existingIndex] = newSession;
      } else {
        // Add new session at the beginning
        history.sessions.unshift(newSession);
      }

      // Keep only the last MAX_CODEX_SESSIONS
      history.sessions = history.sessions.slice(0, MAX_CODEX_SESSIONS);

      // Save
      Bun.write(CODEX_SESSION_FILE, JSON.stringify(history, null, 2));
      console.log(`Codex session saved: ${this.threadId!.slice(0, 8)}...`);
    } catch (error) {
      console.warn(`Failed to save Codex session: ${error}`);
    }
  }

  /**
   * Load session history from disk.
   */
  private loadSessionHistory(): SessionHistory {
    try {
      const file = Bun.file(CODEX_SESSION_FILE);
      if (!file.size) {
        return { sessions: [] };
      }

      const text = readFileSync(CODEX_SESSION_FILE, "utf-8");
      return JSON.parse(text) as SessionHistory;
    } catch {
      return { sessions: [] };
    }
  }

  /**
   * Get list of saved Codex sessions for display.
   */
  getSessionList(): SavedSession[] {
    const history = this.loadSessionHistory();
    // Filter to only sessions for current working directory
    return history.sessions.filter(
      (s) => !s.working_dir || s.working_dir === WORKING_DIR
    );
  }

  /**
   * Resume a specific session by ID.
   */
  async resumeSession(sessionId: string): Promise<[success: boolean, message: string]> {
    const history = this.loadSessionHistory();
    const sessionData = history.sessions.find((s) => s.session_id === sessionId);

    if (!sessionData) {
      return [false, "Codex session not found"];
    }

    if (sessionData.working_dir && sessionData.working_dir !== WORKING_DIR) {
      return [
        false,
        `Codex session for different directory: ${sessionData.working_dir}`,
      ];
    }

    try {
      await this.resumeThread(sessionId);
      console.log(
        `Resumed Codex session ${sessionData.session_id.slice(0, 8)}... - "${sessionData.title}"`
      );
      return [true, `Resumed Codex session: "${sessionData.title}"`];
    } catch (error) {
      return [false, `Failed to resume session: ${String(error).slice(0, 100)}`];
    }
  }

  /**
   * Resume the most recent persisted session.
   */
  async resumeLast(): Promise<[success: boolean, message: string]> {
    const sessions = this.getSessionList();
    if (sessions.length === 0) {
      return [false, "No saved Codex sessions"];
    }

    return this.resumeSession(sessions[0]!.session_id);
  }

  /**
   * Kill the session (clear thread).
   */
  async kill(): Promise<void> {
    this.thread = null;
    this.threadId = null;
    this.systemPromptPrepended = false;

    // Clear saved prefs
    saveCodexPrefs({});

    console.log("Codex session cleared");
  }

  /**
   * Get current thread ID.
   */
  getThreadId(): string | null {
    return this.threadId;
  }

  /**
   * Check if a thread is active.
   */
  get isActive(): boolean {
    return this.thread !== null && this.threadId !== null;
  }
}

// Global Codex session instance
export const codexSession = new CodexSession();

// Export functions for external use
export { mapThinkingToReasoningEffort };
