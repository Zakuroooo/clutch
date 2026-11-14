/**
 * The word lists the check uses, read from the .txt files beside this module.
 * Server, scripts and tests only: the check never runs in the browser.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { WORLDS, type World } from "@/lib/engine/types";

const DIR = path.join(process.cwd(), "lib", "cards");

function read(file: string): string[] {
  return readFileSync(path.join(DIR, file), "utf8")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

export const VOCAB = Object.fromEntries(
  WORLDS.map((w) => [w, read(`worlds/${w}.vocab.txt`)]),
) as Record<World, string[]>;
export const DENY = Object.fromEntries(
  WORLDS.map((w) => [w, read(`worlds/${w}.deny.txt`)]),
) as Record<World, string[]>;
export const ABUSE = read("abuse.txt");
export const SENSITIVE = read("sensitive.txt");

/** Rule R7. Never in any card, any world. */
export const BANNED = [
  "bet",
  "bets",
  "betting",
  "odds",
  "wager",
  "gamble",
  "gambling",
  "jackpot",
  "payout",
  "bookie",
  "punter",
];

/** Numbers that are idiom, not data (rule R2). */
export const FIXED_PHRASES = [
  "one goal up",
  "one goal down",
  "a goal up",
  "a goal down",
  "one move",
  "one lap",
  "one life",
  "last life",
  "first ball",
  "one ball",
  "one over",
  "one shot",
  "number one",
  // The scale every chance is stated on ("went from 71 to 48 out of 100").
  "out of 100",
];

/** Capitalised words that are ordinary English (rule R4). */
export const ORDINARY_CAPITALS = [
  "I",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
