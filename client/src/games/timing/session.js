import { randomTarget, computeError, pickRoundWinners } from './engine.js';

export const REVEAL_SECONDS = 3;
// Lead-in before the clock actually starts: the target is shown and nobody
// can click stop yet, so everyone gets a clear look at it beforehand.
export const READY_SECONDS = 3;
export const NEXT_ROUND_DELAY_MS = 3000;
// Safety net: if someone never clicks stop, the round force-finishes this long
// after it started (well past the 10-20s target range) rather than hanging forever.
export const ROUND_TIMEOUT_MS = 40_000;

export const ROUND_COUNTS = { bo1: 1, bo3: 3, bo5: 5, bo7: 7 };

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function createInitialGame({ playerIds, serverNow }) {
  return {
    target: randomTarget(),
    startedAt: serverNow + READY_SECONDS * 1000,
    round: 1,
    roundStatus: 'playing',
    roundResult: null,
    matchStatus: 'playing',
    stops: {},
    scores: Object.fromEntries(playerIds.map((id) => [id, 0])),
    winnerPlayerIds: null,
  };
}

// Records a player's stop time (an absolute, server-synced timestamp). Once
// every active player has stopped, the round is scored automatically.
export function submitStop(game, { activePlayerIds, roundCount }, playerId, stopAt) {
  if (!game || game.matchStatus !== 'playing' || game.roundStatus !== 'playing') return undefined;
  if (!activePlayerIds.includes(playerId)) return undefined;
  if (game.stops?.[playerId] != null) return undefined;
  if (stopAt < game.startedAt) return undefined; // still in the pre-round lead-in

  const stops = { ...game.stops, [playerId]: stopAt };
  const allStopped = activePlayerIds.every((id) => stops[id] != null);
  if (!allStopped) return { ...game, stops };
  return finishRound({ ...game, stops }, activePlayerIds, roundCount);
}

// Anyone who never clicked stop is scored as if they'd stopped at `cutoffAt`
// (a bad result, but the round can't hang forever waiting on them).
export function forceFinishRound(game, { activePlayerIds, roundCount }, cutoffAt) {
  if (!game || game.matchStatus !== 'playing' || game.roundStatus !== 'playing') return undefined;
  const stops = { ...game.stops };
  for (const id of activePlayerIds) {
    if (stops[id] == null) stops[id] = cutoffAt;
  }
  return finishRound({ ...game, stops }, activePlayerIds, roundCount);
}

function finishRound(game, activePlayerIds, roundCount) {
  const entries = activePlayerIds.map((id) => {
    const elapsedSeconds = round2((game.stops[id] - game.startedAt) / 1000);
    return { playerId: id, elapsedSeconds, error: computeError(elapsedSeconds, game.target) };
  });
  const winners = pickRoundWinners(entries);
  const scores = { ...game.scores };
  for (const id of winners) scores[id] = (scores[id] || 0) + 1;

  const matchOver = game.round >= roundCount;
  let winnerPlayerIds = null;
  if (matchOver) {
    const maxScore = Math.max(...activePlayerIds.map((id) => scores[id] || 0));
    winnerPlayerIds = activePlayerIds.filter((id) => (scores[id] || 0) === maxScore);
  }

  return {
    ...game,
    scores,
    roundStatus: 'round-over',
    roundResult: { target: game.target, entries, winnerPlayerIds: winners },
    matchStatus: matchOver ? 'match-over' : 'playing',
    winnerPlayerIds,
  };
}

export function advanceRound(game, { serverNow }) {
  if (!game || game.matchStatus !== 'playing' || game.roundStatus !== 'round-over') return undefined;
  return {
    ...game,
    target: randomTarget(),
    startedAt: serverNow + READY_SECONDS * 1000,
    round: game.round + 1,
    roundStatus: 'playing',
    roundResult: null,
    stops: {},
  };
}
