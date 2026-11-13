---
name: verify
description: Run the app and check a change in a real browser at phone width. Use after any UI change, before saying it works.
argument-hint: [what to check, e.g. "shelf marks a missed moment"]
---

Check this in a real browser: $ARGUMENTS

1. Start the dev server if it is not running (`npm run dev`). Do not run model training at the same time.
2. Open the page with the Playwright MCP server at **390 × 844**.
3. To reach a known point in the match, use the `?t0=` test anchor (needs `NEXT_PUBLIC_E2E=1`) or "Skip ahead".
4. Do what a fan would do for the thing being checked. Take a screenshot at each step.
5. Check, and report each as pass or fail:
   - The behaviour asked about works.
   - "Replay of a real match, running as live" is visible.
   - Nothing essential is below the fold; every control is in the bottom bar.
   - No console errors.
   - Reload: state is kept.
   - The states for this screen in `docs/DRD.md` §2: force loading, empty, error and finished where you can.
6. For anything shared between people, open a second browser context and check both.
7. Stop the dev server if you started it.

Report what you saw, with screenshots. If you could not check something, say so. Never report "works" from reading code alone.
