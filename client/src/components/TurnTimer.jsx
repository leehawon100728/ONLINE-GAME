import { useEffect, useState } from 'react';

const RADIUS = 17;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function TurnTimer({ deadline, totalSeconds, serverOffset = 0 }) {
  const [now, setNow] = useState(Date.now() + serverOffset);

  useEffect(() => {
    if (!deadline) return undefined;
    const id = setInterval(() => setNow(Date.now() + serverOffset), 200);
    return () => clearInterval(id);
  }, [deadline, serverOffset]);

  if (!deadline || !totalSeconds) {
    return <div className="turn-timer unlimited">무제한</div>;
  }

  const remainingMs = Math.max(0, deadline - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  const ratio = Math.max(0, Math.min(1, remainingMs / (totalSeconds * 1000)));
  const urgent = remainingSec <= 5;

  return (
    <div className={'turn-timer' + (urgent ? ' urgent' : '')}>
      <svg viewBox="0 0 40 40" className="timer-ring">
        <circle cx="20" cy="20" r={RADIUS} className="timer-ring-bg" />
        <circle
          cx="20"
          cy="20"
          r={RADIUS}
          className="timer-ring-fg"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - ratio)}
        />
      </svg>
      <span className="timer-number">{remainingSec}</span>
    </div>
  );
}
