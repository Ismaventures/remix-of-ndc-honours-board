import React, { useEffect, useRef, useState } from 'react';
import { useAudioStore, getAudioUrl } from '@/hooks/useAudioStore';
import { Volume2, VolumeX, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

// Event emitter to trigger crossfades globally without passing props down deeply
export const customAudioThemeEvent = new EventTarget();

export function AudioManager() {
  const { masterVolume, isMuted, toggleMute, setMasterVolume, loadTracks } = useAudioStore();
  
  const audio1Ref = useRef<HTMLAudioElement>(null);
  const audio2Ref = useRef<HTMLAudioElement>(null);
  const activeRef = useRef<1 | 2>(1); // keeps track of which audio element is playing the current track
  
  const [currentId, setCurrentId] = useState<string | null>(null);

  useEffect(() => {
    void loadTracks();
  }, [loadTracks]);

  useEffect(() => {
    const handleCommand = async (e: Event) => {
      const customEvent = e as CustomEvent<{ targetId: string | null; preloader?: boolean }>;
      const { targetId, preloader } = customEvent.detail;

      const a1 = audio1Ref.current;
      const a2 = audio2Ref.current;
      if (!a1 || !a2) return;

      const activeAudio = activeRef.current === 1 ? a1 : a2;
      if (targetId === currentId) {
        const hasActivePlayback = targetId === null || (!activeAudio.paused && Boolean(activeAudio.src));
        if (hasActivePlayback) return;
      }

      const nextUrl = targetId ? await getAudioUrl(targetId) : null;
      setCurrentId(targetId);

      const fadeDuration = 1500;
      const steps = 30;
      const stepTime = fadeDuration / steps;
      
      const nextVolume = isMuted ? 0 : preloader ? masterVolume * 0.5 : masterVolume;

      // Crossfade logic
      const outAudio = activeRef.current === 1 ? a1 : a2;
      const inAudio = activeRef.current === 1 ? a2 : a1;
      
      if (nextUrl) {
        inAudio.src = nextUrl;
        inAudio.volume = 0;
        inAudio.loop = true;
        inAudio.play().catch(() => console.log("Playback prevented by browser"));
      }

      activeRef.current = activeRef.current === 1 ? 2 : 1;

      let currentStep = 0;
      const fadeInterval = setInterval(() => {
        currentStep++;
        
        // Fade out
        if (outAudio.volume > 0) {
            outAudio.volume = Math.max(0, outAudio.volume - (outAudio.volume / (steps - currentStep + 1)));
        }
        
        // Fade in
        if (nextUrl && inAudio.volume < nextVolume) {
            inAudio.volume = Math.min(nextVolume, inAudio.volume + (nextVolume / steps));
        }

        if (currentStep >= steps) {
          clearInterval(fadeInterval);
          outAudio.pause();
          outAudio.src = '';
          if (nextUrl) {
              inAudio.volume = nextVolume;
          }
        }
      }, stepTime);
    };

    customAudioThemeEvent.addEventListener('playTrack', handleCommand);
    return () => customAudioThemeEvent.removeEventListener('playTrack', handleCommand);
  }, [currentId, isMuted, masterVolume]);

  // Handle master volume changes
  useEffect(() => {
     const activeAudio = activeRef.current === 1 ? audio1Ref.current : audio2Ref.current;
     if (activeAudio && currentId) {
         activeAudio.volume = isMuted ? 0 : masterVolume;
     }
  }, [masterVolume, isMuted, currentId]);

  return (
    <>
      <audio ref={audio1Ref} suppressHydrationWarning />
      <audio ref={audio2Ref} suppressHydrationWarning />
      
      <div className="fixed bottom-6 left-6 z-50">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="icon" className="w-12 h-12 rounded-full shadow-lg bg-background/80 backdrop-blur-md border-primary/20 hover:border-primary hover:bg-primary/10 transition-all">
               {isMuted ? <VolumeX className="w-5 h-5 text-muted-foreground" /> : <Volume2 className="w-5 h-5 text-primary" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-4 ml-6 mb-2 bg-background/95 backdrop-blur-xl border-primary/20 shadow-2xl rounded-xl" side="right" align="end">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm tracking-widest text-primary flex items-center gap-2">
                   <Sliders className="w-4 h-4" /> AUDIO CONTROLS
                </h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Mute System</span>
                  <Button variant="ghost" size="sm" onClick={toggleMute} className="h-7 cursor-pointer z-50 relative pointer-events-auto">
                    {isMuted ? "UNMUTE" : "MUTE"}
                  </Button>
                </div>
                <div className="space-y-1 z-50 relative pointer-events-auto">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Master Volume</span>
                    <span>{Math.round(masterVolume * 100)}%</span>
                  </div>
                  <Slider 
                    value={[masterVolume * 100]} 
                    max={100} 
                    step={1}
                    onValueChange={(vals) => setMasterVolume(vals[0] / 100)}
                    className="py-2"
                  />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </>
  );
}

export const playAudioTrack = (targetId: string | null, preloader = false) => {
    customAudioThemeEvent.dispatchEvent(new CustomEvent('playTrack', { detail: { targetId, preloader } }));
};
