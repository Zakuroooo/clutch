# Clutch: design system

The token file is [`design/tokens.css`](../design/tokens.css). It is the only place values are defined. The app imports it from `app/globals.css` and maps it into Tailwind (section 9). Components use tokens only; a hard-coded colour, size or duration fails design review.

Mock-ups: `design/screens/*.html`, screenshots beside them. Shared mock-up CSS, which is the reference for every component below: `design/screens/mock.css`.

## 1. The idea

**A match centre, built like the sports apps fans already use.** Dark surfaces, rounded cards, team crests, a floodlit hero, bold numbers, ball chips, a tab bar. The patterns are the familiar ones from fantasy and streaming apps, so nothing has to be learned.

**One thing is ours: the Pulse.** A glowing ring that fills and pulses with the stakes. It is the brand mark and the centre of the main screen. Its pink-to-orange gradient is used for stakes and nothing else.

This is the third direction. A scoreboard-style version and a minimal serif version were both rejected by Pranay ([DECISIONS/0009](DECISIONS/0009-match-centre-interface.md)).

## 2. Colour

| Token | Value | Use |
|---|---|---|
| `--bg` | `#080a10` | Page |
| `--surface` | `#131722` | Cards |
| `--surface-2` | `#1b2130` | Tiles, chips, quiet buttons, inside cards |
| `--surface-3` | `#252c3e` | Tracks, pressed |
| `--line` | `#262d3d` | Card borders, dividers |
| `--text` | `#f5f7fb` | Primary text |
| `--muted` | `#a0a9bb` | Secondary text |
| `--faint` | `#6b7487` | Captions only |
| `--pulse`, `--pulse-2`, `--pulse-grad` | `#ff2e63` to `#ff8a3d` | **Stakes only** |
| `--pulse-soft`, `--pulse-glow` | tints of `--pulse` | Hot badges, glow |
| `--calm` | `#3a4358` | The ring when nothing is at stake |
| `--go` / `--go-ink` | `#3ddc84` / `#04210f` | The primary button |
| `--four`, `--six`, `--wicket` | blue, violet, red | Ball chips and replay drawings |
| `--up`, `--down` | green, red | A swing for or against |
| `--team-a`, `--team-b` (+ `-2` shades) | from match data | Crests, jerseys, the win-chance bar |

**The Pulse rule.** The pulse gradient and `--pulse` mean "stakes". Allowed on: the ring, the brand dot, "hot" badges on moments, the missed badge and count, the Back me up quote card. Not on ordinary buttons, links or headings. The primary button is green so it never competes with the Pulse.

**Team colours** come from `timeline.json` and are set as CSS variables on the app root. Each team has a main and a darker shade for gradients.

There is no light theme.

## 3. Type

| Role | Family | Used for |
|---|---|---|
| Head | Outfit (500 to 800) | Headings, scores, every number, button labels, the Pulse word |
| Text | Inter (400 to 600) | Body, captions, chips, tabs |

Load both with `next/font/google`. Numbers use `font-variant-numeric: tabular-nums` so scores don't shift.

| Token | Size | Use |
|---|---|---|
| `--t-micro` | 11 px | Badges, tile labels, tab labels |
| `--t-small` | 13 px | Secondary text |
| `--t-body` | 15 px | Body, buttons |
| `--t-lead` | 17 px | Card and section titles |
| `--t-title` | 22 px | Headlines inside cards, tile numbers |
| `--t-score` | 32 px | Scores, card hero headlines, before and after |
| `--t-hero` | 40 px | The Pulse word |

Weights: 800 for scores and hero headlines, 700 for titles and buttons, 600 for chips. **No italics anywhere.** Sentence case; no all-caps labels except team codes inside crests.

## 4. Space, radius, elevation

4 px base: 4, 8, 12, 16, 20, 24, 32. Page gutter 16 px. Cards are 16 px inside. Minimum touch target 48 px.

| Token | Value | Use |
|---|---|---|
| `--r-chip` | 8 px | Swing chips, segmented options |
| `--r-tile` | 12 px | Stat tiles, buttons, thumbnails |
| `--r-card` | 18 px | Cards |
| `--r-sheet` | 24 px | Bottom sheets |
| `--r-full` | full | Crests, ball chips, badges, avatars, the ring |

Cards have a 1 px `--line` border and no shadow. Only two things glow: the Pulse (`--shadow-pulse`) and the brand dot.

## 5. Layout

- Mobile first, 390 px design width, holds at 360 px. On wider screens the app is a centred 430 px column.
- A screen is: app bar, a stack of cards with 12 px between them, section titles between groups, and the tab bar.
- **The main screen answers "should I look up?" above the fold:** score card, then the Pulse card, with nothing else before them.
- A fixed tab bar. Tier 1 has three tabs: Match, Focus, Moments. Back me up and Room join when tier 2 is built; a tab that leads nowhere is not shown. A count badge sits on Moments when anything is missed.
- A screen has at most one green button.

## 6. Imagery

Dream11 and JioHotstar use licensed player photographs. We have no such rights, and we do not generate likenesses ([DECISIONS/0003](DECISIONS/0003-no-real-player-faces.md)). The app gets its life from:

- **Jerseys.** Each player is a jersey in team colours with their number, drawn as SVG. This is the "picture" on player and Back me up cards.
- **Crests.** A round badge in team colours with the team code. No official logos.
- **The hero.** A floodlit ground drawn in CSS: two light sources at the top corners, a green glow from below, faint mowing stripes. Used behind the score card, card headers and the shelf header.
- **Replay thumbnails.** A small pitch-green tile with the side-on drawing of what happened.

No stock photos, no AI-generated people.

## 7. Motion

| Token | Value | Use |
|---|---|---|
| `--d-tap` | 90 ms | Press feedback |
| `--d-quick` | 180 ms | Chip and tab changes |
| `--d-sheet` | 320 ms | A card or sheet arriving |
| `--d-burst` | 900 ms | A reaction floating up |
| `--d-replay` | 2400 ms | One ball in the mini replay |
| `--breath-*` | 6 s / 3.2 s / 1.8 s / 1.1 s | The Pulse's waves, by state |

Rules are in [DRD.md](DRD.md) section 3.

## 8. Components

### AppBar
Brand dot (pulse gradient, glowing) and "Clutch" on the left. On the right, the **replay badge**: a pill reading "Replay of a real match" with a pulse-coloured dot. It is on every match screen and is never shortened to "Live".

### ScoreCard
A hero card with a wash of each team's colour from its own side, and two thin bars at the bottom showing how much of each innings has been bowled. Top row: competition and stage on the left, the over on the right. Middle: two teams facing each other, each with a crest, score (32 px, 800) with wickets smaller and muted, and a caption ("20 overs", "batting"). The side not batting is dimmed. Bottom: the chase strip on a dark blurred tile: "South Africa need **26** from **23** balls" and "5 wkts left".

States: loading shows crests with dashes; innings break shows the target in the strip; finished shows the result in the strip.

### PulseCard and Ring
The main element. A card with a "The Pulse" badge, "Stakes 92 of 100", the ring, and the win-chance bar.

- **Ring:** an SVG circle. The track is `--surface-3`; the arc is the pulse gradient and fills to `stakes.pct`. Around it is a dial of 60 ticks, lit to the same point as the arc, and inside it a soft dark disc, so the ring reads as an instrument and not a progress circle. Two thin waves expand outward and fade. The CSS class is `pulse-ring`, not `ring`: `ring` is a Tailwind utility that draws an outline.
- **Centre:** the word (40 px, 800) and one line of reason.
- **Card background:** a soft pink glow and a pink-tinted border when the state is high or decider.

| State | Arc | Waves | Word | Card |
|---|---|---|---|---|
| calm | `--calm`, short | none | Calm | plain |
| building | gradient | slow (3.2 s) | Building | plain |
| high | gradient | 1.8 s | Look up | glowing |
| decider | gradient, thicker | 1.1 s | This is it | glowing |
| still | as last state, no motion | none | the result | plain |

Sizes: 208 px, and 132 px (small, word only). Accessibility: `role="img"` with a full-sentence label, plus a polite live region that announces the word when the state changes.

### WinBar and WinWorm
Two segments in the two team colours that meet at the current win chance, with a small crest and percentage at each end. Always has an `aria-label` with the full sentence. Above it, inside the Pulse card, the **WinWorm**: the win-chance line for the match so far, with a dashed middle line. It shows how the match got here in one glance.

### BallChips ("This over")
Six 34 px circles. Bowled balls show the runs; a four is `--four`, a six is `--six`, a wicket is `--wicket` with "W". Balls to come are dashed outlines with their number. Extras add a chip.

### MomentCard
A card with a 76 px thumbnail (replay drawing on pitch green, or a jersey) and, beside it: a badge row (kind or Missed or Seen, plus the swing chip such as "SA -23%"), a 15 px bold title, and one muted line. The whole card is a button.

### SwingChip
The team code and the signed change in win chance. Green tint when it helped that team, red when it hurt.

### Card (explanation)
One tall card. Hero header: kind badge, headline (32 px, 800), who and how, and the player's jersey on the right. Body: three stat tiles; a "In football terms" badge with the analogy as a 22 px bold sentence and one muted supporting line; the before and after tile (71% to 48%); two buttons ("Say it plainly" quiet, "Got it" green); a caption that the numbers are checked.

### StatTile
A `--surface-2` tile with a 22 px bold number and an 11 px label. Used in rows of three.

### BeforeAfter
A tile with two big percentages and an arrow between them. The "after" number is red or green by direction.

### Buttons
- **Go:** green fill, dark text, 48 px, 12 px radius. One per screen.
- **Ghost:** `--surface-2` fill, 1 px border.
- Pressed: 4% darker, 90 ms.

### Chips and Segmented
Chips are 36 px pills; the selected chip is inverted (light fill, dark text). The Focus selector is a three-part segmented control on a `--surface-2` track with the selected part inverted.

### Badges
24 px pills. Kinds: neutral, replay (with dot), hot (pink tint), missed (solid pink), world (violet tint).

### Reactions
44 px round buttons with an emoji: fire, shocked, clap, plus one more to be chosen. Emoji are used only as reactions, which is what they are for, never as interface icons. A sent reaction floats up every screen in the room and fades.

### Avatars
28 px circles with an initial on a colour picked by hashing the name. Overlapping row, up to five, then "+N".

### Jersey (PlayerArt)
An SVG shirt in a team-colour gradient with a collar, sleeve cuffs, darker side panels and a light sash, and the number in white (Outfit 800). When we have no number for a player it shows their initials, never a guessed number. Used at 104 px in card headers, larger on Back me up, and 76 px as a thumbnail. Never a face, photograph or silhouette.

### VersusCard (Back me up)
A hero with two jerseys and a "VS" disc between them, each with the player's name and a "Yours" or friend's-name badge. Under it, **CompareRows**: my value, the label, their value, with two bars growing from the centre; the losing side's bar is grey. The fair-point row is labelled as such.

### QuoteCard
The closing line on a pulse-gradient card, 22 px bold white, with "Based on N matches in our data" under it. The only filled gradient card in the app.

### MiniReplay
A side-on SVG: ground line, stumps, bat, a dashed delivery path, and the outcome path and ball in the outcome's colour (`--six`, `--four`, `--wicket`, or pulse for a catch). One drawing per outcome kind: dot, runs, four, six, bowled, caught, lbw, run out, stumped, wide, no-ball. Nothing shows direction or position, because the data has none. Wherever it is shown large, it carries the caption "A drawing of what was recorded. Not the ball's real path."

### TabBar
Tabs with a line icon (inline SVG, 1.8 px stroke) and a label. Tier 1: Match, Focus, Moments. The active tab is `--text`, others `--faint`. Blurred dark background, 1 px top border, safe-area padding.

## 9. Using the tokens in the app

`app/globals.css`:

```css
@import "tailwindcss";
@import "../design/tokens.css";

@theme inline {
  --color-bg: var(--bg);
  --color-surface: var(--surface);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-line: var(--line);
  --color-text: var(--text);
  --color-muted: var(--muted);
  --color-faint: var(--faint);
  --color-pulse: var(--pulse);
  --color-pulse-2: var(--pulse-2);
  --color-go: var(--go);
  --color-four: var(--four);
  --color-six: var(--six);
  --color-wicket: var(--wicket);
  --color-team-a: var(--team-a);
  --color-team-b: var(--team-b);
  --font-head: var(--font-head);
  --font-text: var(--font-text);
  --radius-chip: var(--r-chip);
  --radius-tile: var(--r-tile);
  --radius-card: var(--r-card);
}
```

This is Tailwind v4 syntax. Check the current Tailwind docs before writing it (docs-lookup MCP server). Tailwind's default colour palette is not used.

## 10. Design review checklist

Used by the `design-review` skill and the `design-critic` agent.

1. Does it look like a finished sports app, or like a web page with text on it? Cards, crests, jerseys, chips and the tab bar must be present.
2. Are the score card and the Pulse both visible without scrolling at 390 by 844?
3. Is the pulse gradient used for anything that is not stakes? Is there more than one green button?
4. Is every card aligned to the 16 px gutter, with 12 px gaps and consistent radii?
5. Any italic text, serif face, all-caps label or hard-coded value?
6. Does every number sit in the head face with tabular figures?
7. Is the replay badge visible? Does anything say or imply "live"?
8. Any face, photograph, official logo or AI-generated person?
9. Does every state in DRD section 2 exist, including loading and empty?
10. Contrast, focus ring, 48 px targets, reduced motion.
11. Any number on screen that is not from data?

## 11. Added while building (15 Nov)

Tokens added to `design/tokens.css`, each because a component needed a colour that had no token: `--page-edge`, `--on-color`, `--hot-ink`, `--world`, `--world-ink`, `--four-ink`, `--six-ink`, `--hero-top`, `--hero-bottom`, `--floodlight`, `--grass`, `--pitch`, `--pitch-2`, `--shadow-art`, `--shadow-sheet`. Tints are made with `color-mix()` from a token, so no component or stylesheet rule holds a literal colour.

Components added: **Chip row** on the Match tab (Focus, Skip ahead, replay speed, your world); **Banner** (the in-page call-back on the Focus screen, pulse-tinted because it is a stakes signal); **Coach card** (the demo guide: inverted, above the tab bar, or at the top when a card is open so it never covers the card's buttons); **Sheet** (the explanation card rises from the bottom, traps focus, closes with Escape); **ThumbChart** (a small rising or falling line for moments that are not one ball).

A test (`components/pulse.test.tsx`) fails if a pulse token is used outside the ring, the Pulse card, the brand dot, the hot, missed and replay badges, the missed count, the call-back banner or the "moments waiting" number.
