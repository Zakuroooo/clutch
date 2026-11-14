# Clutch: design requirements

Tokens and component specs are in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). Static mock-ups and screenshots are in `design/screens/`.

## 1. Principles

1. **It should feel like the sports apps fans already use.** Dark match centre, rounded cards, crests, jerseys, bold scores, ball chips, a tab bar. Familiar patterns, done precisely. This is Pranay's direction after rejecting two earlier designs.
2. **Two-second glance.** The score card and the Pulse are above the fold on the main screen. One look answers "should I look up?"
3. **The Pulse is the one thing that is ours.** A ring that fills and pulses with the stakes. Its gradient means stakes and nothing else.
4. **Alive, not busy.** Colour comes from team colours, outcome chips and the Pulse. Motion comes from the Pulse, cards arriving and reactions. Everything else is still.
5. **One thumb.** A tab bar for moving around; one green button per screen for the main action.
6. **Honest on its face.** A "Replay of a real match" badge is on every match screen, where other apps would say "Live". A drawing is labelled a drawing. A number that is not measured is not shown.
7. **Jerseys, never faces.** Players are a jersey in team colours with their number.

## 2. Screens and their states

Every screen handles: loading, empty, error, offline, finished. "Offline" means no network. Solo mode keeps working offline once the match data has loaded.

Tabs in tier 1: **Match**, **Focus**, **Moments** (the shelf). **Back me up** and **Room** (friends) are tier 2 and join the bar when they are built.

### 2.1 Start

A hero with the Pulse ring and one line ("Get on with your work. Clutch calls you back when it matters."), a match card for today's replay (crests, teams, "Replay of a real match, running as live"), and two buttons: **Watch alone** (green) and **Show me in 2 minutes**. Until rooms are built, one quiet line says watching with friends is coming later; there is no dead button.

| State | What the fan sees |
|---|---|
| Loading | The match card as a skeleton (grey blocks in the card's shape). |
| Error (match data failed) | A card: "The match didn't load." with **Try again**. |
| Offline | A card: "You're offline. Connect once to load the match." |
| Rooms unavailable | "Watch with friends" is disabled with the caption "Rooms are down right now. You can still watch alone." |

### 2.2 Pick your world

Title: "What do you already love?" A two-column grid of six cards: Football, Formula 1, Chess, Bollywood, Gaming, Keep it plain. Each card has a simple line icon, the name, and a one-line sample of how it sounds. Tap to select (the card gets a light border and a tick), then **Continue**. Changeable later from the Match tab.

| State | What the fan sees |
|---|---|
| Returning fan | Their world is selected; the button reads "Keep football". |

### 2.3 Match (the main screen)

Mock-up: `design/screens/room.html`. Top to bottom:

1. **App bar:** brand, replay badge.
2. **Score card:** both teams with crests and scores; the chase strip.
3. **Pulse card:** the ring with its word and reason, "Stakes N of 100", and the win-chance bar.
4. **Chip row:** Focus, Skip ahead (to 8 seconds before the next moment), replay speed (1, 4 or 16 times), your world.
4a. **This over:** ball chips, with the time to the next ball.
5. **Just happened:** the latest moment card. Tap to open its explanation.
6. **Room row** (tier 2): reaction buttons, friends' avatars, the room code.
7. **Tab bar.**

Items 1 to 3 fit above the fold at 390 by 844.

| State | What the fan sees |
|---|---|
| Loading | Skeleton score card and a grey ring with "Loading". |
| Before the first ball | Ring calm, word "Soon", reason "First ball in 0:42". |
| Between innings | Ring calm, word "Break". Chase strip: "South Africa need 177 to win". |
| Alone in a room | The room row shows "Only you here" and a **Share code** button. The match runs anyway. |
| Friend left | Their avatar leaves the row. No message. |
| Card loading | The moment card appears at once with a plain title from code ("Wicket. SA 151/5."); the headline replaces it when ready. Never blank. |
| Card failed | The plain template. Nothing says it failed. |
| Connection lost (room) | The replay badge is joined by a "Reconnecting" badge. The clock keeps running locally. |
| Offline (solo) | Works. Cards come from the pre-generated file or templates. |
| Finished | Ring still and full, word is the result ("India won"), reason "by 7 runs". "Just happened" becomes "Match summary" linking to Moments. |

### 2.4 Focus mode

Mock-up: `design/screens/focus.html`. Reached from the Focus tab or the "Focus" chip on the Match tab. Focus is off until the fan taps **Turn Focus on**; call-backs interrupt only while it is on. A Pulse card in its calm state ("Calm. Keep working."), the **Call me back for** segmented control (The decider, Big moments, Everything), three stat tiles (call-backs so far, moments waiting, balls left), a notifications card, and the green button **I'm back. Catch me up**.

When a call-back fires: the Pulse card switches to its glowing state with "Look up" and the reason, the device vibrates once, and a system notification is sent if allowed.

| State | What the fan sees |
|---|---|
| Permission not asked | The notifications card reads "Get a buzz when it matters" with an **Allow** button. Asked only on this tap, never on load. |
| Permission refused | "Notifications are off. Clutch will flash this tab's title instead." Focus still works. |
| iPhone in a browser tab | "On iPhone, add Clutch to your Home Screen to get notifications," with the two steps. |
| Promise line | "About N call-backs in a match" appears under the control only once N is measured (PRD AC4.6). |
| Finished | The Pulse card shows the result; the button reads "See what I missed". |

### 2.5 Moments (the shelf)

Mock-up: `design/screens/shelf.html`. A hero card: a "3 missed" badge, "You missed three big moments", and the green button **Catch me up in 40 seconds**. Then the list of moment cards, newest first, each with a replay thumbnail, a Missed badge if the fan missed it, the kind, a swing chip, a title and the score change. Seen moments carry no extra badge.

Opening a moment shows its explanation card (2.6) with the mini replay at full width above the tiles.

| State | What the fan sees |
|---|---|
| Empty | Hero: "Nothing big yet." Caption: "When something happens, it's kept here so you can't miss it." No button. |
| Nothing missed | Hero: "You've seen it all." No card carries the Missed badge. |
| Card loading | The card opens with the replay and tiles; the analogy area shows skeleton lines. |
| Card failed | Plain template text. |
| Catch me up playing | Moments play one at a time as full explanation cards with a progress bar at the top and a **Stop** button. |
| Finished | The list, headed by a result card. |

### 2.6 An explanation card

Mock-up: `design/screens/card.html`. Hero header with a kind badge, the headline, who and how, and the player's jersey. Then three stat tiles, the world badge ("In football terms") with the analogy as a bold sentence and one supporting line, the before and after tile, and two buttons: **Say it plainly** and **Got it**.

| State | What the fan sees |
|---|---|
| Loading | Header, tiles and before and after at once (from code). The analogy as skeleton lines. |
| Failed, or no LLM | A template. Each world has one fixed analogy sentence per kind of moment, filled with the anchors by code, so the card still reads "In football terms". If that sentence would be untrue for this moment, the plain template is shown under "In plain words". The caption says the wording is a fixed template, not written by an AI model. |
| Plain | The world badge reads "In plain words"; the button becomes "In football terms". |

### 2.7 Back me up (tier 2)

Mock-up: `design/screens/backup.html`. A versus card with two jerseys, then compare rows (value, label, value, with bars), one of them marked as a fair point to the other side, then the closing line on the pulse-gradient quote card with "Based on N matches in our data". Buttons: **Another line** and **Drop it in the room** (green).

| State | What the fan sees |
|---|---|
| Picking | Two horizontal rows of small jersey cards, one per squad member: "Your player", "Their player". |
| Loading | Versus card and compare rows at once (from code). Quote card as a skeleton. |
| My player leads on nothing | A card: "On these numbers, theirs is ahead." with the closest row. No invented claim. |
| Too little data | A card: "We only have N matches for this player. Not enough to argue with." |
| Failed check | A template closing line. |

### 2.8 Room (tier 2)

A card with the room code in large type and a **Share** button, a list of friends here (avatar, name, their world), and the leaderboard for per-over calls. Before each over, a call card appears on the Match tab with three chips (0 to 5, 6 to 9, 10 or more).

| State | What the fan sees |
|---|---|
| Not in a room | Two cards: **Start a room**, and **Join with a code** (six boxes). |
| Wrong code | "No room with that code." under the boxes. |
| Rooms down | "Rooms are down right now. You can still watch alone." |

### 2.9 Reviewer demo

Opened by "Show me in 2 minutes". The clock is set a little before a moment the Pulse rises into, chosen by code (`lib/engine/demo.ts`), having skipped one earlier moment so the shelf has something missed. The Match screen with a coach card pinned above the tab bar: one sentence per step ("The ring fills when a ball could change the match.") with **Next** and **Skip demo**. A "Skip ahead" chip stays on the Match tab for the whole session and jumps to the next big moment.

## 3. Motion

| What | When | Spec |
|---|---|---|
| Pulse waves | Stakes above calm | Two rings expand from 0.82 to 1.22 scale and fade, offset by half a cycle. Cycle: building 3.2 s, high 1.8 s, decider 1.1 s. |
| Ring arc | Each ball | The arc animates to the new `stakes.pct` over 600 ms. |
| State change | Stakes cross a threshold | The card's glow fades in or out over 600 ms; the word cross-fades in 180 ms. |
| Moment card | A moment arrives | Slides in from below over 320 ms. |
| Explanation card | Opened | Rises as a sheet over 320 ms; leaves in 180 ms. |
| Reaction | Sent or received | The emoji floats up and fades over 900 ms. At most 8 on screen. |
| Mini replay | Opened, or Catch me up | The ball travels the drawn path over 2.4 s. Plays once; tap to replay. |
| Press | Any tap | 90 ms darken. |

Nothing else animates: no list entrance effects, no parallax, no looping decoration.

**Reduced motion:** waves become one still ring; the arc and the word still change. Cards appear without sliding. Reactions show briefly without moving. The mini replay shows its final frame.

## 4. Haptics and sound

- One vibration (200 ms) on a call-back. Two short ones (80, 60, 80 ms) for a decider. Nothing else vibrates.
- iPhone browsers do not support web vibration; the notification carries it there.
- No sound in tier 1.
- A "Vibrate on call-backs" switch, on by default.

## 5. Copy tone

Clutch talks like a friend who knows the game and doesn't show off.

- Short and plain. "Look up." "Their best hitter is gone." "Keep working."
- What happened first, why it matters second.
- No jargon without a reason. "Need 26 from 23 balls", not "required run rate".
- Never betting words: bet, odds, wager, gamble, jackpot, payout.
- Never "Live". The match is a replay and the badge says so.
- Errors say what happened and what to do. No apologies, no "Oops".
- Buttons say what they do: "Catch me up", "Drop it in the room", "Say it plainly".
- Sentence case.

Pulse words: **Calm** (keep working) · **Building** (something's starting) · **Look up** (this could change it) · **This is it** (the decider).

## 6. Accessibility

- Text contrast at least 4.5:1. `--faint` is only for captions.
- Touch targets at least 48 px (ball chips are display only).
- Visible focus ring on every control. Full keyboard use on laptop.
- The Pulse has a text equivalent and announces state changes politely (`aria-live="polite"`), once per change.
- Colour is never the only signal: chips carry a letter or number, swings carry a sign, missed moments say "Missed".
- Sheets trap focus and close with Escape.
- Respects `prefers-reduced-motion`.
- Reaction buttons have text labels for screen readers.
- Text scales to 200% without loss on the Match screen.

## 7. Reviewer demo flow (about two minutes)

1. Open the link. Tap **Show me in 2 minutes**. No sign-up, no permission prompt.
2. The Match screen opens a few balls before a big moment. The ring is calm. Coach card: "This ring is all you need to watch. It's calm, so you can look away."
3. The ring fills, the card glows, the word becomes **Look up**. Coach card: "This is the call-back. In Focus mode your phone would buzz now."
4. The ball happens. An explanation card rises, in football terms. Coach card: "Same facts, your language. Try Say it plainly."
5. The Moments tab opens: one moment marked Missed, with its drawing and swing.
6. The demo ends on the Match tab with the "Skip ahead" chip and one line: "Try Focus, or start a room and share the code."

The demo uses the same code paths as the product. It only moves the clock.
