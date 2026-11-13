# Clutch: privacy

Clutch is a student prototype. It has no accounts and is built to hold as little as possible.

## What is stored, and where

| Data | Where | Why | How long |
|---|---|---|---|
| Your world, Focus bar, vibration setting | Your browser (`localStorage`) | To remember your choices | Until you clear site data |
| Which moments you saw or missed; solo match position | Your browser | The shelf | Until you clear site data |
| An anonymous session id | Your browser and Supabase Auth | So room rules can tell members apart without a login | Until you clear site data; server side until rooms are cleaned up |
| The name you type when joining a room | Supabase (`members`) | So friends can see who is here | Until the room is deleted (rooms older than 7 days are deleted by hand) |
| Your per-over calls | Supabase (`calls`) | The leaderboard | Same |
| Reactions | Nowhere. Sent live to the room and forgotten | | Not stored |
| Generated cards | Supabase (`cards`) or memory | So the same card isn't generated twice | No personal data in them |

Tier 1 (watching alone) stores nothing on any server.

## What is not collected

- No email, phone number, password or real identity. The name is whatever you type.
- No location, contacts or device identifiers.
- No analytics or advertising trackers.
- No audio or video. Voice and the "roar trigger" are designed but not built. If built, audio would stay on the device and never be stored; that would need its own permission screen and an update to this page.

## What goes to the LLM provider

Only match facts built by code from public match data (scores, player names from the data, win chances). **Nothing a user types is ever sent to the LLM.** Names of real players appear only as facts from the data; the prompt forbids inventing anything about them, and a check enforces it.

## Notifications

Asked for only when you tap "Allow" in Focus mode. Tier 1 notifications are created by the page itself on your device; no push subscription is sent to any server. You can turn them off in your browser at any time.

## Known limits

- **Room channels are not encrypted end to end and not authorised per message.** Anyone who has a room's internal id (given only to people who joined with the code) could listen to its live reactions and presence. The id is a random UUID and is not guessable. There is nothing sensitive on the channel, but don't type a name you wouldn't want other people in the room to see.
- **Room codes are 6 characters.** Someone could guess one. Joining shows names and calls in that room. Rooms are short-lived.
- Names are not moderated. They are length-limited and shown as plain text.
- There is no automatic deletion job. Old rooms are removed by a manual step in the runbook.

## Third parties

| Service | Used for | Sees |
|---|---|---|
| Vercel | Hosting | Standard web request logs |
| Supabase | Rooms (tier 2) | The table data above |
| The LLM provider named in the README | Card wording | Match facts only |
| Google Fonts (via `next/font`, self-hosted at build) | Fonts | Nothing at run time |

## Players

Real players are shown by name, team colour and jersey number only. No photographs, drawings or generated likenesses. Player statistics are derived from Cricsheet's open data and are labelled with the number of matches they are based on.

## Contact

Open an issue on the repository.
