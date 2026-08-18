import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBoard, checkWin, isValidMove, isBoardFull, BOARD_SIZE } from './engine.js';

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

test('isBoardFull detects a full board', () => {
  const board = createBoard();
  assert.equal(isBoardFull(board), false);
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) board[y][x] = 'black';
  }
  assert.equal(isBoardFull(board), true);
});
