# Skill System Documentation

## Overview

The skills system enables SubTurtle agents to load specialized Claude Code capabilities on demand. The meta agent specifies which skills a spawned SubTurtle should have, and those skills are automatically made available in the SubTurtle's Claude session.

## Two-Tier Skill System

There are **two distinct kinds** of skills:

### 1. Official Plugins from the Anthropic Registry

**Definition**: Built and maintained by Anthropic, available in the Claude Code plugin registry. Installed globally once, then available to all Claude sessions on the system.

**Installation**: Use the `claude` CLI command (non-interactive):
```bash
claude plugin install <plugin-name>
```

**Loading**: No special configuration needed — Claude Code discovers and makes these available automatically after installation.

**Use in SubTurtle**: Pass `--skill <name>` to `ctl start` (e.g., `--skill frontend-design`). The SubTurtle's Claude session will have access to the plugin.

**Available Official Plugins** (worth installing):
- `frontend-design` — Create distinctive, production-grade frontend interfaces with high design quality
- `code-review` — Run code reviews on changesets
- `security-guidance` — Security analysis and guidance
- `pdf` — Extract, analyze, and manipulate PDF files

**Key Point**: Do NOT hand-write skills that already exist in the registry. If an official plugin exists, use it instead.

### 2. Custom Project Skills

**Definition**: Domain-specific skills for needs not covered by official plugins (e.g., Remotion video composition, internal domain knowledge tools).

**Location**: `super_turtle/skills/.claude/skills/<skill-name>/SKILL.md`

**Loading**: Via `--add-dir super_turtle/skills` flag passed to Claude CLI calls. Custom skills are discovered automatically in that directory.

**Use in SubTurtle**: Pass `--skill <name>` to `ctl start`. The SubTurtle loads custom skills from the skills directory via `--add-dir`.

**When to Create**: Only when an official plugin does not exist. Example: Remotion video composition has no official plugin, so a custom skill is appropriate.

## Usage: The `--skill` Flag

To spawn a SubTurtle with specific skills:

```bash
./super_turtle/subturtle/ctl start my-feature --type yolo --skill frontend-design
./super_turtle/subturtle/ctl start video-project --type yolo --skill remotion
./super_turtle/subturtle/ctl start secure-audit --type yolo --skill code-review --skill security-guidance
```

**Repeatable**: The `--skill` flag can be passed multiple times to load multiple skills.

**How It Works**:
1. The meta agent passes skill names to `ctl start`
2. `ctl` stores skill names and passes them to the SubTurtle Python process
3. The SubTurtle loop adds `--add-dir super_turtle/skills` to Claude CLI calls (for custom skills)
4. Claude Code automatically discovers all available skills (official + custom in `--add-dir` directories)

## Important: Skills Stay Out of Meta Context

Skills are loaded **only in the SubTurtle's Claude session**, not in the meta agent's context. This keeps the meta agent's context clean and focused on orchestration decisions. The meta agent can reason about *which* skills to use, but doesn't need the skill definitions themselves.

## Implementation Details

### ctl (Control Script)

- Accepts `--skill <name>` flags (repeatable)
- Passes skill names to the SubTurtle Python process via command-line arguments

### SubTurtle Python Process

- Receives skill names from `ctl`
- Stores skill names in the SubTurtle instance
- Passes `--add-dir super_turtle/skills` to all Claude CLI calls (for custom skills)
- Makes skill names available in status/list commands

### agents.py (Claude Class)

- Has `add_dirs` parameter support
- Includes `--add-dir` flags in all Claude CLI calls when `add_dirs` is configured
- Passes `add_dirs` through all loop functions

## Status & List Commands

SubTurtle status and list commands now show active skills:

```
ctl list
ctl status <name>
```

Output includes the skills loaded for each SubTurtle.

## Checklist for Adding a New Skill

1. **Does an official plugin exist?**
   - YES → Install with `claude plugin install <name>` (once globally)
   - NO → Create a custom skill at `super_turtle/skills/.claude/skills/<name>/SKILL.md`

2. **Document the skill** in a `SKILL.md` file with:
   - Clear description
   - What it does
   - How the SubTurtle should use it

3. **Use the `--skill` flag** when spawning a SubTurtle:
   ```bash
   ctl start <name> --type <type> --skill <skill-name>
   ```

4. **Verify** the skill loads correctly by checking SubTurtle logs.
