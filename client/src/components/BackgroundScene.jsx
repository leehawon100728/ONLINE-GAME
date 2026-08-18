function Cloud({ cx, cy, scale = 1 }) {
  return (
    <g transform={`translate(${cx},${cy}) scale(${scale})`} fill="#ffffff">
      <ellipse cx="0" cy="12" rx="72" ry="30" />
      <circle cx="-36" cy="2" r="30" />
      <circle cx="12" cy="-14" r="38" />
      <circle cx="52" cy="4" r="26" />
    </g>
  );
}

export default function BackgroundScene() {
  return (
    <svg
      className="background-scene"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff0a8" />
          <stop offset="100%" stopColor="#ffc93c" />
        </radialGradient>
      </defs>

      <g transform="translate(-140,900)" fill="none" strokeLinecap="round" opacity="0.8">
        <path d="M 0 0 A 460 460 0 0 1 460 -460" stroke="#ffb3c6" strokeWidth="36" />
        <path d="M 44 0 A 416 416 0 0 1 416 -416" stroke="#ffe28a" strokeWidth="36" />
        <path d="M 88 0 A 372 372 0 0 1 372 -372" stroke="#ffffff" strokeWidth="36" />
      </g>

      <g transform="translate(1230,190)">
        {Array.from({ length: 12 }).map((_, i) => (
          <rect key={i} x="-6" y="-185" width="12" height="65" rx="6" fill="#ffc93c" transform={`rotate(${i * 30})`} />
        ))}
        <circle r="92" fill="url(#sunGlow)" />
      </g>

      <Cloud cx="150" cy="150" scale="1" />
      <Cloud cx="1080" cy="120" scale="0.75" />
      <Cloud cx="1310" cy="480" scale="0.65" />
      <Cloud cx="130" cy="520" scale="0.6" />
    </svg>
  );
}
