/**
 * Session management for Codex using the official Codex TypeScript SDK.
 *
 * CodexSession class manages Codex sessions with thread persistence.
 * No streaming in Phase 1 (buffered responses only).
 */

import { Codex } from "@openai/codex-sdk";
import { readFileSync } from "fs";
import { OPENAI_API_KEY, WORKING_DIR, META_PROMPT } from "./config";
import type { TokenUsage } from "./types";

// Prefs file for Codex (separate from Claude)
const CODEX_PREFS_FILE = "/tmp/codex-telegram-prefs.json";

interface CodexPrefs {
  threadId?: string;
  createdAt?: string;
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

/**
 * Manages Codex sessions using the official Codex SDK.
 */
export class CodexSession {
  private codex: Codex;
  private thread: any = null; // Codex thread object
  private threadId: string | null = null;
  private systemPromptPrepended = false;
  lastActivity: Date | null = null;
  lastError: string | null = null;
  lastErrorTime: Date | null = null;
  lastMessage: string | null = null;

  constructor() {
    // Initialize Codex SDK with API key
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is required for Codex");
    }

    this.codex = new Codex({
      apiKey: OPENAI_API_KEY,
    });

    // Try to load saved threadId
    const prefs = loadCodexPrefs();
    if (prefs.threadId) {
      this.threadId = prefs.threadId;
      console.log(
        `Loaded saved Codex thread: ${this.threadId.slice(0, 8)}...`
      );
    }
  }

  /**
   * Start a new Codex thread.
   */
  async startNewThread(): Promise<void> {
    try {
      // Create new thread with working directory
      this.thread = await this.codex.startThread({
        workingDirectory: WORKING_DIR,
        skipGitRepoCheck: true, // Allow non-git directories
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
  async resumeThread(threadId: string): Promise<void> {
    try {
      this.thread = await this.codex.resumeThread(threadId);
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
   * Send a message to the current Codex thread.
   * Returns the final response text.
   *
   * On first message, prepends system prompt (META_SHARED.md content).
   */
  async sendMessage(userMessage: string): Promise<string> {
    if (!this.thread) {
      // Create thread if not already created
      await this.startNewThread();
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

      // Run the message through Codex (buffered, not streamed)
      const turn = await this.thread.run(messageToSend);

      // Extract response
      const response = turn.finalResponse || "";

      this.lastActivity = new Date();
      this.lastError = null;
      this.lastErrorTime = null;

      return response;
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
