import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { RoomProvider, useRoom } from './context/RoomContext.jsx';
import BackgroundScene from './components/BackgroundScene.jsx';
import HomePage from './pages/HomePage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import GomokuPage from './pages/GomokuPage.jsx';

function RoomGate() {
  const { code } = useParams();
  const { session, room, rejoinRoom } = useRoom();
  const [notAMember, setNotAMember] = useState(false);

  useEffect(() => {
    setNotAMember(false);
    if (session?.roomCode !== code) {
      rejoinRoom(code).then((res) => {
        if (!res.ok) setNotAMember(true);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  if (notAMember && session?.roomCode !== code) {
    return <Navigate to="/" replace />;
  }
  if (!room || session?.roomCode !== code) {
    return <div className="page-center">입장하는 중...</div>;
  }
  if (room.status === 'in-game' && room.selectedGame === 'gomoku') {
    return <GomokuPage />;
  }
  return <RoomPage />;
}

export default function App() {
  return (
    <RoomProvider>
      <BackgroundScene />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:code" element={<RoomGate />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </RoomProvider>
  );
}
