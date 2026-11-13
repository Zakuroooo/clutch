/// <reference lib="webworker" />
/**
 * Posts a tick every 250 ms. A worker's timers are throttled far less than a page's in
 * a background tab, which Focus mode call-backs depend on (docs/TRD.md 3.4).
 */
const TICK_MS = 250;
setInterval(() => postMessage("tick"), TICK_MS);
export {};
