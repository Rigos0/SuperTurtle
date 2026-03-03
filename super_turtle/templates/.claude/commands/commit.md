Commit current changes. User input: `$ARGUMENTS`

## Instructions

1. Run `git status` and `git diff` to see all unstaged and staged changes.
2. Analyze the changes and group them by concern. If all changes are related, make one commit. If they touch unrelated areas, split into multiple commits.
3. For each commit:
   - Stage only the relevant files (`git add <specific files>`, never `git add .` or `git add -A`)
   - Write a commit message using conventional commits format: `type: message`
   - Keep messages short and to the point — one line, no body unless truly needed

## Commit types

- `feat:` — new feature or functionality
- `fix:` — bug fix
- `docs:` — documentation only
- `style:` — formatting, whitespace (not CSS)
- `refactor:` — code change that neither fixes a bug nor adds a feature
- `perf:` — performance improvement
- `test:` — adding or updating tests
- `chore:` — tooling, config, build, dependencies
- `ci:` — CI/CD changes

## Rules

- If `$ARGUMENTS` contains a message or instructions, use that to guide the commit message.
- Never commit `.env`, credentials, or secrets.
- Never amend previous commits unless explicitly asked.
- Always end commit messages with the co-author line.
