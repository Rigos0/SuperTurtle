# Review Notes

## Commit `e476416d` - `Streamline single subturtle board actions`

### Intended product change

- Keep the live `/sub` board in a single tracked Telegram message when drilling into one running SubTurtle.
- When exactly one SubTurtle is running, replace the generic worker picker with direct `Tasks`, `Logs`, and `Stop` actions on the board home view.
- Simplify the single-worker detail card by removing duplicated status/current-task chrome and shortening button labels/back-navigation text.
- Rename the backlog/detail wording from `Backlog` to `Tasks` so the board, callbacks, and tests use the same terminology.
