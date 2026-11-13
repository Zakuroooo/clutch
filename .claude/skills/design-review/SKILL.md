---
name: design-review
description: Review a screen against the Clutch design system and say what to remove. Use before finishing any screen or component.
argument-hint: [screen or route, e.g. /match]
---

Review $ARGUMENTS against `docs/DESIGN-SYSTEM.md` and `docs/DRD.md`.

1. Open the screen at 390 × 844 with the Playwright MCP server and take a screenshot. Also open the matching mock-up in `design/screens/` if there is one.
2. Hand both screenshots and the changed component files to the `design-critic` agent.
3. Go through the checklist in `docs/DESIGN-SYSTEM.md` §9, item by item. For each, answer pass or fail with the evidence.
4. Run these greps over `components/` and `app/`:
   - colours not from tokens: `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(" components app --include=*.tsx --include=*.css`
   - `--pulse` or `pulse` colour classes outside Dial, WinChanceLine, MomentRow, MiniReplay and the missed count
   - `rounded-` classes other than `rounded-full`
   - emoji characters
5. Check with reduced motion on, and with keyboard only.

Report a short list: what fails, what to remove, what to fix. Lead with removals. The goal is one object on an empty screen.
