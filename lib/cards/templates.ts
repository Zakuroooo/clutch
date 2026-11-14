/**
 * Fallback cards (docs/CARDS.md section 8), built by code from the facts, so they are
 * always correct. Used when the LLM is off, slow, or fails the check.
 *
 * Two layers: the plain card from the spec, and a fixed analogy sentence per world and
 * kind, filled with the anchors. Both go through the same check as an LLM card.
 */
import type { World } from "@/lib/engine/types";
import type { Anchors } from "./anchors";
import type { CardText, Facts } from "./schema";

function chanceLine(f: Facts, span: "ball" | "over"): string {
  const when = span === "over" ? "in that over" : "on that ball";
  const owner = f.chance_team.endsWith("s") ? `${f.chance_team}'` : `${f.chance_team}'s`;
  return `${owner} chance of winning went from ${f.chance_before} to ${f.chance_after} out of 100 ${when}.`;
}

function watchLine(f: Facts): string | null {
  const inChase =
    f.kind !== "innings_end" && f.kind !== "result" && f.needed !== null && f.balls_left !== null;
  if (!inChase || f.needed! <= 0) return null;
  return `${f.batting_team} need ${f.needed} from ${f.balls_left} ball${f.balls_left === 1 ? "" : "s"}.`;
}

/** The plain template card. Always passes the check with world "plain". */
export function plainTemplate(f: Facts): CardText {
  const watch = watchLine(f);
  const used = (...fields: (keyof Facts)[]) => [
    ...fields,
    ...(watch ? (["needed", "balls_left"] as const) : []),
  ];
  switch (f.kind) {
    case "wicket_big":
      return {
        headline: `${f.wicket!.player_out} is out.`,
        what: `${f.wicket!.player_out} is out for ${f.batter_runs} off ${f.batter_balls}. ${f.batting_team} are ${f.score_after}.`,
        why: chanceLine(f, "ball"),
        watch,
        used_facts: used(
          "wicket",
          "batter_runs",
          "batter_balls",
          "score_after",
          "chance_before",
          "chance_after",
        ),
      };
    case "swing":
      return {
        headline: `${f.runs_off_ball} off one ball.`,
        what: `${f.runs_off_ball} off this ball, ${f.bowler} to ${f.batter}. ${f.batting_team} are ${f.score_after}.`,
        why: chanceLine(f, "ball"),
        watch,
        used_facts: used(
          "runs_off_ball",
          "batter",
          "bowler",
          "score_after",
          "chance_before",
          "chance_after",
        ),
      };
    case "over_big":
      return {
        headline: `${f.over_runs} runs in one over.`,
        what: `${f.batting_team} go from ${f.score_before} to ${f.score_after} in the over.`,
        why: chanceLine(f, "over"),
        watch,
        used_facts: used(
          "over_runs",
          "score_before",
          "score_after",
          "chance_before",
          "chance_after",
        ),
      };
    case "milestone":
      return {
        headline: `${f.batter} reaches ${f.batter_runs}.`,
        what: `${f.batter} has ${f.batter_runs} off ${f.batter_balls} balls.`,
        why: `A batter who has been in this long is hard to stop, and ${f.batting_team} know it.`,
        watch,
        used_facts: used("batter", "batter_runs", "batter_balls"),
      };
    case "innings_end":
      return {
        headline:
          `${f.bowling_team} need ${f.needed}.`.length <= 45
            ? `${f.bowling_team} need ${f.needed}.`
            : `The target is ${f.needed}.`,
        what: `${f.batting_team} finish on ${f.score_after}.`,
        why: "Now the other side bats and has to beat that score.",
        watch: null,
        used_facts: ["needed", "score_after"],
      };
    case "result":
      return {
        headline:
          `${f.result!.winner} win.`.length <= 45
            ? `${f.result!.winner} win.`
            : "That's the match.",
        what: `${f.result!.winner} win by ${f.result!.margin}.`,
        why: "That's the match. Nothing more to chase.",
        watch: null,
        used_facts: ["result"],
      };
    case "new_batter": {
      const nb = f.new_batter!;
      return {
        headline: `${nb.name} walks in.`,
        what: `${nb.name} comes in with ${f.batting_team} ${f.score_after}.`,
        why:
          nb.matches > 0
            ? `We have ${nb.matches} of this batter's matches in our data, and this one starts under pressure.`
            : "A new batter has to start from nothing while the pressure is on.",
        watch,
        used_facts: used("new_batter", "score_after"),
      };
    }
  }
}

type Line = (f: Facts, a: Anchors) => string;
type WorldLines = Record<Facts["kind"], Line>;

/** One fixed analogy sentence per world and kind. Roles only, never real names. */
const ANALOGY: Record<Exclude<World, "plain">, WorldLines> = {
  football: {
    wicket_big: (f, a) => `Think of minute ${a.minute} in football: ${f.batting_team} just lost a striker to a red card, and ${f.bowling_team} have the momentum.`,
    swing: (f, a) => `Minute ${a.minute}, and ${f.who_gained} just scored a goal against the run of play. The whole game looks different.`,
    over_big: (f, a) => `Like a spell of football where a team camps in the other half: by minute ${a.minute}, ${f.who_gained} have the upper hand.`,
    milestone: (f, a) => `${f.batter} is the striker who has been scoring all game. At minute ${a.minute}, the defence still has no answer.`,
    innings_end: (f) => `That's half-time. ${f.bowling_team} know the scoreline they must beat in the second half.`,
    result: (f) => `Full-time. ${f.result!.winner} take it by ${f.result!.margin}.`,
    new_batter: (_f, a) => `A fresh striker comes off the bench at minute ${a.minute}, with the game still open.`,
  },
  f1: {
    wicket_big: (f, a) => `Lap ${a.lap} of ${a.total_laps}: ${f.batting_team} just lost time with a slow pit stop, and ${f.bowling_team} take the place.`,
    swing: (f, a) => `Lap ${a.lap} of ${a.total_laps}, and ${f.who_gained} just pulled off an overtake. The order looks very different now.`,
    over_big: (f, a) => `A run of fast laps: by lap ${a.lap} of ${a.total_laps}, ${f.who_gained} have pulled clear.`,
    milestone: (f, a) => `${f.batter} is the driver on fresh tyres setting the pace. On lap ${a.lap}, nobody can get past.`,
    innings_end: (f) => `Qualifying is done. ${f.bowling_team} now know the time they have to beat for pole.`,
    result: (f) => `Chequered flag. ${f.result!.winner} take the top step of the podium by ${f.result!.margin}.`,
    new_batter: (_f, a) => `A new driver leaves the pit lane on lap ${a.lap} of ${a.total_laps}, with everything still open.`,
  },
  chess: {
    wicket_big: (f, a) => `Around move ${a.move}, ${f.batting_team} just lost a rook for nothing. ${f.bowling_team} are a piece up.`,
    swing: (f, a) => `Move ${a.move}, and ${f.who_gained} found the sacrifice that works. The whole board has turned.`,
    over_big: (f, a) => `A string of strong moves: by move ${a.move}, ${f.who_gained} have the better pieces.`,
    milestone: (f, a) => `${f.batter} is the queen that has been on the board all game. By move ${a.move}, nothing has challenged it.`,
    innings_end: (f) => `The first half of the game is over. ${f.bowling_team} know exactly what they need from the endgame.`,
    result: (f) => `Checkmate. ${f.result!.winner} take it by ${f.result!.margin}.`,
    new_batter: (_f, a) => `A fresh piece comes into play around move ${a.move}, with the endgame still to come.`,
  },
  bollywood: {
    wicket_big: (f, a) => `Act ${a.act}, and ${f.batting_team} just lost a hero. This is the twist ${f.bowling_team} wanted.`,
    swing: (f, a) => `A twist in act ${a.act}: ${f.who_gained} just changed everything with a single scene.`,
    over_big: (f) => `The long song where everything changes: by the end of it, ${f.who_gained} have taken over.`,
    milestone: (f, a) => `${f.batter} is the hero who is in every scene. In act ${a.act}, everything still runs through this hero.`,
    innings_end: (f) => `That's the interval. ${f.bowling_team} know what the climax has to deliver.`,
    result: (f) => `The final scene. ${f.result!.winner} get the happy ending by ${f.result!.margin}.`,
    new_batter: (_f, a) => `Someone new walks into the scene in act ${a.act}, and the ending is still open.`,
  },
  gaming: {
    wicket_big: (f, a) => `Round ${a.round} of ${a.total_rounds}: ${f.batting_team} just lost their carry, and ${f.bowling_team} have the bigger health bar.`,
    swing: (f, a) => `Round ${a.round} of ${a.total_rounds}, and ${f.who_gained} just landed the clutch play. Everything flips.`,
    over_big: (f, a) => `A streak of winning exchanges: by round ${a.round} of ${a.total_rounds}, ${f.who_gained} have the bigger health bar.`,
    milestone: (f, a) => `${f.batter} is the carry who has not been knocked out. In round ${a.round}, the other side still has no counter.`,
    innings_end: (f) => `Half the game is done. ${f.bowling_team} know the score they need before the final boss.`,
    result: (f) => `Game over. ${f.result!.winner} clear the final boss by ${f.result!.margin}.`,
    new_batter: (_f, a) => `A fresh teammate respawns in round ${a.round} of ${a.total_rounds}, with the game still open.`,
  },
}; // prettier-ignore

/**
 * The template for a world: the plain card with the world's analogy as its "why", when
 * that analogy is safe to say. Returns the world it is actually written in.
 */
export function templateCard(
  f: Facts,
  world: World,
  anchors: Anchors,
): { card: CardText; world: World } {
  const plain = plainTemplate(f);
  if (world === "plain") return { card: plain, world };
  // A wicket analogy says the bowling side gained. If the numbers say otherwise, stay plain.
  if (f.kind === "wicket_big" && f.who_gained !== f.bowling_team)
    return { card: plain, world: "plain" };
  const why = ANALOGY[world][f.kind](f, anchors);
  if (why.length > 220) return { card: plain, world: "plain" };
  return { card: { ...plain, why }, world };
}
