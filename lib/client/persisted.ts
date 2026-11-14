"use client";
/**
 * A value kept in localStorage and shared by every component that reads it. When
 * localStorage is unavailable (private mode) it lives in memory for the session.
 */
import { useSyncExternalStore } from "react";

export type Persisted<T> = {
  get(): T;
  set(next: T | ((prev: T) => T)): void;
  subscribe(listener: () => void): () => void;
  /** False when the browser refused storage: progress will not survive a refresh. */
  durable(): boolean;
};

export function persisted<T>(
  key: string,
  initial: T,
  parse: (raw: unknown) => T | null,
): Persisted<T> {
  let value = initial;
  let loaded = false;
  let durable = true;
  const listeners = new Set<() => void>();

  const load = () => {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw !== null) value = parse(JSON.parse(raw)) ?? initial;
    } catch {
      durable = false;
    }
  };

  return {
    get() {
      load();
      return value;
    },
    set(next) {
      load();
      value = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        durable = false;
      }
      listeners.forEach((l) => l());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    durable: () => durable,
  };
}

/** Read a persisted value in a component. The server render uses `initial`. */
export function usePersisted<T>(store: Persisted<T>, initial: T): T {
  return useSyncExternalStore(
    store.subscribe,
    () => store.get(),
    () => initial,
  );
}
