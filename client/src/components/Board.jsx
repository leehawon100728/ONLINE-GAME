const SIZE = 15;
const CELL = 36;
const PADDING = 28;
const BOARD_PX = PADDING * 2 + CELL * (SIZE - 1);
const STAR_POINTS = [3, 7, 11].flatMap((x) => [3, 7, 11].map((y) => ({ x, y })));

export default function Board({ board, onCellClick, disabled, lastMove }) {
  const lines = [];
  for (let i = 0; i < SIZE; i++) {
    const pos = PADDING + i * CELL;
    const end = PADDING + CELL * (SIZE - 1);
    lines.push(<line key={`h${i}`} x1={PADDING} y1={pos} x2={end} y2={pos} className="board-line" />);
    lines.push(<line key={`v${i}`} x1={pos} y1={PADDING} x2={pos} y2={end} className="board-line" />);
  }

  const stones = [];
  const hitCells = [];
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const cx = PADDING + x * CELL;
      const cy = PADDING + y * CELL;
      const color = board[y][x];
      if (color) {
        const isLast = lastMove && lastMove.x === x && lastMove.y === y;
        stones.push(
          <g key={`s${x}-${y}`}>
            <circle
              cx={cx}
              cy={cy}
              r={CELL * 0.44}
              fill={color === 'black' ? 'url(#stoneBlack)' : 'url(#stoneWhite)'}
              className="stone"
            />
            {isLast && (
              <circle cx={cx} cy={cy} r={CELL * 0.13} className={`stone-marker marker-${color}`} />
            )}
          </g>
        );
      } else {
        hitCells.push(
          <rect
            key={`h${x}-${y}`}
            x={cx - CELL / 2}
            y={cy - CELL / 2}
            width={CELL}
            height={CELL}
            className={disabled ? 'cell-hit' : 'cell-hit clickable'}
            onClick={() => !disabled && onCellClick(x, y)}
          />
        );
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`} className="gomoku-board" role="img" aria-label="오목판">
      <defs>
        <radialGradient id="stoneBlack" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#6b6b6b" />
          <stop offset="55%" stopColor="#1c1c1c" />
          <stop offset="100%" stopColor="#000000" />
        </radialGradient>
        <radialGradient id="stoneWhite" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#e7e1d3" />
          <stop offset="100%" stopColor="#c7bfab" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width={BOARD_PX} height={BOARD_PX} className="board-bg" rx="6" />
      {lines}
      {STAR_POINTS.map(({ x, y }) => (
        <circle key={`star-${x}-${y}`} cx={PADDING + x * CELL} cy={PADDING + y * CELL} r={3.5} className="board-star" />
      ))}
      {hitCells}
      {stones}
    </svg>
  );
}
