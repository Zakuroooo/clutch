# Submission note (200 words)

Filled on 15 Nov from `model/artifacts/split.json` and `pulse_eval.json` (the "Big moments" bar). If a number changes, change it here from the file. Final word count must be 200 or fewer.

One sentence depends on work not done yet: the cards are explained by fixed templates until an LLM key is used. If LLM-written cards are generated and pass `evals:check` before submitting, change "Each is explained" to "An LLM explains each". Until then the note must not say an LLM writes them.

---

**Clutch: the friend who tells you when to look up**

The match is on beside my work, I look away, and I miss the one ball everyone talks about. With friends, the room roars and I don't know why.

Live sport is long quiet stretches and a few seconds that matter, and nobody tells casual fans which.

**Hypothesis:** if a fan is called back when a moment matters, sees what they missed, and is told why in terms they already know, they stay with the match.

**What I built:** a match-centre app with one ring, the Pulse. A win-probability model, trained on 3,137 T20 matches, scores the stakes of every ball. The Pulse fills and calls you back before big moments. Missed moments wait on a shelf with a drawn replay. Each is explained in your world (football, F1, chess, Bollywood, gaming); code supplies every fact and checks every number.

**Honest limits:** it replays a real past match as live. No real users, so the hypothesis is untested. On held-out matches, call-backs came before 52% of the biggest swings; random ones caught 22%. Rooms with friends are designed only.

Built with AI coding agents; decisions and review are mine: docs/AI-WORKFLOW.md.

---

Word count of the note above (title to last line): 200, counted by script on 15 Nov. Recount after any edit.

## Before submitting

- [x] Every blank filled from `model/artifacts/` or `evals/results/`, or its sentence removed
- [x] "Friends can join a room by code" removed (tier 2 was not built)
- [ ] The worlds listed are the ones that actually work
- [x] 200 words or fewer
- [ ] The form's AI question answered from `docs/AI-WORKFLOW.md`, in the same words
