import { useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext.jsx';
import RoomCodeBadge from '../components/RoomCodeBadge.jsx';
import {
  MATCH_FORMAT_OPTIONS,
  TURN_SECONDS_OPTIONS,
  turnSecondsToValue,
  valueToTurnSeconds,
  matchFormatLabel,
  turnSecondsLabel,
} from '../gameOptions.js';

const GAME_LABELS = { gomoku: '오목' };

export default function RoomPage() {
  const navigate = useNavigate();
  const { session, room, updateSettings, startGame, leaveRoom, error, clearError } = useRoom();

  if (!room || !session) return null;

  const isHost = room.hostPlayerId === session.playerId;
  const activePlayers = room.players.filter((p) => !p.isSpectator);
  const spectators = room.players.filter((p) => p.isSpectator);
  const canStart = isHost && activePlayers.length === 2;

  function handleLeave() {
    leaveRoom();
    navigate('/');
  }

  async function handleStart() {
    const res = await startGame();
    if (!res.ok) return;
  }

  return (
    <div className="page-center">
      <div className="panel room-panel">
        <div className="room-panel-header">
          <RoomCodeBadge code={room.code} />
          <button className="btn btn-ghost" onClick={handleLeave}>
            나가기
          </button>
        </div>

        <section className="players-section">
          <h2 className="section-title">참가자 ({activePlayers.length}/2)</h2>
          <ul className="player-list">
            {activePlayers.map((p) => (
              <li key={p.playerId} className={'player-card' + (p.connected ? '' : ' disconnected')}>
                {p.playerId === room.hostPlayerId && <span className="crown">👑</span>}
                <span className="player-name">{p.nickname}</span>
                {p.playerId === session.playerId && <span className="you-tag">나</span>}
                {!p.connected && <span className="reconnecting-tag">재접속 대기중</span>}
              </li>
            ))}
            {activePlayers.length < 2 && <li className="player-card empty-slot">상대방을 기다리는 중...</li>}
          </ul>
          {spectators.length > 0 && (
            <p className="spectator-note">관전자: {spectators.map((s) => s.nickname).join(', ')}</p>
          )}
        </section>

        <p className="selected-game-label">
          <span className="game-choice-icon">⚫⚪</span> {GAME_LABELS[room.selectedGame] ?? room.selectedGame}
        </p>

        <section className="settings-section">
          <h2 className="section-title">대국 설정</h2>
          {isHost ? (
            <div className="settings-grid">
              <label className="field">
                <span>한 수 제한시간</span>
                <select
                  value={turnSecondsToValue(room.settings.turnSeconds)}
                  onChange={(e) => updateSettings({ turnSeconds: valueToTurnSeconds(e.target.value) })}
                >
                  {TURN_SECONDS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>경기 방식</span>
                <select
                  value={room.settings.matchFormat}
                  onChange={(e) => updateSettings({ matchFormat: e.target.value })}
                >
                  {MATCH_FORMAT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <div className="settings-readonly">
              <div>
                한 수 제한시간: <strong>{turnSecondsLabel(room.settings.turnSeconds)}</strong>
              </div>
              <div>
                경기 방식: <strong>{matchFormatLabel(room.settings.matchFormat)}</strong>
              </div>
            </div>
          )}
        </section>

        {isHost ? (
          <button className="btn btn-primary btn-large" disabled={!canStart} onClick={handleStart}>
            게임 시작
          </button>
        ) : (
          <p className="wait-note">방장이 게임을 시작하기를 기다리는 중...</p>
        )}

        {error && (
          <div className="error-banner" onClick={clearError}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
