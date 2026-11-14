"use client";
/**
 * Call-backs with the page open (docs/TRD.md section 8, tier 1): a system notification
 * if allowed, one vibration where supported, and the tab title. No push server.
 */
import { useSyncExternalStore } from "react";
import type { Alert } from "@/lib/engine/types";

export const ALERT_TITLE = "Look up · Clutch";
export const VIBRATE = { normal: [200], decider: [80, 60, 80] };

export type NotifyPermission = "unsupported" | "default" | "granted" | "denied";

export function notifyPermission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

const permissionListeners = new Set<() => void>();

/** Ask for permission. Only ever called from a tap (Safari requires a user gesture). */
export async function askPermission(): Promise<NotifyPermission> {
  if (notifyPermission() === "unsupported") return "unsupported";
  try {
    await Notification.requestPermission();
  } catch {
    // older Safari: the callback form; the state below still reads the result
  }
  permissionListeners.forEach((l) => l());
  return notifyPermission();
}

/** The permission state in a component. The server render says "default". */
export function useNotifyPermission(): NotifyPermission {
  return useSyncExternalStore(
    (listener) => {
      permissionListeners.add(listener);
      return () => permissionListeners.delete(listener);
    },
    notifyPermission,
    () => "default" as const,
  );
}

/** True on an iPhone browser tab, where notifications need the Home Screen app. */
export function useNeedsHomeScreen(): boolean {
  return useSyncExternalStore(
    () => () => {},
    needsHomeScreen,
    () => false,
  );
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

let savedTitle: string | null = null;

export function flashTitle() {
  if (savedTitle === null) savedTitle = document.title;
  document.title = ALERT_TITLE;
}

/** Put the tab title back, once the fan is looking at the tab again. */
export function restoreTitle() {
  if (savedTitle !== null) {
    document.title = savedTitle;
    savedTitle = null;
  }
}

/** iPhone browsers need the app on the Home Screen before notifications work. */
export function needsHomeScreen(): boolean {
  if (typeof navigator === "undefined") return false;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches;
  return ios && !standalone;
}

export async function sendCallback(alert: Alert, options: { vibrate: boolean }): Promise<void> {
  flashTitle();
  if (options.vibrate && typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(alert.bar === "decider" ? VIBRATE.decider : VIBRATE.normal);
    } catch {
      // not supported here (iPhone): the notification is the only signal
    }
  }
  if (notifyPermission() !== "granted") return;
  const body = { body: alert.line, tag: "clutch-alert", renotify: true } as NotificationOptions;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification("Look up", body);
    else new Notification("Look up", body);
  } catch {
    // the title and the in-page banner still tell the fan
  }
}
