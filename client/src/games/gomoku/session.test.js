import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialGame, applyMove, applyTimeout, advanceRound } from './session.js';

const P1 = 'uid-p1';
const P2 = 'uid-p2';
const NOW = 1_700_000_000_000;

test('createInitialGame assigns black/white and sets a turn deadline', () => {
  const game = createInitialGame({ playerIds: [P1, P2], turnSeconds: 30, serverNow: NOW });
  assert.equal(game.colorOf[P1], 'black');
  assert.equal(game.colorOf[P2], 'white');
  assert.equal(game.turnColor, 'black');
  assert.equal(game.round, 1);
  assert.equal(game.turnDeadline, NOW + 30_000);
  assert.deepEqual(game.scores, { [P1]: 0, [P2]: 0 });
});

test('createInitialGame with unlimited time has no deadline', () => {
  const game = createInitialGame({ playerIds: [P1, P2], turnSeconds: null, serverNow: NOW });
  assert.equal(game.turnDeadline, null);
});

test('rejects a move out of turn', () => {
  const game = createInitialGame({ playerIds: [P1, P2], turnSeconds: 30, serverNow: NOW });
  const opts = { matchFormat: 'bo1', turnSeconds: 30, serverNow: NOW };
  const result = applyMove(game, opts, P2, 7, 7); // white trying to move first
  assert.equal(result, undefined);
});

test('rejects a move onto an occupied cell', () => {
  let game = createInitialGame({ playerIds: [P1, P2], turnSeconds: 30, serverNow: NOW });
  const opts = { matchFormat: 'bo1', turnSeconds: 30, serverNow: NOW };
  game = applyMove(game, opts, P1, 7, 7);
  const result = applyMove(game, opts, P2, 7, 7);
  assert.equal(result, undefined);
});

test('a move that would create a double three is rejected for black', () => {
  const game = {
    board: { 7: { 5: 'black', 7: 'black' }, 6: { 6: 'black' }, 8: { 6: 'black' } },
    colorOf: { [P1]: 'black', [P2]: 'white' },
    turnColor: 'black',
    round: 1,
    roundStatus: 'playing',
    roundResult: null,
    matchStatus: 'playing',
    winnerUid: null,
    lastMove: null,
    turnDeadline: null,
    scores: { [P1]: 0, [P2]: 0 },
  };
  const opts = { matchFormat: 'bo1', turnSeconds: null, serverNow: NOW };
  const result = applyMove(game, opts, P1, 7, 6); // row 7, col 6 -> completes a 3-3
  assert.equal(result, undefined);
});

test('five in a row ends the round and, in bo1, the match, crediting the right player', () => {
  let game = createInitialGame({ playerIds: [P1, P2], turnSeconds: 60, serverNow: NOW });
  const opts = { matchFormat: 'bo1', turnSeconds: 60, serverNow: NOW };
  // black (P1) plays a horizontal five at row 0; white (P2) plays elsewhere each turn.
  const blackMoves = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]];
  const whiteMoves = [[1, 0], [1, 1], [1, 2], [1, 3]];
  for (let i = 0; i < blackMoves.length; i++) {
    game = applyMove(game, opts, P1, ...blackMoves[i]);
    assert.ok(game, `black move ${i} should be accepted`);
    if (i < whiteMoves.length) {
      game = applyMove(game, opts, P2, ...whiteMoves[i]);
      assert.ok(game, `white move ${i} should be accepted`);
    }
  }
  assert.equal(game.roundStatus, 'round-over');
  assert.equal(game.roundResult.reason, 'five-in-a-row');
  assert.equal(game.roundResult.winnerPlayerId, P1);
  assert.equal(game.scores[P1], 1);
  assert.equal(game.matchStatus, 'match-over');
  assert.equal(game.winnerUid, P1);
});

test('a full board with no winner ends the round in a draw', () => {
  // color(r,c) depends on (r + 2c) mod 4: stepping by 1 row, 1 col, or 1
  // diagonal each changes that residue by 1, 2, or 3 (mod 4) respectively,
  // so any straight line changes color every 1-2 cells and never runs five.
  const BOARD_SIZE = 15;
  const colorAt = (r, c) => (((r + 2 * c) % 4) + 4) % 4 < 2 ? 'black' : 'white';

  const sparseBoard = {};
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (r === BOARD_SIZE - 1 && c === BOARD_SIZE - 1) continue; // leave one cell empty
      sparseBoard[r] = sparseBoard[r] || {};
      sparseBoard[r][c] = colorAt(r, c);
    }
  }
  const lastColor = colorAt(BOARD_SIZE - 1, BOARD_SIZE - 1);
  const game = {
    board: sparseBoard,
    colorOf: { [P1]: lastColor, [P2]: lastColor === 'black' ? 'white' : 'black' },
    turnColor: lastColor,
    round: 1,
    roundStatus: 'playing',
    roundResult: null,
    matchStatus: 'playing',
    winnerUid: null,
    lastMove: null,
    turnDeadline: null,
    scores: { [P1]: 0, [P2]: 0 },
  };
  const opts = { matchFormat: 'bo1', turnSeconds: null, serverNow: NOW };
  const result = applyMove(game, opts, P1, BOARD_SIZE - 1, BOARD_SIZE - 1);
  assert.ok(result, 'final move filling the board should be accepted');
  assert.equal(result.roundStatus, 'round-over');
  assert.equal(result.roundResult.reason, 'draw');
  assert.equal(result.roundResult.winnerPlayerId, null);
});

test('timeout forfeits the round to whoever was NOT on the clock', () => {
  let game = createInitialGame({ playerIds: [P1, P2], turnSeconds: 10, serverNow: NOW });
  const result = applyTimeout(game, { matchFormat: 'bo3' });
  assert.ok(result);
  assert.equal(result.roundResult.reason, 'timeout');
  // black (P1) was on the clock (turnColor starts 'black'), so white (P2) wins.
  assert.equal(result.roundResult.winnerPlayerId, P2);
  assert.equal(result.scores[P2], 1);
  assert.equal(result.matchStatus, 'playing'); // bo3 needs 2 wins
});

test('applyTimeout is a no-op once the round is already over', () => {
  let game = createInitialGame({ playerIds: [P1, P2], turnSeconds: 10, serverNow: NOW });
  game = applyTimeout(game, { matchFormat: 'bo3' });
  const secondAttempt = applyTimeout(game, { matchFormat: 'bo3' });
  assert.equal(secondAttempt, undefined);
});

test('advanceRound swaps colors, resets the board, and increments round', () => {
  let game = createInitialGame({ playerIds: [P1, P2], turnSeconds: 15, serverNow: NOW });
  game = applyTimeout(game, { matchFormat: 'bo3' }); // round 1 over, P2 (white) won
  const next = advanceRound(game, { turnSeconds: 15, serverNow: NOW + 100_000 });
  assert.equal(next.round, 2);
  assert.equal(next.roundStatus, 'playing');
  assert.equal(next.turnColor, 'black');
  assert.equal(next.colorOf[P1], 'white'); // colors swapped from round 1
  assert.equal(next.colorOf[P2], 'black');
  assert.deepEqual(next.board, {});
  assert.equal(next.turnDeadline, NOW + 100_000 + 15_000);
  assert.equal(next.scores[P2], 1); // score carried over
});

test('per-player score tracking survives color swapping across rounds (regression)', () => {
  // Round 1: P1 is black and wins as black via a real five-in-a-row.
  let game = createInitialGame({ playerIds: [P1, P2], turnSeconds: 60, serverNow: NOW });
  const opts1 = { matchFormat: 'bo3', turnSeconds: 60, serverNow: NOW };
  const blackMoves = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]];
  const whiteMoves = [[1, 0], [1, 1], [1, 2], [1, 3]];
  for (let i = 0; i < blackMoves.length; i++) {
    game = applyMove(game, opts1, P1, ...blackMoves[i]);
    if (i < whiteMoves.length) game = applyMove(game, opts1, P2, ...whiteMoves[i]);
  }
  assert.equal(game.scores[P1], 1);
  assert.equal(game.matchStatus, 'playing'); // bo3 needs 2 wins

  // Round 2: colors swap (black always moves first, and it's now P2's color).
  // P2 times out immediately, so the round is won by whoever is white THIS
  // round -- which is P1 again, even though the winning color flipped from
  // 'black' (round 1) to 'white' (round 2). A color-keyed score tally would
  // have put these two wins in different buckets (black=1, white=1) and
  // wrongly kept the match alive; player-keyed tracking correctly sees P1
  // reaching winsNeeded=2 and ends the match here.
  game = advanceRound(game, { turnSeconds: 60, serverNow: NOW + 1000 });
  assert.equal(game.colorOf[P1], 'white');
  assert.equal(game.colorOf[P2], 'black');
  assert.equal(game.turnColor, 'black'); // P2 is on the clock at round start
  game = applyTimeout(game, { matchFormat: 'bo3' });
  assert.equal(game.roundResult.winnerPlayerId, P1);
  assert.equal(game.scores[P1], 2);
  assert.equal(game.scores[P2], 0);
  assert.equal(game.matchStatus, 'match-over');
  assert.equal(game.winnerUid, P1);
});
