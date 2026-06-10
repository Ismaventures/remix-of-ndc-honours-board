import React, { useEffect, useState } from "react";
import ndcCrest from "/images/ndc-crest.png";

interface PreBootVaultProps {
  onComplete: () => void;
}

export const PreBootVault: React.FC<PreBootVaultProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);

  // Smoothly animate progress bar to 100% over 2.4 seconds
  useEffect(() => {
    const duration = 2400; // 2.4 seconds total duration
    const intervalTime = 30; // update every 30ms
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          // Wait 300ms at 100% for smooth transition before calling onComplete
          setTimeout(onComplete, 300);
          return 100;
        }
        return Math.min(100, prev + step);
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gradient-to-b from-[#000a1a] via-[#001026] to-[#000a1a] select-none">
      
      {/* Premium ambient glow circles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.035)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 max-w-md w-full">
        
        {/* Crest Wrapper with smooth breathing pulse */}
        <div className="relative mb-8 flex items-center justify-center animate-pulse" style={{ animationDuration: "3s" }}>
          {/* Subtle backglow */}
          <div className="absolute inset-0 w-28 h-28 md:w-32 md:h-32 rounded-full bg-gradient-to-r from-[#002060]/20 via-[#FF0000]/10 to-[#00B0F0]/20 blur-xl pointer-events-none" />
          
          <div className="relative w-24 h-24 md:w-28 md:h-28 flex items-center justify-center">
            <img 
              src={ndcCrest} 
              alt="National Defence College Crest" 
              className="w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]" 
            />
          </div>
        </div>

        {/* Institution Title */}
        <h1 className="text-base sm:text-lg md:text-xl font-serif font-extrabold tracking-[0.22em] text-[#FFD700] uppercase leading-snug">
          National Defence College
        </h1>
        <h2 className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.3em] text-white/90 uppercase mt-1">
          Nigeria
        </h2>

        {/* Tri-Service Motto */}
        <div className="flex items-center gap-3 mt-4 w-full justify-center opacity-80">
          <div className="h-[1px] w-8 bg-white/10" />
          <span className="text-[9px] uppercase tracking-[0.25em] text-white/70 font-semibold font-mono">
            Intellect · Courage · Patriotism
          </span>
          <div className="h-[1px] w-8 bg-white/10" />
        </div>

        {/* Thin, elegant tri-service progress bar */}
        <div className="w-64 sm:w-72 h-[3px] bg-white/10 rounded-full mt-10 overflow-hidden relative shadow-inner">
          <div 
            className="h-full rounded-full bg-gradient-to-r from-[#002060] via-[#FF0000] to-[#00B0F0] transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Loading percentage status */}
        <p className="text-[8.5px] font-mono tracking-[0.2em] text-white/40 uppercase mt-3.5">
          INITIALIZING HONOURS BOARD... {Math.round(progress)}%
        </p>

      </div>
    </div>
  );
};
