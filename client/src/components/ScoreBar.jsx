export default function ScoreBar({ left, right, winsNeeded }) {
  return (
    <div className="score-bar">
      <div className={'score-side' + (left.isTurn ? ' active' : '')}>
        <span className={`score-stone stone-dot-${left.color}`} />
        <span className="score-name">{left.nickname}</span>
        <span className="score-value">{left.score}</span>
      </div>
      <div className="score-target">{winsNeeded}선승</div>
      <div className={'score-side' + (right.isTurn ? ' active' : '')}>
        <span className="score-value">{right.score}</span>
        <span className="score-name">{right.nickname}</span>
        <span className={`score-stone stone-dot-${right.color}`} />
      </div>
    </div>
  );
}
