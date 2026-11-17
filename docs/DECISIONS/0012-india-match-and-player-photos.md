# 0012. Replay India v England, and show real player photos with free licences

Date: 17 Nov 2026 · Status: accepted · Supersedes: 0003 (no real player faces) for photos; 0010 no longer applies to the current match

## Context
Denmark v Germany had a full match video synced ball by ball, but a reviewer recognises none of its players. Pranay asked for an India match and for real player photos so fans know who is batting.

## Decision
- The replay match is India v England, ICC Men's T20 World Cup 2026 semi-final, 5 March 2026 (Cricsheet 1512772), India won by 7 runs. It is in the test split, so the model never trained on it.
- There is no full-match video: full India matches are not on YouTube legally. The video code stays; this match has none.
- Player photos come only from Wikimedia Commons, only with a free licence (public domain, CC0, CC BY, CC BY-SA, GODL-India), fetched by `scripts/fetch-photos.mjs`, each credited with author and licence on the player's profile. 17 of 22 players have one; the rest show the team shirt. No photo is generated, drawn or taken from news or agency sites.
- Career numbers on profiles count only T20 matches before the replay match's date (fixing an earlier leak that counted later matches too).

## Consequences
- The Denmark v Germany data and video sync stay in the repository for the record.
- Rule 4 in CLAUDE.md now allows these photos and nothing else.
