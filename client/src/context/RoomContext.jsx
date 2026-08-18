import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ref, onValue, get, set, update, remove, runTransaction, onDisconnect, serverTimestamp } from 'firebase/database';
import { db, ensureSignedIn } from '../firebase.js';
import {
  createInitialGame,
  applyMove,
  applyTimeout,
  advanceRound,
  sparseToArray,
  MATCH_FORMATS,
  NEXT_ROUND_DELAY_MS,
} from '../games/gomoku/session.js';

const RoomContext = createContext(null);
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 0/O, 1/I 제외

function generateRoomCode() {
  return Array.from({ length: 6 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
}

export function RoomProvider({ children }) {
  const [uid, setUid] = useState(null);
  const [currentCode, setCurrentCode] = useState(null);
  const [rawRoom, setRawRoom] = useState(null);
  const [connected, setConnected] = useState(true);
  const [serverOffset, setServerOffset] = useState(0);
  const [error, setError] = useState(null);

  const serverNow = useCallback(() => Date.now() + serverOffset, [serverOffset]);

  useEffect(() => {
    ensureSignedIn().then((user) => setUid(user.uid));
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, '.info/connected'), (snap) => setConnected(snap.val() === true));
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, '.info/serverTimeOffset'), (snap) => setServerOffset(snap.val() || 0));
    return () => unsub();
  }, []);

  // Subscribe to the active room (meta + nested game state come in one snapshot).
  useEffect(() => {
    if (!currentCode) {
      setRawRoom(null);
      return undefined;
    }
    const unsub = onValue(ref(db, `rooms/${currentCode}`), (snap) => setRawRoom(snap.val()));
    return () => unsub();
  }, [currentCode]);

  // Presence: mark connected=true while attached, flip to false automatically on disconnect.
  useEffect(() => {
    if (!currentCode || !uid) return undefined;
    const playerRef = ref(db, `rooms/${currentCode}/players/${uid}`);
    const unsub = onValue(ref(db, '.info/connected'), (snap) => {
      if (snap.val() !== true) return;
      onDisconnect(playerRef)
        .update({ connected: false })
        .then(() => update(playerRef, { connected: true }))
        .catch(() => {});
    });
    return () => {
      unsub();
      onDisconnect(playerRef).cancel().catch(() => {});
    };
  }, [currentCode, uid]);

  // Host migration: if the host is gone (left or disconnected), the next active
  // player to notice self-claims the room. Best-effort by design (see README).
  useEffect(() => {
    if (!currentCode || !uid || !rawRoom) return;
    const me = rawRoom.players?.[uid];
    if (!me || me.isSpectator) return;
    const hostUid = rawRoom.hostUid;
    const hostPlayer = hostUid ? rawRoom.players?.[hostUid] : null;
    const hostGone = !hostPlayer || hostPlayer.connected === false;
    if (hostGone && hostUid !== uid) {
      set(ref(db, `rooms/${currentCode}/hostUid`), uid).catch(() => {});
    }
  }, [currentCode, uid, rawRoom]);

  // Turn-timer watcher: whichever connected client notices the deadline passed
  // tries to forfeit the round. Transactions make this safe if several clients race.
  useEffect(() => {
    const game = rawRoom?.game;
    if (!game || game.matchStatus !== 'playing' || game.roundStatus !== 'playing' || !game.turnDeadline) {
      return undefined;
    }
    const msLeft = game.turnDeadline - serverNow();
    const handle = setTimeout(() => {
      if (!currentCode) return;
      const matchFormat = rawRoom?.settings?.matchFormat;
      runTransaction(ref(db, `rooms/${currentCode}/game`), (current) => {
        if (!current) return undefined;
        return applyTimeout(current, { matchFormat });
      }).catch(() => {});
    }, Math.max(0, msLeft));
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCode, rawRoom?.game?.turnDeadline, rawRoom?.game?.roundStatus, rawRoom?.game?.matchStatus]);

  // Round-advance watcher: 3s after a round ends, any connected client kicks off the next one.
  useEffect(() => {
    const game = rawRoom?.game;
    if (!game || game.matchStatus !== 'playing' || game.roundStatus !== 'round-over') return undefined;
    const handle = setTimeout(() => {
      if (!currentCode) return;
      const turnSeconds = rawRoom?.settings?.turnSeconds ?? null;
      runTransaction(ref(db, `rooms/${currentCode}/game`), (current) => {
        if (!current) return undefined;
        return advanceRound(current, { turnSeconds, serverNow: serverNow() });
      }).catch(() => {});
    }, NEXT_ROUND_DELAY_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCode, rawRoom?.game?.roundStatus, rawRoom?.game?.round, rawRoom?.game?.matchStatus]);

  const createRoom = useCallback(async (nickname, gameId) => {
    const user = await ensureSignedIn();
    setError(null);
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateRoomCode();
      try {
        await set(ref(db, `rooms/${code}`), {
          hostUid: user.uid,
          status: 'lobby',
          selectedGame: gameId,
          settings: { turnSeconds: 30, matchFormat: 'bo3' },
          createdAt: serverTimestamp(),
          players: { [user.uid]: { nickname, seat: 0, isSpectator: false, connected: true } },
        });
        setCurrentCode(code);
        return { ok: true, roomCode: code };
      } catch {
        if (attempt === 4) {
          setError('방을 만들지 못했습니다. 다시 시도해주세요.');
          return { ok: false, error: '방을 만들지 못했습니다.' };
        }
      }
    }
    return { ok: false, error: '방을 만들지 못했습니다.' };
  }, []);

  const joinRoom = useCallback(async (codeInput, nickname) => {
    const user = await ensureSignedIn();
    const code = codeInput.trim().toUpperCase();
    setError(null);
    try {
      const snap = await get(ref(db, `rooms/${code}`));
      if (!snap.exists()) {
        setError('존재하지 않는 방입니다.');
        return { ok: false, error: '존재하지 않는 방입니다.' };
      }
      const data = snap.val();
      if (data.players?.[user.uid]) {
        setCurrentCode(code);
        return { ok: true, roomCode: code };
      }
      const activeCount = Object.values(data.players || {}).filter((p) => !p.isSpectator).length;
      const isSpectator = activeCount >= 2;
      await set(ref(db, `rooms/${code}/players/${user.uid}`), {
        nickname,
        seat: isSpectator ? null : activeCount,
        isSpectator,
        connected: true,
      });
      setCurrentCode(code);
      return { ok: true, roomCode: code };
    } catch {
      setError('입장하지 못했습니다.');
      return { ok: false, error: '입장하지 못했습니다.' };
    }
  }, []);

  // Used when landing directly on /room/:code (e.g. after a refresh): attach
  // without creating a new player, only if we're already a member.
  const rejoinRoom = useCallback(async (codeInput) => {
    const user = await ensureSignedIn();
    const code = codeInput.trim().toUpperCase();
    try {
      const snap = await get(ref(db, `rooms/${code}/players/${user.uid}`));
      if (!snap.exists()) return { ok: false, error: 'not-a-member' };
      setCurrentCode(code);
      return { ok: true, roomCode: code };
    } catch {
      return { ok: false, error: 'failed' };
    }
  }, []);

  const updateSettings = useCallback(
    async (settings) => {
      if (!currentCode) return { ok: false };
      try {
        await update(ref(db, `rooms/${currentCode}/settings`), settings);
        return { ok: true };
      } catch {
        setError('설정을 변경하지 못했습니다.');
        return { ok: false };
      }
    },
    [currentCode]
  );

  const startGame = useCallback(async () => {
    if (!currentCode || !rawRoom) return { ok: false };
    const activePlayers = Object.entries(rawRoom.players || {})
      .filter(([, p]) => !p.isSpectator)
      .sort((a, b) => a[1].seat - b[1].seat)
      .map(([id]) => id);
    if (activePlayers.length !== 2) {
      setError('2명이 모두 입장해야 시작할 수 있습니다.');
      return { ok: false };
    }
    if (!rawRoom.selectedGame) {
      setError('게임을 선택해주세요.');
      return { ok: false };
    }
    const initialGame = createInitialGame({
      playerIds: activePlayers,
      turnSeconds: rawRoom.settings?.turnSeconds ?? null,
      serverNow: serverNow(),
    });
    try {
      await update(ref(db), {
        [`rooms/${currentCode}/status`]: 'in-game',
        [`rooms/${currentCode}/game`]: initialGame,
      });
      return { ok: true };
    } catch {
      setError('시작하지 못했습니다.');
      return { ok: false };
    }
  }, [currentCode, rawRoom, serverNow]);

  const returnToLobby = useCallback(async () => {
    if (!currentCode) return { ok: false };
    try {
      await update(ref(db), {
        [`rooms/${currentCode}/status`]: 'lobby',
        [`rooms/${currentCode}/game`]: null,
      });
      return { ok: true };
    } catch {
      setError('로비로 돌아가지 못했습니다.');
      return { ok: false };
    }
  }, [currentCode]);

  const move = useCallback(
    async (x, y) => {
      if (!currentCode || !uid) return { ok: false };
      const matchFormat = rawRoom?.settings?.matchFormat;
      const turnSeconds = rawRoom?.settings?.turnSeconds ?? null;
      try {
        const result = await runTransaction(ref(db, `rooms/${currentCode}/game`), (current) => {
          if (!current) return undefined;
          return applyMove(current, { matchFormat, turnSeconds, serverNow: serverNow() }, uid, y, x);
        });
        if (!result.committed) {
          setError('착수할 수 없습니다.');
          return { ok: false };
        }
        setError(null);
        return { ok: true };
      } catch {
        setError('착수하지 못했습니다.');
        return { ok: false };
      }
    },
    [currentCode, uid, rawRoom, serverNow]
  );

  const leaveRoom = useCallback(async () => {
    if (!currentCode || !uid) {
      setCurrentCode(null);
      return;
    }
    const code = currentCode;
    const wasActivePlayer = rawRoom?.players?.[uid] && !rawRoom.players[uid].isSpectator;
    try {
      if (rawRoom?.status === 'in-game' && wasActivePlayer) {
        await update(ref(db), { [`rooms/${code}/status`]: 'lobby', [`rooms/${code}/game`]: null });
      }
      await onDisconnect(ref(db, `rooms/${code}/players/${uid}`)).cancel();
      await remove(ref(db, `rooms/${code}/players/${uid}`));
    } catch {
      // best-effort
    }
    setCurrentCode(null);
    setRawRoom(null);
  }, [currentCode, uid, rawRoom]);

  const room = useMemo(() => {
    if (!rawRoom || !currentCode) return null;
    const players = Object.entries(rawRoom.players || {}).map(([playerId, p]) => ({
      playerId,
      nickname: p.nickname,
      seat: p.seat,
      isSpectator: p.isSpectator,
      connected: p.connected !== false,
    }));
    return {
      code: currentCode,
      hostPlayerId: rawRoom.hostUid,
      players,
      selectedGame: rawRoom.selectedGame ?? null,
      settings: rawRoom.settings || { turnSeconds: 30, matchFormat: 'bo3' },
      status: rawRoom.status,
    };
  }, [rawRoom, currentCode]);

  const gameState = useMemo(() => {
    const game = rawRoom?.game;
    if (!game) return null;
    const format = MATCH_FORMATS[rawRoom.settings?.matchFormat] || MATCH_FORMATS.bo3;
    return {
      board: sparseToArray(game.board),
      colorOf: game.colorOf,
      lastMove: game.lastMove ? { x: game.lastMove.col, y: game.lastMove.row, color: game.lastMove.color } : null,
      round: game.round,
      totalRounds: format.totalRounds,
      winsNeeded: format.winsNeeded,
      scores: game.scores,
      turnColor: game.turnColor,
      matchFormat: rawRoom.settings?.matchFormat,
      turnSeconds: rawRoom.settings?.turnSeconds ?? null,
      turnDeadline: game.turnDeadline,
      status: game.matchStatus,
      roundStatus: game.roundStatus,
      roundResult: game.roundResult,
      winnerPlayerId: game.winnerUid,
    };
  }, [rawRoom]);

  const session = useMemo(() => {
    if (!uid || !currentCode) return null;
    return { playerId: uid, roomCode: currentCode, nickname: rawRoom?.players?.[uid]?.nickname };
  }, [uid, currentCode, rawRoom]);

  const value = {
    session,
    room,
    gameState,
    connected,
    error,
    clearError: () => setError(null),
    createRoom,
    joinRoom,
    rejoinRoom,
    updateSettings,
    startGame,
    returnToLobby,
    move,
    leaveRoom,
  };

  return <RoomContext.Provider value={value}>{children}</RoomContext.Provider>;
}

export function useRoom() {
  const ctx = useContext(RoomContext);
  if (!ctx) throw new Error('useRoom must be used within RoomProvider');
  return ctx;
}
