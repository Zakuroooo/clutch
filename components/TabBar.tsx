"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/match",
    label: "Match",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="0.6" />
      </>
    ),
  },
  {
    href: "/match/focus",
    label: "Focus",
    icon: (
      <>
        <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9Z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </>
    ),
  },
  {
    href: "/match/moments",
    label: "Moments",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="6" rx="2" />
        <rect x="4" y="14" width="16" height="6" rx="2" />
      </>
    ),
  },
] as const;

/** Tier 1 tabs. Back me up and Room join when tier 2 is built. */
export function TabBar({ missed }: { missed: number }) {
  const path = usePathname();
  return (
    <nav className="tabbar" aria-label="Main">
      {TABS.map((t) => {
        const on = path === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`tab${on ? " on" : ""}`}
            aria-current={on ? "page" : undefined}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {t.icon}
            </svg>
            {t.label}
            {t.label === "Moments" && missed > 0 ? (
              <span className="dot" aria-label={`${missed} missed`}>
                {missed}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
