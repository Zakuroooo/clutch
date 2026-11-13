---
name: design-review
description: Review a screen against the Clutch design system and say how to make it look like a finished sports app. Use before finishing any screen or component.
argument-hint: [screen or route, e.g. /match]
---

Review $ARGUMENTS against `docs/DESIGN-SYSTEM.md` and `docs/DRD.md`.

1. Open the screen at 390 × 844 with the Playwright MCP server and take a screenshot. Also open the matching mock-up in `design/screens/` if there is one.
2. Hand both screenshots and the changed component files to the `design-critic` agent.
3. Go through the checklist in `docs/DESIGN-SYSTEM.md` §10, item by item. For each, answer pass or fail with the evidence.
4. Run these greps over `components/` and `app/`:
   - colours not from tokens: `grep -rnE "#[0-9a-fA-F]{3,8}\b|rgb\(" components app --include=*.tsx --include=*.css`
   - pulse colour or gradient classes outside the Pulse ring, brand dot, hot and missed badges, and the quote card
   - radius values that are not the chip, tile, card, sheet or full tokens
   - `italic`, serif font classes, and emoji outside the reaction buttons
5. Check with reduced motion on, and with keyboard only.

Report a short list: what fails and what to change, most important first. Then name the one change that would most improve the screen and make it. The goal is a screen that could sit next to Dream11 or JioHotstar and look finished. Save the screenshot to `design/review/` so Pranay can see progress.
