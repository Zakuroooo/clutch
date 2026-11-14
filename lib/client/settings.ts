"use client";
import { z } from "zod";
import { WorldSchema, type World } from "@/lib/engine/types";
import { persisted, usePersisted } from "./persisted";

const SettingsSchema = z.object({
  /** Null until the fan has picked a world. */
  world: WorldSchema.nullable(),
  vibrate: z.boolean(),
});
export type Settings = z.infer<typeof SettingsSchema>;

export const DEFAULT_SETTINGS: Settings = { world: null, vibrate: true };

export const settingsStore = persisted<Settings>("clutch.settings.v1", DEFAULT_SETTINGS, (raw) => {
  const parsed = SettingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
});

export function useSettings(): Settings {
  return usePersisted(settingsStore, DEFAULT_SETTINGS);
}

export function setWorld(world: World) {
  settingsStore.set((s) => ({ ...s, world }));
}

export function setVibrate(vibrate: boolean) {
  settingsStore.set((s) => ({ ...s, vibrate }));
}

export const WORLD_LABEL: Record<World, string> = {
  football: "Football",
  f1: "Formula 1",
  chess: "Chess",
  bollywood: "Bollywood",
  gaming: "Gaming",
  plain: "Keep it plain",
};

/** "In football terms" */
export const WORLD_TERMS: Record<World, string> = {
  football: "In football terms",
  f1: "In Formula 1 terms",
  chess: "In chess terms",
  bollywood: "In Bollywood terms",
  gaming: "In gaming terms",
  plain: "In plain words",
};
