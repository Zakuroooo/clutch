/**
 * Reads the replay match's static files from data/ and validates every one with Zod.
 * Server and scripts only (it uses the file system); the browser gets the result as props.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import {
  AlertSchema,
  MomentSchema,
  ThresholdsSchema,
  type Alert,
  type Bar,
  type MatchInfo,
  type Moment,
  type Thresholds,
} from "@/lib/engine/types";
import { detectNewBatters, type NewBatterEvent } from "./moments";
import {
  PeopleSchema,
  PlayersSchema,
  TimelineSchema,
  type CricketTick,
  type People,
  type Players,
} from "./types";

const DATA = path.join(process.cwd(), "data");

async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf8"));
}

async function readOptional(file: string): Promise<unknown | null> {
  try {
    return await readJson(file);
  } catch {
    return null;
  }
}

export async function replayMatchId(): Promise<string> {
  const replay = z
    .object({ match_id: z.string().min(1) })
    .parse(await readJson(path.join(DATA, "replay.json")));
  return replay.match_id;
}

/** What the Focus screen may promise: measured on test matches, or nothing. */
export type PulsePromise = Record<Bar, { callbacks_median: number; coverage: number }> & {
  test_matches: number;
};

const PulseEvalSchema = z.object({
  test_matches: z.number(),
  bars: z.record(
    z.string(),
    z.object({ callbacks_median: z.number(), coverage: z.number() }).partial().passthrough(),
  ),
});

/** The shipped model's headline numbers, for the Behind the scenes panel. */
export type ModelInfo = {
  name: string;
  brier: number;
  baseline_brier: number;
  test_matches: number;
};

export async function loadModelInfo(): Promise<ModelInfo | null> {
  const raw = await readOptional(path.join(process.cwd(), "model", "artifacts", "metrics.json"));
  const parsed = z
    .object({
      shipped: z.string(),
      test_matches: z.number(),
      models: z.record(z.string(), z.object({ name: z.string(), brier: z.number() })),
    })
    .safeParse(raw);
  if (!parsed.success) return null;
  const shipped = parsed.data.models[parsed.data.shipped];
  const baseline = parsed.data.models.baseline_run_rate;
  if (!shipped || !baseline) return null;
  return {
    name: shipped.name.replace(/^Model \d: /, ""),
    brier: shipped.brier,
    baseline_brier: baseline.brier,
    test_matches: parsed.data.test_matches,
  };
}

/** The match video, when the replay match has one and its balls are synced to it. */
export type VideoInfo = { youtube_id: string; title: string; channel: string; channel_url: string };

export async function loadVideo(matchId: string): Promise<VideoInfo | null> {
  const replay = z
    .object({
      video: z
        .object({
          youtube_id: z.string(),
          title: z.string(),
          channel: z.string(),
          channel_url: z.string(),
        })
        .optional(),
    })
    .safeParse(await readOptional(path.join(DATA, "replay.json")));
  const synced = await readOptional(path.join(DATA, "matches", matchId, "video_sync.json"));
  if (!replay.success || !replay.data.video || !synced) return null;
  return replay.data.video;
}

export async function loadPulsePromise(): Promise<PulsePromise | null> {
  const raw = await readOptional(path.join(process.cwd(), "model", "artifacts", "pulse_eval.json"));
  const parsed = PulseEvalSchema.safeParse(raw);
  if (!parsed.success) return null;
  const pick = (bar: Bar) => {
    const b = parsed.data.bars[bar];
    return b?.callbacks_median !== undefined && b.coverage !== undefined
      ? { callbacks_median: b.callbacks_median, coverage: b.coverage }
      : null;
  };
  const [notable, big, decider] = [pick("notable"), pick("big"), pick("decider")];
  if (!notable || !big || !decider) return null;
  return { notable, big, decider, test_matches: parsed.data.test_matches };
}

export type MatchData = {
  match: MatchInfo;
  ticks: CricketTick[];
  alerts: Alert[];
  moments: Moment[];
  newBatters: NewBatterEvent[];
  thresholds: Thresholds;
  players: Players;
  people: People;
};

export async function loadMatch(matchId: string): Promise<MatchData> {
  const dir = path.join(DATA, "matches", matchId);
  const timeline = TimelineSchema.parse(await readJson(path.join(dir, "timeline.json")));
  const alerts = z.array(AlertSchema).parse(await readJson(path.join(dir, "alerts.json")));
  const thresholds = ThresholdsSchema.parse(await readJson(path.join(DATA, "thresholds.json")));
  const moments = z
    .array(MomentSchema)
    .parse((await readOptional(path.join(dir, "moments.json"))) ?? []);
  const players = PlayersSchema.parse((await readOptional(path.join(dir, "players.json"))) ?? {});
  const people = PeopleSchema.parse((await readOptional(path.join(dir, "people.json"))) ?? {});
  const ticks = timeline.events as CricketTick[];
  return {
    match: timeline.match,
    ticks,
    alerts,
    moments,
    newBatters: detectNewBatters(ticks, thresholds),
    thresholds,
    players,
    people,
  };
}
