"use client";
import { useEffect, useState } from "react";
import {
  achievements,
  compare,
  debatePoints,
  knownFor,
  roleOf,
} from "@/lib/adapters/cricket/profile";
import { setFavourite, useSettings } from "@/lib/client/settings";
import { AppBar } from "./AppBar";
import { useMatch } from "./MatchProvider";
import { PlayerPhoto, useFullName } from "./PlayerPhoto";
import { StatTile } from "./StatTile";

/**
 * My player: pick the player you back, see everything they have done, and get the points
 * to make when your friends argue for someone else. All from the record before this match.
 */
export function PlayersScreen() {
  const { data } = useMatch();
  const settings = useSettings();
  const full = useFullName();
  const [rival, setRival] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // /match/players?p=<name> (from "Back them in a debate") picks that player.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("p");
    if (p && data.players[p]) {
      setFavourite(p);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [data.players]);

  const mine = settings.favourite && data.players[settings.favourite] ? settings.favourite : null;
  const teams = data.match.teams.map((t) => ({
    team: t,
    names: Object.keys(data.players).filter((n) => data.players[n].team === t.name),
  }));

  if (!mine) {
    return (
      <main>
        <AppBar />
        <div className="wrap">
          <h1 className="page-h">Who do you back?</h1>
          <p className="muted">Pick a player. You get everything they have done, and the points to win an argument about them.</p>
        </div>
        {teams.map(({ team, names }) => (
          <section key={team.code} aria-label={team.name}>
            <div className="sec"><h2>{team.name}</h2></div>
            <div className="wrap player-grid">
              {names.map((n) => (
                <button key={n} type="button" className="player-pick" onClick={() => setFavourite(n)}>
                  <PlayerPhoto name={n} size="md" />
                  <b>{full(n)}</b>
                  <span>{roleOf(data.players[n])}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
        <p className="note">Photos from Wikimedia Commons under free licences, credited on each profile. Others show the team shirt.</p>
      </main>
    );
  }

  const p = data.players[mine];
  const photo = data.people[mine]?.photo;
  const points = debatePoints(mine, data.players);
  const others = Object.keys(data.players).filter((n) => n !== mine);
  const vs = rival && rival !== mine ? rival : null;
  const rows = vs ? compare(mine, vs, data.players) : [];
  const share = [`Why ${full(mine)}:`, ...points.map((x) => `• ${x}`)].join("\n");

  return (
    <main>
      <AppBar />
      <div className="wrap">
        <section className="card hero pad my-player" aria-label="My player">
          <div className="player-head">
            <PlayerPhoto name={mine} size="lg" />
            <div>
              <span className="badge">{p.team} · {roleOf(p)}</span>
              <h1 className="player-name">{full(mine)}</h1>
              <button type="button" className="link" onClick={() => setFavourite(null)}>Change player</button>
            </div>
          </div>
          <div className="tiles three" style={{ marginTop: "var(--s-4)" }}>
            {achievements(p).slice(0, 6).map((t) => (
              <StatTile key={t.label} value={t.value} label={t.label} />
            ))}
          </div>
        </section>
      </div>

      <div className="sec"><h2>Your arguments</h2></div>
      <div className="wrap">
        <div className="card pad">
          <ol className="points">
            {points.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
          <button
            type="button"
            className="btn wide"
            style={{ marginTop: "var(--s-3)" }}
            onClick={() => {
              void navigator.clipboard?.writeText(share).then(() => setCopied(true));
            }}
          >
            {copied ? "Copied. Paste it in the chat" : "Copy my arguments"}
          </button>
        </div>
      </div>

      <div className="sec"><h2>Head to head</h2></div>
      <div className="wrap">
        <label className="small muted" htmlFor="rival">Your friend backs</label>
        <select id="rival" className="select" value={vs ?? ""} onChange={(e) => setRival(e.target.value || null)}>
          <option value="">Pick a player</option>
          {others.map((n) => (
            <option key={n} value={n}>{full(n)} ({data.players[n].team})</option>
          ))}
        </select>
        {vs ? (
          <div className="card pad h2h" data-testid="head-to-head">
            <div className="h2h-top">
              <span><PlayerPhoto name={mine} size="sm" /><b>{full(mine)}</b></span>
              <span className="muted small">vs</span>
              <span><PlayerPhoto name={vs} size="sm" /><b>{full(vs)}</b></span>
            </div>
            <table>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label}>
                    <td className={`num ${r.lead === "a" ? "lead" : ""}`}>{r.a}</td>
                    <th scope="row">{r.label}</th>
                    <td className={`num ${r.lead === "b" ? "lead" : ""}`}>{r.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="small muted" style={{ marginTop: "var(--s-2)" }}>
              {full(mine)} leads on {rows.filter((r) => r.lead === "a").length} of {rows.length}.{" "}
              {knownFor(vs, data.players)[0] ? `Be ready for this one: ${knownFor(vs, data.players)[0]}.` : ""}
            </p>
          </div>
        ) : null}
      </div>
      <p className="note">
        T20 matches before this one, IPL included (Cricsheet).
        {photo ? ` Photo: ${photo.author}, ${photo.licence}, via Wikimedia Commons.` : ""}
      </p>
      <div style={{ height: "5rem" }} />
    </main>
  );
} // prettier-ignore
