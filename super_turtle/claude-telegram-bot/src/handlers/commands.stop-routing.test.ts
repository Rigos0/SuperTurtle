import { describe, expect, it } from "bun:test";
import { resolve } from "path";

type StopRoutingPayload = {
  codexStopCalls: number;
  claudeStopCalls: number;
};

type StopRoutingResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  payload: StopRoutingPayload | null;
};

const commandsPath = resolve(import.meta.dir, "commands.ts");
const sessionPath = resolve(import.meta.dir, "../session.ts");
const registryPath = resolve(import.meta.dir, "../drivers/registry.ts");
const marker = "__STOP_ROUTING_PROBE__=";

async function probeStopRouting(): Promise<StopRoutingResult> {
  const env: Record<string, string> = {
    ...process.env,
    TELEGRAM_BOT_TOKEN: "test-token",
    TELEGRAM_ALLOWED_USERS: "123",
    CLAUDE_WORKING_DIR: process.cwd(),
    CODEX_ENABLED: "true",
    HOME: process.env.HOME || "/tmp",
  };

  const script = `
    const marker = ${JSON.stringify(marker)};
    const commandsPath = ${JSON.stringify(commandsPath)};
    const sessionPath = ${JSON.stringify(sessionPath)};
    const registryPath = ${JSON.stringify(registryPath)};

    const { handleStop } = await import(commandsPath);
    const { session } = await import(sessionPath);
    const { getDriver } = await import(registryPath);

    const claudeDriver = getDriver("claude");
    const codexDriver = getDriver("codex");

    const originalClaudeStop = claudeDriver.stop;
    const originalCodexStop = codexDriver.stop;

    let claudeStopCalls = 0;
    let codexStopCalls = 0;

    claudeDriver.stop = async () => {
      claudeStopCalls += 1;
      return "stopped";
    };

    codexDriver.stop = async () => {
      codexStopCalls += 1;
      return "stopped";
    };

    const mkCtx = () => ({
      from: { id: 123, username: "tester", is_bot: false, first_name: "Tester" },
      chat: { id: 123, type: "private" },
      message: {
        text: "/stop",
        message_id: 1,
        date: Math.floor(Date.now() / 1000),
        chat: { id: 123, type: "private" },
      },
      reply: async () => {},
      api: {
        editMessageText: async () => {},
        deleteMessage: async () => {},
      },
    });

    try {
      session.activeDriver = "codex";
      session.stopTyping();
      session.clearStopRequested();
      const endClaudeProcessing = session.startProcessing();
      await handleStop(mkCtx());
      endClaudeProcessing();

      session.activeDriver = "claude";
      session.stopTyping();
      session.clearStopRequested();
      const endCodexProcessing = session.startProcessing();
      await handleStop(mkCtx());
      endCodexProcessing();

      const payload = { claudeStopCalls, codexStopCalls };
      console.log(marker + JSON.stringify(payload));
    } finally {
      claudeDriver.stop = originalClaudeStop;
      codexDriver.stop = originalCodexStop;
    }
  `;

  const proc = Bun.spawn({
    cmd: ["bun", "--no-env-file", "-e", script],
    env,
    stdout: "pipe",
    stderr: "pipe",
  });

  const [stdout, stderr, exitCode] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  const payloadLine = stdout
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith(marker));

  const payload = payloadLine
    ? (JSON.parse(payloadLine.slice(marker.length)) as StopRoutingPayload)
    : null;

  return { exitCode, stdout, stderr, payload };
}

describe("/stop routing", () => {
  it("stops whichever driver is active", async () => {
    const result = await probeStopRouting();
    if (result.exitCode !== 0) {
      throw new Error(`Stop routing probe failed:\n${result.stderr || result.stdout}`);
    }

    expect(result.payload).not.toBeNull();
    expect(result.payload?.codexStopCalls).toBe(1);
    expect(result.payload?.claudeStopCalls).toBe(1);
  });
});
