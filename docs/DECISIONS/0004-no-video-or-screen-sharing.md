# 0004. No video and no screen sharing

**Date:** 13 Nov 2026 · **Status:** superseded in part by [0010](0010-embedded-match-video.md): the replay match's own stream is now embedded. Re-streaming, clipping and screen sharing stay out.

## Context
Friends watching together might want to share the broadcast in the room. Missed moments would be best shown as video clips.

## Decision
Clutch never shows, relays or shares match video. Everyone watches the match on their own screen; Clutch is the second screen and keeps the room in step. Missed moments are drawn from data.

## Why
- Broadcast rights belong to the broadcaster. Re-streaming or clipping breaks them.
- It keeps the product cheap, light and legal.

## Cost
- A drawing is less satisfying than a replay clip.
- Friends on different streams may be seconds apart. The "spoiler guard" that would fix this is designed, not built.
