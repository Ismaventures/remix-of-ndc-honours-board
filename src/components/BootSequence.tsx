import React, { useState, useEffect } from 'react';
import { useAudioStore } from '@/hooks/useAudioStore';
import { playAudioTrack } from '@/components/AudioManager';
import { useCommandantsStore } from '@/hooks/useStore';
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl';
import ndcCrest from '/images/ndc-crest.png';

export function BootSequence({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(0);
  const [utcNow, setUtcNow] = useState(() => new Date());
  const assignments = useAudioStore(s => s.assignments);
  const { commandants } = useCommandantsStore();
  
  const currentCommandant = commandants.find(c => c.isCurrent);
  const currentCommandantImageUrl = useResolvedMediaUrl(currentCommandant?.imageUrl);
  const [typedLine1, setTypedLine1] = useState('');
  const [typedLine2, setTypedLine2] = useState('');
  const [typedLine3, setTypedLine3] = useState('');

  const line1Txt = 'Initializing Secure Environment...';
  const line2Txt = 'Verifying System Integrity...';
  const line3Txt = 'Loading Honour Archives...';

  const progress = Math.min(100, Math.round((Math.min(step, 7) / 7) * 100));
  const statusLabel =
    step < 2 ? 'Bootstrapping' :
    step < 4 ? 'Authenticating' :
    step < 6 ? 'Syncing Archives' :
    step < 7 ? 'Final Checks' :
    'Mission Ready';

  const utcLabel = utcNow.toLocaleTimeString('en-GB', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'UTC',
  });

  useEffect(() => {
    if (assignments.preloader) {
      playAudioTrack(assignments.preloader, true);
    }
    
    const t1 = setTimeout(() => setStep(1), 1000);
    const t2 = setTimeout(() => setStep(2), 2000);
    
    const t3 = setTimeout(() => {
      setStep(3);
      typeText(line1Txt, setTypedLine1, () => {
        setStep(4);
        typeText(line2Txt, setTypedLine2, () => {
          setStep(5);
          typeText(line3Txt, setTypedLine3, () => {
             setStep(6);
             setTimeout(() => {
               setStep(7);
               
               // End sequence and transition out
               if (onComplete) {
                   setTimeout(() => {
                     setStep(8);
                     setTimeout(onComplete, 1000);
                   }, 2000);
               }
             }, 1500);
          });
        });
      });
    }, 3000);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3);
    };
  }, [assignments.preloader, onComplete]);

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const typeText = (text: string, setter: React.Dispatch<React.SetStateAction<string>>, onFinish: () => void) => {
    let current = '';
    let i = 0;
    const interval = setInterval(() => {
      current += text[i];
      setter(current);
      i++;
      if (i === text.length) {
        clearInterval(interval);
        setTimeout(onFinish, 400); 
      }
    }, 40); 
  };

  return (
    <div className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 overflow-hidden transition-opacity duration-1000 ${step === 8 ? 'opacity-0' : 'opacity-100'}`}>
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(200,169,81,0.11),rgba(2,6,23,0.96)_48%,rgba(2,6,23,1)_100%)]" />

      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '44px 44px' }} />
      
      {/* Background Crest Watermark (Huge & Faded) */}
      <div className={`absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0 transition-opacity ease-in-out ${step >= 1 ? 'scale-100' : 'scale-90'}`} style={{ transitionDuration: '3000ms' }}>
         <img src={ndcCrest} alt="" className="w-[800px] h-[800px] object-contain" />
      </div>

      {/* Horizontal sweeping scan line */}
      <div className={`absolute left-0 w-full h-[2px] bg-primary/60 shadow-[0_0_20px_rgba(200,169,81,0.8)] transition-transform ease-linear z-0 ${step >= 1 ? 'translate-y-full' : '-translate-y-full'}`} style={{ top: 0, transitionDuration: '3000ms' }} />

      <div className={`absolute top-3 left-3 right-3 md:top-5 md:left-6 md:right-6 z-20 transition-all duration-700 ${step >= 1 ? 'opacity-100' : 'opacity-0'}`}>
        <div className="flex items-center justify-between gap-3 text-[10px] md:text-xs font-mono uppercase tracking-[0.18em] bg-slate-900/60 border border-primary/25 px-3 py-2 rounded-md backdrop-blur-sm text-primary/85">
          <span>Classification: Restricted</span>
          <span className="hidden md:inline">Operation: Sentinel Archive</span>
          <span>UTC: {utcLabel}</span>
        </div>
      </div>

      <div className="relative w-full h-full max-h-screen max-w-5xl px-4 md:px-8 py-4 md:py-6 flex flex-col items-center justify-between gap-4 md:gap-6 z-10">
        
        {/* Header - NDC Top */}
        <div className={`transition-all duration-1000 ease-out flex flex-col items-center w-full shrink-0 ${step >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <img src={ndcCrest} alt="NDC Crest" className="w-16 h-16 md:w-24 md:h-24 mb-2 md:mb-4 drop-shadow-[0_0_15px_rgba(200,169,81,0.3)] object-contain" />
          
          <h1 className="text-xl md:text-3xl lg:text-4xl font-serif text-white tracking-[0.08em] md:tracking-[0.18em] uppercase text-center w-full relative pb-3 md:pb-4 drop-shadow-md leading-tight">
            NATIONAL DEFENCE COLLEGE NIGERIA
            {/* Animated Gold Underline */}
            <div className="absolute bottom-0 left-0 h-[2px] bg-primary transition-all ease-in-out shadow-[0_0_10px_theme('colors.primary.DEFAULT')]" style={{ width: step >= 1 ? '100%' : '0%', transitionDuration: '1200ms' }} />
          </h1>
          
          <h2 className={`mt-2 md:mt-3 text-sm md:text-lg text-primary tracking-[0.08em] md:tracking-[0.12em] uppercase font-sans font-light transition-all duration-1000 ease-in-out ${step >= 3 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
            System Initialization
          </h2>
        </div>

        {/* Dynamic Center Row: Commandant Portrait + Terminal */}
        <div className="w-full flex-1 min-h-0 flex flex-col md:flex-row items-center justify-center gap-4 md:gap-10 max-w-4xl">
           
           {/* Current Commandant Authorizing */}
           {currentCommandant && (
                 <div className={`transition-all duration-1000 delay-300 ease-out flex flex-col items-center shrink-0 ${step >= 3 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                  <div className="relative p-1 rounded-full border border-primary/30 bg-primary/5 shadow-[0_0_30px_rgba(200,169,81,0.15)] flex-shrink-0">
                    <div className="w-28 h-28 md:w-36 md:h-36 rounded-full overflow-hidden border-2 border-primary relative z-10 bg-slate-900">
                      {currentCommandantImageUrl ? (
                        <img src={currentCommandantImageUrl} alt={currentCommandant.name} className="w-full h-full object-cover object-top grayscale hover:grayscale-0 transition-all duration-700 hover:scale-105" />
                      ) : (
                        <div className="w-full h-full bg-slate-900" />
                      )}
                      </div>
                      
                      {/* Holographic scanning circle elements */}
                      <div className="absolute inset-0 rounded-full border-[1px] border-primary border-dashed animate-[spin_10s_linear_infinite] opacity-50" />
                      <div className="absolute -inset-4 rounded-full border-[1px] border-primary border-dotted animate-[spin_15s_linear_infinite_reverse] opacity-30" />
                  </div>
                  
                    <div className="mt-3 md:mt-4 text-center bg-slate-950/80 py-2 px-3 md:px-4 rounded-lg border border-primary/20 backdrop-blur max-w-[280px]">
                      <p className="text-[10px] text-muted-foreground tracking-widest uppercase mb-1">Authorizing Command</p>
                      <p className="text-xs md:text-sm font-bold text-primary tracking-wide uppercase drop-shadow-[0_0_5px_theme('colors.primary.DEFAULT')]">{currentCommandant.name}</p>
                      <p className="text-[9px] md:text-[10px] text-primary/70 mt-1 uppercase tracking-wide truncate">{currentCommandant.title}</p>
                  </div>
               </div>
           )}

           {/* Console / Terminal output */}
            <div className={`w-full md:w-[420px] text-left font-mono text-xs md:text-sm text-gray-300 space-y-2 md:space-y-3 ${currentCommandant ? 'md:border-l md:border-primary/20 md:pl-8' : ''} py-2 min-h-[90px]`}>
              <div className="text-[10px] md:text-xs text-primary/85 uppercase tracking-[0.14em] pb-1 border-b border-primary/20">Command Console - {statusLabel}</div>
              <div className="flex items-center">
                <span className="mr-2 text-primary/70">[01]</span>
                 <span>{typedLine1}</span>
                 {(step === 3) && <span className="animate-pulse w-3 h-5 bg-primary ml-2 flex-shrink-0 shadow-[0_0_5px_theme('colors.primary.DEFAULT')]" />}
              </div>
              <div className="flex items-center">
                <span className="mr-2 text-primary/70">[02]</span>
                 <span>{typedLine2}</span>
                 {(step === 4) && <span className="animate-pulse w-3 h-5 bg-primary ml-2 flex-shrink-0 shadow-[0_0_5px_theme('colors.primary.DEFAULT')]" />}
              </div>
              <div className="flex items-center">
                <span className="mr-2 text-primary/70">[03]</span>
                 <span>{typedLine3}</span>
                 {(step === 5) && <span className="animate-pulse w-3 h-5 bg-primary ml-2 flex-shrink-0 shadow-[0_0_5px_theme('colors.primary.DEFAULT')]" />}
              </div>
           </div>

        </div>

        {/* STATUS READY */}
        <div className="w-full max-w-3xl min-h-[66px] md:min-h-[72px] flex flex-col items-center justify-center shrink-0 gap-2">
          <div className="w-full h-2 bg-slate-800/80 border border-primary/20 rounded overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary/55 via-primary to-primary/55 transition-all duration-700" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex items-center justify-between w-full text-[10px] md:text-xs font-mono uppercase tracking-[0.14em] text-primary/80">
            <span>Progress {progress}%</span>
            <span>{statusLabel}</span>
          </div>
          <div className={`text-lg md:text-xl font-mono text-primary font-bold tracking-[0.15em] md:tracking-[0.25em] transition-all duration-700 ease-out origin-center drop-shadow-[0_0_10px_theme('colors.primary.DEFAULT')] ${step >= 7 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
            STATUS: READY
          </div>
        </div>

      </div>
    </div>
  );
}
