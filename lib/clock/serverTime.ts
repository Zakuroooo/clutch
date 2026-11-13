/**
 * Estimating the gap between this device's clock and the server's (docs/TRD.md 3.3),
 * so two devices with wrong clocks still agree on "now".
 */
export type TimeSample = {
  /** Device clock when the request left. */
  t0: number;
  /** The server's clock in its reply. */
  server: number;
  /** Device clock when the reply arrived. */
  t1: number;
};

export function offsetOf(sample: TimeSample): number {
  return sample.server - (sample.t0 + sample.t1) / 2;
}

/** The offset from the sample with the smallest round trip; 0 when there are none. */
export function estimateOffset(samples: readonly TimeSample[]): number {
  if (samples.length === 0) return 0;
  const best = samples.reduce((a, b) => (b.t1 - b.t0 < a.t1 - a.t0 ? b : a));
  return offsetOf(best);
}

/** Take `count` samples from /api/time. Failures are skipped; no samples means offset 0. */
export async function measureOffset(
  fetchTime: () => Promise<number>,
  deviceNow: () => number,
  count = 3,
): Promise<number> {
  const samples: TimeSample[] = [];
  for (let k = 0; k < count; k++) {
    try {
      const t0 = deviceNow();
      const server = await fetchTime();
      samples.push({ t0, server, t1: deviceNow() });
    } catch {
      // offline or blocked: keep what we have
    }
  }
  return estimateOffset(samples);
}
