import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ndcCrest from "/images/ndc-crest.png";

interface PreBootVaultProps {
  onComplete: () => void;
}

const MILITARY_BRANCHES = [
  { id: "navy", src: "/images/Badge_of_the_Nigerian_Navy.svg", name: "Nigerian Navy", zoom: 1 },
  { id: "army", src: "/images/Emblem_of_the_Nigerian_Army.svg", name: "Nigerian Army", zoom: 1 },
  { id: "airforce", src: "/Nigerian_Air_Force_emblem.svg.png", name: "Nigerian Air Force", zoom: 1 },
  { id: "dhq", src: "/dhq logo.jpg", name: "Defence Headquarters", zoom: 1 }
];

export const PreBootVault: React.FC<PreBootVaultProps> = ({ onComplete }) => {
  const [activeStage, setActiveStage] = useState(-1);
  const [unlocked, setUnlocked] = useState(false);
  const [burst, setBurst] = useState(false);
  const [statusText, setStatusText] = useState("ESTABLISHING SECURE ARCHIVE RECORD...");

  const currentBgLogo = (activeStage >= 0 && activeStage < 4) 
    ? MILITARY_BRANCHES[activeStage].src 
    : ndcCrest;

  const currentBranchName = (activeStage >= 0 && activeStage < 4) 
    ? MILITARY_BRANCHES[activeStage].name 
    : "National Defence College";

  useEffect(() => {
    // 7.5s chronological sequence
    const sequence = [
      { t: 800, action: () => { setActiveStage(0); setStatusText("SYNCHRONIZING NAVAL COMMAND RECORDS..."); } },
      { t: 1800, action: () => { setActiveStage(1); setStatusText("SYNCHRONIZING ARMY COMMAND RECORDS..."); } },
      { t: 2800, action: () => { setActiveStage(2); setStatusText("SYNCHRONIZING AIR FORCE COMMAND RECORDS..."); } },
      { t: 3800, action: () => { setActiveStage(3); setStatusText("SYNCHRONIZING DEFENCE HEADQUARTERS..."); } },
      { t: 5000, action: () => { 
          setActiveStage(4); 
          setUnlocked(true); 
          setStatusText("ALL BRANCHES SYNCHRONIZED. UNLOCKING NDC CHRONICLES..."); 
      } },
      { t: 6200, action: () => { setStatusText("ACCESS GRANTED. RECORD INITIALIZED."); } },
      { t: 6600, action: () => setBurst(true) },
      { t: 7500, action: () => onComplete() },
    ];

    const timeouts = sequence.map((step) => setTimeout(step.action, step.t));
    return () => timeouts.forEach(clearTimeout);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#010813] overflow-hidden font-serif">
      
      {/* Deep Environment Background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#001533_0%,#010612_70%,#000000_100%)] z-0" />
      
      {/* Massive Rotating Background Watermark */}
      <motion.div 
        className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none mix-blend-plus-lighter"
        animate={{ opacity: [0.2, 0.3, 0.2] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <AnimatePresence mode="popLayout">
          <motion.div
            key={currentBgLogo}
            className="absolute w-[140vw] h-[140vw] md:w-[85vw] md:h-[85vw] max-w-[1200px] max-h-[1200px] rounded-full overflow-hidden flex items-center justify-center opacity-[0.25]"
            initial={{ opacity: 0, scale: 0.8, filter: "blur(15px)" }}
            animate={{ opacity: 0.25, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 1.2, filter: "blur(15px)" }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            style={{ 
              WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 70%)',
              maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 70%)'
            }}
          >
            <img
              src={currentBgLogo}
              className="w-full h-full object-contain p-8 md:p-12"
              alt="background watermark"
            />
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Core Orbital System */}
      <div className="relative w-[340px] h-[340px] md:w-[600px] md:h-[600px] flex items-center justify-center z-10 transition-transform duration-1000">
         
        {/* The Outer Rotating Ring Container */}
        <motion.div 
          className="absolute inset-0"
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        >
          {MILITARY_BRANCHES.map((logo, i) => {
             const angle = i * 90;
             const isComplete = activeStage >= i;
             const isActivating = activeStage === i;
             
             return (
               <div key={logo.id} className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
                 
                 {/* Synchronization Light Beam connecting to the center hub */}
                 <motion.div 
                   className="absolute left-1/2 top-[18%] md:top-[16%] w-[2px] md:w-[3px] bg-gradient-to-b from-[#FFD700] to-transparent -translate-x-1/2 z-0"
                   style={{ height: '32%', transformOrigin: 'top' }}
                   initial={{ scaleY: 0, opacity: 0 }}
                   animate={{ 
                     scaleY: isComplete ? 1 : 0,
                     opacity: isComplete ? 0.7 : 0
                   }}
                   transition={{ duration: 0.6, ease: "easeOut" }}
                 />

                 {/* The Logo Node (Counter-rotating to stay upright) */}
                 <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 z-10">
                    <motion.div 
                       animate={{ rotate: [-angle, -angle - 360] }}
                       transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                       className="flex flex-col items-center justify-center gap-3 md:gap-4"
                    >
                       {/* Purely Round White Plaque */}
                       <motion.div 
                         className={`
                           relative flex items-center justify-center
                           w-20 h-20 md:w-[110px] md:h-[110px]
                           rounded-full overflow-hidden 
                           bg-slate-100 border-[3px] shadow-[0_5px_15px_rgba(0,0,0,0.8)]
                           transition-all duration-700
                           ${isComplete ? 'border-[#FFD700] shadow-[0_0_30px_rgba(212,175,55,0.6)]' : 'border-slate-400'}
                         `}
                         animate={{ scale: isActivating ? 1.12 : isComplete ? 1 : 0.95 }}
                       >
                         <div className="absolute inset-[6px] md:inset-[8px] rounded-full overflow-hidden">
                          <img
                            src={logo.src}
                            alt={logo.name}
                            className={`w-full h-full object-contain object-center transition-all duration-700 [clip-path:circle(50%_at_50%_50%)] ${isComplete ? '' : 'grayscale opacity-60'}`}
                            style={{ transform: `scale(${logo.zoom})` }}
                          />
                         </div>
                       </motion.div>

                       {/* Elegantly housed label */}
                       <div className={`
                         px-3 py-1.5 md:px-5 md:py-2 rounded-full border transition-all duration-500 whitespace-nowrap 
                         bg-[#010813]/90 backdrop-blur-md shadow-lg 
                         ${isComplete ? 'border-[#FFD700]/60' : 'border-slate-700/60'}
                       `}>
                         <span className={`text-[9px] md:text-xs font-bold uppercase tracking-widest ${isComplete ? 'text-[#FFD700]' : 'text-slate-400'}`}>
                           {logo.name}
                         </span>
                       </div>

                    </motion.div>
                 </div>

               </div>
             );
          })}
        </motion.div>

        {/* Central Static NDC Hub */}
        <motion.div 
          className="absolute z-20 flex flex-col items-center justify-center"
          animate={{ 
            scale: burst ? 0 : unlocked ? 1.05 : 1,
            opacity: burst ? 0 : 1 
          }}
          transition={{ duration: 1 }}
        >
           <motion.div
             className="relative flex items-center justify-center w-32 h-32 md:w-44 md:h-44 rounded-full bg-[#010813]/90 backdrop-blur-2xl border-2 shadow-2xl"
             animate={{
               scale: unlocked ? [1, 1.15, 1] : 1,
               borderColor: unlocked ? 'rgba(212,175,55,1)' : 'rgba(51,65,85,0.8)',
               boxShadow: unlocked ? '0 0 100px rgba(212,175,55,0.6), inset 0 0 40px rgba(212,175,55,0.3)' : '0 10px 40px rgba(0,0,0,0.9)',
             }}
             transition={{ duration: 0.8, ease: "easeOut" }}
           >
             {/* Dynamic Center Logo */}
             <AnimatePresence mode="wait">
               <motion.img 
                 key={currentBgLogo}
                 src={currentBgLogo} 
                 alt={currentBranchName} 
                 className="absolute w-[75%] h-[75%] object-contain z-10 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]" 
                 initial={{ opacity: 0, scale: 0.6 }}
                 animate={{ 
                   opacity: 1, 
                   scale: unlocked ? 1.05 : 0.95,
                   filter: unlocked ? 'brightness(1.2)' : 'brightness(1)'
                 }}
                 exit={{ opacity: 0, scale: 0.8 }}
                 transition={{ duration: 0.4 }}
               />
             </AnimatePresence>
             
             {/* Subtle Inner Lock Ring Spinning */}
             {unlocked && (
               <motion.div 
                 className="absolute inset-[6px] md:inset-[8px] rounded-full border border-dashed border-[#FFD700]/50 pointer-events-none"
                 animate={{ rotate: -360 }}
                 transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
               />
             )}
           </motion.div>

           <motion.div 
             className="mt-6 md:mt-8 flex flex-col items-center h-8"
             initial={{ opacity: 0.6 }}
             animate={{ opacity: unlocked ? 1 : 0.8 }}
           >
             <AnimatePresence mode="wait">
               <motion.h2 
                 key={currentBranchName}
                 initial={{ opacity: 0, y: 5 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -5 }}
                 transition={{ duration: 0.3 }}
                 className="text-xs md:text-lg font-bold text-center tracking-[0.3em] text-[#FFD700] uppercase drop-shadow-[0_4px_8px_rgba(0,0,0,1)]"
               >
                 {currentBranchName}
               </motion.h2>
             </AnimatePresence>
           </motion.div>
        </motion.div>

      </div>

      {/* Military Synchronisation Console */}
      <motion.div 
        className="absolute bottom-8 md:bottom-12 w-full flex flex-col items-center justify-center z-20 pointer-events-none"
        animate={{ opacity: burst ? 0 : 1 }}
      >
        <div className="bg-[#000a1a]/80 border border-[#001f4d] backdrop-blur-md px-8 py-4 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] text-center max-w-[90%]">
          <p className={`text-[10px] md:text-sm font-sans font-medium tracking-[0.2em] uppercase transition-colors duration-300 ${
            unlocked ? 'text-[#FFD700] drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]' : 'text-slate-300'
          }`}>
            {statusText}
          </p>
          <div className="mt-4 flex justify-center gap-3">
            {[0, 1, 2, 3].map((idx) => (
              <div 
                key={idx} 
                className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full border border-black/80 transition-all duration-500 ${
                  activeStage > idx ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)] scale-100' 
                  : activeStage === idx ? 'bg-amber-400 animate-pulse shadow-[0_0_10px_rgba(251,191,36,0.6)] scale-125' 
                  : 'bg-slate-700/50 scale-75'
                }`}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Elegant Fade Out Transition */}
      <AnimatePresence>
        {burst && (
          <motion.div 
            className="absolute inset-0 z-[120] pointer-events-none flex items-center justify-center bg-[#01060d]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeIn" }}
          >
             {/* Pulse overlay to blend into the application */}
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.15),transparent)] mix-blend-overlay" />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
