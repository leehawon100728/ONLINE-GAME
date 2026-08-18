import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createBoard,
  checkWin,
  isValidMove,
  isBoardFull,
  isForbiddenMove,
  getForbiddenCells,
  BOARD_SIZE,
} from './engine.js';

test('horizontal five in a row wins', () => {
  const board = createBoard();
  for (let x = 3; x <= 6; x++) board[7][x] = 'black';
  board[7][7] = 'black';
  assert.equal(checkWin(board, 7, 7, 'black'), true);
});

test('vertical five in a row wins', () => {
  const board = createBoard();
  for (let y = 0; y < 4; y++) board[y][2] = 'white';
  board[4][2] = 'white';
  assert.equal(checkWin(board, 2, 4, 'white'), true);
});

test('diagonal (down-right) five in a row wins', () => {
  const board = createBoard();
  for (let i = 0; i < 4; i++) board[i][i] = 'black';
  board[4][4] = 'black';
  assert.equal(checkWin(board, 4, 4, 'black'), true);
});

test('diagonal (down-left / anti-diagonal) five in a row wins', () => {
  const board = createBoard();
  for (let i = 0; i < 4; i++) board[i][10 - i] = 'white';
  board[4][6] = 'white';
  assert.equal(checkWin(board, 6, 4, 'white'), true);
});

test('six or more in a row still wins (freestyle rules)', () => {
  const board = createBoard();
  for (let x = 2; x <= 7; x++) board[5][x] = 'black';
  assert.equal(checkWin(board, 5, 5, 'black'), true);
});

test('four in a row does not win', () => {
  const board = createBoard();
  for (let x = 3; x <= 5; x++) board[7][x] = 'black';
  board[7][6] = 'black';
  assert.equal(checkWin(board, 6, 7, 'black'), false);
});

test('a full five-in-a-row still wins even with an opponent stone beside it', () => {
  const board = createBoard();
  board[7][2] = 'white';
  for (let x = 3; x <= 7; x++) board[7][x] = 'black';
  assert.equal(checkWin(board, 7, 7, 'black'), true);
});

test('opponent stone blocking one end prevents reaching five', () => {
  const board = createBoard();
  for (let x = 3; x <= 5; x++) board[7][x] = 'black';
  board[7][6] = 'white';
  assert.equal(checkWin(board, 5, 7, 'black'), false);
});

test('isValidMove rejects out of bounds and occupied cells', () => {
  const board = createBoard();
  board[0][0] = 'black';
  assert.equal(isValidMove(board, 0, 0), false);
  assert.equal(isValidMove(board, -1, 0), false);
  assert.equal(isValidMove(board, BOARD_SIZE, 0), false);
  assert.equal(isValidMove(board, 1, 1), true);
});

test('overline (six in a row) is forbidden for black', () => {
  const board = createBoard();
  for (let x = 2; x <= 6; x++) board[5][x] = 'black';
  board[5][7] = 'black';
  assert.equal(isForbiddenMove(board, 7, 5, 'black'), true);
});

test('overline is not forbidden for white (only black is restricted)', () => {
  const board = createBoard();
  for (let x = 2; x <= 6; x++) board[5][x] = 'white';
  board[5][7] = 'white';
  assert.equal(isForbiddenMove(board, 7, 5, 'white'), false);
});

test('completing an exact five is a win, never forbidden', () => {
  const board = createBoard();
  for (let x = 3; x <= 6; x++) board[7][x] = 'black';
  board[7][7] = 'black';
  assert.equal(isForbiddenMove(board, 7, 7, 'black'), false);
});

test('double three (3-3) is forbidden for black', () => {
  const board = createBoard();
  board[7][5] = 'black';
  board[7][7] = 'black';
  board[6][6] = 'black';
  board[8][6] = 'black';
  board[7][6] = 'black'; // the move being tested
  assert.equal(isForbiddenMove(board, 6, 7, 'black'), true);
});

test('double four (4-4) is forbidden for black', () => {
  const board = createBoard();
  board[7][3] = 'black';
  board[7][4] = 'black';
  board[7][5] = 'black';
  board[4][6] = 'black';
  board[5][6] = 'black';
  board[6][6] = 'black';
  board[7][6] = 'black'; // the move being tested
  assert.equal(isForbiddenMove(board, 6, 7, 'black'), true);
});

test('a four plus an open three (not doubled) is allowed', () => {
  const board = createBoard();
  board[7][3] = 'black';
  board[7][4] = 'black';
  board[7][5] = 'black';
  board[5][6] = 'black';
  board[6][6] = 'black';
  board[7][6] = 'black'; // the move being tested
  assert.equal(isForbiddenMove(board, 6, 7, 'black'), false);
});

test('getForbiddenCells lists 3-3 points for black and is empty for white', () => {
  const board = createBoard();
  board[7][5] = 'black';
  board[7][7] = 'black';
  board[6][6] = 'black';
  board[8][6] = 'black';
  const blackForbidden = getForbiddenCells(board, 'black');
  assert.ok(blackForbidden.some(([x, y]) => x === 6 && y === 7));
  assert.deepEqual(getForbiddenCells(board, 'white'), []);
});

test('isBoardFull detects a full board', () => {
  const board = createBoard();
  assert.equal(isBoardFull(board), false);
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) board[y][x] = 'black';
  }
  assert.equal(isBoardFull(board), true);
});
