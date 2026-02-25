/**
 * Session management for Codex using the official Codex TypeScript SDK.
 *
 * CodexSession class manages Codex sessions with thread persistence.
 * Supports streaming responses with ThreadEvent processing.
 */

import { readFileSync } from "fs";
import { WORKING_DIR, META_PROMPT } from "./config";
import type { StatusCallback } from "./types";

// Prefs file for Codex (separate from Claude)
const CODEX_PREFS_FILE = "/tmp/codex-telegram-prefs.json";

interface CodexPrefs {
  threadId?: string;
  createdAt?: string;
  model?: string;
  reasoningEffort?: string;
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
 * Manages Codex sessions using the official Codex SDK.
 */
export class CodexSession {
  private codex: CodexClient | null = null;
  private thread: CodexThread | null = null;
  private threadId: string | null = null;
  private systemPromptPrepended = false;
  lastActivity: Date | null = null;
  lastError: string | null = null;
  lastErrorTime: Date | null = null;
  lastMessage: string | null = null;

  constructor() {
    // Try to load saved threadId
    const prefs = loadCodexPrefs();
    if (prefs.threadId) {
      this.threadId = prefs.threadId;
      console.log(
        `Loaded saved Codex thread: ${this.threadId.slice(0, 8)}...`
      );
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
      this.codex = new CodexImpl();
    } catch (error) {
      throw new Error(formatCodexInitError(error));
    }
  }

  /**
   * Start a new Codex thread.
   */
  async startNewThread(model?: string, reasoningEffort?: string): Promise<void> {
    await this.ensureInitialized();

    try {
      if (!this.codex) {
        throw new Error("Codex SDK client not initialized");
      }

      // Create new thread with working directory and model settings
      this.thread = await this.codex.startThread({
        workingDirectory: WORKING_DIR,
        skipGitRepoCheck: true,
        ...(model && { model }),
        ...(reasoningEffort && { modelReasoningEffort: reasoningEffort }),
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
  async resumeThread(threadId: string, model?: string, reasoningEffort?: string): Promise<void> {
    await this.ensureInitialized();

    try {
      if (!this.codex) {
        throw new Error("Codex SDK client not initialized");
      }

      this.thread = await this.codex.resumeThread(threadId, {
        ...(model && { model }),
        ...(reasoningEffort && { modelReasoningEffort: reasoningEffort }),
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
    reasoningEffort?: string
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
              console.log(`TOOL: ${toolName}`);
              // Don't show status for MCP tools - they handle their own output
              if (
                !toolName.startsWith("mcp__ask-user") &&
                !toolName.startsWith("mcp__send-turtle") &&
                !toolName.startsWith("mcp__bot-control")
              ) {
                await statusCallback("tool", toolName);
              }
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

        // Handle turn completed
        if (event.type === "turn_completed" && event.usage) {
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

      return responseParts.join("") || "No response from Codex.";
    } catch (error) {
      console.error("Error sending message to Codex:", error);
      this.lastError = String(error).slice(0, 100);
      this.lastErrorTime = new Date();
      throw error;
    }
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
