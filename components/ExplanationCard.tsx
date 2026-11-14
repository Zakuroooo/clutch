"use client";
import { useEffect, useRef, useState } from "react";
import type { Card, Facts } from "@/lib/cards/schema";
import { CardSchema, cardKey } from "@/lib/cards/schema";
import { useSettings, WORLD_LABEL, WORLD_TERMS } from "@/lib/client/settings";
import type { World } from "@/lib/engine/types";
import { Badge } from "./Badge";
import { BeforeAfter } from "./BeforeAfter";
import { Button } from "./Button";
import { Crest } from "./Crest";
import { Jersey } from "./Jersey";
import { useMatch } from "./MatchProvider";
import { MiniReplay, REPLAY_CAPTION } from "./MiniReplay";
import { StatTile } from "./StatTile";

type Tile = { value: number | string; label: string };

/** Three stat tiles for a moment, chosen by kind. Every value is a field of the facts. */
export function tilesFor(f: Facts): Tile[] {
  const chase: Tile | null = f.needed !== null && f.kind !== "innings_end" ? { value: f.needed, label: "still needed" } : null;
  const left: Tile = { value: f.wickets_left, label: "wickets left" };
  switch (f.kind) {
    case "wicket_big":
      return [{ value: f.batter_runs ?? 0, label: "runs made" }, { value: f.batter_balls ?? 0, label: "balls faced" }, chase ?? left];
    case "swing":
    case "milestone":
      return [{ value: f.runs_off_ball, label: "off this ball" }, { value: f.batter_runs ?? 0, label: `${shortName(f.batter)}'s runs` }, chase ?? left];
    case "over_big":
      return [{ value: f.over_runs ?? 0, label: "runs in the over" }, left, chase ?? { value: f.score_after, label: "score" }];
    case "innings_end":
      return [{ value: f.score_after, label: "final score" }, { value: f.needed ?? 0, label: "needed to win" }, { value: f.balls_left ?? 0, label: "balls to get them" }];
    case "result":
      return [];
    case "new_batter":
      return [
        { value: f.new_batter?.matches ?? 0, label: "matches in our data" },
        { value: f.new_batter?.strike_rate ?? "–", label: "runs per 100 balls" },
        chase ?? left,
      ];
  }
} // prettier-ignore

function shortName(name: string | null): string {
  if (!name) return "batter";
  const words = name.split(/\s+/);
  return words[words.length - 1];
}

/** The card for a moment in a world: from the shipped file, or the route as a fallback. */
function useCard(momentId: string, world: World): { card: Card | null; loading: boolean } {
  const { data } = useMatch();
  const shipped = data.cards[cardKey(momentId, world)] ?? null;
  const [fetched, setFetched] = useState<{ key: string; card: Card | null } | null>(null);
  const key = cardKey(momentId, world);
  useEffect(() => {
    if (shipped) return;
    let live = true;
    fetch("/api/card", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ match_id: data.match.id, moment_id: momentId, world }),
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        const parsed = CardSchema.partial().safeParse(json);
        if (live)
          setFetched({
            key,
            card: parsed.success && parsed.data.headline ? (parsed.data as Card) : null,
          });
      })
      .catch(() => live && setFetched({ key, card: null }));
    return () => {
      live = false;
    };
  }, [shipped, key, momentId, world, data.match.id]);
  if (shipped) return { card: shipped, loading: false };
  const mine = fetched?.key === key ? fetched : null;
  return { card: mine?.card ?? null, loading: mine === null };
}

/**
 * One tall card for a moment. The header, tiles, drawing and before-and-after come from
 * code at once; the analogy comes from the card (checked text, or the template).
 */
export function ExplanationCard({
  momentId,
  onClose,
  footer,
}: {
  momentId: string;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  const { data, factsFor, wordsFor } = useMatch();
  const settings = useSettings();
  const [plain, setPlain] = useState(false);
  const mine: World = settings.world ?? "plain";
  const world: World = plain ? "plain" : mine;
  const facts = factsFor(momentId);
  const words = wordsFor(momentId);
  const { card, loading } = useCard(momentId, world);
  const moment = data.moments.find((m) => m.id === momentId);
  const sheet = useRef<HTMLDivElement>(null);

  // A sheet traps focus and closes with Escape.
  useEffect(() => {
    const node = sheet.current;
    const before = document.activeElement as HTMLElement | null;
    node?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab" || !node) return;
      const items = [...node.querySelectorAll<HTMLElement>("button, a[href]")].filter(
        (el) => !el.hasAttribute("disabled"),
      );
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      before?.focus?.();
    };
  }, [onClose]);

  if (!facts || !words) return null;
  const who = facts.wicket?.player_out ?? facts.batter ?? facts.new_batter?.name ?? null;
  const battingSide = data.match.teams[0].name === facts.batting_team ? "a" : "b";
  const player = who ? data.players[who] : undefined;
  const tiles = tilesFor(facts);
  const shownWorld = card?.world ?? world;
  const span = facts.kind === "over_big" ? "this over" : "this ball";
  const how = facts.wicket
    ? `${facts.wicket.player_out}, ${facts.wicket.kind}${facts.wicket.fielder ? ` by ${facts.wicket.fielder}` : ""}`
    : (card?.what ?? words.line);

  return (
    <>
      <div className="scrim" onClick={onClose} aria-hidden="true" />
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-h"
        ref={sheet}
        data-testid="explanation-card"
      >
        <div className="grabber" aria-hidden="true" />
        {footer}
        <div className="hero card-hero">
          <div>
            <Badge kind="hot">
              {words.badge}, over {facts.over_label}
            </Badge>
            <h2 id="card-h" className="card-headline" data-testid="card-headline">
              {card?.headline ?? `${words.title}.`}
            </h2>
            <p className="small muted" style={{ marginTop: "var(--s-2)" }}>
              {how}
            </p>
          </div>
          {who ? (
            <Jersey side={battingSide} number={player?.jersey ?? null} name={who} />
          ) : (
            <Crest
              code={data.match.teams.find((t) => t.name === facts.who_gained)?.code ?? ""}
              side={data.match.teams[0].name === facts.who_gained ? "a" : "b"}
              size="lg"
            />
          )}
        </div>
        <div className="card-body stack">
          {moment && moment.replay_kind !== "none" ? (
            <figure>
              <div className="replay" key={momentId}>
                <MiniReplay kind={moment.replay_kind} animate />
              </div>
              <figcaption className="micro muted" style={{ marginTop: "var(--s-1)" }}>
                {REPLAY_CAPTION}
              </figcaption>
            </figure>
          ) : null}
          {tiles.length > 0 ? (
            <div className="tiles">
              {tiles.map((t) => (
                <StatTile key={t.label} value={t.value} label={t.label} />
              ))}
            </div>
          ) : null}
          <div>
            <Badge kind="world">{WORLD_TERMS[shownWorld]}</Badge>
            {loading ? (
              <div aria-busy="true" style={{ marginTop: "var(--s-3)" }}>
                <div className="skeleton" style={{ height: 22, width: "92%" }} />
                <div className="skeleton" style={{ height: 22, width: "70%", marginTop: 8 }} />
              </div>
            ) : (
              <>
                <p className="card-why" data-testid="card-why">
                  {card?.why ?? words.line}
                </p>
                {card?.what ? (
                  <p className="muted" style={{ marginTop: "var(--s-2)" }}>
                    {card.what}
                  </p>
                ) : null}
              </>
            )}
          </div>
          <BeforeAfter
            team={facts.chance_team}
            before={facts.chance_before}
            after={facts.chance_after}
            span={span}
          />
          {card?.watch ? (
            <p className="small">
              <span className="muted">Watch for: </span>
              {card.watch}
            </p>
          ) : null}
          <div className="row">
            {mine !== "plain" ? (
              <Button onClick={() => setPlain((p) => !p)} style={{ flex: 1 }}>
                {plain ? WORLD_TERMS[mine] : "Say it plainly"}
              </Button>
            ) : null}
            <Button kind="go" onClick={onClose} style={{ flex: 1 }} data-autofocus>
              Got it
            </Button>
          </div>
          <p className="micro faint">
            Every number here comes from the match data and is checked before you see it.
            {card?.source === "template"
              ? ` This wording is a fixed template${mine !== "plain" && !plain ? ` for ${WORLD_LABEL[mine].toLowerCase()}` : ""}, not written by an AI model.`
              : ""}
          </p>
        </div>
      </div>
    </>
  );
}
