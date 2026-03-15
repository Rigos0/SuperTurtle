const assert = require("assert");
const {
  buildPocConfig,
  buildRemoteBootstrapCommand,
  buildRemoteEnv,
  buildRemoteStartCommand,
  buildStateRecord,
  buildWebhookUrl,
  buildHealthUrl,
  isMissingSandboxError,
  parseDotEnv,
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
    "/healthz"
  );
  assert.strictEqual(remoteEnv.CLAUDE_WORKING_DIR, "/home/user/project");
  assert.strictEqual(remoteEnv.SUPERTURTLE_RUNTIME_ROLE, "teleport-remote");
  assert.strictEqual(remoteEnv.TELEGRAM_TRANSPORT, "webhook");
  assert.strictEqual(remoteEnv.TELEGRAM_WEBHOOK_REGISTER, "false");
  assert.strictEqual(remoteEnv.TELEGRAM_WEBHOOK_URL, "https://sandbox.example/telegram/webhook/demo");
  assert.strictEqual(remoteEnv.TELEGRAM_WEBHOOK_SECRET, "secret-demo");
  assert.strictEqual(remoteEnv.PORT, "8787");
  assert.strictEqual(remoteEnv.TURTLE_GREETINGS, "false");

  const state = buildStateRecord("/Users/example/project", "sandbox_123", "host.example", {
    port: 8787,
    timeoutMs: 123000,
    remoteRoot: "/home/user/project",
    remoteBotDir: "/home/user/project/super_turtle/claude-telegram-bot",
    webhookPath: "/telegram/webhook/demo",
    webhookSecret: "secret-demo",
    healthPath: "/healthz",
    logPath: "/tmp/superturtle-e2b-bot.log",
    pidPath: "/tmp/superturtle-e2b-bot.pid",
    archivePath: "/tmp/superturtle-e2b-project.tgz",
  });
  assert.strictEqual(state.webhookUrl, "https://host.example/telegram/webhook/demo");
  assert.strictEqual(state.healthUrl, "https://host.example/healthz");
  assert.strictEqual(state.ownerMode, "local");

  assert.strictEqual(buildWebhookUrl("host.example", "/telegram/webhook/demo"), "https://host.example/telegram/webhook/demo");
  assert.strictEqual(buildHealthUrl("host.example", "healthz"), "https://host.example/healthz");

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
        "/healthz"
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
