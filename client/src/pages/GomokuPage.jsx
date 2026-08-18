import { useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext.jsx';
import Board from '../components/Board.jsx';
import TurnTimer from '../components/TurnTimer.jsx';
import ScoreBar from '../components/ScoreBar.jsx';

const ROUND_REASON_LABEL = {
  'five-in-a-row': '오목 완성',
  timeout: '시간 초과',
  draw: '무승부',
};

function buildSeatedPlayers(room, gameState) {
  return Object.keys(gameState.colorOf)
    .map((playerId) => {
      const player = room.players.find((p) => p.playerId === playerId);
      return {
        playerId,
        nickname: player?.nickname ?? '',
        seat: player?.seat ?? 0,
        color: gameState.colorOf[playerId],
        score: gameState.scores[playerId] ?? 0,
        isTurn: gameState.colorOf[playerId] === gameState.turnColor,
      };
    })
    .sort((a, b) => a.seat - b.seat);
}

export default function GomokuPage() {
  const navigate = useNavigate();
  const { session, room, gameState, move, returnToLobby, leaveRoom, error, clearError } = useRoom();

  if (!room || !gameState || !session) return <div className="page-center">불러오는 중...</div>;

  const isHost = room.hostPlayerId === session.playerId;
  const myColor = gameState.colorOf[session.playerId];
  const isSpectator = !myColor;
  const isMyTurn = !isSpectator && gameState.turnColor === myColor && gameState.roundStatus === 'playing';
  const roundOver = gameState.roundStatus === 'round-over';
  const matchOver = gameState.status === 'match-over';

  const seatedPlayers = buildSeatedPlayers(room, gameState);
  const [left, right] = seatedPlayers;
  const currentTurnPlayer = seatedPlayers.find((p) => p.color === gameState.turnColor);
  const nicknameOf = (playerId) => room.players.find((p) => p.playerId === playerId)?.nickname ?? '';

  function handleCellClick(x, y) {
    if (!isMyTurn) return;
    move(x, y);
  }

  function handleLeave() {
    leaveRoom();
    navigate('/');
  }

  async function handleReturnToLobby() {
    await returnToLobby();
  }

  const turnLabel = isSpectator
    ? `${currentTurnPlayer?.nickname ?? ''}님 차례 (관전 중)`
    : isMyTurn
      ? '내 차례입니다'
      : `${currentTurnPlayer?.nickname ?? ''}님 차례`;

  return (
    <div className="page-center">
      <div className="panel game-panel">
        <div className="game-panel-header">
          <span className="round-label">
            {gameState.round}판째 · {gameState.winsNeeded}선승
          </span>
          <button className="btn btn-ghost btn-small" onClick={handleLeave}>
            나가기
          </button>
        </div>

        {left && right && <ScoreBar left={left} right={right} winsNeeded={gameState.winsNeeded} />}

        <div className="turn-info">
          <span className={'turn-text' + (isMyTurn ? ' my-turn' : '')}>{turnLabel}</span>
          <TurnTimer deadline={gameState.turnDeadline} totalSeconds={gameState.turnSeconds} />
        </div>

        <div className="board-wrap">
          <Board
            board={gameState.board}
            onCellClick={handleCellClick}
            disabled={!isMyTurn}
            lastMove={gameState.lastMove}
          />

          {roundOver && !matchOver && (
            <div className="overlay">
              <div className="overlay-card">
                <p className="overlay-title">
                  {gameState.roundResult.winnerPlayerId
                    ? `${nicknameOf(gameState.roundResult.winnerPlayerId)}님 승리!`
                    : '무승부'}
                </p>
                <p className="overlay-sub">{ROUND_REASON_LABEL[gameState.roundResult.reason]}</p>
                <p className="overlay-note">잠시 후 다음 판이 시작됩니다...</p>
              </div>
            </div>
          )}

          {matchOver && (
            <div className="overlay">
              <div className="overlay-card">
                <p className="overlay-title">
                  {gameState.winnerPlayerId ? `${nicknameOf(gameState.winnerPlayerId)}님 최종 승리!` : '무승부로 매치 종료'}
                </p>
                <p className="overlay-sub">
                  최종 스코어 {left?.score ?? 0} : {right?.score ?? 0}
                </p>
                {isHost ? (
                  <button className="btn btn-primary" onClick={handleReturnToLobby}>
                    로비로 돌아가기
                  </button>
                ) : (
                  <p className="overlay-note">방장이 로비로 돌아가기를 기다리는 중...</p>
                )}
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="error-banner" onClick={clearError}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
