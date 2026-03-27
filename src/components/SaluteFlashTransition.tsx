import { motion } from "framer-motion";

interface SaluteFlashTransitionProps {
  durationMs: number;
}

// Salute Flash: A sharp white/gold flash with a silhouette salute, evoking a ceremonial salute moment
export function SaluteFlashTransition({ durationMs }: SaluteFlashTransitionProps) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-950 overflow-hidden pointer-events-none">
      {/* Flash */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.7, 0] }}
        transition={{ duration: durationMs / 1000, times: [0, 0.2, 0.5, 1] }}
        className="absolute inset-0 bg-gradient-to-br from-yellow-200 via-white to-yellow-400 mix-blend-screen"
        style={{ zIndex: 2 }}
      />
      {/* Salute silhouette */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={{ opacity: [0, 0.8, 0], scale: [0.7, 1.1, 1.3] }}
        transition={{ duration: durationMs / 1200, delay: durationMs / 1800 }}
        className="absolute left-1/2 top-1/2 w-32 h-32 sm:w-48 sm:h-48 bg-[url('/images/salute-silhouette.png')] bg-center bg-no-repeat bg-contain opacity-80"
        style={{ zIndex: 3, transform: "translate(-50%,-50%)" }}
      />
    </div>
  );
}
