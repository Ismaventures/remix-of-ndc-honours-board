import { motion } from "framer-motion";

interface MissionBriefTransitionProps {
  durationMs: number;
}

// Mission Brief: A rapid scanline effect with a green-tinted overlay, like a classified mission briefing
export function MissionBriefTransition({ durationMs }: MissionBriefTransitionProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black overflow-hidden pointer-events-none">
      {/* Scanlines */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0.2, 0] }}
        transition={{ duration: durationMs / 1000, times: [0, 0.2, 0.7, 1] }}
        className="absolute inset-0 bg-[repeating-linear-gradient(0deg,#00ff6a_0_2px,transparent_2px_8px)] mix-blend-color-dodge"
        style={{ zIndex: 2 }}
      />
      {/* Green overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0] }}
        transition={{ duration: durationMs / 1200, delay: durationMs / 1800 }}
        className="absolute inset-0 bg-green-400/20 mix-blend-multiply"
        style={{ zIndex: 1 }}
      />
      {/* Centered classified text */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: [0, 1, 0], scale: [0.8, 1.1, 1.3] }}
        transition={{ duration: durationMs / 1200, delay: durationMs / 1800 }}
        className="absolute left-1/2 top-1/2 text-3xl sm:text-5xl font-extrabold text-green-300 tracking-widest opacity-80"
        style={{ zIndex: 3, transform: "translate(-50%,-50%)" }}
      >
        CLASSIFIED
      </motion.div>
    </div>
  );
}
