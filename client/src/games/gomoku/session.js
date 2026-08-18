import { createBoard, checkWin, isValidMove, isBoardFull, isForbiddenMove } from './engine.js';

export const MATCH_FORMATS = {
  bo1: { label: '단판', totalRounds: 1, winsNeeded: 1 },
  bo3: { label: '3판 2선승', totalRounds: 3, winsNeeded: 2 },
  bo5: { label: '5판 3선승', totalRounds: 5, winsNeeded: 3 },
  bo7: { label: '7판 4선승', totalRounds: 7, winsNeeded: 4 },
};

export const TURN_SECONDS_OPTIONS = [10, 15, 30, 60, null]; // null = unlimited

export const NEXT_ROUND_DELAY_MS = 3000;

// Realtime Database can't store sparse arrays well, so the board on the wire is
// board[row][col] = color, with empty cells simply absent. The pure win/board
// helpers in engine.js work on full 2D arrays, so convert at the boundary.
export function sparseToArray(sparseBoard) {
  const board = createBoard();
  for (const rowKey of Object.keys(sparseBoard || {})) {
    const row = Number(rowKey);
    const rowData = sparseBoard[rowKey] || {};
    for (const colKey of Object.keys(rowData)) {
      board[row][Number(colKey)] = rowData[colKey];
    }
  }
  return board;
}

function playerIdForColor(game, color) {
  return Object.keys(game.colorOf).find((id) => game.colorOf[id] === color);
}

export function createInitialGame({ playerIds, turnSeconds, serverNow }) {
  const [idA, idB] = playerIds;
  return {
    board: {},
    colorOf: { [idA]: 'black', [idB]: 'white' },
    turnColor: 'black',
    round: 1,
    roundStatus: 'playing',
    roundResult: null,
    matchStatus: 'playing',
    winnerUid: null,
    lastMove: null,
    turnDeadline: turnSeconds ? serverNow + turnSeconds * 1000 : null,
    scores: { [idA]: 0, [idB]: 0 },
  };
}

// Returns the next game state, or undefined if the move is illegal (caller
// should abort the transaction in that case).
export function applyMove(game, { matchFormat, turnSeconds, serverNow }, playerId, row, col) {
  if (!game || game.matchStatus !== 'playing' || game.roundStatus !== 'playing') return undefined;
  const color = game.colorOf[playerId];
  if (!color || color !== game.turnColor) return undefined;

  const boardArray = sparseToArray(game.board);
  if (!isValidMove(boardArray, col, row)) return undefined;
  boardArray[row][col] = color;
  if (isForbiddenMove(boardArray, col, row, color)) return undefined;

  // Realtime Database doesn't persist empty objects, so a fresh round's board
  // reads back as `undefined` rather than `{}` -- guard every access to it.
  const nextBoard = { ...game.board, [row]: { ...(game.board?.[row] || {}), [col]: color } };
  const base = { ...game, board: nextBoard, lastMove: { row, col, color } };

  if (checkWin(boardArray, col, row, color)) {
    return finishRound(base, matchFormat, color, 'five-in-a-row');
  }
  if (isBoardFull(boardArray)) {
    return finishRound(base, matchFormat, null, 'draw');
  }
  const nextColor = color === 'black' ? 'white' : 'black';
  return {
    ...base,
    turnColor: nextColor,
    turnDeadline: turnSeconds ? serverNow + turnSeconds * 1000 : null,
  };
}

export function applyTimeout(game, { matchFormat }) {
  if (!game || game.matchStatus !== 'playing' || game.roundStatus !== 'playing') return undefined;
  const loserColor = game.turnColor;
  const winnerColor = loserColor === 'black' ? 'white' : 'black';
  return finishRound(game, matchFormat, winnerColor, 'timeout');
}

export function advanceRound(game, { turnSeconds, serverNow }) {
  if (!game || game.matchStatus !== 'playing' || game.roundStatus !== 'round-over') return undefined;
  const [idA, idB] = Object.keys(game.colorOf);
  const swappedColorOf = {
    [idA]: game.colorOf[idA] === 'black' ? 'white' : 'black',
    [idB]: game.colorOf[idB] === 'black' ? 'white' : 'black',
  };
  return {
    ...game,
    board: {},
    colorOf: swappedColorOf,
    turnColor: 'black',
    round: game.round + 1,
    roundStatus: 'playing',
    roundResult: null,
    lastMove: null,
    turnDeadline: turnSeconds ? serverNow + turnSeconds * 1000 : null,
  };
}

function finishRound(game, matchFormat, winnerColor, reason) {
  const winnerPlayerId = winnerColor ? playerIdForColor(game, winnerColor) : null;
  const scores = { ...game.scores };
  if (winnerPlayerId) scores[winnerPlayerId] = (scores[winnerPlayerId] || 0) + 1;

  const { winsNeeded, totalRounds } = MATCH_FORMATS[matchFormat];
  const [idA, idB] = Object.keys(game.colorOf);
  const matchWinnerId = scores[idA] >= winsNeeded ? idA : scores[idB] >= winsNeeded ? idB : null;
  const matchOver = Boolean(matchWinnerId) || game.round >= totalRounds;

  return {
    ...game,
    scores,
    roundStatus: 'round-over',
    roundResult: { winnerColor, winnerPlayerId, reason, round: game.round, scores },
    turnDeadline: null,
    matchStatus: matchOver ? 'match-over' : 'playing',
    winnerUid: matchOver
      ? (matchWinnerId ?? (scores[idA] === scores[idB] ? null : scores[idA] > scores[idB] ? idA : idB))
      : null,
  };
}
