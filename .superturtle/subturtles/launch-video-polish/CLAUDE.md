# Current task
Polish Scene 3 (Architecture) in PhoneLaunchVideo.tsx: center node chain, use thinner elegant connectors, deepen the dark background with layered gradients, reduce subtitle text, and make the nodes feel premium.

# End goal with specs
A clean, professional 9:16 phone video at super_turtle/launch-video/out/teleport-launch-phone.mp4. Each scene should feel like it belongs to the same product — think YC demo day / polished product launch quality.

Quality bar:
- Consistent vertical rhythm and spacing across all scenes (8px base grid)
- One focal point per scene — no competing elements
- Clean type hierarchy: one big title, minimal supporting text
- Animations that feel intentional, not random
- Chat scene (scene 2) should feel like a REAL Telegram chat — proper bubble shapes, typing indicator, natural spacing
- Architecture scene (scene 3, dark) should feel premium — Linear/Vercel dark mode quality
- Floating turtles opacity 0.04-0.05 max, or remove if they distract
- All content vertically centered with generous whitespace
- When in doubt, remove an element rather than add one

Files:
- Main: super_turtle/launch-video/src/PhoneLaunchVideo.tsx
- Constants: super_turtle/launch-video/src/constants.ts
- Design: super_turtle/launch-video/src/design.ts
- Fonts: super_turtle/launch-video/src/fonts.ts (Geist + GeistMono)
- Assets: super_turtle/launch-video/public/robot-turtle.png
- Render: cd super_turtle/launch-video && npx remotion render src/index.ts TeleportLaunchVideoPhone out/teleport-launch-phone.mp4
- Frame check: npx remotion still src/index.ts TeleportLaunchVideoPhone --frame=N --output=out/check.png

Tech: Remotion v4, React, 30fps, 1080x1920. spring() for organic motion, interpolate() with easing for linear. headlineFont=Geist, monoFont=GeistMono.

# Roadmap (Completed)
- Built v1-v4 of the phone video, iterated on story structure

# Roadmap (Upcoming)
- Professional visual polish pass on all 5 scenes

# Backlog
- [x] Read PhoneLaunchVideo.tsx, constants.ts, design.ts, fonts.ts fully
- [x] Standardize spacing: 8px grid, consistent padding/margins/gaps across all 5 scenes, remove ad-hoc values
- [x] Polish Scene 2 (Chat): real Telegram bubble shapes (outgoing=round-TL/TR/BL flat-BR, incoming=opposite), typing indicator dots before reply, realistic timestamps, natural message spacing
- [ ] Polish Scene 3 (Architecture): center node chain, thinner elegant connectors, deeper dark bg with layered gradients, reduce subtitle text, make nodes feel premium <- current
- [ ] Polish Scene 4 (Teleport): tighten card, smooth beam animation without jumps, make /teleport badge more prominent
- [ ] Polish Scene 5 (Close): even checkmark spacing, CTA button styling, good turtle avatar visual weight
- [ ] Reduce floating turtle opacity to 0.04-0.05 globally or remove from scenes where they distract
- [ ] Render final video, verify all 5 scenes look cohesive by checking frames at 35, 130, 240, 320, 395
- [ ] Commit polished version
