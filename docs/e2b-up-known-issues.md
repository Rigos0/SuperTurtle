# E2B `remote.sh up` known issues

Date reproduced: 2026-02-27  
Environment: macOS, `e2b` CLI `2.4.2`

## Summary

`bash super_turtle/e2b/remote.sh up` currently fails in non-interactive automation because sandbox creation depends on an interactive CLI path (`e2b sandbox create`) that is not script-safe. The flow can report a sandbox ID, then immediately fail to reuse that ID for sync/start.

## Reproduced failures

### 1) Non-interactive `sandbox create` crashes (`setRawMode`)

Command:

```bash
printf 'exit\n' | e2b sandbox create base
```

Observed:

- CLI prints a sandbox ID and disconnect notice.
- Then exits non-zero with:

```text
TypeError: process.stdin.setRawMode is not a function
```

### 2) Pseudo-TTY fallback still yields an unusable sandbox ID

Command (matches `up.sh` fallback strategy):

```bash
printf 'exit\n' | script -q /dev/null e2b sandbox create base
```

Observed:

- CLI exits `0` and prints a sandbox ID.
- Immediate reuse fails:

```bash
printf 'exit\n' | e2b sandbox connect <sandbox-id>
```

with:

```text
ai [NotFoundError]: Paused sandbox <sandbox-id> not found
```

### 3) Full `remote.sh up` reproduces create-then-vanish path

Command (isolated state file, skip install/start to focus on create/sync):

```bash
E2B_STATE_FILE="$(mktemp -u)" bash super_turtle/e2b/remote.sh up --template base --skip-install --skip-start
```

Observed sequence:

1. `[e2b-up] created sandbox <id>`
2. `[e2b-up] syncing local repo to sandbox <id>...`
3. sync/connect fails with `NotFoundError: Paused sandbox <id> not found`
4. `up` exits with `ERROR: repo sync failed`

## Exact root cause

`super_turtle/e2b/up.sh` currently creates sandboxes via interactive terminal behavior:

- Primary path: `printf 'exit\n' | e2b sandbox create <template>`
- Fallback path: `printf 'exit\n' | script -q /dev/null e2b sandbox create <template>`

This has two independent failure modes:

1. In non-TTY shells, E2B CLI `2.4.2` crashes on `process.stdin.setRawMode`.
2. Even with pseudo-TTY workaround, `sandbox create` is still an interactive "create and connect terminal" command. Feeding `exit` ends that terminal session and the reported sandbox ID is not reliably reusable for follow-up `connect` during sync.

Because `up.sh` parses and trusts the ID from this interactive output, it records sandbox state as `running` before performing sync, then fails when sync attempts to reconnect to a non-existent sandbox.
