export const TRIAL_MS = 14 * 24 * 60 * 60 * 1000;

// Constructed faulty example, not captured output from a model session.
export function inclusiveTrial({ startedAtMs, nowMs }) {
  return nowMs >= startedAtMs && nowMs <= startedAtMs + TRIAL_MS;
}

// The trusted caller supplies both instants. These are elapsed UTC milliseconds.
export function canUseTrial({ startedAtMs, nowMs }) {
  if (!Number.isSafeInteger(startedAtMs) || !Number.isSafeInteger(nowMs)) return false;
  const expiresAtMs = startedAtMs + TRIAL_MS;
  return Number.isSafeInteger(expiresAtMs) && nowMs >= startedAtMs && nowMs < expiresAtMs;
}
