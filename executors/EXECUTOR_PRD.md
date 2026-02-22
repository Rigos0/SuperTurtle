# Executor PRD — Pluggable Executor Architecture

## Problem

The Gemini executor (`executors/gemini/executor.py`) is the first working executor. It contains ~280 lines that handle polling, status transitions, file collection, upload, error handling, and graceful shutdown — plus ~20 lines of Gemini-specific logic (build command, run subprocess). As we add Claude Code, Codex, and code-review executors, copying this file each time duplicates critical infrastructure and makes bug fixes a maintenance burden.

## Design Goals

1. **Copy-and-configure**: creating a new executor should require one file (~30 lines) that defines what command to run and how to collect output.
2. **Single source of truth**: polling, status transitions, file upload, error handling, and graceful shutdown live in one shared module.
3. **No framework overhead**: the scaffold is a plain Python base class, not a framework. No metaclass magic, no plugin registry, no dynamic imports.
4. **Backward-compatible**: the existing Gemini executor migrates onto the scaffold without behavior change.
5. **Testable in isolation**: the base class can be tested with a fake executor subclass that never calls a real CLI.

## Architecture Overview

```
executors/
├── base/                         # Shared scaffold (Python package)
│   ├── __init__.py               # Re-exports BaseExecutor
│   ├── executor.py               # BaseExecutor class
│   ├── api_client.py             # HTTP helpers (poll, status, upload)
│   └── files.py                  # File collection + filtering
├── gemini/                       # Gemini executor (migrated)
│   ├── executor.py               # GeminiExecutor(BaseExecutor)
│   ├── GEMINI.md                 # System prompt
│   └── .env.example
├── claude/                       # Claude Code executor (new)
│   ├── executor.py               # ClaudeExecutor(BaseExecutor)
│   ├── CLAUDE_EXECUTOR.md        # System prompt
│   └── .env.example
├── codex/                        # OpenAI Codex executor (new)
│   ├── executor.py               # CodexExecutor(BaseExecutor)
│   ├── CODEX.md                  # System prompt
│   └── .env.example
├── code_review/                  # Code review executor (new)
│   ├── executor.py               # CodeReviewExecutor(BaseExecutor)
│   └── .env.example
├── requirements.txt              # Shared deps (requests, python-dotenv)
└── EXECUTOR_PRD.md               # This document
```

## BaseExecutor Class

### Public Interface

```python
class BaseExecutor(ABC):
    """Base class for all agnt executors."""

    # -- Subclass must set these ------------------------------------------
    name: str                      # Logging prefix, e.g. "gemini"

    # -- Subclass must implement ------------------------------------------
    @abstractmethod
    def execute(self, job: dict, work_dir: Path) -> None:
        """Run the job's work inside work_dir.

        The method should:
        1. Produce output files inside work_dir.
        2. Raise on unrecoverable failure (base will mark job failed).
        3. Optionally call self.report_progress(job_id, pct) during execution.

        The base class handles: accept, running status, file collection,
        upload, failure reporting, and work-dir cleanup.
        """

    # -- Optional overrides -----------------------------------------------
    def build_prompt(self, job: dict) -> str:
        """Build the prompt string from job data. Default: prompt + params."""

    def collect_files(self, work_dir: Path) -> list[Path]:
        """Collect output files from work_dir. Default: all non-dot,
        non-symlink files, excluding the system prompt file."""

    def setup_work_dir(self, job: dict, work_dir: Path) -> None:
        """Prepare work_dir before execute(). Default: copy system prompt
        file if self.system_prompt_path is set."""

    # -- Provided by base (not overridden) --------------------------------
    def run(self) -> None:
        """Main polling loop. Blocks until shutdown signal."""

    def report_progress(self, job_id: str, progress: int) -> None:
        """Report progress (0-100) for a running job."""
```

### Configuration

All executors share a common configuration model loaded from environment variables. The base class reads these in `__init__`:

| Env Var | Default | Description |
|---|---|---|
| `AGNT_API_URL` | `http://localhost:8000` | API base URL |
| `AGNT_EXECUTOR_API_KEY` | `executor-dev-key` | Executor auth key |
| `AGNT_AGENT_ID` | *(required)* | UUID of agent this executor services |
| `POLL_INTERVAL_SECONDS` | `5` | Seconds between poll cycles |
| `JOB_TIMEOUT_SECONDS` | `300` | Max seconds per job execution |

Per-executor env vars (e.g. `GEMINI_BIN`, `CLAUDE_BIN`) are read by the subclass, not the base.

### Lifecycle (What the Base Does)

```
__init__()
  → Load .env, read shared config, set up logging, register signal handlers

run()
  → while not shutdown:
      jobs = api_client.poll_jobs(agent_id, status="pending")
      for job in jobs:
          _process_job(job)
      sleep(poll_interval)

_process_job(job)
  → try accept (409 = already claimed, skip)
  → create work_dir
  → try:
      update_status(running, progress=10)
      setup_work_dir(job, work_dir)        # subclass hook
      execute(job, work_dir)               # subclass implements
      files = collect_files(work_dir)      # subclass hook
      if no files and stdout captured → write response.txt
      if no files → mark failed("No output produced")
      upload_files(job_id, files, work_dir)
    except TimeoutError → mark failed("Job timed out")
    except Exception → mark failed(str(exc)[:500])
    finally → rmtree(work_dir)
```

### Subprocess Helper

Most executors run a CLI binary in a subprocess. The base module provides a helper:

```python
def run_cli(
    cmd: list[str],
    cwd: Path,
    timeout: int,
    *,
    capture_stdout: bool = True,
) -> subprocess.CompletedProcess[str]:
    """Run a CLI command with timeout. Raises TimeoutError or CalledProcessError."""
```

Executors that need streaming or custom process management can use `subprocess.Popen` directly instead.

## API Client Module

Extracted from the Gemini executor's HTTP helpers, the `api_client` module provides:

```python
class ApiClient:
    def __init__(self, base_url: str, api_key: str): ...
    def poll_jobs(self, agent_id: str, status: str = "pending") -> list[dict]: ...
    def update_status(self, job_id: str, status: str, *, progress: int | None = None, reason: str | None = None) -> None: ...
    def upload_files(self, job_id: str, file_paths: list[Path], work_dir: Path) -> None: ...
```

Constants: `MAX_UPLOAD_FILES = 20`, `MAX_FILE_SIZE = 50 MB`, request timeout = 10s (poll/status), 60s (upload).

## File Collection Module

Extracted file-walking logic:

```python
def collect_files(work_dir: Path, *, exclude_names: set[str] | None = None) -> list[Path]:
    """Walk work_dir, skip dotfiles/dotdirs/symlinks/path-traversal, return list of Paths."""
```

The `exclude_names` parameter lets each executor skip its system prompt file (e.g. `{"GEMINI.md"}`).

## Target Executors

### 1. Gemini Executor (migration)

Existing executor migrated onto the scaffold. No behavior change.

```python
class GeminiExecutor(BaseExecutor):
    name = "gemini"

    def __init__(self):
        super().__init__()
        self.gemini_bin = os.getenv("GEMINI_BIN", "gemini")
        self.system_prompt_path = Path(__file__).parent / "GEMINI.md"

    def execute(self, job, work_dir):
        prompt = self.build_prompt(job)
        result = run_cli(
            [self.gemini_bin, "-p", prompt, "--yolo"],
            cwd=work_dir,
            timeout=self.job_timeout,
        )
        # If no files produced but stdout has content, write response.txt
        if result.stdout.strip():
            (work_dir / "response.txt").write_text(result.stdout)
```

**Env**: `GEMINI_BIN` (default: `gemini`)

### 2. Claude Code Executor

Runs `claude` CLI as a subprocess, same pattern as in the orchestrator's `agents.py`.

```python
class ClaudeExecutor(BaseExecutor):
    name = "claude"

    def __init__(self):
        super().__init__()
        self.claude_bin = os.getenv("CLAUDE_BIN", "claude")
        self.system_prompt_path = Path(__file__).parent / "CLAUDE_EXECUTOR.md"

    def execute(self, job, work_dir):
        prompt = self.build_prompt(job)
        run_cli(
            [self.claude_bin, "--dangerously-skip-permissions", "-p", prompt],
            cwd=work_dir,
            timeout=self.job_timeout,
        )
```

**Env**: `CLAUDE_BIN` (default: `claude`)

**Notes**:
- Uses `--dangerously-skip-permissions` for full auto execution (no interactive approval needed).
- Does NOT use `--permission-mode plan` — executors always execute, never just plan.
- Claude Code natively writes files to cwd, so output collection works unchanged.
- System prompt (`CLAUDE_EXECUTOR.md`) is copied to work_dir as context.

### 3. Codex Executor

Runs `codex` CLI via the `exec` subcommand.

```python
class CodexExecutor(BaseExecutor):
    name = "codex"

    def __init__(self):
        super().__init__()
        self.codex_bin = os.getenv("CODEX_BIN", "codex")
        self.system_prompt_path = Path(__file__).parent / "CODEX.md"

    def execute(self, job, work_dir):
        prompt = self.build_prompt(job)
        run_cli(
            [self.codex_bin, "exec", "--yolo", prompt],
            cwd=work_dir,
            timeout=self.job_timeout,
        )
```

**Env**: `CODEX_BIN` (default: `codex`)

**Notes**:
- Codex `exec` subcommand with `--yolo` for auto-approval.
- Writes files to cwd like other executors.

### 4. Code Review Executor

Unlike the other executors, the code review agent doesn't generate files in a fresh workspace — it analyzes existing code and produces a review report.

**Input mechanism**: The job's `params_json` carries the code to review. Two modes:

| Mode | `params_json` fields | Description |
|---|---|---|
| `inline` | `{"code": "...", "language": "python"}` | Code passed directly in the job |
| `files` | `{"repo_url": "...", "paths": ["src/foo.py"]}` | Files fetched from a URL/path |

For the POC, only `inline` mode is implemented. The `files` mode is deferred to a future iteration.

```python
class CodeReviewExecutor(BaseExecutor):
    name = "code-review"

    def __init__(self):
        super().__init__()
        self.claude_bin = os.getenv("CLAUDE_BIN", "claude")

    def execute(self, job, work_dir):
        params = job.get("params") or {}
        code = params.get("code", "")
        language = params.get("language", "")

        # Write code to a file for context
        ext = {"python": ".py", "javascript": ".js", "typescript": ".ts",
               "go": ".go", "rust": ".rs"}.get(language, ".txt")
        code_file = work_dir / f"input{ext}"
        code_file.write_text(code)

        review_prompt = (
            f"Review the code in {code_file.name}. "
            f"Provide a structured review covering: correctness, security, "
            f"performance, readability, and suggestions. "
            f"Write the review to review.md."
        )

        if job.get("prompt"):
            review_prompt += f"\n\nAdditional instructions: {job['prompt']}"

        run_cli(
            [self.claude_bin, "--dangerously-skip-permissions", "-p", review_prompt],
            cwd=work_dir,
            timeout=self.job_timeout,
        )

    def collect_files(self, work_dir):
        # Only upload the review output, not the input code
        files = super().collect_files(work_dir)
        return [f for f in files if f.name != f.name.startswith("input")]
```

**Env**: `CLAUDE_BIN` (default: `claude`)

**Notes**:
- Uses Claude Code as the underlying review engine.
- Input code is written to work_dir so Claude can read it.
- Only the review output (e.g. `review.md`) is uploaded, not the input file.
- The `prompt` field allows buyers to add specific review focus areas.

## Shared Dependencies

Single `requirements.txt` at `executors/requirements.txt`:

```
requests
python-dotenv
```

Each executor can optionally have its own `requirements.txt` for executor-specific deps, but the current set of executors all share the same two dependencies.

## Running an Executor

```bash
# From project root
cd executors/gemini
cp .env.example .env    # Edit AGNT_AGENT_ID
python3 -m executor     # or: python3 executor.py
```

No change from current pattern. Each executor is a standalone Python script with a `main()` entry point.

## Error Handling Strategy

| Failure | Behavior |
|---|---|
| API unreachable during poll | Log warning, retry next cycle |
| 409 on accept (already claimed) | Skip job, log info |
| CLI subprocess returns non-zero | Mark job `failed` with stderr (truncated to 500 chars) |
| CLI subprocess times out | Kill process, mark job `failed("Job timed out")` |
| No output files produced | Mark job `failed("No output produced")` |
| Upload fails (network error) | Mark job `failed`, API handles cleanup of partial uploads |
| Unexpected exception | Mark job `failed` with exception message, log full traceback |

Work directory is always cleaned up in `finally`, regardless of outcome.

## Testing Strategy

### Unit Tests for Base Scaffold

Test the base class and its modules without any real CLI or API:

1. **ApiClient** — mock `requests` to verify correct URLs, headers, payloads, and error handling for poll/status/upload.
2. **File collection** — create temp directories with various file types (dotfiles, symlinks, nested dirs) and verify correct filtering.
3. **BaseExecutor lifecycle** — create a `FakeExecutor(BaseExecutor)` that writes a known file, verify the full `_process_job` flow: accept → running → execute → collect → upload → cleanup.
4. **Error paths** — verify that subprocess failures, timeouts, and empty output all result in correct `failed` status calls.
5. **Signal handling** — verify that setting `_shutdown = True` causes the poll loop to exit cleanly.

### Integration Tests (per executor)

Each executor gets a basic integration test that:
1. Starts the API (or mocks it).
2. Creates a pending job.
3. Runs the executor for one cycle.
4. Asserts the job reaches `completed` with expected files.

These tests require the real CLI binary to be installed, so they run in CI or manually, not in the unit test suite.

## Migration Plan

1. **Iteration 16**: Build `executors/base/` with `BaseExecutor`, `ApiClient`, `files.py`, unit tests.
2. **Iteration 16 (same)**: Migrate Gemini executor onto the scaffold. Run existing integration test to verify no regression.
3. **Iteration 17**: Claude Code executor using the scaffold.
4. **Iteration 18**: Codex executor using the scaffold.
5. **Iteration 19**: Code review executor using the scaffold.
6. **Iteration 20**: Integration test all executors end-to-end.

## Non-Goals (Explicitly Out of Scope)

- **Dynamic executor discovery/registry** — executors are started manually, not auto-discovered.
- **Multi-agent-id support** — one executor process services one agent ID.
- **Executor-to-executor communication** — executors are independent; workflow orchestration is handled externally.
- **Cloud deployment of executors** — all executors run locally per project constraints.
- **Containerized executors** — possible future work, but not in this PRD's scope.
- **Rate limiting / backoff** — constant poll interval is sufficient for the POC; exponential backoff can be added later if needed.
