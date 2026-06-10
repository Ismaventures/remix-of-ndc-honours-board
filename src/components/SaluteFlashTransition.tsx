interface SaluteFlashTransitionProps {
  durationMs: number;
}

export function SaluteFlashTransition({ durationMs }: SaluteFlashTransitionProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0 bg-gradient-to-br from-yellow-200 via-white to-yellow-400 mix-blend-screen"
        style={{ zIndex: 2, animation: `anim-flash-overlay ${durationMs / 1000}s ease-in-out forwards` }}
      />
      <div
        className="absolute left-1/2 top-1/2 w-32 h-32 sm:w-48 sm:h-48 bg-[url('/images/salute-silhouette.png')] bg-center bg-no-repeat bg-contain opacity-80"
        style={{
          zIndex: 3,
          transform: "translate(-50%,-50%)",
          animation: `anim-salute-silhouette ${durationMs / 1200}s ease-in-out ${durationMs / 1800}s forwards`,
        }}
      />
    </div>
  );
}
