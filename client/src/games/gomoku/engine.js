export const BOARD_SIZE = 15;

export function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));
}

export function isInBounds(x, y) {
  return x >= 0 && x < BOARD_SIZE && y >= 0 && y < BOARD_SIZE;
}

export function isValidMove(board, x, y) {
  return isInBounds(x, y) && board[y][x] === null;
}

const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
];

// Returns true if placing `color` at (x, y) creates a line of 5 or more.
export function checkWin(board, x, y, color) {
  for (const [dx, dy] of DIRECTIONS) {
    let count = 1;
    count += countDirection(board, x, y, dx, dy, color);
    count += countDirection(board, x, y, -dx, -dy, color);
    if (count >= 5) return true;
  }
  return false;
}

function countDirection(board, x, y, dx, dy, color) {
  let count = 0;
  let cx = x + dx;
  let cy = y + dy;
  while (isInBounds(cx, cy) && board[cy][cx] === color) {
    count += 1;
    cx += dx;
    cy += dy;
  }
  return count;
}

export function isBoardFull(board) {
  return board.every((row) => row.every((cell) => cell !== null));
}

// Looks at the line of `color` running through (x, y) in one direction (the
// stone at (x, y) must already be placed on `board`). Reports its exact
// length and whether each end is open (empty, in-bounds cell right past the
// run) so callers can classify it as a four, an open three, etc.
function inspectLine(board, x, y, dx, dy, color) {
  let back = 0;
  let cx = x - dx;
  let cy = y - dy;
  while (isInBounds(cx, cy) && board[cy][cx] === color) {
    back += 1;
    cx -= dx;
    cy -= dy;
  }
  const backOpen = isInBounds(cx, cy) && board[cy][cx] === null;

  let forward = 0;
  cx = x + dx;
  cy = y + dy;
  while (isInBounds(cx, cy) && board[cy][cx] === color) {
    forward += 1;
    cx += dx;
    cy += dy;
  }
  const forwardOpen = isInBounds(cx, cy) && board[cy][cx] === null;

  return { length: back + forward + 1, backOpen, forwardOpen };
}

// Renju-style forbidden points for black (double-three, double-four,
// overline). White has no restrictions. `board` must already have `color`
// placed at (x, y). A move that completes an exact five is a win and is
// never forbidden, even if it also happens to form one of these shapes
// along another line.
export function isForbiddenMove(board, x, y, color) {
  if (color !== 'black') return false;

  const lines = DIRECTIONS.map(([dx, dy]) => inspectLine(board, x, y, dx, dy, color));

  if (lines.some((line) => line.length === 5)) return false;
  if (lines.some((line) => line.length >= 6)) return true; // 장목 (overline)

  const openThrees = lines.filter((line) => line.length === 3 && line.backOpen && line.forwardOpen).length;
  if (openThrees >= 2) return true; // 삼삼 (double three)

  const fours = lines.filter((line) => line.length === 4 && (line.backOpen || line.forwardOpen)).length;
  if (fours >= 2) return true; // 사사 (double four)

  return false;
}

// All empty cells where `color` is forbidden to play, for marking on the board.
export function getForbiddenCells(board, color) {
  if (color !== 'black') return [];
  const scratch = board.map((row) => row.slice());
  const cells = [];
  for (let y = 0; y < BOARD_SIZE; y++) {
    for (let x = 0; x < BOARD_SIZE; x++) {
      if (scratch[y][x] !== null) continue;
      scratch[y][x] = color;
      const forbidden = isForbiddenMove(scratch, x, y, color);
      scratch[y][x] = null;
      if (forbidden) cells.push([x, y]);
    }
  }
  return cells;
}
