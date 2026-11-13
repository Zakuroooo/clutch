---
name: new-feature
description: Build one task from docs/BUILD-PLAN.md the project way - read the spec, plan, write failing tests, write code, verify. Use when asked to build a task such as T5 or a named feature.
argument-hint: [task id, e.g. T5]
---

Build task $ARGUMENTS from `docs/BUILD-PLAN.md`.

1. **Read the spec.** Open the task in `docs/BUILD-PLAN.md` and every doc section it links. If the task is tier 2 and Review 3 has not happened, stop and say so.
2. **Plan.** List the files you will create or change and the tests you will write, in five lines or fewer. If anything in the spec is unclear or contradicts another doc, ask before writing code.
3. **Look things up.** For any framework or SDK call, check current docs with the context7 MCP server first.
4. **Write the failing tests** named in the task ("Tests first") from `docs/TESTING.md`. Run them and confirm they fail for the right reason.
5. **Write the code** until the tests pass. Keep logic pure; pass `now` in. Do not touch files outside the task.
6. **Run the checks:** `npm run typecheck && npm run lint && npm test` (and `make model-test` for Python tasks).
7. **Verify.** For UI tasks, run the `verify` skill. For data tasks, ask the `data-checker` agent to review.
8. **Check the acceptance line** in the task. State plainly whether it is met, and show the command output that proves it.
9. **Update the docs** in the same change if behaviour differs from what they say. Never fill a results table with a number that is not in an artifact file.
10. **Review.** Ask the `code-reviewer` agent to review the diff. Fix what it finds.
11. **Commit** one commit for the task. No AI trailers. Do not push unless asked.

Report: what was built, test counts, anything skipped or not verified, and what Pranay should look at.
