---
name: run-evals
description: Run the card evals - the faithfulness check over recorded outputs and the planted-error set - and report real pass rates. Use after changing a prompt, the check, the facts builder or the templates.
argument-hint: [check | generate | judge]
---

Run the card evals. Mode: $ARGUMENTS (default `check`).

- `check` (no key needed): `npm run evals:check`. Runs `check()` over committed outputs and the adversarial set.
- `generate` (needs the LLM key in `.env.local`): `npm run evals:generate`, then `check`. Only when the prompt version changed.
- `judge` (needs the key): `npm run evals:judge`.

Then:
1. Read `evals/results/summary.json`.
2. Report: first-try pass rate, pass after retry, template rate, failures by rule, by world, and planted errors caught out of the total.
3. If any planted error passed the check, that is a bug in the check. Stop and fix it before anything else.
4. If the pass rate dropped, show three failing outputs with the rule that failed.
5. Copy numbers into `docs/EVALS.md` only from `summary.json`. Never estimate or round up.

If the prompt text changed but the prompt version did not, say so and bump it.
