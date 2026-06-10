interface ParadeSweepTransitionProps {
  durationMs: number;
}

export function ParadeSweepTransition({ durationMs }: ParadeSweepTransitionProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-hidden pointer-events-none">
      <div
        className="absolute top-0 left-0 h-full w-1/3 bg-[#FF0000] shadow-2xl"
        style={{ zIndex: 2, animation: `anim-sweep-left-to-right ${durationMs / 900}s cubic-bezier(0.22,1,0.36,1) forwards` }}
      />
      <div
        className="absolute top-0 left-1/3 h-full w-1/3 bg-[#002060] shadow-2xl"
        style={{ zIndex: 2, animation: `anim-sweep-left-to-right ${durationMs / 1000}s cubic-bezier(0.22,1,0.36,1) ${durationMs / 1800}s forwards` }}
      />
      <div
        className="absolute top-0 left-2/3 h-full w-1/3 bg-[#00B0F0] shadow-2xl"
        style={{ zIndex: 2, animation: `anim-sweep-left-to-right ${durationMs / 1100}s cubic-bezier(0.22,1,0.36,1) ${durationMs / 1200}s forwards` }}
      />
      <div
        className="absolute inset-0 bg-white/10 pointer-events-none"
        style={{ zIndex: 1, animation: `anim-sweep-shimmer ${durationMs / 1200}s ease-in-out ${durationMs / 900}s forwards` }}
      />
    </div>
  );
}
