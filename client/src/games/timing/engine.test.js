import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomTarget, computeError, pickRoundWinners, TARGET_MIN, TARGET_MAX } from './engine.js';

test('randomTarget stays within range and has at most 2 decimal places', () => {
  for (let i = 0; i < 200; i++) {
    const t = randomTarget();
    assert.ok(t >= TARGET_MIN && t <= TARGET_MAX, `${t} out of range`);
    assert.ok(Math.abs(Math.round(t * 100) - t * 100) < 1e-6, `${t} has more than 2 decimals`);
  }
});

test('computeError is the absolute difference, rounded to 2 decimals', () => {
  assert.equal(computeError(12.37, 12.3), 0.07);
  assert.equal(computeError(10, 12.5), 2.5);
  assert.equal(computeError(15, 15), 0);
});

test('pickRoundWinners returns the single closest player', () => {
  const winners = pickRoundWinners([
    { playerId: 'a', error: 0.5 },
    { playerId: 'b', error: 0.12 },
    { playerId: 'c', error: 1.2 },
  ]);
  assert.deepEqual(winners, ['b']);
});

test('pickRoundWinners allows a tie between multiple players', () => {
  const winners = pickRoundWinners([
    { playerId: 'a', error: 0.3 },
    { playerId: 'b', error: 0.3 },
    { playerId: 'c', error: 0.9 },
  ]);
  assert.deepEqual(winners.sort(), ['a', 'b']);
});

test('pickRoundWinners on an empty list returns no winners', () => {
  assert.deepEqual(pickRoundWinners([]), []);
});
