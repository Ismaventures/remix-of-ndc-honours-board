import React, { useState, useEffect } from "react";
import { useAudioStore } from "@/hooks/useAudioStore";
import { playAudioTrack } from "@/components/AudioManager";
import { useCommandantsStore } from "@/hooks/useStore";
import { resolveMediaRefToObjectUrl } from "@/lib/persistentMedia";
import {
  BootSequenceSettings,
  DEFAULT_BOOT_SEQUENCE_SETTINGS,
} from "@/hooks/useBootSequenceSettings";
import ndcCrest from "/images/ndc-crest.png";
import { NdcScatteredTransition } from "./NdcScatteredTransition";

type BootPortrait = {
  id: string;
  name: string;
  rankOrTitle: string;
  imageUrl: string | null;
  isCurrent: boolean;
  tenureLabel: string;
};

export function BootSequence({
  settings,
  onComplete,
}: {
  settings?: BootSequenceSettings;
  onComplete?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [utcNow, setUtcNow] = useState(() => new Date());
  const assignments = useAudioStore((s) => s.assignments);
  const { commandants } = useCommandantsStore();

  const currentCommandant = commandants.find((c) => c.isCurrent);
  const [bootPortraits, setBootPortraits] = useState<BootPortrait[]>([]);
  const [activePortraitIndex, setActivePortraitIndex] = useState(0);
  const [portraitVisible, setPortraitVisible] = useState(true);
  const [showWelcomeGate, setShowWelcomeGate] = useState(false);
  const [isEnteringArchive, setIsEnteringArchive] = useState(false);
  const [bootStage, setBootStage] = useState<"preboot" | "scatter" | "gate">(
    "preboot",
  );

  const bootSettings = settings ?? DEFAULT_BOOT_SEQUENCE_SETTINGS;
  const timeScale = Math.max(
    0.65,
    bootSettings.totalDurationMs /
      DEFAULT_BOOT_SEQUENCE_SETTINGS.totalDurationMs,
  );
  const scaledDelay = (baseMs: number, min = 120) =>
    Math.max(min, Math.round(baseMs * timeScale));

  const progress = Math.min(100, Math.round((Math.min(step, 7) / 7) * 100));
  const statusLabel =
    step < 2
      ? "Bootstrapping"
      : step < 4
        ? "Authenticating"
        : step < 6
          ? "Syncing Archives"
          : step < 7
            ? "Final Checks"
            : "Archive Ready";

  const currentPortrait = bootPortraits[activePortraitIndex] ?? null;

  const initials = currentPortrait?.name
    ? currentPortrait.name
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
    : "NDC";

  const utcLabel = utcNow.toLocaleTimeString("en-GB", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });

  useEffect(() => {
    // Lock body scroll while boot sequence is active
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (assignments.preloader) {
      playAudioTrack(assignments.preloader, true);
    }

    const t1 = setTimeout(() => setStep(1), scaledDelay(1000));
    const t2 = setTimeout(() => setStep(2), scaledDelay(2000));

    const transitionTimers: ReturnType<typeof setTimeout>[] = [];
    const t3 = setTimeout(() => {
      setStep(3);
      transitionTimers.push(
        setTimeout(() => setStep(4), scaledDelay(700, 280)),
        setTimeout(() => setStep(5), scaledDelay(1400, 560)),
        setTimeout(() => setStep(6), scaledDelay(2100, 840)),
        setTimeout(() => {
          setStep(7);
          transitionTimers.push(
            setTimeout(() => {
              setBootStage("scatter");
              transitionTimers.push(
                setTimeout(() => {
                  setBootStage("gate");
                  setShowWelcomeGate(true);
                }, 2500),
              );
            }, scaledDelay(700, 300)),
          );
        }, scaledDelay(3600, 1440)),
      );
    }, scaledDelay(3000));

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      transitionTimers.forEach((timer) => clearTimeout(timer));
    };
  }, [assignments.preloader, timeScale]);

  useEffect(() => {
    let mounted = true;
    const transientUrls: string[] = [];

    const prepareBootPortraits = async () => {
      const unique = new Map<string, BootPortrait>();

      const byRecentTenure = [...commandants].sort((a, b) => {
        if (a.isCurrent && !b.isCurrent) return -1;
        if (!a.isCurrent && b.isCurrent) return 1;
        return (b.tenureStart ?? 0) - (a.tenureStart ?? 0);
      });

      for (const cmd of byRecentTenure) {
        let resolvedImage: string | null = null;
        if (cmd.imageUrl) {
          const resolved = await resolveMediaRefToObjectUrl(cmd.imageUrl);
          resolvedImage = resolved;
          if (resolvedImage?.startsWith("blob:")) {
            transientUrls.push(resolvedImage);
          }
        }

        const tenureLabel = `${cmd.tenureStart}${cmd.tenureEnd ? ` - ${cmd.tenureEnd}` : " - Present"}`;

        unique.set(cmd.id, {
          id: cmd.id,
          name: cmd.name,
          rankOrTitle: cmd.title,
          imageUrl: resolvedImage,
          isCurrent: cmd.isCurrent,
          tenureLabel,
        });
      }

      if (!mounted) return;

      const items = Array.from(unique.values());
      setBootPortraits(items);

      const currentIdx = items.findIndex((item) => item.isCurrent);
      setActivePortraitIndex(currentIdx >= 0 ? currentIdx : 0);
    };

    void prepareBootPortraits();

    return () => {
      mounted = false;
      transientUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [commandants]);

  useEffect(() => {
    if (bootPortraits.length <= 1) return;

    const currentIdx = bootPortraits.findIndex((item) => item.isCurrent);
    const pastIndices = bootPortraits
      .map((item, idx) => ({ item, idx }))
      .filter(({ item }) => !item.isCurrent)
      .map(({ idx }) => idx);
    const rotationIndices =
      pastIndices.length > 0 ? pastIndices : bootPortraits.map((_, idx) => idx);

    if (step >= 7) {
      if (currentIdx >= 0) {
        setPortraitVisible(false);
        const settleTimer = setTimeout(() => {
          setActivePortraitIndex(currentIdx);
          setPortraitVisible(true);
        }, 170);
        return () => clearTimeout(settleTimer);
      }
      return;
    }

    if (step < 2 || rotationIndices.length === 0) return;

    const archiveBase = Math.max(850, bootSettings.archiveTransitionMs);
    const intervalMs =
      step < 5
        ? Math.round(archiveBase * 1.6)
        : step < 6
          ? Math.round(archiveBase * 1.85)
          : Math.round(archiveBase * 2.1);
    const flipOutMs = Math.max(
      180,
      Math.min(420, Math.round(archiveBase * 0.36)),
    );
    const flipInDelayMs = Math.max(
      120,
      Math.min(260, Math.round(archiveBase * 0.2)),
    );

    const timer = setInterval(() => {
      setPortraitVisible(false);
      setTimeout(() => {
        setActivePortraitIndex((prev) => {
          const prevIndexInPast = rotationIndices.findIndex(
            (idx) => idx === prev,
          );
          if (prevIndexInPast < 0) return rotationIndices[0];
          const nextPastIndex = (prevIndexInPast + 1) % rotationIndices.length;
          return rotationIndices[nextPastIndex];
        });
        setTimeout(() => {
          setPortraitVisible(true);
        }, flipInDelayMs);
      }, flipOutMs);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [step, bootPortraits, bootSettings.archiveTransitionMs]);

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcNow(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center bg-slate-950 overflow-hidden transition-all duration-[1500ms] ease-in-out ${isEnteringArchive ? "opacity-0 scale-[1.15] blur-md brightness-150 pointer-events-none" : "opacity-100 scale-100 blur-none brightness-100"}`}
    >
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.2),rgba(2,6,23,0.96)_48%,rgba(2,6,23,1)_100%)]" />

      <div
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />

      {/* Background Crest Watermark (Huge & Faded) */}
      <div
        className={`absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none z-0 transition-opacity ease-in-out ${step >= 1 ? "scale-100" : "scale-90"}`}
        style={{ transitionDuration: "3000ms" }}
      >
        <img
          src={ndcCrest}
          alt=""
          className="w-[800px] h-[800px] object-contain"
        />
      </div>

      {bootStage === "preboot" && (
        <div
          className={`absolute top-3 left-3 right-3 md:top-5 md:left-6 md:right-6 z-20 transition-all duration-700 ${step >= 1 ? "opacity-100" : "opacity-0"}`}
        >
          <div className="flex items-center justify-between gap-3 text-[10px] md:text-xs font-mono uppercase tracking-[0.18em] bg-slate-900/72 border border-white/20 px-3 py-2 rounded-md backdrop-blur-sm text-white/90">
            <span>Classification: Restricted</span>
            <span className="hidden md:inline text-primary">
              Operation: Sentinel Archive
            </span>
            <span>UTC: {utcLabel}</span>
          </div>
        </div>
      )}

      {bootStage === "preboot" && (
        <div className="relative w-full h-full max-h-screen max-w-5xl px-4 md:px-8 pt-4 md:pt-6 pb-4 md:pb-6 flex flex-col items-center justify-start gap-4 md:gap-6 z-10 transition-opacity duration-500 opacity-100 overflow-hidden scrollbar-hide">
          {/* Header - NDC Top */}
          <div
            className={`transition-all duration-1000 ease-out flex flex-col items-center w-full shrink-0 ${step >= 2 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          >
            <img
              src={ndcCrest}
              alt="NDC Crest"
              className="w-16 h-16 md:w-24 md:h-24 mb-2 md:mb-4 drop-shadow-[0_0_15px_hsl(var(--primary)/0.4)] object-contain"
            />

            <h1 className="text-xl md:text-3xl lg:text-4xl font-serif text-white tracking-[0.08em] md:tracking-[0.18em] uppercase text-center w-full relative pb-3 md:pb-4 drop-shadow-md leading-tight">
              NATIONAL DEFENCE COLLEGE NIGERIA
              {/* Animated Gold Underline */}
              <div
                className="absolute bottom-0 left-0 h-[2px] bg-primary transition-all ease-in-out shadow-[0_0_10px_theme('colors.primary.DEFAULT')]"
                style={{
                  width: step >= 1 ? "100%" : "0%",
                  transitionDuration: "1200ms",
                }}
              />
            </h1>

            <h2
              className={`mt-2 md:mt-3 text-sm md:text-lg text-primary tracking-[0.08em] md:tracking-[0.12em] uppercase font-sans font-light transition-all duration-1000 ease-in-out ${step >= 3 ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
            >
              System Initialization
            </h2>
          </div>

          {/* Dynamic Center Row: Commandant Portrait */}
          <div className="w-full flex-1 min-h-0 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 max-w-5xl py-1">
            {/* Boot Portrait Sequence: past commandants in motion, then current commandant lock-in */}
            {(currentCommandant || currentPortrait) && (
              <div
                className={`transition-all duration-1000 delay-300 ease-out flex w-[clamp(120px,24vw,188px)] flex-col items-center shrink-0 justify-center ${step >= 3 ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
              >
                <div className="relative w-full rounded-xl border border-white/20 bg-slate-900/75 backdrop-blur-md p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)] flex flex-col">
                  <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(120%_100%_at_0%_0%,hsl(var(--primary)/0.2),transparent_58%)] rounded-xl" />
                  <div
                    className={`relative z-10 w-[clamp(84px,20vw,144px)] h-[clamp(84px,20vw,144px)] mx-auto rounded-full overflow-hidden border-2 border-primary/45 bg-slate-950 transition-all duration-700 ${portraitVisible ? "opacity-100 [transform:perspective(1000px)_rotateY(0deg)_translateX(0px)_scale(1)]" : "opacity-0 [transform:perspective(1000px)_rotateY(76deg)_translateX(-26px)_scale(0.94)]"}`}
                    style={{ transformOrigin: "left center" }}
                  >
                    {currentPortrait?.imageUrl ? (
                      <img
                        src={currentPortrait.imageUrl}
                        alt={currentPortrait.name}
                        className={`w-full h-full object-cover object-top transition-all duration-500 ${currentPortrait?.isCurrent && step >= 7 ? "grayscale-0" : "grayscale-[35%]"}`}
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-900 flex items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-white/70">
                          <img
                            src={ndcCrest}
                            alt="NDC Crest"
                            className="w-10 h-10 md:w-12 md:h-12 object-contain grayscale opacity-80"
                          />
                          <span className="text-xs md:text-sm font-bold tracking-wider">
                            {initials}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/0 via-black/0 to-black/45" />
                    <div className="absolute inset-0 pointer-events-none opacity-[0.08] bg-[linear-gradient(45deg,hsl(var(--foreground)/0.15)_25%,transparent_25%,transparent_75%,hsl(var(--foreground)/0.15)_75%),linear-gradient(45deg,hsl(var(--foreground)/0.15)_25%,transparent_25%,transparent_75%,hsl(var(--foreground)/0.15)_75%)] bg-[length:24px_24px] bg-[position:0_0,12px_12px]" />
                  </div>

                  <div className="mt-2 text-left rounded-lg bg-slate-950/70 p-1.5 z-10 w-full">
                    <p className="text-[7px] text-white/65 tracking-widest uppercase mb-0.5">
                      {currentPortrait?.isCurrent && step >= 7
                        ? "Current Commandant"
                        : "Commandants Sequence"}
                    </p>
                    <p className="text-[9px] md:text-[11px] font-bold text-white tracking-wide uppercase leading-tight">
                      {currentPortrait?.name ?? currentCommandant.name}
                    </p>
                    <p className="text-[8px] text-primary mt-0.5 uppercase tracking-wide truncate">
                      {currentPortrait?.rankOrTitle ?? currentCommandant.title}
                    </p>
                    <p className="text-[8px] text-white/72 mt-0.5 uppercase tracking-wide">
                      {currentPortrait?.tenureLabel ??
                        `${currentCommandant.tenureStart}${currentCommandant.tenureEnd ? ` - ${currentCommandant.tenureEnd}` : " - Present"}`}
                    </p>
                  </div>
                </div>

                <div className="mt-2 w-full rounded-md border border-white/12 bg-slate-950/70 px-1 py-1 overflow-hidden hidden sm:block">
                  <div className="relative h-6 md:h-8">
                    <div
                      className="absolute inset-y-0 left-0 flex items-center gap-1.5 transition-transform duration-700"
                      style={{ transform: `translateX(-${activePortraitIndex * 40}px)` }}
                    >
                      {bootPortraits.slice(0, 20).map((item, idx) => (
                        <div
                          key={item.id}
                          className={`h-6 w-6 md:h-8 md:w-8 shrink-0 rounded-full overflow-hidden border transition-all duration-300 ${idx === activePortraitIndex ? "border-primary shadow-[0_0_14px_hsl(var(--primary)/0.42)] scale-110" : "border-white/20 opacity-70"}`}
                        >
                          {item.imageUrl ? (
                            <img
                              src={item.imageUrl}
                              alt={item.name}
                              className="h-full w-full object-cover object-top"
                            />
                          ) : (
                            <div className="h-full w-full bg-slate-800" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-2 text-center bg-slate-950/82 py-1 px-2 md:px-3 rounded-lg border border-white/15 backdrop-blur w-full">
                  <p className="text-[7px] text-white/65 tracking-widest uppercase mb-0.5">
                    {step >= 7
                      ? "Authorizing Command"
                      : "Archive Commandant Sequence"}
                  </p>
                  <p className="text-[9px] md:text-[11px] font-bold text-white tracking-wide uppercase drop-shadow-[0_0_5px_hsl(var(--primary)/0.45)]">
                    {currentPortrait?.name ?? currentCommandant.name}
                  </p>
                  <p className="text-[7px] md:text-[8px] text-primary mt-0.5 uppercase tracking-wide truncate">
                    {currentPortrait?.rankOrTitle ?? currentCommandant.title}
                  </p>
                </div>
              </div>
            )}

          </div>

          {/* Boot progress indicator (kept low and minimal for a formal look) */}
          <div className="w-full max-w-3xl min-h-[72px] flex flex-col items-center justify-center shrink-0 gap-2 bg-slate-950/65 backdrop-blur-sm rounded-lg px-2 py-2 border border-white/10 mt-auto">
            <div className="w-full h-2 bg-slate-800/80 border border-white/15 rounded overflow-hidden">
              <div
                className="h-full bg-primary/85 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between w-full text-[10px] md:text-xs font-mono uppercase tracking-[0.12em] text-white/78">
              <span>Loading {progress}%</span>
              <span>{statusLabel}</span>
            </div>
            <div
              className={`text-base md:text-lg font-mono text-primary font-semibold tracking-[0.12em] md:tracking-[0.2em] transition-all duration-700 ease-out origin-center ${step >= 7 ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
            >
              ARCHIVE READY
            </div>
          </div>
        </div>
      )}

      {bootStage === "scatter" && <NdcScatteredTransition durationMs={2500} />}

      {bootStage === "gate" && (
        <div
          className={`relative z-30 w-full h-full flex items-center justify-center px-4 transition-all duration-1000 ease-out ${showWelcomeGate ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-8 scale-95"}`}
        >
          <div
            className={`absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.25),rgba(2,6,23,0.98)_55%,rgba(2,6,23,1)_100%)] transition-opacity duration-1000 ${showWelcomeGate ? "opacity-100" : "opacity-0"}`}
          />

          {/* Faded plenty images of the NDC crest animated matrix */}
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
            {/* Added a pulsing glowing overlay to make it look active */}
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
              Initialization completed. Access to the NDC Chronicles of Staffs Archive
              is now ready. Select the portal entry below to proceed.
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
    </div>
  );
}
