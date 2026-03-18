# Conductor GC: Technical Architecture

This diagram illustrates the complete flow of the `ctl gc-state` command, from the CLI entry point to the safety-guarded pruning of workers, wakeups, inbox items, and log rotation.

```mermaid
flowchart TD
    %% CLI Layer
    subgraph CLI["CLI Wrapper (Shell)"]
        Start[("./super_turtle/subturtle/ctl gc-state --max-age 7d")] --> ParseDur["parse_duration()\n(lib/shared.sh)"]
        ParseDur --> Env["Set PYTHONPATH & $PYTHON"]
        Env --> CallPy["python3 state/conductor_gc.py\n--state-dir .superturtle/state\n--max-age {seconds}"]
    end

    %% Data Source Layer
    subgraph StateDir["State Directory (.superturtle/state/)"]
        direction LR
        Workers[("/workers/*.json")]
        Wakeups[("/wakeups/*.json")]
        Inbox[("/inbox/*.json")]
        Logs[("events.jsonl
        runs.jsonl")]
    end

    %% Logic Layer
    subgraph GC["Conductor GC Logic (Python)"]
        direction TB
        
        %% Step 1: Mapping
        CallPy --> Init["Init ConductorStateStore"]
        Init --> ScanWorkers["Resilient JSON Scan:
        Identify 'Active Run IDs'
        (Any lifecycle != archived)"]
        
        Init --> ScanWakeups["Resilient JSON Scan:
        Identify 'Pending Run IDs'
        (Any state == pending|processing)"]

        ScanWorkers & ScanWakeups --> DecisionPoint{{"Pruning Decision Engine"}}

        %% Step 2: Pruning Decisions
        subgraph Pruning["Surgical Pruning logic"]
            direction TB
            
            P1["Prune Wakeup?
            IF state in {sent, suppressed, failed}
            AND run_id NOT in ActiveRuns
            AND updated_at < cutoff"]
            
            P2["Prune Inbox?
            IF state in {acknowledged, suppressed}
            AND (ack_at OR update_at) < cutoff
            (Direct JSON Read)"]
            
            P3["Prune Worker?
            IF lifecycle == 'archived'
            AND run_id NOT in ActiveRuns
            AND run_id NOT in PendingRuns
            AND updated_at < cutoff"]
        end

        DecisionPoint --> P1 & P2 & P3

        %% Step 3: Action
        P1 --> DelWk["os.unlink(wakeup_file)"]
        P2 --> DelIn["os.unlink(inbox_file)"]
        P3 --> DelWrk["os.unlink(worker_file)"]

        %% Step 4: Log Rotation
        DelWk & DelIn & DelWrk --> Rotation["Log Rotation Engine"]
        
        subgraph RotationLogic["Atomic Rotation (.jsonl)"]
            direction TB
            R1["Read lines (UTF-8 errors='replace')"]
            R2["Split: 'Recent' vs 'Old' by timestamp"]
            R3["Append 'Old' lines to .jsonl.1"]
            R4["Atomic Rewrite:
            .jsonl.tmp -> .jsonl"]
            R1 --> R2 --> R3 --> R4
        end
        Rotation --> RotationLogic
    end

    %% Output Layer
    RotationLogic --> Summary["GcResult Dataclass:
    - wakeups_pruned: int
    - inbox_pruned: int
    - workers_pruned: int
    - events_archived: int
    - runs_archived: int"]
    
    Summary --> ConsolePrint["Print Diagnostic Summary"]
    ConsolePrint --> End([Exit])

    %% Data Connections
    Workers -.-> ScanWorkers
    Wakeups -.-> ScanWakeups
    Inbox -.-> P2
    Logs -.-> R1

    %% Styling
    style Start fill:#f9f,stroke:#333,stroke-width:2px
    style StateDir fill:#fff,stroke:#333,stroke-dasharray: 5 5
    style Pruning fill:#fffbe6,stroke:#d4b106
    style RotationLogic fill:#e6f7ff,stroke:#1890ff
    style Summary fill:#f6ffed,stroke:#52c41a
```

### Safety Summary
*   **Active Run Guard**: Prevents pruning wakeups/workers for any run that isn't fully archived (protects `running`, `completed`, `failed`, `stopped`, etc).
*   **Pending Wakeup Guard**: Prevents pruning worker state if there are still undelivered (`pending` or `processing`) notifications in the pipe for that run.
*   **Atomic Log Guard**: Uses temporary files and `os.replace` (atomic rename) to ensure log integrity even on sudden process interruption.
*   **Data Resilience**: Uses `errors="replace"` in UTF-8 decoding and resilient JSON scanning to skip corrupt records without crashing.
*   **Inbox Precision**: Prioritizes `delivery.acknowledged_at` for inbox items, ensuring we only prune once a human has actually seen the message.
