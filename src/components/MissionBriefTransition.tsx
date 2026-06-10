interface MissionBriefTransitionProps {
  durationMs: number;
}

export function MissionBriefTransition({ durationMs }: MissionBriefTransitionProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 bg-[repeating-linear-gradient(0deg,#00ff6a_0_2px,transparent_2px_8px)] mix-blend-color-dodge"
        style={{ zIndex: 2, animation: `anim-mission-scanlines ${durationMs / 1000}s ease-in-out forwards` }}
      />
      <div
        className="absolute inset-0 bg-green-400/20 mix-blend-multiply"
        style={{ zIndex: 1, animation: `anim-sweep-shimmer ${durationMs / 1200}s ease-in-out ${durationMs / 1800}s forwards` }}
      />
      <div
        className="absolute left-1/2 top-1/2 text-3xl sm:text-5xl font-extrabold text-green-300 tracking-widest opacity-80"
        style={{ zIndex: 3, transform: "translate(-50%,-50%)", animation: `anim-classified-text ${durationMs / 1200}s ease-in-out ${durationMs / 1800}s forwards` }}
      >
        CLASSIFIED
      </div>
    </div>
  );
}
