# Launch Video

This package is a Remotion workspace for the SuperTurtle launch video.

## Why this shape

It follows the active product flow in the repo:

1. local turtle runs on the PC
2. `/teleport` starts or resumes an E2B sandbox
3. Telegram ownership cuts over only after the remote webhook is healthy
4. remote turtle handles the conversation
5. `/home` returns ownership to the local machine

## Commands

```bash
cd super_turtle/launch-video
npm install
npm run studio
npm run render
```

## Working rules from the Remotion skill

- animations use `useCurrentFrame()` and `fps`, not CSS animation
- compositions are defined in `src/Root.tsx`
- video props are typed and validated with Zod
- scene timing is explicit with `TransitionSeries`
- future assets should go in `public/` and be referenced with `staticFile()`

## Next edits

- replace placeholder UI cards with real screenshots or recreated Telegram states
- add voiceover and music via `public/` assets and `@remotion/media`
- tune scene durations to the final narration
