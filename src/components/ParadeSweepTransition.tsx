import { motion } from "framer-motion";

interface ParadeSweepTransitionProps {
  durationMs: number;
}

// Parade Sweep: A bold tricolor sweep (red, navy, blue) moves horizontally, like a parade flag, with a marching drum effect
export function ParadeSweepTransition({ durationMs }: ParadeSweepTransitionProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-hidden pointer-events-none">
      {/* Tricolor sweep */}
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: durationMs / 900, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-0 h-full w-1/3 bg-[#FF0000] shadow-2xl"
        style={{ zIndex: 2 }}
      />
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: durationMs / 1000, delay: durationMs / 1800, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-1/3 h-full w-1/3 bg-[#002060] shadow-2xl"
        style={{ zIndex: 2 }}
      />
      <motion.div
        initial={{ x: "-100%" }}
        animate={{ x: "100%" }}
        transition={{ duration: durationMs / 1100, delay: durationMs / 1200, ease: [0.22, 1, 0.36, 1] }}
        className="absolute top-0 left-2/3 h-full w-1/3 bg-[#00B0F0] shadow-2xl"
        style={{ zIndex: 2 }}
      />
      {/* Parade shimmer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: durationMs / 1200, delay: durationMs / 900 }}
        className="absolute inset-0 bg-white/10 pointer-events-none"
        style={{ zIndex: 1 }}
      />
    </div>
  );
}
