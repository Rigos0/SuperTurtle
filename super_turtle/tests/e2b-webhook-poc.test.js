const assert = require("assert");
const fs = require("fs");
const os = require("os");
const { join, resolve } = require("path");
const {
  buildLocalAuthBootstrap,
  buildPocConfig,
  buildRemoteAuthFinalizeCommand,
  buildRemoteBootstrapCommand,
  buildRemoteEnv,
  buildReadyUrl,
  buildRemoteStartCommand,
  buildStateRecord,
  buildWebhookUrl,
  buildHealthUrl,
  extractTokenFromCredentialPayload,
  hasLocalCodexAuth,
  isMissingSandboxError,
  parseDotEnv,
  serializeDotEnv,
} = require("../bin/e2b-webhook-poc-lib.js");

(() => {
  const parsed = parseDotEnv(`
# comment
TELEGRAM_BOT_TOKEN=123:abc
TELEGRAM_ALLOWED_USERS="12345"
CLAUDE_WORKING_DIR='/tmp/project'
`);
  assert.deepStrictEqual(parsed, {
    TELEGRAM_BOT_TOKEN: "123:abc",
    TELEGRAM_ALLOWED_USERS: "12345",
    CLAUDE_WORKING_DIR: "/tmp/project",
  });
  assert.strictEqual(
    extractTokenFromCredentialPayload('{"claudeAiOauth":{"accessToken":"token-123"}}'),
    "token-123"
  );

  const config = buildPocConfig("/Users/example/project", {
    port: "8787",
    timeoutMs: "123000",
    webhookPath: "telegram/webhook/demo",
  });
  assert.strictEqual(config.port, 8787);
  assert.strictEqual(config.timeoutMs, 123000);
  assert.strictEqual(config.webhookPath, "/telegram/webhook/demo");
  assert.strictEqual(config.remoteRoot, "/home/user/project");

  const remoteEnv = buildRemoteEnv(
    {
      TELEGRAM_BOT_TOKEN: "123:abc",
      TELEGRAM_ALLOWED_USERS: "12345",
      CLAUDE_WORKING_DIR: "/local/path",
      OPENAI_API_KEY: "sk-test",
    },
    "/home/user/project",
    "https://sandbox.example/telegram/webhook/demo",
    "secret-demo",
    8787,
    "/healthz",
    "/readyz",
    "agent",
    "codex",
    { claudeAccessToken: "claude-token-123" }
  );
  assert.strictEqual(remoteEnv.CLAUDE_WORKING_DIR, "/home/user/project");
  assert.strictEqual(remoteEnv.CLAUDE_CODE_OAUTH_TOKEN, "claude-token-123");
  assert.strictEqual(remoteEnv.SUPERTURTLE_RUNTIME_ROLE, "teleport-remote");
  assert.strictEqual(remoteEnv.SUPERTURTLE_REMOTE_MODE, "agent");
  assert.strictEqual(remoteEnv.SUPERTURTLE_REMOTE_DRIVER, "codex");
  assert.strictEqual(remoteEnv.TELEGRAM_TRANSPORT, "webhook");
  assert.strictEqual(remoteEnv.TELEGRAM_WEBHOOK_REGISTER, "false");
  assert.strictEqual(remoteEnv.TELEGRAM_WEBHOOK_URL, "https://sandbox.example/telegram/webhook/demo");
  assert.strictEqual(remoteEnv.TELEGRAM_WEBHOOK_SECRET, "secret-demo");
  assert.strictEqual(remoteEnv.TELEGRAM_WEBHOOK_READY_PATH, "/readyz");
  assert.strictEqual(remoteEnv.PORT, "8787");
  assert.strictEqual(remoteEnv.TURTLE_GREETINGS, "false");

  const state = buildStateRecord("/Users/example/project", "sandbox_123", "host.example", {
    port: 8787,
    timeoutMs: 123000,
    remoteMode: "agent",
    remoteDriver: "codex",
    remoteRoot: "/home/user/project",
    remoteBotDir: "/home/user/project/super_turtle/claude-telegram-bot",
    webhookPath: "/telegram/webhook/demo",
    webhookSecret: "secret-demo",
    healthPath: "/healthz",
    readyPath: "/readyz",
    logPath: "/tmp/superturtle-e2b-bot.log",
    pidPath: "/tmp/superturtle-e2b-bot.pid",
    archivePath: "/tmp/superturtle-e2b-project.tgz",
  });
  assert.strictEqual(state.webhookUrl, "https://host.example/telegram/webhook/demo");
  assert.strictEqual(state.healthUrl, "https://host.example/healthz");
  assert.strictEqual(state.readyUrl, "https://host.example/readyz");
  assert.strictEqual(state.ownerMode, "local");
  assert.strictEqual(state.remoteMode, "agent");
  assert.strictEqual(state.remoteDriver, "codex");

  assert.strictEqual(buildWebhookUrl("host.example", "/telegram/webhook/demo"), "https://host.example/telegram/webhook/demo");
  assert.strictEqual(buildHealthUrl("host.example", "healthz"), "https://host.example/healthz");
  assert.strictEqual(buildReadyUrl("host.example", "readyz"), "https://host.example/readyz");
  assert.deepStrictEqual(
    parseDotEnv(serializeDotEnv({
      TELEGRAM_BOT_TOKEN: "123:abc",
      CLAUDE_CODE_OAUTH_TOKEN: "token-with-specials:/+=",
      TELEGRAM_ALLOWED_USERS: "12345",
    })),
    {
      TELEGRAM_BOT_TOKEN: "123:abc",
      CLAUDE_CODE_OAUTH_TOKEN: "token-with-specials:/+=",
      TELEGRAM_ALLOWED_USERS: "12345",
    }
  );

  const bootstrapCommand = buildRemoteBootstrapCommand({
    remoteRoot: "/home/user/project",
    remoteBotDir: "/home/user/project/super_turtle/claude-telegram-bot",
    archivePath: "/tmp/project.tgz",
    logPath: "/tmp/superturtle-e2b-bot.log",
    pidPath: "/tmp/superturtle-e2b-bot.pid",
  });
  assert.match(bootstrapCommand, /curl -fsSL https:\/\/bun\.sh\/install/);
  assert.match(bootstrapCommand, /bun install --frozen-lockfile \|\| bun install/);
  assert.doesNotMatch(bootstrapCommand, /bun run src\/index\.ts/);

  const authFinalizeCommand = buildRemoteAuthFinalizeCommand({
    remoteRoot: "/home/user/project",
    remoteMode: "agent",
  });
  assert.match(authFinalizeCommand, /npm install -g --prefix "\$HOME\/\.local" @openai\/codex/);
  assert.match(authFinalizeCommand, /codex login status/);

  const startCommand = buildRemoteStartCommand({
    remoteRoot: "/home/user/project",
    remoteBotDir: "/home/user/project/super_turtle/claude-telegram-bot",
    archivePath: "/tmp/project.tgz",
    logPath: "/tmp/superturtle-e2b-bot.log",
    pidPath: "/tmp/superturtle-e2b-bot.pid",
  });
  assert.match(startCommand, /echo \$\$ > '\/tmp\/superturtle-e2b-bot\.pid'/);
  assert.match(startCommand, /exec bun run src\/index\.ts/);

  assert.throws(
    () =>
      buildRemoteEnv(
        { TELEGRAM_ALLOWED_USERS: "12345" },
        "/home/user/project",
        "https://sandbox.example/telegram/webhook/demo",
        "secret-demo",
        8787,
        "/healthz",
        "/readyz",
        "control",
        null
    ),
    /TELEGRAM_BOT_TOKEN/
  );

  assert.strictEqual(
    isMissingSandboxError(Object.assign(new Error("Paused sandbox abc not found"), { name: "NotFoundError" })),
    true
  );
  assert.strictEqual(
    isMissingSandboxError(new Error("some other failure")),
    false
  );
})();

(() => {
  const tmpHome = fs.mkdtempSync(resolve(os.tmpdir(), "superturtle-e2b-auth-test-"));
  const codexDir = join(tmpHome, ".codex");
  fs.mkdirSync(codexDir, { recursive: true });
  fs.writeFileSync(join(codexDir, "auth.json"), "{\"token\":\"demo\"}\n", "utf-8");

  const originalHome = process.env.HOME;
  const originalClaudeToken = process.env.CLAUDE_CODE_OAUTH_TOKEN;
  try {
    process.env.HOME = tmpHome;
    process.env.CLAUDE_CODE_OAUTH_TOKEN = "claude-env-token";

    const bootstrap = buildLocalAuthBootstrap({});
    assert.strictEqual(bootstrap.claudeAccessToken, "claude-env-token");
    assert.strictEqual(hasLocalCodexAuth(), true);
    assert.strictEqual(bootstrap.codexAuthSourcePath, join(tmpHome, ".codex", "auth.json"));
  } finally {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
    if (originalClaudeToken === undefined) {
      delete process.env.CLAUDE_CODE_OAUTH_TOKEN;
    } else {
      process.env.CLAUDE_CODE_OAUTH_TOKEN = originalClaudeToken;
    }
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
})();
