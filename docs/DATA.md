# Clutch: data

## 1. Source

All match data comes from **Cricsheet** (https://cricsheet.org), a free, volunteer-run collection of ball-by-ball cricket data.

## 2. Licence (checked on cricsheet.org, 13 Nov 2026)

From https://cricsheet.org/licensing/:

- The data (JSON and CSV match data, and the people and venue registers) is under the **Open Data Commons Attribution License (ODC-By) v1.0**.
- Only the XML match data is under Creative Commons Attribution 4.0. We do not use the XML files.

**What ODC-By allows:** copying, sharing, adapting the data and building things from it, for any purpose.

**What it requires:**
1. **Credit the source** in any public use of the data or of work produced from it.
2. If we share the data or an adapted version, **make its licence clear** and keep the original notices.

**What this means for Clutch:** training a model on the data, deriving stats from it, and shipping a processed copy of one match inside the app are all allowed, provided we credit Cricsheet and state the licence. We do this in three places:

- The app's About line and the README: "Match data from Cricsheet (cricsheet.org), used under the Open Data Commons Attribution License v1.0."
- `data/ATTRIBUTION.md`, next to the processed files, saying they are adapted from Cricsheet and are under ODC-By 1.0.
- `match.source` and `match.licence` inside every `timeline.json`.

**Limits of this check.** The licensing page gives a summary and links to the full licence; the summary was read, the full legal text was not reviewed by a lawyer. The site itself ("Site © Cricsheet. All rights reserved") is separate from the data; we copy no site text or design. Cricsheet's data is compiled by volunteers and is not an official record of any cricket board.

**Not covered by this licence:** team names and colours, tournament names and logos, and players' likenesses belong to their owners. We use team names as facts, plain colours, and no logos or faces ([DECISIONS/0003](DECISIONS/0003-no-real-player-faces.md)).

## 3. Files used

From https://cricsheet.org/downloads/ (JSON format):

| File | Contents | Count shown on the site, 13 Nov 2026 |
|---|---|---|
| `t20s_male_json.zip` | Men's T20 internationals | 3,649 |
| `ipl_json.zip` | Indian Premier League | 1,243 |

Download URL pattern: `https://cricsheet.org/downloads/<file>`. Counts change as Cricsheet adds matches; the pipeline records the actual count and the download date in `model/artifacts/data_report.json`. Further men's T20 leagues (BBL, PSL, CPL and others are listed on the same page) can be added if more data helps; any addition is recorded here.

Raw zips go in `model/data/raw/`, which is git-ignored. They are never committed.

## 4. The JSON format (version 1.3.0)

Documented at https://cricsheet.org/format/json/. The parts we read:

```
meta.data_version, meta.created, meta.revision
info.dates[]                 match dates (first one is the start date, used for the split)
info.match_type              "T20" or "IT20" for our files
info.gender                  "male"
info.teams[]                 the two team names
info.overs                   20
info.outcome                 winner, by {runs|wickets}, result ("tie", "no result"), method ("D/L"), eliminator
info.players{team: [names]}  squads, used for Back me up
info.registry.people{name: id}   stable 8-character ids for people
info.toss, info.venue, info.city, info.event, info.season
innings[]                    in order of play
  .team                      batting team
  .target {overs, runs}      on the chasing innings
  .super_over                true for super overs (excluded)
  .overs[]
    .over                    0-based over number
    .deliveries[]
      .batter, .bowler, .non_striker
      .runs {batter, extras, total}
      .extras {wides|noballs|byes|legbyes|penalty}
      .wickets[] {kind, player_out, fielders[{name}]}
```

Things the format does **not** contain, which shape the product:

- **No time for each ball.** The replay timeline is synthetic (TRD section 3.1).
- **No ball tracking:** no pitch location, no shot direction, no fielder positions. The mini replay therefore draws only the kind of outcome ([DECISIONS/0008](DECISIONS/0008-schematic-replay.md)).
- **No jersey numbers.** These are typed by hand into `data/jerseys.json` from a public squad list. The file is keyed by match id, then player name. A player with no entry shows initials on the jersey, never a guessed number.

## 5. Cleaning

Done in `model/src/parse.py`; each rule's count is written to `data_report.json`.

| Step | Rule |
|---|---|
| Keep | `match_type` in {T20, IT20}, `gender` = male, `overs` = 20, exactly 2 non-super-over innings |
| Drop | `outcome.result` present (tie, no result), `outcome.method` present (rain rules), `outcome.eliminator` or `bowl_out` present, any innings with a `target.overs` under 20 |
| Legal ball | A delivery with no `wides` and no `noballs` in `extras` |
| Wickets | Count one per entry in `wickets`, except `retired hurt` |
| Player identity | Use `info.registry.people` ids, not names, to join a player across matches |
| Names | Display names are Cricsheet's (for example "V Kohli") |

## 6. Splits

By match start date: train 70%, validation 15%, test 15% ([MODEL.md](MODEL.md) section 4). The replay match is in the test split. Eval cases for the cards come from other test-split matches ([EVALS.md](EVALS.md) section 2).

Player stats for Back me up are counted over all matches in our files, because they are counts, not predictions. Each card says "Based on N matches in our data".

## 7. The replay match

Chosen by Pranay from the test split. `model/src/pick_replay.py` lists test-split matches ranked by how much the win chance swung, so he can pick one he remembers. Its Cricsheet id is set in `data/replay.json`:

```json
{ "match_id": "", "chosen_by": "Pranay", "chosen_on": "" }
```

The ranked list is saved to `model/artifacts/replay_candidates.json`. Pranay chose match 1529301, Punjab Kings v Mumbai Indians (Indian Premier League, 14 May 2026), on 15 Nov 2026: a quiet first half and a tight finish, so the Pulse goes from calm to hot. Changing the match is: edit the id, `make export`, `npm run moments`, `npm run pregen`.

The mock-ups use India v South Africa as sample content with sample numbers; that is not a decision about the replay match.

## 8. Files we publish

Committed to the repository and served by the app, all adapted from Cricsheet under ODC-By 1.0:

- `data/matches/<match_id>/timeline.json`, `alerts.json`, `moments.json`, `cards.json`, `players.json`
- `data/thresholds.json`
- `model/artifacts/*.json` and `calibration.png` (aggregate results only)
