import { describe, expect, it } from "bun:test";
import { resolve } from "path";

type ResumeLimitProbe = {
  claudeButtonCount: number;
  codexButtonCount: number;
  codexLiveMaxArg: number | null;
  claudeAllResumeCallbacks: boolean;
  codexAllResumeCallbacks: boolean;
};

function runResumeLimitProbe(): { exitCode: number; stdout: string; stderr: string; payload: ResumeLimitProbe | null } {
  const projectRoot = resolve(import.meta.dir, "../..");
  const marker = "__RESUME_LIMIT_PROBE__=";

  const script = `
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_ALLOWED_USERS = "123";
    process.env.CLAUDE_WORKING_DIR = process.cwd();
    process.env.CODEX_ENABLED = "true";
    process.env.CODEX_CLI_AVAILABLE_OVERRIDE = "true";
    console.log = () => {};
    console.warn = () => {};
    console.error = () => {};

    const { handleResume } = await import("./src/handlers/commands.ts");
    const { session } = await import("./src/session.ts");
    const { codexSession } = await import("./src/codex-session.ts");

    const mkSessions = (prefix) =>
      Array.from({ length: 9 }, (_, i) => ({
        session_id: prefix + "-session-" + i,
        saved_at: new Date(2026, 0, 1, 12, i, 0).toISOString(),
        working_dir: process.cwd(),
        title: prefix + " title " + i,
      }));

    const replies = [];
    const ctx = {
      from: { id: 123 },
      message: { text: "/resume" },
      reply: async (text, extra) => {
        replies.push({ text, extra });
      },
    };

    const claudeSessions = mkSessions("claude");
    const codexSessions = mkSessions("codex");
    let codexLiveMaxArg = null;

    session.activeDriver = "claude";
    session.getSessionList = () => claudeSessions;
    await handleResume(ctx);
    const claudeReply = replies.at(-1);
    const claudeButtons = claudeReply?.extra?.reply_markup?.inline_keyboard || [];
    const claudeCallbacks = claudeButtons.map((row) => row[0]?.callback_data || "");

    session.activeDriver = "codex";
    codexSession.getSessionListLive = async (maxSessions = 50) => {
      codexLiveMaxArg = maxSessions;
      return codexSessions;
    };
    codexSession.getSessionList = () => [];
    await handleResume(ctx);
    const codexReply = replies.at(-1);
    const codexButtons = codexReply?.extra?.reply_markup?.inline_keyboard || [];
    const codexCallbacks = codexButtons.map((row) => row[0]?.callback_data || "");

    const payload = {
      claudeButtonCount: claudeButtons.length,
      codexButtonCount: codexButtons.length,
      codexLiveMaxArg,
      claudeAllResumeCallbacks: claudeCallbacks.every((c) => String(c).startsWith("resume:")),
      codexAllResumeCallbacks: codexCallbacks.every((c) => String(c).startsWith("codex_resume:")),
    };

    process.stdout.write(${JSON.stringify(marker)} + JSON.stringify(payload));
  `;

  const proc = Bun.spawnSync(["bun", "--no-env-file", "-e", script], {
    cwd: projectRoot,
    env: {
      ...process.env,
      TELEGRAM_BOT_TOKEN: "test-token",
      TELEGRAM_ALLOWED_USERS: "123",
      CLAUDE_WORKING_DIR: projectRoot,
      CODEX_ENABLED: "true",
      CODEX_CLI_AVAILABLE_OVERRIDE: "true",
    },
  });

  const stdout = proc.stdout.toString();
  const stderr = proc.stderr.toString();
  const markerIndex = stdout.indexOf(marker);
  let payload: ResumeLimitProbe | null = null;
  if (markerIndex >= 0) {
    const tail = stdout.slice(markerIndex + marker.length);
    const start = tail.indexOf("{");
    if (start >= 0) {
      let depth = 0;
      let inString = false;
      let escaped = false;
      let end = -1;
      for (let i = start; i < tail.length; i += 1) {
        const ch = tail[i]!;
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (ch === "\\") {
            escaped = true;
          } else if (ch === "\"") {
            inString = false;
          }
          continue;
        }
        if (ch === "\"") {
          inString = true;
          continue;
        }
        if (ch === "{") {
          depth += 1;
          continue;
        }
        if (ch === "}") {
          depth -= 1;
          if (depth === 0) {
            end = i;
            break;
          }
        }
      }
      if (end >= start) {
        payload = JSON.parse(tail.slice(start, end + 1)) as ResumeLimitProbe;
      }
    }
  }
  return { exitCode: proc.exitCode, stdout, stderr, payload };
}

describe("/resume session list limits", () => {
  it("shows only the latest 5 sessions for both Claude and Codex", () => {
    const result = runResumeLimitProbe();
    if (result.exitCode !== 0) {
      throw new Error(`resume limit probe failed:\\n${result.stderr || result.stdout}`);
    }

    expect(result.payload).not.toBeNull();
    expect(result.payload?.claudeButtonCount).toBe(5);
    expect(result.payload?.codexButtonCount).toBe(5);
    expect(result.payload?.codexLiveMaxArg).toBe(5);
    expect(result.payload?.claudeAllResumeCallbacks).toBe(true);
    expect(result.payload?.codexAllResumeCallbacks).toBe(true);
  });
});
