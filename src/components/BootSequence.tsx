import { useEffect, useState } from "react";
import { useAudioStore } from "@/hooks/useAudioStore";
import { playAudioTrack } from "@/components/AudioManager";
import {
  BootSequenceSettings,
  DEFAULT_BOOT_SEQUENCE_SETTINGS,
} from "@/hooks/useBootSequenceSettings";
import ndcCrest from "/images/ndc-crest.png";
import { PreBootVault } from "./PreBootVault";

export function BootSequence({
  settings,
  onComplete,
}: {
  settings?: BootSequenceSettings;
  onComplete?: () => void;
}) {
  const assignments = useAudioStore((s) => s.assignments);
  const tracks = useAudioStore((s) => s.tracks);
  const loadTracks = useAudioStore((s) => s.loadTracks);
  const [showWelcomeGate, setShowWelcomeGate] = useState(false);
  const [isEnteringArchive, setIsEnteringArchive] = useState(false);
  const [bootStage, setBootStage] = useState<"service-intro" | "gate">(
    "service-intro",
  );

  const bootSettings = settings ?? DEFAULT_BOOT_SEQUENCE_SETTINGS;
  const timeScale = Math.max(
    0.65,
    bootSettings.totalDurationMs /
      DEFAULT_BOOT_SEQUENCE_SETTINGS.totalDurationMs,
  );
  const scaledDelay = (baseMs: number, min = 120) =>
    Math.max(min, Math.round(baseMs * timeScale));
  const serviceIntroDurationMs = scaledDelay(5200, 3400);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    void loadTracks();
  }, [loadTracks]);

  useEffect(() => {
    if (!assignments.preloader) return;

    const hasTrack = tracks.some((track) => track.id === assignments.preloader);
    if (!hasTrack) return;

    playAudioTrack(assignments.preloader, true, false, { fadeMs: 420 });
  }, [assignments.preloader, tracks]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#001233] overflow-hidden transition-all duration-[1500ms] ease-in-out ${isEnteringArchive ? "opacity-0 scale-[1.15] blur-md brightness-150 pointer-events-none" : "opacity-100 scale-100 blur-none brightness-100"}`}
    >
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,rgba(0,176,240,0.16),rgba(0,18,51,0.95)_48%,rgba(0,32,96,1)_100%)]" />

      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {bootStage === "service-intro" && (
        <PreBootVault onComplete={() => {
          setBootStage("gate");
          setShowWelcomeGate(true);
        }} />
      )}

      {bootStage === "gate" && (
        <div
          className={`relative z-30 w-full h-full flex items-center justify-center px-4 transition-all duration-1000 ease-out ${showWelcomeGate ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}`}
        >
          <div
            className={`absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.25),rgba(2,6,23,0.98)_55%,rgba(2,6,23,1)_100%)] transition-opacity duration-1000 ${showWelcomeGate ? "opacity-100" : "opacity-0"}`}
          />

          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 flex items-center justify-center mix-blend-plus-lighter">
            <div
              className={`absolute -inset-[150%] opacity-0 animate-[spin_240s_linear_infinite] transition-opacity duration-[2000ms] delay-700 ease-in-out ${showWelcomeGate ? "opacity-[0.04]" : "opacity-0"}`}
              style={{
                backgroundImage: `url(${ndcCrest})`,
                backgroundSize: "240px 240px",
                backgroundPosition: "center",
                backgroundRepeat: "repeat",
                filter: "grayscale(100%)",
              }}
            />
            <div
              className={`absolute -inset-[150%] opacity-0 animate-[spin_180s_linear_infinite_reverse] transition-opacity duration-[2000ms] delay-1000 ease-in-out ${showWelcomeGate ? "opacity-[0.02]" : "opacity-0"}`}
              style={{
                backgroundImage: `url(${ndcCrest})`,
                backgroundSize: "400px 400px",
                backgroundPosition: "center",
                backgroundRepeat: "repeat",
                filter: "grayscale(100%) contrast(150%)",
              }}
            />
            <div
              className={`absolute inset-0 bg-primary/8 mix-blend-color-burn transition-all duration-1000 animate-pulse-slow ${showWelcomeGate ? "opacity-100" : "opacity-0"}`}
            />
          </div>

          <div className="relative z-10 w-full max-w-2xl rounded-2xl border-2 border-primary/35 bg-slate-900/80 backdrop-blur-xl shadow-[0_20px_100px_hsl(var(--primary)/0.22)] px-6 py-10 md:px-14 md:py-14 text-center">
            <div
              className={`mx-auto mb-6 w-20 h-20 md:w-24 md:h-24 rounded-full border border-primary/70 bg-primary/12 flex items-center justify-center shadow-[0_0_30px_hsl(var(--primary)/0.35)] animate-[pulse_2.2s_ease-in-out_infinite] transition-all duration-1000 delay-300 ${showWelcomeGate ? "opacity-100 scale-100 rotate-0" : "opacity-0 scale-50 rotate-[-15deg]"}`}
            >
              <img
                src={ndcCrest}
                alt="NDC Crest"
                className="w-14 h-14 md:w-16 md:h-16 object-contain"
              />
            </div>
            <p
              className={`text-[12px] md:text-sm uppercase tracking-[0.25em] text-primary font-semibold mb-2 transition-all duration-700 delay-500 ${showWelcomeGate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              National Defence College Nigeria
            </p>
            <h3
              className={`text-xl md:text-4xl font-serif text-white tracking-widest uppercase text-shadow-lg drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] transition-all duration-700 delay-700 ${showWelcomeGate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              Archive Access Portal
            </h3>
            <p
              className={`mt-4 text-xs md:text-base text-white/80 leading-relaxed max-w-md mx-auto font-light transition-all duration-700 delay-[900ms] ${showWelcomeGate ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              Initialization completed. Access to the NDC Chronicles of Staffs
              Archive is now ready. Select the portal entry below to proceed.
            </p>
            <div
              className={`transition-all duration-1000 delay-[1100ms] ${showWelcomeGate ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            >
              <button
                onClick={() => {
                  if (isEnteringArchive) return;
                  setIsEnteringArchive(true);
                  setTimeout(() => {
                    if (onComplete) onComplete();
                  }, 1300);
                }}
                className="group relative overflow-hidden mt-10 inline-flex items-center justify-center px-10 py-5 md:px-16 md:py-6 rounded-lg border-2 border-primary bg-[linear-gradient(45deg,hsl(var(--primary)/0.12),hsl(var(--primary)/0.32)_50%,hsl(var(--primary)/0.12))] hover:bg-primary/40 text-[hsl(var(--gold-bright))] text-lg md:text-xl font-bold tracking-[0.25em] md:tracking-[0.3em] uppercase hover:scale-[1.05] hover:shadow-[0_0_50px_hsl(var(--primary)/0.6)] hover:-translate-y-1 transition-all duration-500 ease-out"
              >
                <div className="absolute inset-0 bg-primary/20 -translate-x-[150%] skew-x-[30deg] group-hover:translate-x-[150%] transition-transform duration-1000 ease-in-out" />
                <span className="relative z-10 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)] text-white mix-blend-screen">
                  ENTER ARCHIVE
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes introPulse {
          0%,
          100% {
            transform: scale(0.92);
            opacity: 0.36;
          }
          50% {
            transform: scale(1.04);
            opacity: 0.72;
          }
        }

        @keyframes introNavyFirst {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.6) translateY(34px);
            filter: blur(8px);
          }
          70% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.04) translateY(0);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(0.94) translateY(-36px);
          }
        }

        @keyframes introServicesRise {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) translateY(70px) scale(0.86);
            filter: blur(10px);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(0) scale(1);
            filter: blur(0);
          }
        }

        @keyframes introNdcHero {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scale(0.55) rotate(-8deg);
            filter: blur(8px);
          }
          55% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1.08) rotate(0deg);
            filter: blur(0);
          }
          100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
