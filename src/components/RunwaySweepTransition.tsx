import { motion } from "framer-motion";

interface RunwaySweepTransitionProps {
  durationMs: number;
}

// Runway Sweep: A dynamic angled light sweep, like a searchlight or runway beacon, with a subtle engine rumble
export function RunwaySweepTransition({ durationMs }: RunwaySweepTransitionProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-hidden pointer-events-none">
      {/* Angled light sweep */}
      <motion.div
        initial={{ x: "-120%", rotate: -18, opacity: 0.1 }}
        animate={{ x: "120%", rotate: 18, opacity: [0.1, 0.7, 0.1] }}
        transition={{ duration: durationMs / 900, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 h-full w-1/2 bg-gradient-to-tr from-yellow-100 via-white/80 to-blue-300/60 blur-2xl mix-blend-screen"
        style={{ zIndex: 2 }}
      />
      {/* Subtle shimmer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.3, 0] }}
        transition={{ duration: durationMs / 1200, delay: durationMs / 900 }}
        className="absolute inset-0 bg-white/10 pointer-events-none"
        style={{ zIndex: 1 }}
      />
    </div>
  );
}
