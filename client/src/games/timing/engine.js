export const TARGET_MIN = 10;
export const TARGET_MAX = 20;

function round2(n) {
  return Math.round(n * 100) / 100;
}

// A random target between TARGET_MIN and TARGET_MAX seconds, to 2 decimal places.
export function randomTarget() {
  return round2(TARGET_MIN + Math.random() * (TARGET_MAX - TARGET_MIN));
}

export function computeError(elapsedSeconds, targetSeconds) {
  return round2(Math.abs(elapsedSeconds - targetSeconds));
}

// Players tied for the smallest error all win the round (ties allowed).
export function pickRoundWinners(entries) {
  if (entries.length === 0) return [];
  const minError = Math.min(...entries.map((e) => e.error));
  return entries.filter((e) => e.error === minError).map((e) => e.playerId);
}
