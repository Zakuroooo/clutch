export const REPLAY_NOTE = "Replay of a real match, running as live";

/** Brand on the left, the replay badge on the right. On every match screen. */
export function AppBar({ extra }: { extra?: React.ReactNode }) {
  return (
    <header className="appbar">
      <span className="brand">
        <span className="brand-dot" aria-hidden="true" />
        Clutch
      </span>
      <span className="row" style={{ gap: "var(--s-2)" }}>
        {extra}
        <ReplayBadge />
      </span>
    </header>
  );
}

export function ReplayBadge() {
  return (
    <span className="badge replay" title={REPLAY_NOTE}>
      Replay of a real match<span className="sr-only">, running as live</span>
    </span>
  );
}
