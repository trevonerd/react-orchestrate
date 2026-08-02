/** Demo pacing — slow enough to follow each step */
export const DEMO_PACE = {
  autoStartMs: 2_000,
  scrollSettleMs: 1_400,
  pauseShortMs: 800,
  pauseMediumMs: 1_200,
  pauseLongMs: 1_800,
  minLoadingMs: 1_600,
  revealHoldMs: 1_000,
} as const;

const minDelay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Ensures skeleton/spinner stays visible even on fast networks */
export async function withMinDuration<T>(promise: Promise<T>, ms: number): Promise<T> {
  const [result] = await Promise.all([promise, minDelay(ms)]);
  return result;
}
