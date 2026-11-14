/** Line icons, 1.8 px stroke, drawn inline. Emoji are never used as interface icons. */
const base = { viewBox: "0 0 24 24", "aria-hidden": true } as const;

export const IconBell = () => (
  <svg {...base}>
    <path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7 2.5 7h-17S6 15 6 9Z" />
    <path d="M10 20a2 2 0 0 0 4 0" />
  </svg>
);
export const IconSkip = () => (
  <svg {...base}>
    <path d="M5 5v14l9-7-9-7Z" />
    <path d="M18 5v14" />
  </svg>
);
export const IconSpeed = () => (
  <svg {...base}>
    <path d="M4 16a8 8 0 1 1 16 0" />
    <path d="M12 16l4-5" />
  </svg>
);
export const IconWorld = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3c3 3.5 3 14.500 0 18M12 3c-3 3.5-3 14.500 0 18" />
  </svg>
);
export const IconPlay = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
    <path d="M7 4.5v15l12-7.5-12-7.5Z" />
  </svg>
);
export const IconRestart = () => (
  <svg {...base}>
    <path d="M4 12a8 8 0 1 0 2.6-5.900" />
    <path d="M4 4v5h5" />
  </svg>
);
export const IconCheck = () => (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M5 12.5l4.500 4.500L19 7.500" />
  </svg>
);
