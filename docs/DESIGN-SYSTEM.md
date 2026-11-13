# Clutch: design system

The token file is [`design/tokens.css`](../design/tokens.css). It is the only place values are defined. The app imports it from `app/globals.css` and maps it into Tailwind (section 8). Components use tokens only; a hard-coded colour, size or duration fails design review.

Mock-ups: `design/screens/*.html`, screenshots beside them.

## 1. The idea

**One object on an empty screen.** Most sports apps stack a scorecard, tabs, tickers and banners. Clutch shows a dial, one line of score, and three words at the bottom. Everything else appears only when something happens, and leaves when you dismiss it.

The look is closer to a watch face than a sports app: near-black ground, a hairline dial, a high-contrast serif, one colour. Quiet is the point. The fan is doing something else.

## 2. Colour

| Token | Value | Use |
|---|---|---|
| `--night` | `#0a0f0d` | The whole screen |
| `--rule` | `#27342e` | The few hairlines there are |
| `--rule-strong` | `#3d4d45` | Dial ticks not yet bowled, the win-chance track |
| `--chalk` | `#f1ede2` | Primary text, bowled ticks, the one solid button |
| `--dust` | `#9ba69f` | Secondary text |
| `--ash` | `#6c7872` | Captions, the replay note. Never body text |
| `--pulse` | `#ff2f6d` | Stakes only (see below) |
| `--pulse-glow` | 35% of `--pulse` | The dial's halo |
| `--team-a`, `--team-b` | from match data | Player art only |

`--turf`, `--turf-2` and `--pulse-dim` exist in the file for pressed states and are otherwise unused.

**The Pulse rule.** `--pulse` means "stakes". It is allowed on: the dial's hand and halo, the marks for missed moments (on the dial and the over number on the shelf), the swing segment of a win-chance line, and the missed count. Nowhere else. Buttons, links, headings and selection never use it. If a second thing on screen is pink without being about stakes, it is a bug.

**Team colours** appear only as player art. The room screen has no team colour at all.

There is no light theme.

## 3. Type

Two families, clearly different.

| Role | Family | Used for |
|---|---|---|
| Display | Bodoni Moda (400, 500; roman and italic; optical size axis) | The word in the dial, headlines, the analogy, scores and all data numerals |
| Text | Schibsted Grotesk (400, 500) | Small text, controls, captions |

Load both with `next/font/google`. Italic carries voice: the dial's word, the analogy line and the closing line are italic; facts and headlines are roman.

| Token | Size | Use |
|---|---|---|
| `--t-micro` | 12 px | Replay note, captions |
| `--t-small` | 14 px | Secondary text, controls |
| `--t-body` | 16 px | Body |
| `--t-lead` | 22 px | Display-face lines: the "just happened" line, selector words |
| 26 px | `1.625rem` | The analogy (display italic, line-height 1.28) |
| `--t-title` | 32 px | The score, shelf headlines, fact numerals |
| `--t-headline` | 44 px | Card headline, page titles |
| `--t-pulse` | 56 px | The word in the dial |
| `--t-giant` | 144 px | Jersey number on player art |

Rules:
- Bodoni's thin strokes vanish when small. Never set the display face below 22 px.
- Display line-height 1.0 to 1.05; body 1.55.
- Sentence case. Headlines end with a full stop, like a spoken line. No all-caps, no letter-spaced labels.
- Lining figures for data. Build task: confirm Bodoni Moda has tabular figures; if not, give score digits a fixed `ch` width so they don't shift.

## 4. Space and layout

4 px base: 4, 8, 12, 16, 24, 32, 48, 64. Side padding 24 px. Minimum touch target 48 px.

- **Empty space is the layout.** Regions are separated by space first, a hairline only when two lists of text meet. No boxes, no cards, no panels, no shadows.
- A screen has at most: the top line, one main thing, and the bottom bar.
- The dial and score are centred. Reading screens (card, shelf, Back me up) are left-aligned.
- The bottom bar is fixed, with safe-area padding. It holds at most three words, or one solid button and one word.
- Mobile first: design width 390 px, must hold at 360 px. On wider screens the app stays a centred 430 px column.

## 5. Shape

| Token | Value | Use |
|---|---|---|
| `--r-0` | 0 | Everything by default |
| `--r-button` | full | The one solid button per screen |
| `--r-round` | full | The dial, friend markers |

There are no rounded rectangles.

## 6. Motion

| Token | Value | Use |
|---|---|---|
| `--d-tap` | 90 ms | Press feedback |
| `--d-quick` | 180 ms | Word cross-fade, things leaving |
| `--d-sheet` | 320 ms | A card arriving |
| `--d-burst` | 900 ms | A reaction crossing the screen |
| `--d-replay` | 2400 ms | One ball in the mini replay |
| `--breath-calm` / `-building` / `-high` / `-decider` | 6 s / 3.2 s / 1.8 s / 1.1 s | One breath of the halo |

Rules for when motion is allowed are in [DRD.md](DRD.md) section 3.

## 7. Components

Reference markup and CSS: `design/screens/mock.css` and `dial.js`.

### Dial (the Pulse)
The brand mark and the main interface element. It carries three things at once.

- **Progress.** One tick per ball of the current innings (120 in a T20), starting at 12 o'clock, clockwise. Bowled ticks are chalk at 55% opacity; ticks to come are `--rule-strong`. A small `--pulse` dot (the hand) sits at the current ball.
- **Moments.** A moment's tick is longer. Missed moments are `--pulse`; seen moments are chalk. Tapping the dial opens the shelf.
- **Stakes.** A soft halo inside the ring breathes. No halo when calm; faster and brighter as stakes rise. The word in the centre says the state.

Props: `balls`, `now`, `moments: { ball, missed }[]`, `state: 'calm' | 'building' | 'high' | 'decider' | 'still'`, `word`, `reason`, `size: 'full' | 'small'`.

| State | Halo | Word |
|---|---|---|
| calm | none | "Calm", in dust |
| building | 40% strength, 3.2 s breath | "Building" |
| high | full, 1.8 s | "Look up" |
| decider | full, 1.1 s, hand dot doubles in size | "This is it" |
| still | none, no motion | the result, or the state word under reduced motion |

Sizes: full 304 px (`--dial`), small 136 px (word only). Drawn as one SVG; ticks are 0.6 px lines in a 200-unit view box, moment ticks 1.1 px.

Accessibility: `role="img"` with a label such as "Stakes are high. Look up. 97 of 120 balls bowled. 3 moments missed." A visually hidden live region announces the word when the state changes.

### ScoreLine
One centred line in the display face at 32 px: the batting team's full name and score, wickets in dust ("South Africa 151/5"). One line under it in small dust text: "need 26 from 23 balls" in a chase, or "over 12.4" in the first innings. The other team's score is not shown on the room screen; it is in the under-line at the innings break and on the finished screen.

### JustHappened
Appears above the bottom bar when a moment or new batter arrives, and stays until the next one. A hairline, then the headline in display italic at 22 px, then one small dust line. The whole thing is a button that opens the card.

### BottomBar
Words, not buttons: 14 px, dust; the active or important one in chalk. A count beside "Missed" is `--pulse`. Each word has a 48 px touch height.

### PillButton
The only solid control. Chalk fill, night text, weight 500, 48 px high, fully rounded. At most one per screen, always in the bottom bar.

### Card
A full screen, not a sheet. Vertically centred: small kicker ("Over 16.1"), headline (44 px roman), the analogy (26 px italic), one fact line (16 px dust), the win-chance line. Bottom bar: "Say it plainly" and the "Got it" pill. The top line names the world: "In football terms".

New-batter cards put PlayerArt above the headline.

### WinChanceLine
A 1 px track. A 3 px chalk line from the left to the smaller of before and after. The swing between before and after is 3 px `--pulse`. Under it: the team's name with "chance" on the left; "71 to 48" on the right, numerals in the display face. Always has an `aria-label` with the full sentence.

### MomentRow (shelf)
Two columns: the over in small text (ash; `--pulse` if missed), then the headline in the display face at 32 px with the score change under it. Seen moments have a dust headline. Rows are separated by a hairline. Opening a row shows MiniReplay and WinChanceLine in place.

### MiniReplay
A thin-line SVG, side-on: ground line, two sets of stumps, bat. The delivery is a dashed ash path; the outcome segment and the ball are `--pulse`. 1 px strokes.

One drawing per outcome kind: dot, runs, four (along the ground to a rope mark), six (over the rope mark), bowled, caught, lbw, run out, stumped, wide, no-ball. The kind comes from the data. Nothing shows direction or position, because the data has none.

Caption, always present: "A drawing of what was recorded. Not the ball's real path."

### Selector (Focus bar)
Three options as words in a row, display face 22 px, between two hairlines. Unselected: ash roman. Selected: chalk italic. Uses `aria-pressed`.

### PlayerArt
A 3:4 panel of flat team colour. The jersey number in display italic at 144 px, 28% opacity, top centre. Name in the display face at the bottom, a small role line above it. Nothing else. Never a photograph, portrait, silhouette or generated likeness.

### FactRow (Back me up)
Three columns: my value, the label (small, dust, centred), their value. Values in the display face at 32 px; the lower value is ash. Hairline under each row.

### Reactions (tier 2)
"React" in the bottom bar opens four words in the display italic: "Six!", "Out!", "No!", "Yes!". Tapping one sends it; on every screen the word rises from the bottom and fades. No emoji.

### FriendMarker
22 px circle, hairline border, the friend's initial at 10 px. Overlapping row in the top line, up to five, then "+N".

### Notice lines
- Replay note: micro, ash, top left of every match screen.
- Connection line: replaces the right side of the top line with "Reconnecting" while the room is offline.

## 8. Using the tokens in the app

`app/globals.css`:

```css
@import "tailwindcss";
@import "../design/tokens.css";

@theme inline {
  --color-night: var(--night);
  --color-rule: var(--rule);
  --color-rule-strong: var(--rule-strong);
  --color-chalk: var(--chalk);
  --color-dust: var(--dust);
  --color-ash: var(--ash);
  --color-pulse: var(--pulse);
  --color-team-a: var(--team-a);
  --color-team-b: var(--team-b);
  --font-display: var(--font-display);
  --font-text: var(--font-text);
}
```

This is Tailwind v4 syntax. The build agent must check the current Tailwind docs before writing it (docs-lookup MCP server) and adjust if it has changed. Tailwind's default colour palette is not used.

## 9. Design review checklist

Used by the `design-review` skill and the `design-critic` agent.

1. Count the things on the screen. More than the top line, one main thing and the bottom bar? Remove something.
2. Is `--pulse` used anywhere that is not stakes?
3. Can the dial's state be read in two seconds at arm's length?
4. Any box, card, panel, shadow, gradient, blur, rounded rectangle or emoji?
5. Is the display face used below 22 px?
6. Is every action reachable with one thumb at 390 by 844?
7. Is any value hard-coded that has a token?
8. Does anything move that is not in the motion table?
9. Is the replay note visible?
10. Does every state in DRD section 2 exist?
11. Contrast, focus ring, 48 px targets, reduced motion.
12. Any number on screen that is not from data? Any face?
