# Clutch: design requirements

Tokens and component specs are in [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md). Static mock-ups and screenshots are in `design/screens/`.

## 1. Principles

1. **One object on an empty screen.** The room is a dial, one line of score and three words. If a screen feels like a sports app (scorecards, tabs, tickers, banners), it is wrong. This was Pranay's direction after the first mock-ups: classy, minimal, not cluttered.
2. **Two-second glance.** The fan is doing something else. One look at the dial answers "should I look up?"
3. **Things appear when they matter and then leave.** A card takes the whole screen when a moment happens, and goes when dismissed. Nothing sits on screen waiting to be useful.
4. **The dial is the brand.** It shows the match's progress, the stakes and the moments you missed, in one object. It holds the only saturated colour.
5. **One thumb.** Every action is in the bottom bar.
6. **Motion means something.** The dial's halo breathes with the stakes, a card arrives, a reaction crosses the screen. Nothing else animates.
7. **Honest on its face.** "Replay of a real match, running as live" is always on screen. A drawing is labelled a drawing. A number that is not measured is not shown.
8. **Never a face.** Players are a team colour and a jersey number.

Avoided on purpose: gradients, glass, emoji as icons, cards and panels, feature grids, a default font stack, rounded rectangles, anything that looks like a streaming or score app.

## 2. Screens and their states

Every screen handles: loading, empty, error, offline, finished. "Offline" means no network. Solo mode keeps working offline once the match data has loaded.

### 2.1 Start

A small calm dial, one sentence in the display face ("Get on with your work. Clutch calls you back when it matters."), and in the bottom bar two choices: the pill **Watch alone** and the word **With friends**. Under the sentence, a text link: "Show me in 2 minutes".

| State | What the fan sees |
|---|---|
| Loading | The dial with no ticks lit. Choices appear when match data is ready. |
| Error (match data failed) | "The match didn't load." and a **Try again** pill. |
| Offline | "You're offline. Connect once to load the match." |
| Rooms unavailable | "With friends" is in ash and, when tapped, says "Rooms are down right now. You can still watch alone." |

### 2.2 Pick your world

A question in the display face: "What do you already love?" Six answers as large words, one per line, in the display face: Football, Formula 1, Chess, Bollywood, Gaming, None of these. Tapping one selects it (it turns italic) and moves on. Nothing else on the screen. Changeable later.

| State | What the fan sees |
|---|---|
| Returning fan | Their world is already italic; the bottom bar has a "Keep football" pill. |

### 2.3 The room (the main screen)

Mock-up: `design/screens/room.html`.

1. **Top line:** the replay note; friends' initials on the right (tier 2).
2. **The dial,** centred, with its word and one line of reason.
3. **The score line:** "South Africa 151/5", and under it "need 26 from 23 balls".
4. **Just happened** (only after a moment): one italic line and "See why".
5. **Bottom bar:** Focus, React (tier 2), Missed with its count.

That is the whole screen. There is no over-by-over strip, no second team row, no meter, no tabs.

| State | What the fan sees |
|---|---|
| Loading | Dial with unlit ticks, the word "Loading" in dust. No spinner. |
| Before the first ball | Calm. Word "Soon". Reason "First ball in 0:42". |
| Between innings | Calm. Word "Break". Score line: "India 176/7"; under it "South Africa need 177". |
| Alone in a room | Under the score: "Only you here. Share KXT4PM." Tapping copies the code. The match runs anyway. |
| Friend left | Their initial leaves the top line. No message. |
| Card loading | "Just happened" shows the plain fact at once ("Wicket. 151/5."). The italic headline replaces it when ready. Never blank. |
| Card failed | The plain template. Nothing says it failed. |
| Connection lost (room) | The right of the top line says "Reconnecting". The clock keeps running locally. |
| Offline (solo) | Works. Cards come from the pre-generated file or templates. |
| Finished | Dial still, every tick lit. Word is the result ("India won"), reason "by 7 runs". Bottom bar: "Watch again" and "Missed". |

### 2.4 Focus mode

Mock-up: `design/screens/focus.html`. The dial in its calm state, "Keep working", one line with the score, the selector ("Call me back for": The decider, Big moments, Everything), and one pill: **I'm back. Catch me up**.

When a call-back fires: the halo appears, the word becomes "Look up", the reason says why, the device vibrates once, and a system notification is sent if allowed.

| State | What the fan sees |
|---|---|
| Permission not asked | A line above the selector: "Let Clutch notify you", with **Allow**. Asked only on this tap, never on load. |
| Permission refused | "Notifications are off. Clutch will flash this tab's title instead." Focus still works. |
| iPhone in a browser tab | "On iPhone, add Clutch to your Home Screen to get notifications." with the two steps. |
| Promise line | "About N call-backs in a match" appears only once N is measured (PRD AC4.6). |
| Finished | "Match over. India won by 7 runs. Five moments are waiting." |

### 2.5 Moment Shelf

Mock-up: `design/screens/shelf.html`. A headline that says the state in words ("You missed three."), then the moments, newest first: the over on the left (pink if missed), the headline large, the score change under it. The newest missed moment is open, showing the mini replay and the win-chance line. Bottom bar: the pill **Catch me up in 40 seconds**.

| State | What the fan sees |
|---|---|
| Empty | Headline: "Nothing big yet." One line: "When something happens, it's kept here so you can't miss it." |
| Nothing missed | Headline: "You've seen it all." Moments listed in dust. No pill. |
| Card loading | The row opens with the replay and win-chance line; the analogy shows as two ash bars until ready. |
| Card failed | Plain template text. |
| Catch me up playing | One moment as a full-screen card at a time, a thin progress line at the top, "Stop" in the bottom bar. |
| Finished | The list, with the result as the first row. |

### 2.6 A card

Mock-up: `design/screens/card.html`. A full screen. Over number, headline, the analogy in italic as the main text, one fact line, the win-chance line. Bottom bar: "Say it plainly" and the pill **Got it**. The top line says which world: "In football terms".

New-batter cards have player art above the headline.

| State | What the fan sees |
|---|---|
| Loading | Headline and fact line at once (from code). The analogy as ash bars. |
| Failed | The template card. |
| Plain | The analogy is replaced by the plain line; the bar word becomes "In football terms". |

### 2.7 Back me up (tier 2)

Mock-up: `design/screens/backup.html`. Two panels of team colour with jersey numbers, up to three fact rows (my value, label, their value), the closing line in italic, and "Based on N matches in our data". Bottom bar: "Another line" and the pill **Drop it in the room**.

| State | What the fan sees |
|---|---|
| Picking | "Who's yours?" and the squad as a list of names in the display face. Then "Who's theirs?" |
| Loading | Art and fact rows at once (from code). Closing line as ash bars. |
| My player leads on nothing | "On these numbers, theirs is ahead." and the closest comparison. No invented claim. |
| Too little data | "We only have N matches for this player. Not enough to argue with." |
| Failed check | A template closing line. |

### 2.8 Reviewer demo

The room screen. The "just happened" area carries the guide instead: one sentence per step ("The ring wakes up when a ball could change the match.") with "Next" in the bottom bar. "Skip ahead" stays in the bottom bar for the whole session and jumps to the next big moment.

## 3. Motion

| What | When | Spec |
|---|---|---|
| Halo breathing | While stakes are above calm | Opacity 0.35 to 1, scale 0.97 to 1.02. One breath: building 3.2 s, high 1.8 s, decider 1.1 s. |
| State change | Stakes cross a threshold | Halo fades in or out over 600 ms; the word cross-fades in 180 ms. |
| Hand | Each ball | The dot moves one tick; the tick lights. 180 ms. |
| Card | A moment is opened or arrives | Fades up 12 px over 320 ms; leaves in 180 ms. |
| Reaction | A reaction arrives | The word rises and fades over 900 ms. At most 8 on screen. |
| Mini replay | Moment opened, or Catch me up | The ball travels the drawn path, 2.4 s. Plays once; tap to replay. |
| Press | Any tap | Opacity dip, 90 ms. |

Nothing else animates. No list entrances, no parallax, no hover effects.

**Reduced motion:** the halo is shown still at a strength that matches the state; the word and the hand still change. Cards appear without movement. Reactions show as a brief still word. The mini replay shows its final frame.

## 4. Haptics and sound

- One vibration (200 ms) on a call-back. Two short ones (80, 60, 80 ms) for a decider. Nothing else vibrates.
- iPhone browsers do not support web vibration; the notification carries it there.
- No sound in tier 1.
- A "Vibrate on call-backs" switch, on by default.

## 5. Copy tone

Clutch talks like a friend who knows the game and doesn't show off.

- Short and plain. "Look up." "Their best hitter is gone." "Keep working."
- Headlines are spoken lines and end with a full stop.
- What happened first, why it matters second.
- No jargon without a reason. "Need 26 from 23", not "required run rate".
- Never betting words: bet, odds, wager, gamble, jackpot, payout.
- Errors say what happened and what to do. No apologies, no "Oops".
- Controls say what they do: "Catch me up", "Drop it in the room", "Say it plainly".
- Sentence case. No all-caps.

Dial words: **Calm** (keep working) · **Building** (something's starting) · **Look up** (this could change it) · **This is it** (the decider).

## 6. Accessibility

- Text contrast at least 4.5:1. `--ash` is only for captions and the replay note.
- Touch targets at least 48 px high, including the bottom-bar words.
- Visible focus ring (1 px chalk, 4 px offset) on every control. Full keyboard use on laptop.
- The dial has a text equivalent and announces state changes politely (`aria-live="polite"`), once per change.
- Colour is never the only signal: the dial always has a word; missed moments are counted in words ("You missed three").
- Cards trap focus and close with Escape.
- Respects `prefers-reduced-motion`.
- The display face is never set below 22 px, where its thin strokes become hard to read.
- Text scales to 200% without loss on the room screen.

## 7. Reviewer demo flow (about two minutes)

1. Open the link. Tap **Show me in 2 minutes**. No sign-up, no permission prompt.
2. The room opens a few balls before a big moment. The dial is calm. Guide: "This is all you need to watch. It's calm, so you can look away."
3. The halo appears and the word becomes **Look up**. Guide: "This is the call-back. In Focus mode your phone would buzz now."
4. The ball happens. A card fills the screen in football terms. Guide: "Same facts, your language. Try Say it plainly."
5. The shelf opens: one moment marked missed, with its drawing and the win-chance swing.
6. The demo ends on the room with "Skip ahead" and one line: "Try Focus, or open a room and share the code."

The demo uses the same code paths as the product. It only moves the clock.
