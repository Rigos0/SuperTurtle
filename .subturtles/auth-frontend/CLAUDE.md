## Current Task
All auth frontend wiring items are complete; waiting for next backlog.

## End Goal with Specs
- ConvexAuthProvider wraps the app instead of ConvexProvider
- Login screen shown when not authenticated (using existing `components/login/` scaffold)
- LoginCard has 3 sign-in options: "Continue as Guest" (anonymous), "Sign in with GitHub", "Sign in with Google"
- All sign-in buttons use `signIn` from `@convex-dev/auth/react`
- After login, user sees the main feed (existing App layout)
- "Sign out" button in header (right side, replaces or sits near the avatar menu)
- `useConvexUser` hook updated to get the authenticated user from Convex Auth session
- Green "Turtle In" branding on login page (primary: #2e7d32)
- Build passes: `cd linkedin-demo && npm run build`

## Backlog
- [x] Update `linkedin-demo/src/index.js`: replace `ConvexProvider` with `ConvexAuthProvider` from `@convex-dev/auth/react`. Keep Redux Provider. The import changes from `import { ConvexProvider, ConvexReactClient } from "convex/react"` to also include `import { ConvexAuthProvider } from "@convex-dev/auth/react"`. Wrap: `<ConvexAuthProvider client={convex}>` instead of `<ConvexProvider client={convex}>`
- [x] Rewrite `linkedin-demo/src/components/login/loginCard/LoginCard.js`: Remove ALL Firebase imports (react-firebaseui, firebase). Remove the old author social links footer. Add 3 buttons:
  1. "🐢 Continue as Guest" — calls `signIn("anonymous")` (green background #2e7d32, white text)
  2. "Sign in with GitHub" — calls `signIn("github")` (dark background #24292e)
  3. "Sign in with Google" — calls `signIn("google")` (white background, dark text, Google colors)
  Import `useAuthActions` from `@convex-dev/auth/react` to get the `signIn` function. Replace the old logo image with text "🐢 Turtle In" in green (#2e7d32). Keep the Paper wrapper and card styling.
- [x] Update `linkedin-demo/src/components/login/loginCard/Style.js`: Update button color from `#5d98d4` to `#2e7d32`. Add styles for the 3 auth buttons (`.guestBtn`, `.githubBtn`, `.googleBtn`). Remove `.about` and `.social__links` styles (no longer needed).
- [x] Update `linkedin-demo/src/App.js`: Import `useConvexAuth` from `convex/react` or `Authenticated`/`Unauthenticated` from `@convex-dev/auth/react`. If not authenticated, render `<Login />`. If authenticated, render the existing feed layout. Remove the `mockUser` import and `LoginAction` dispatch. Remove the `useEffect` that dispatches `LoginAction(mockUser)`.
- [x] Add sign-out button to Header: In `linkedin-demo/src/components/header/Header.js`, import `useAuthActions` from `@convex-dev/auth/react`. Add a "Sign Out" button or menu item (right side of header). On click: `signOut()`. Style with green theme.
- [x] Update `linkedin-demo/src/hooks/useConvexUser.js`: Instead of calling `getFeaturedUser`, use the Convex Auth session to get the current user. Import `useConvexAuth` from `convex/react`. If authenticated, query the auth user. Fallback: keep `getFeaturedUser` as default for seed data compatibility.
- [x] Run `npm run build` to verify build passes
- [x] Commit with message "Wire Convex Auth frontend: login UI, auth gate, sign-out"

## Notes
- All paths absolute from repo root: `/Users/Richard.Mladek/Documents/projects/agentic/`
- This SubTurtle runs AFTER auth-backend has created auth.ts, http.ts, auth.config.ts, and updated schema.ts
- The `@convex-dev/auth` package is already installed
- The login component exists at `linkedin-demo/src/components/login/` — reuse the scaffold
- LoginCard currently imports `firebase` and `react-firebaseui` — these MUST be removed entirely
- Current index.js uses `ConvexProvider` from `convex/react` — change to `ConvexAuthProvider` from `@convex-dev/auth/react`
- The `Authenticated` and `Unauthenticated` components from `convex/react` can be used to gate UI
- Keep the Lottie animation on the login page (it's in Login.js, not LoginCard.js)
- Green colors: primary #2e7d32, light #66bb6a, dark #1b5e20
- The Header component is at `linkedin-demo/src/components/header/Header.js`
- Run npm commands from `linkedin-demo/` directory

## Loop Control
STOP
