interface RunwaySweepTransitionProps {
  durationMs: number;
}

export function RunwaySweepTransition({ durationMs }: RunwaySweepTransitionProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-hidden pointer-events-none">
      <div
        className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-tr from-yellow-100 via-white/80 to-blue-300/60 blur-2xl mix-blend-screen"
        style={{ zIndex: 2, animation: `anim-runway-sweep ${durationMs / 900}s cubic-bezier(0.22,1,0.36,1) forwards` }}
      />
      <div
        className="absolute inset-0 bg-white/10 pointer-events-none"
        style={{ zIndex: 1, animation: `anim-sweep-shimmer ${durationMs / 1200}s ease-in-out ${durationMs / 900}s forwards` }}
      />
    </div>
  );
}
