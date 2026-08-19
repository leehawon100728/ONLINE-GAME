export const TARGET_MIN = 10;
export const TARGET_MAX = 20;

function round2(n) {
  return Math.round(n * 100) / 100;
}

// A clean, whole-second target between TARGET_MIN and TARGET_MAX (e.g. 14, shown as "14.00초")
// so it's easy to remember during the reveal window.
export function randomTarget() {
  return TARGET_MIN + Math.floor(Math.random() * (TARGET_MAX - TARGET_MIN + 1));
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
