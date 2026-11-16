# 0010. The match video, embedded and synced ball by ball

**Date:** 16 Nov 2026 · **Status:** accepted, on the `video` branch · **Supersedes:** 0004 in part

## Context
Without the match itself on screen, Clutch felt like a scoreboard. Pranay decided to add the
real match video. No IPL match has an official full-length upload on YouTube, so the replay
match changes to one that does.

## Decision
- The replay match is **Denmark v Germany, 1st T20I, Svanholm Park, 18 June 2026** (Cricsheet
  1539472, in the test split; Germany won by 2 wickets). The host ground's club, Svanholm
  Cricket Club, streamed the whole match on its YouTube channel.
- The video is **embedded only**, in YouTube's own player with its own controls and branding.
  It is never downloaded, re-hosted, clipped or drawn over. It starts only on a tap.
- **Video time is the match timeline.** Each ball's time is when the video's on-screen
  scoreboard first shows it, found by reading the scoreboard (`model/src/video_sync.py`),
  then bisected to about two seconds. Balls between readings are spread evenly. The result
  and the evidence are in `data/matches/1539472/video_sync.json`.
- While the tab is visible the **video leads the clock**; when the tab is hidden the clock
  leads, so Focus call-backs keep coming, and the video catches up on return
  (`lib/clock/follow.ts`).
- If the player cannot load or errors, the replay **falls back to the clock** on the same
  timeline, with a line that says so.
- Credits under the player name the channel. The replay badge stays, because the footage
  carries the stream's own "LIVE" mark.

## What did not change
- Clutch still never generates, draws or adds an image of a real player (0003). Real players
  appear only inside the broadcaster's own footage, played in YouTube's player.
- No clips of missed moments: the shelf keeps its drawings (0008); the fan can jump the video
  to a moment instead.

## Cost
- A club stream: one wide camera, modest picture, not a TV broadcast.
- Denmark and Germany are not teams most Indian fans know.
- If the channel removes the video or turns off embedding, the app falls back to the clock.
