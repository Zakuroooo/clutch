# 0002. Facts by code, wording by LLM, checked by code

**Date:** 13 Nov 2026 · **Status:** accepted

## Context
An LLM is the only practical way to explain a cricket moment as a football or chess analogy. LLMs also state wrong numbers and names with confidence. A card with a wrong score would destroy trust in everything else.

## Decision
1. Code builds a facts object for each moment from the match data.
2. The LLM receives only those facts and writes the wording.
3. Code checks the wording: every number and name must be in the facts (docs/CARDS.md section 6).
4. A card that fails is replaced by a template built from the same facts.

For Back me up, numbers are not written by the LLM at all; code renders them.

## Why
- The fan can never be shown a number the data does not contain.
- The failure mode is a plainer card, not a wrong one.
- The check is ordinary code, so it can be unit-tested with planted errors.

## Cost
- The check is strict and will reject some good cards.
- It cannot catch every error of meaning (an analogy that is the wrong way round but uses no wrong number). That is measured by a rubric instead (docs/EVALS.md), and is a known gap.
