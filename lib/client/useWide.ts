"use client";
import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1024px)";

/** True on a laptop-width screen, where the Match tab is two columns. */
export function useWide(): boolean {
  return useSyncExternalStore(
    (listener) => {
      const m = window.matchMedia(QUERY);
      m.addEventListener("change", listener);
      return () => m.removeEventListener("change", listener);
    },
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}
