# Current Task
All backlog items are complete; finalize state and stop this loop.

# End Goal with Specs
Update `super_turtle/meta/META_SHARED.md` to formalize the notification format in the "## Autonomous supervision (cron check-ins)" section.

The existing section already mentions markers (🎉 Finished, ⚠️ Stuck, ❌ Error, 🚀 Milestone) but doesn't define exact message templates. Add concrete templates:

```
🚀 Started: <name>
Working on: <task description>
Mode: <yolo-codex|yolo|slow> | Timeout: <duration>

🎉 Finished: <name>
✓ <item 1>
✓ <item 2>
✓ <item 3>
Next: <what happens next, or "Roadmap complete">

⚠️ Stuck: <name>
No progress for <N> check-ins.
Last activity: <description>
Action: <what meta agent did — stopped, restarted, needs human input>

❌ Error: <name>
<error description>
Action: <what meta agent did>

📍 Milestone: <name>
<N>/<total> backlog items complete.
Latest: <what just shipped>
```

Also add a "🔗 Preview" template for tunnel URLs:
```
🔗 Preview: <name>
<url>
```

These should be added to the existing "Notification format" subsection, replacing the current brief description with these concrete templates.

File: `super_turtle/meta/META_SHARED.md`
Section: "## Autonomous supervision (cron check-ins)" → "Notification format" subsection

Acceptance criteria:
- All 6 templates (Started, Finished, Stuck, Error, Milestone, Preview) are documented
- Templates use the exact emoji markers
- Each template shows the structure clearly
- Existing content is preserved (just enhanced)

# Backlog
- [x] Read META_SHARED.md to find the "Notification format" subsection
- [x] Replace the brief format description with concrete templates for all 6 event types
- [x] Ensure templates are inside a code block for clarity
- [x] Commit with descriptive message

## Loop Control
STOP
