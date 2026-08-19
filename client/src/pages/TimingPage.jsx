import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext.jsx';
import { REVEAL_SECONDS, READY_SECONDS } from '../games/timing/session.js';
import { TARGET_MIN, TARGET_MAX } from '../games/timing/engine.js';

const SPIN_SECONDS = 1.2; // how long the target "slot machine" spins before landing

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
  const msToStart = timingState.startedAt - now;
  const readyPhase = msToStart > 0;
  const secondsToStart = Math.max(0, Math.ceil(msToStart / 1000));
  const elapsedSeconds = Math.max(0, (now - timingState.startedAt) / 1000);
  const revealing = readyPhase || elapsedSeconds < REVEAL_SECONDS;
  const secondsIntoReady = readyPhase ? READY_SECONDS - msToStart / 1000 : READY_SECONDS;
  const spinning = readyPhase && secondsIntoReady < SPIN_SECONDS;
  const displayTarget = spinning ? TARGET_MIN + Math.random() * (TARGET_MAX - TARGET_MIN) : timingState.target;

  const nicknameOf = (playerId) => room.players.find((p) => p.playerId === playerId)?.nickname ?? '';
  const sortedScores = [...activePlayers].sort(
    (a, b) => (timingState.scores[b.playerId] || 0) - (timingState.scores[a.playerId] || 0)
  );

  function handleStop() {
    if (hasStopped || isSpectator || roundOver || readyPhase) return;
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

        <p className="timing-target-hint">
          목표 시간은 {TARGET_MIN}~{TARGET_MAX}초 사이에서 무작위로 정해져요. 시작 전에 미리 보여드리고, 시작한
          뒤에도 {REVEAL_SECONDS}초 동안 더 보이다가 가려지니 잘 기억해뒀다가, 그만큼 시간이 지났다고 생각되면
          멈추세요!
        </p>

        {!roundOver && (
          <div className={'timing-target-banner' + (spinning ? ' spinning' : '')}>
            {revealing ? (
              <>
                <span className="timing-target-label">🎯 목표 시간</span>
                <span className="timing-target-value">{formatSeconds(displayTarget)}초</span>
                {readyPhase && (
                  <span className="timing-target-countdown">
                    {secondsToStart}초 후 시작! 잘 기억해두세요
                  </span>
                )}
              </>
            ) : (
              <span className="timing-target-hidden">🔒 목표 시간을 기억하고 있나요?</span>
            )}
          </div>
        )}

        <div className="timing-arena">
          <div className={'timing-split-grid' + (isSpectator ? ' spectating' : '')}>
            {!isSpectator && (
              <div className="timing-tile mine">
                <span className="timing-tile-name">{me.nickname}</span>
                {hasStopped ? (
                  <div className="timing-clock">{formatSeconds((myStopAt - timingState.startedAt) / 1000)}초</div>
                ) : (
                  <div className="timing-clock blind">??.??</div>
                )}
                <button
                  className="btn btn-primary btn-large"
                  disabled={hasStopped || roundOver || readyPhase}
                  onClick={handleStop}
                >
                  {hasStopped ? '기록됨, 대기 중...' : readyPhase ? `${secondsToStart}초 후 시작` : '지금 멈추기!'}
                </button>
              </div>
            )}

            {others.map((p) => (
              <div key={p.playerId} className="timing-tile">
                <span className="timing-tile-name">{p.nickname}</span>
                <span
                  className={'timing-other-status' + (timingState.stops[p.playerId] != null ? ' stopped' : '')}
                >
                  {readyPhase ? '🕐 준비 중' : timingState.stops[p.playerId] != null ? '✅ 멈춤' : '⏳ 측정 중'}
                </span>
              </div>
            ))}
          </div>

          {isSpectator && <p className="wait-note">관전 중입니다.</p>}

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
