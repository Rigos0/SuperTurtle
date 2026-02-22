# Executor Base Module

Shared Python scaffold for all executors.

## Purpose
- Poll jobs from the API
- Manage lifecycle status updates (`accepted` -> `running` -> terminal state)
- Upload result files
- Clean up per-job work directories

## Usage
- Subclass `BaseExecutor` and implement `execute(job, work_dir)`.
- Optional hooks: `build_prompt()`, `setup_work_dir()`, `collect_files()`.
- Run from an executor directory script (for example `executors/gemini/executor.py`).
