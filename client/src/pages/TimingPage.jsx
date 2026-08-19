import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext.jsx';
import { REVEAL_SECONDS } from '../games/timing/session.js';

function formatSeconds(seconds) {
  return seconds.toFixed(2);
}

export default function TimingPage() {
  const navigate = useNavigate();
  const {
    session,
    room,
    timingState,
    serverOffset,
    submitTimingStop,
    returnToLobby,
    leaveRoom,
    error,
    clearError,
  } = useRoom();
  const [now, setNow] = useState(() => Date.now() + serverOffset);

  const hasStopped = Boolean(session && timingState?.stops?.[session.playerId] != null);

  useEffect(() => {
    if (hasStopped) return undefined;
    const id = setInterval(() => setNow(Date.now() + serverOffset), 100);
    return () => clearInterval(id);
  }, [serverOffset, hasStopped, timingState?.round]);

  if (!room || !timingState || !session) return <div className="page-center">불러오는 중...</div>;

  const isHost = room.hostPlayerId === session.playerId;
  const activePlayers = room.players.filter((p) => !p.isSpectator);
  const me = room.players.find((p) => p.playerId === session.playerId);
  const isSpectator = !me || me.isSpectator;
  const others = activePlayers.filter((p) => p.playerId !== session.playerId);

  const roundOver = timingState.roundStatus === 'round-over';
  const matchOver = timingState.status === 'match-over';
  const myStopAt = timingState.stops[session.playerId];
  const elapsedSeconds = Math.max(0, (now - timingState.startedAt) / 1000);
  const revealing = elapsedSeconds < REVEAL_SECONDS;

  const nicknameOf = (playerId) => room.players.find((p) => p.playerId === playerId)?.nickname ?? '';
  const sortedScores = [...activePlayers].sort(
    (a, b) => (timingState.scores[b.playerId] || 0) - (timingState.scores[a.playerId] || 0)
  );

  function handleStop() {
    if (hasStopped || isSpectator || roundOver) return;
    submitTimingStop();
  }

  function handleLeave() {
    leaveRoom();
    navigate('/');
  }

  async function handleReturnToLobby() {
    await returnToLobby();
  }

  return (
    <div className="page-center">
      <div className="panel game-panel timing-panel">
        <div className="game-panel-header">
          <span className="round-label">
            {timingState.round}판째 · 총 {timingState.roundCount}판
          </span>
          <button className="btn btn-ghost btn-small" onClick={handleLeave}>
            나가기
          </button>
        </div>

        <ul className="timing-score-list">
          {sortedScores.map((p) => (
            <li key={p.playerId} className={p.playerId === session.playerId ? 'me' : ''}>
              <span className="timing-score-name">{p.nickname}</span>
              <span className="timing-score-value">{timingState.scores[p.playerId] || 0}승</span>
            </li>
          ))}
        </ul>

        <div className="timing-arena">
          {isSpectator ? (
            <p className="wait-note">관전 중입니다.</p>
          ) : (
            <div className="timing-own-card">
              <div className={'timing-clock' + (revealing ? '' : ' blind')}>
                {hasStopped
                  ? formatSeconds((myStopAt - timingState.startedAt) / 1000)
                  : revealing
                    ? formatSeconds(elapsedSeconds)
                    : '??.??'}
              </div>
              <button className="btn btn-primary btn-large" disabled={hasStopped || roundOver} onClick={handleStop}>
                {hasStopped ? '기록됨, 대기 중...' : '지금 멈추기!'}
              </button>
            </div>
          )}

          {others.length > 0 && (
            <div className="timing-others-grid">
              {others.map((p) => (
                <div key={p.playerId} className="timing-other-card">
                  <span className="timing-other-name">{p.nickname}</span>
                  <span
                    className={'timing-other-status' + (timingState.stops[p.playerId] != null ? ' stopped' : '')}
                  >
                    {timingState.stops[p.playerId] != null ? '✅ 멈춤' : '⏳ 측정 중'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {roundOver && !matchOver && timingState.roundResult && (
            <div className="overlay">
              <div className="overlay-card">
                <p className="overlay-title">목표 시간: {timingState.roundResult.target.toFixed(2)}초</p>
                <ul className="timing-result-list">
                  {[...timingState.roundResult.entries]
                    .sort((a, b) => a.error - b.error)
                    .map((entry) => (
                      <li
                        key={entry.playerId}
                        className={timingState.roundResult.winnerPlayerIds.includes(entry.playerId) ? 'winner' : ''}
                      >
                        {timingState.roundResult.winnerPlayerIds.includes(entry.playerId) ? '🏆 ' : ''}
                        {nicknameOf(entry.playerId)} — {entry.elapsedSeconds.toFixed(2)}초 (오차{' '}
                        {entry.error.toFixed(2)}초)
                      </li>
                    ))}
                </ul>
                <p className="overlay-note">잠시 후 다음 판이 시작됩니다...</p>
              </div>
            </div>
          )}

          {matchOver && (
            <div className="overlay">
              <div className="overlay-card">
                <p className="overlay-title">
                  {timingState.winnerPlayerIds?.length === 1
                    ? `${nicknameOf(timingState.winnerPlayerIds[0])}님 최종 승리!`
                    : `공동 우승: ${(timingState.winnerPlayerIds || []).map(nicknameOf).join(', ')}`}
                </p>
                <ul className="timing-result-list">
                  {sortedScores.map((p) => (
                    <li key={p.playerId}>
                      {p.nickname} — {timingState.scores[p.playerId] || 0}승
                    </li>
                  ))}
                </ul>
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
