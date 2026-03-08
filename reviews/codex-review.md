# Codex Review

## TypeScript sweep: `super_turtle/claude-telegram-bot/src/`

1. High: archive extraction trusts attacker-controlled paths and symlinks
   - File: `super_turtle/claude-telegram-bot/src/handlers/document.ts:146-157`, `super_turtle/claude-telegram-bot/src/handlers/document.ts:189-210`
   - Issue: `unzip -d` / `tar -xf` extract entries without validating `..`, absolute paths, or symlink targets, and the follow-up reader opens whatever landed under the extracted tree. A crafted archive can escape the temp dir or trick the bot into reading arbitrary local files.
   - Fix: pre-list archive members and reject traversal/symlink entries before extraction, or switch to an extraction library that enforces containment.

2. High: document downloads collide on filename, so same-named uploads overwrite each other
   - File: `super_turtle/claude-telegram-bot/src/handlers/document.ts:75-87`, `super_turtle/claude-telegram-bot/src/handlers/document.ts:650-659`
   - Issue: downloaded documents are stored as `${TEMP_DIR}/${safeName}` with no unique suffix. Two uploads named `README.md` (especially inside one media group) will write the same temp path, so later processing can analyze the wrong file or duplicate the last upload.
   - Fix: generate unique temp filenames the same way the photo handler does, then clean them up after processing.

3. High: Claude/Codex preference and session persistence is fire-and-forget
   - File: `super_turtle/claude-telegram-bot/src/session.ts:232-235`, `super_turtle/claude-telegram-bot/src/session.ts:1132-1133`, `super_turtle/claude-telegram-bot/src/codex-session.ts:67-70`, `super_turtle/claude-telegram-bot/src/codex-session.ts:1670-1671`
   - Issue: these helpers call `Bun.write(...)` without `await`, inside synchronous `try/catch` blocks. Write failures become unhandled promise rejections, and callers assume the data is already on disk when a restart or resume can still race the pending write.
   - Fix: use synchronous writes for these state files or make the helpers async and await every persistence call.

4. Medium: temp files for non-audio media are never reclaimed
   - File: `super_turtle/claude-telegram-bot/src/handlers/document.ts:69-89`, `super_turtle/claude-telegram-bot/src/handlers/document.ts:417-447`, `super_turtle/claude-telegram-bot/src/handlers/document.ts:558-659`, `super_turtle/claude-telegram-bot/src/handlers/photo.ts:42-56`, `super_turtle/claude-telegram-bot/src/handlers/photo.ts:102-129`, `super_turtle/claude-telegram-bot/src/handlers/video.ts:32-52`, `super_turtle/claude-telegram-bot/src/handlers/video.ts:132-214`
   - Issue: photo, document, and video handlers keep the downloaded temp artifacts forever; archive cleanup only happens on the success path. A long-running bot can steadily fill `/tmp` and eventually break future uploads or unrelated local processes.
   - Fix: add `finally` cleanup for each downloaded path and always remove extracted archive directories/files on both success and failure.
