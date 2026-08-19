import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialGame,
  submitStop,
  forceFinishRound,
  advanceRound,
  ROUND_COUNTS,
  READY_SECONDS,
} from './session.js';

const P1 = 'uid-p1';
const P2 = 'uid-p2';
const P3 = 'uid-p3';
const NOW = 1_700_000_000_000;

test('createInitialGame sets a target, a delayed start time, and zeroed scores', () => {
  const game = createInitialGame({ playerIds: [P1, P2, P3], serverNow: NOW });
  assert.ok(Number.isInteger(game.target) && game.target >= 10 && game.target <= 20);
  assert.equal(game.startedAt, NOW + READY_SECONDS * 1000); // clock starts after the ready lead-in
  assert.equal(game.round, 1);
  assert.deepEqual(game.scores, { [P1]: 0, [P2]: 0, [P3]: 0 });
  assert.equal(game.roundStatus, 'playing');
});

test('a stop submitted during the ready lead-in (before startedAt) is ignored', () => {
  let game = createInitialGame({ playerIds: [P1, P2], serverNow: NOW });
  const ctx = { activePlayerIds: [P1, P2], roundCount: ROUND_COUNTS.bo3 };
  const result = submitStop(game, ctx, P1, NOW + 500); // still in the lead-in
  assert.equal(result, undefined);
});

test('the round stays open until every active player has stopped', () => {
  let game = createInitialGame({ playerIds: [P1, P2], serverNow: NOW });
  game.startedAt = NOW;
  const ctx = { activePlayerIds: [P1, P2], roundCount: ROUND_COUNTS.bo3 };
  game = submitStop(game, ctx, P1, NOW + 12_000);
  assert.equal(game.roundStatus, 'playing');
  assert.equal(game.stops[P1], NOW + 12_000);
});

test('a player cannot submit a stop twice in the same round', () => {
  let game = createInitialGame({ playerIds: [P1, P2], serverNow: NOW });
  game.startedAt = NOW;
  const ctx = { activePlayerIds: [P1, P2], roundCount: ROUND_COUNTS.bo3 };
  game = submitStop(game, ctx, P1, NOW + 12_000);
  const result = submitStop(game, ctx, P1, NOW + 13_000);
  assert.equal(result, undefined);
});

test('the closest player to the target wins the round once everyone stops', () => {
  let game = createInitialGame({ playerIds: [P1, P2], serverNow: NOW });
  game.startedAt = NOW;
  game.target = 12; // fix the target so the outcome is deterministic
  const ctx = { activePlayerIds: [P1, P2], roundCount: ROUND_COUNTS.bo1 };
  game = submitStop(game, ctx, P1, NOW + 12_500); // 0.5s off
  game = submitStop(game, ctx, P2, NOW + 12_100); // 0.1s off
  assert.equal(game.roundStatus, 'round-over');
  assert.deepEqual(game.roundResult.winnerPlayerIds, [P2]);
  assert.equal(game.scores[P2], 1);
  assert.equal(game.scores[P1], 0);
  assert.equal(game.matchStatus, 'match-over'); // bo1 = 1 round
  assert.deepEqual(game.winnerPlayerIds, [P2]);
});

test('a tie in error gives the round win to every player tied for closest', () => {
  let game = createInitialGame({ playerIds: [P1, P2, P3], serverNow: NOW });
  game.startedAt = NOW;
  game.target = 12;
  const ctx = { activePlayerIds: [P1, P2, P3], roundCount: ROUND_COUNTS.bo1 };
  game = submitStop(game, ctx, P1, NOW + 12_100);
  game = submitStop(game, ctx, P2, NOW + 11_900);
  game = submitStop(game, ctx, P3, NOW + 13_000);
  assert.deepEqual(game.roundResult.winnerPlayerIds.sort(), [P1, P2]);
  assert.equal(game.scores[P1], 1);
  assert.equal(game.scores[P2], 1);
  assert.equal(game.scores[P3], 0);
});

test('forceFinishRound scores a non-responder using the cutoff time', () => {
  let game = createInitialGame({ playerIds: [P1, P2], serverNow: NOW });
  game.startedAt = NOW;
  game.target = 12;
  const ctx = { activePlayerIds: [P1, P2], roundCount: ROUND_COUNTS.bo1 };
  game = submitStop(game, ctx, P1, NOW + 12_050); // P1 responded, very close
  game = forceFinishRound(game, ctx, NOW + 40_000); // P2 never clicked
  assert.equal(game.roundStatus, 'round-over');
  assert.deepEqual(game.roundResult.winnerPlayerIds, [P1]);
});

test('advanceRound picks a fresh target and resets stops, with a new ready lead-in', () => {
  let game = createInitialGame({ playerIds: [P1, P2], serverNow: NOW });
  game.startedAt = NOW;
  game.target = 12;
  const ctx = { activePlayerIds: [P1, P2], roundCount: ROUND_COUNTS.bo3 };
  game = submitStop(game, ctx, P1, NOW + 12_000);
  game = submitStop(game, ctx, P2, NOW + 12_500);
  assert.equal(game.matchStatus, 'playing'); // bo3 needs 3 rounds total

  const next = advanceRound(game, { serverNow: NOW + 100_000 });
  assert.equal(next.round, 2);
  assert.equal(next.roundStatus, 'playing');
  assert.deepEqual(next.stops, {});
  assert.equal(next.startedAt, NOW + 100_000 + READY_SECONDS * 1000);
  assert.ok(Number.isInteger(next.target) && next.target >= 10 && next.target <= 20);
});

test('the match ends only after the configured number of rounds', () => {
  let game = createInitialGame({ playerIds: [P1, P2], serverNow: NOW });
  game.startedAt = NOW;
  game.target = 12;
  const ctx = { activePlayerIds: [P1, P2], roundCount: ROUND_COUNTS.bo3 };
  game = submitStop(game, ctx, P1, NOW + 12_000);
  game = submitStop(game, ctx, P2, NOW + 15_000);
  assert.equal(game.matchStatus, 'playing');
  assert.equal(game.winnerPlayerIds, null);
});
