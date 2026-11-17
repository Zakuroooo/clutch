# 0011. Rooms over Supabase Realtime only, with voice, and no tables

Date: 17 Nov 2026 · Status: accepted · Changes: the rooms design in TRD sections 5 and 6

## Context
Pranay asked for watching together now: a room where friends see the same ball, chat, react, argue about players, and talk to each other by voice like a Discord voice channel. The TRD designs rooms with tables (`rooms`, `members`, `calls`), anonymous sign-in and row-level security. That is a day of work and has no screen a reviewer sees that the simpler version lacks. Rule 7 said tier 2 waits for Review 3; Pranay gave the go-ahead on 17 Nov 2026.

## Decision
- A room is a Supabase Realtime channel, `room:<CODE>`. No tables, no sign-in, nothing stored. A room exists while someone is in it.
- Presence says who is here (name, in voice, muted).
- Broadcast carries chat, reactions, the match clock and voice set-up messages. Every message is checked again by the receiver (`lib/room/protocol.ts`): chat goes through the same banned and abuse word lists as the cards (rule 5).
- The match clock: when anyone skips, pauses or changes speed, the new anchor is broadcast and everyone adopts it. A joiner says hello and gets the current anchor. Devices use their own clocks; phones on network time agree within about a second, which is fine for a replay.
- Voice: open microphone, like a call, with mute. Audio goes straight between browsers (WebRTC, every phone to every other, up to 6). Public STUN servers only, no TURN relay: on networks that block direct connections, voice fails with a clear message and chat still works.
- Only the publishable key is used in the browser. Without Supabase settings the room screens are hidden and the app works alone, as in CI.

## Consequences
- Late joiners do not see earlier chat. Calls before each over and the leaderboard need stored state and are still not built.
- Anyone with a code can join a room. Codes are 6 characters from 31 (about 887 million), and rooms are short-lived.
- Voice was tested with two browser tabs and a test tone in place of a microphone (the test browser blocks microphones); it has not been tested between two real phones on different networks.
