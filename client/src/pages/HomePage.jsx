import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoom } from '../context/RoomContext.jsx';
import { generateNickname } from '../nickname.js';

export default function HomePage() {
  const navigate = useNavigate();
  const { createRoom, joinRoom, error, clearError } = useRoom();
  const [nickname, setNickname] = useState(() => generateNickname());
  const [joinCode, setJoinCode] = useState('');
  const [busy, setBusy] = useState(false);

  const trimmedNickname = nickname.trim();

  async function handlePlay(gameId) {
    if (busy || !trimmedNickname) return;
    setBusy(true);
    const res = await createRoom(trimmedNickname, gameId);
    setBusy(false);
    if (res.ok) navigate(`/room/${res.roomCode}`);
  }

  async function handleJoin(e) {
    e.preventDefault();
    if (!trimmedNickname || !joinCode.trim() || busy) return;
    setBusy(true);
    const res = await joinRoom(joinCode.trim().toUpperCase(), trimmedNickname);
    setBusy(false);
    if (res.ok) navigate(`/room/${res.roomCode}`);
  }

  return (
    <div className="page-center">
      <div className="home-stack">
        <div className="brand-block">
          <h1 className="brand-title">미니게임 방</h1>
          <p className="brand-subtitle">게임을 골라 방을 만들고, 친구에게 코드를 공유해보세요</p>
        </div>

        <div className="panel nickname-panel">
          <span className="field-label">닉네임</span>
          <div className="nickname-row">
            <input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={12}
              placeholder="닉네임"
            />
            <button
              type="button"
              className="btn btn-ghost btn-icon"
              title="닉네임 새로 뽑기"
              onClick={() => setNickname(generateNickname())}
            >
              🎲
            </button>
          </div>
        </div>

        <div className="panel catalog-panel">
          <p className="game-category-label">1vs1</p>
          <div className="game-choices">
            <button className="game-choice" disabled={busy || !trimmedNickname} onClick={() => handlePlay('gomoku')}>
              <span className="game-choice-icon">⚫⚪</span>
              <span>오목</span>
            </button>
          </div>

          <p className="game-category-label">1vs다수</p>
          <div className="game-choices">
            <button className="game-choice" disabled>
              <span className="game-choice-icon">🧩</span>
              <span>준비중</span>
            </button>
          </div>

          <p className="game-category-label">개인전</p>
          <div className="game-choices">
            <button className="game-choice" disabled={busy || !trimmedNickname} onClick={() => handlePlay('timing')}>
              <span className="game-choice-icon">⏱️</span>
              <span>시간 맞추기</span>
            </button>
          </div>
        </div>

        <div className="panel join-panel">
          <h2 className="section-title">코드로 입장</h2>
          <form onSubmit={handleJoin} className="join-form">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="방 코드 (숫자 4자리)"
              className="code-input"
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || !trimmedNickname || !joinCode.trim()}
            >
              입장하기
            </button>
          </form>
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
