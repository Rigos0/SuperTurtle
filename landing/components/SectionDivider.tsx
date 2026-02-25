export function SectionDivider() {
  return (
    <div className="relative w-full h-16 flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#faf8f5' }}>
      <svg
        className="w-full h-full"
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Subtle organic wave path */}
        <path
          d="M 0,30 Q 180,10 360,30 T 720,30 T 1080,30 T 1440,30 L 1440,60 L 0,60 Z"
          fill="rgba(74, 95, 59, 0.06)"
        />
        {/* Secondary wave for depth */}
        <path
          d="M 0,40 Q 240,20 480,40 T 960,40 T 1440,40 L 1440,60 L 0,60 Z"
          fill="rgba(184, 111, 76, 0.04)"
        />
      </svg>
    </div>
  );
}
