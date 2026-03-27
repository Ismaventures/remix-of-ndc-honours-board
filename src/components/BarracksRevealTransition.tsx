import { motion } from "framer-motion";

interface BarracksRevealTransitionProps {
  durationMs: number;
}

// Barracks Reveal: Cards emerge from a sliding steel door with sparks and a metallic clang effect
export function BarracksRevealTransition({ durationMs }: BarracksRevealTransitionProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-hidden pointer-events-none">
      {/* Sliding steel door */}
      <motion.div
        initial={{ x: 0 }}
        animate={{ x: "-110%" }}
        transition={{ duration: durationMs / 1000, ease: [0.22, 1, 0.36, 1] }}
        className="absolute left-0 top-0 h-full w-full bg-gradient-to-br from-gray-700 to-gray-900 border-r-4 border-gray-400 shadow-2xl"
        style={{ zIndex: 2 }}
      >
        <div className="absolute bottom-0 left-0 w-full h-2 bg-yellow-400/60 blur-sm animate-pulse" />
      </motion.div>
      {/* Sparks */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: [0, 1, 0], y: [40, 0, -30] }}
        transition={{ duration: durationMs / 1200, delay: durationMs / 1800 }}
        className="absolute left-1/2 bottom-8 w-16 h-4 bg-gradient-to-r from-yellow-300 via-orange-400 to-red-500 rounded-full blur-md opacity-70"
        style={{ zIndex: 3, transform: "translateX(-50%)" }}
      />
      {/* Card focus flash */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0] }}
        transition={{ duration: durationMs / 1800, delay: durationMs / 1200 }}
        className="absolute inset-0 bg-yellow-100/20 pointer-events-none"
        style={{ zIndex: 1 }}
      />
    </div>
  );
}
