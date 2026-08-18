import { useState } from 'react';

export default function RoomCodeBadge({ code }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }

  return (
    <div className="room-code-badge" onClick={handleCopy} title="클릭해서 복사">
      <span className="room-code-label">방 코드</span>
      <span className="room-code-value">{code}</span>
      <span className="room-code-copy">{copied ? '복사됨!' : '복사'}</span>
    </div>
  );
}
