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
