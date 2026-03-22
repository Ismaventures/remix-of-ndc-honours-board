import { useEffect, useState, useMemo } from "react";
import ndcCrest from "/images/ndc-crest.png";

interface NdcScatteredTransitionProps {
  durationMs: number;
}

export function NdcScatteredTransition({
  durationMs,
}: NdcScatteredTransitionProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Generate random fixed properties for a dramatic scatter effect
  const particles = useMemo(() => {
    return Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100, // percentage for left
      y: Math.random() * 100, // percentage for top
      scaleStart: Math.random() * 0.2 + 0.1, // starts small
      scaleEnd: Math.random() * 2 + 1.5, // ends very large
      rotate: Math.random() * 360 - 180, // some rotation
      delay: Math.random() * (durationMs * 0.3), // random start time up to 30% of duration
      duration: durationMs * (Math.random() * 0.4 + 0.4), // lasts 40-80% of total transition time
    }));
  }, [durationMs]);

  if (!mounted) return null;

  return (
    <div className="absolute inset-0 z-50 overflow-hidden pointer-events-none flex items-center justify-center bg-slate-950">
      {/* Background sweep to clear previous content slightly */}
      <div
        className="absolute inset-0 bg-primary/10 mix-blend-color-burn"
        style={{
          animation: `pulse ${durationMs * 0.8}ms ease-in-out forwards`,
        }}
      />

      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute origin-center opacity-0 drop-shadow-[0_0_15px_hsl(var(--primary)/0.45)]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            animation: `scatterFly ${p.duration}ms cubic-bezier(0.2, 0.8, 0.2, 1) ${p.delay}ms forwards`,
            transform: `translate(-50%, -50%) rotate(${p.rotate}deg)`,
          }}
        >
          <img
            src={ndcCrest}
            alt=""
            className="w-24 h-24 sm:w-32 sm:h-32 object-contain filter grayscale opacity-40 mix-blend-screen"
          />
        </div>
      ))}

      {/* Main giant logo pulling focus in the middle at the end */}
      <div
        className="absolute inset-0 flex items-center justify-center opacity-0"
        style={{
          animation: `scatterCenterFocus ${durationMs * 0.8}ms cubic-bezier(0.4, 0, 0.2, 1) ${durationMs * 0.2}ms forwards`,
        }}
      >
        <img
          src={ndcCrest}
          alt=""
          className="w-64 h-64 sm:w-96 sm:h-96 object-contain drop-shadow-[0_0_50px_hsl(var(--primary)/0.7)]"
        />
      </div>

      <style>{`
        @keyframes scatterFly {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.1) rotate(0deg);
          }
          20% {
            opacity: 0.6;
          }
          80% {
            opacity: 0.2;
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(3.5) rotate(45deg);
          }
        }
        
        @keyframes scatterCenterFocus {
          0% {
            opacity: 0;
            transform: scale(0.5);
            filter: blur(10px);
          }
          50% {
            opacity: 1;
            transform: scale(1.1);
            filter: blur(0px);
          }
          100% {
            opacity: 0;
            transform: scale(2.5);
            filter: blur(20px);
          }
        }
      `}</style>
    </div>
  );
}
