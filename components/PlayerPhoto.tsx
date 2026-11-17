"use client";
import Image from "next/image";
import { Jersey } from "./Jersey";
import { useMatch } from "./MatchProvider";

/**
 * A player's photo when a freely licensed one exists (Wikimedia Commons, credited on the
 * profile), otherwise their jersey. Ringed in their team's colour.
 */
export function PlayerPhoto({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const { data } = useMatch();
  const person = data.people[name];
  const team = data.players[name]?.team;
  const side = team === data.match.teams[1].name ? "b" : "a";
  const px = size === "lg" ? 112 : size === "md" ? 64 : 40;
  const label = person?.full_name ?? name;
  return (
    <span className={`player-photo ${size} side-${side}`} style={{ width: px, height: px }}>
      {person?.photo ? (
        <Image src={person.photo.src} alt={label} width={px} height={px} sizes={`${px}px`} loading="eager" />
      ) : (
        <Jersey side={side} number={data.players[name]?.jersey ?? null} name={label} />
      )}
    </span>
  );
}

/** "Hardik Pandya", or the scorecard name when we have no full name. */
export function useFullName(): (name: string) => string {
  const { data } = useMatch();
  return (name) => data.people[name]?.full_name ?? name;
}
