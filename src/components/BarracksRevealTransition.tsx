interface BarracksRevealTransitionProps {
  durationMs: number;
}

export function BarracksRevealTransition({ durationMs }: BarracksRevealTransitionProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-hidden pointer-events-none">
      <div
        className="absolute left-0 top-0 h-full w-full bg-gradient-to-br from-gray-700 to-gray-900 border-r-4 border-gray-400 shadow-2xl"
        style={{ zIndex: 2, animation: `anim-barracks-door ${durationMs / 1000}s cubic-bezier(0.22,1,0.36,1) forwards` }}
      >
        <div className="absolute bottom-0 left-0 w-full h-2 bg-yellow-400/60 blur-sm animate-pulse" />
      </div>
      <div
        className="absolute left-1/2 bottom-8 w-16 h-4 bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 rounded-full blur-md opacity-70"
        style={{ zIndex: 3, transform: "translateX(-50%)", animation: `anim-sparks ${durationMs / 1200}s ease-in-out ${durationMs / 1800}s forwards` }}
      />
      <div
        className="absolute inset-0 bg-yellow-100/20 pointer-events-none"
        style={{ zIndex: 1, animation: `anim-card-focus ${durationMs / 1800}s ease-in-out ${durationMs / 1200}s forwards` }}
      />
    </div>
  );
}
