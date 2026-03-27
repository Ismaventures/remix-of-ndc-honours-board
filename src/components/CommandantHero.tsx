import { useEffect, useState } from "react";
import { Shield, Star } from "lucide-react";
import { Commandant } from "@/types/domain";
import ndcCrest from "/images/ndc-crest.png";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
import { useThemeMode } from "@/hooks/useThemeMode";

interface CommandantHeroProps {
  commandant?: Commandant;
  compactDescription?: boolean;
}

export function CommandantHero({
  commandant,
  compactDescription = true,
  isAutoDisplay = false,
}: CommandantHeroProps & { isAutoDisplay?: boolean }) {
  const [visible, setVisible] = useState(isAutoDisplay);
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");
  const isCompact = compactDescription;

  useEffect(() => {
    if (isAutoDisplay) {
      setVisible(true);
      return;
    }

    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, [isAutoDisplay]);

  const name = commandant?.name ?? "No commandant record available";
  const titleText =
    commandant?.title ?? "Commandant record pending database data";
  const description =
    commandant?.description ??
    "No commandant biography is currently available from the database.";
  const isCurrent = commandant?.isCurrent ?? false;
  const commandantImageUrl = useResolvedMediaUrl(commandant?.imageUrl);
  const tenureLabel = commandant
    ? `${commandant.tenureStart}${commandant.tenureEnd ? ` - ${commandant.tenureEnd}` : " - Present"}`
    : "Tenure unavailable";

  if (isAutoDisplay) {
    return (
      <section className={`relative w-full h-full min-h-0 max-h-full flex flex-col items-stretch overflow-hidden border ${isLightMode ? "bg-white text-slate-900 border-slate-200" : "bg-background text-foreground border-border"}`}>
        {/* Top Defence Colors Strip */}
        <div className="absolute top-0 inset-x-0 h-[8px] flex z-30">
          <div className="flex-1 bg-[#002060]" title="Navy" />
          <div className="flex-1 bg-[#FF0000]" title="Army" />
          <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
        </div>

        {/* Background elements */}
        <div className="absolute inset-0 z-0 opacity-40">
          <div className={`absolute inset-0 ${isLightMode ? "bg-white" : "bg-background"}`} />
          {!isLightMode && (
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:3vw_3vw]" />
          )}
        </div>

        {/* NDC Logos in corners */}
        <div className="absolute top-[4.5%] left-[3.5%] z-20">
          <img src={ndcCrest} alt="NDC Logo" className="h-[clamp(20px,4.8vh,56px)] w-auto object-contain filter drop-shadow-sm" />
        </div>
        <div className="absolute top-[4.5%] right-[3.5%] z-20">
          <img src={ndcCrest} alt="NDC Logo" className="h-[clamp(20px,4.8vh,56px)] w-auto object-contain filter drop-shadow-sm" />
        </div>

        {/* Main content: symmetric inset; crests are absolute so use balanced pt/pb */}
        <div className="relative z-10 mx-auto flex w-full max-w-[min(96vw,1400px)] flex-1 min-h-0 flex-col items-center justify-center gap-5 px-4 pb-6 pt-[max(4rem,12%)] sm:gap-6 sm:px-5 sm:pb-7 sm:pt-[max(4.25rem,11%)] md:flex-row md:items-center md:justify-center md:gap-7 md:px-7 md:py-7 lg:gap-8">
          {/* Portrait with Yellow/Gold frame — flex-shrink-0 so the info plate never overlaps a squashed portrait */}
          <div className="relative flex w-full flex-shrink-0 items-center justify-center md:max-w-[42%] md:w-auto lg:max-w-[40%]">
            <div className="p-[0.25rem] sm:p-[0.35vh] bg-[#FFD700] shadow-2xl transition-transform duration-500 w-fit max-w-full">
              <div className="p-[0.25rem] sm:p-[0.35vh] bg-white">
                <div className="p-[0.15rem] sm:p-[0.25vh] bg-[#FFD700]">
                  <div className={`relative mx-auto aspect-[3/4] h-[min(50vh,70dvh)] w-auto max-w-[min(90vw,420px)] bg-slate-100 shadow-inner overflow-hidden md:h-[min(70vh,80dvh)] ${isLightMode ? "bg-slate-50" : "bg-muted/20"}`}>
                    {commandantImageUrl ? (
                      <img
                        src={commandantImageUrl}
                        alt={name}
                        className="w-full h-full object-contain object-top"
                        loading="eager"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <Shield className="h-[15%] w-auto opacity-20" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Identity Plate */}
          <div className="relative w-full max-w-[min(92vw,640px)] flex-shrink-0 md:max-w-none md:min-w-0 md:flex-1 md:self-center">
            {/* Top Red Bar */}
            <div className="h-[0.6vh] min-h-[2px] w-full bg-[#FF0000]" />
            {/* Main Info Bar */}
            <div className="bg-[#002060] w-full py-[max(8px,1.2vh)] md:py-[2.3vh] px-[3vw] sm:px-[4vw] flex flex-col items-center justify-center text-center shadow-2xl">
              <div className="flex flex-col items-center gap-[0.24vh] md:gap-[0.5vh] mb-[0.35vh] md:mb-[1vh]">
                <h2 className="text-[clamp(0.92rem,2.9vh,4rem)] font-bold tracking-tight text-[#FFD700] uppercase drop-shadow-md leading-tight">
                  {name}
                </h2>
                <span className="text-[clamp(0.46rem,1.4vh,1.5rem)] font-medium text-white/95 tracking-[0.18em] sm:tracking-widest uppercase italic border-t border-white/10 pt-[0.2vh] mt-[0.2vh]">
                  {titleText}
                </span>
              </div>
              
              <div className="flex flex-col items-center gap-[0.1vh] md:gap-[0.2vh]">
                <p className="text-[clamp(0.56rem,1.8vh,1.9rem)] font-bold text-white tracking-[0.17em] sm:tracking-[0.25em] uppercase">
                  {isCurrent ? "Current Commandant" : "Past Commandant"}
                </p>
                <div className="flex flex-col items-center gap-1 md:gap-2 mt-1 md:mt-2">
                  <p className="text-[clamp(0.5rem,1.5vh,1.4rem)] font-semibold text-[#FFD700] tracking-[0.12em] sm:tracking-[0.15em] uppercase bg-white/5 px-2.5 py-0.5 md:px-4 md:py-1 rounded">
                    {tenureLabel}
                  </p>
                </div>
                <p className="text-[clamp(0.58rem,1.8vh,1.8rem)] font-bold text-[#FFD700] tracking-[0.15em] sm:tracking-[0.25em] uppercase mt-1.5 md:mt-4">
                  National Defence College
                </p>
              </div>
            </div>
            {/* Bottom Red Bar */}
            <div className="h-[0.6vh] min-h-[2px] w-full bg-[#FF0000]" />
          </div>
        </div>
            
        {/* Sequence Number Indicator */}
          <div className="absolute bottom-[2.2%] right-[3.5vw] z-40">
            <div className={`text-[clamp(7px,1.1vh,14px)] font-bold px-[max(6px,1.1vw)] py-[max(2px,0.26vh)] border shadow-md ${isLightMode ? "bg-white text-black border-slate-400" : "bg-background text-foreground border-border"}`}>
              c-{commandant?.id ?? "0"}
           </div>
        </div>

        {/* Bottom Defence Colors Strip */}
          <div className="absolute bottom-0 inset-x-0 h-[8px] flex z-30">
          <div className="flex-1 bg-[#002060]" title="Navy" />
          <div className="flex-1 bg-[#FF0000]" title="Army" />
          <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
        </div>
      </section>
    );
  }

  return (
    <section
      className={`relative overflow-hidden rounded-2xl transition-all duration-500 group ${
        isLightMode 
          ? "bg-white border border-slate-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)]"
          : "bg-card border border-primary/20 shadow-xl"
      } ${isCurrent ? "commandant-hero-current" : ""} ${isCompact ? "mb-0" : "mb-8"}`}
    >
      {/* Top Defence Colors Strip */}
      <div className="absolute top-0 inset-x-0 h-[8px] flex z-30">
        <div className="flex-1 bg-[#002060]" title="Navy" />
        <div className="flex-1 bg-[#FF0000]" title="Army" />
        <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        {!isLightMode && (
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:42px_42px]" />
        )}
      </div>

      <div
        className={`relative grid items-center ${isCompact ? "gap-6 md:gap-8 p-6 md:p-8 pt-10 grid-cols-1 md:grid-cols-[240px_1fr]" : "gap-8 md:gap-10 p-8 md:p-12 pt-14 grid-cols-1 md:grid-cols-[280px_1fr]"}`}
      >
        <div
          className={`transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
          }`}
        >
          <div className="relative mx-auto md:mx-0 w-fit">
            <div
              className={`relative rounded-lg bg-muted/70 border border-primary/45 flex items-center justify-center overflow-hidden z-10 shadow-2xl ${isCurrent ? "commandant-portrait-frame" : ""} ${isCompact ? "w-40 h-52 md:w-44 md:h-58" : "w-48 h-60 md:w-52 md:h-68"}`}
            >
              {commandantImageUrl ? (
                <img
                  src={commandantImageUrl}
                  alt={name}
                  className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center gap-3 text-primary/40">
                  <Shield className="h-14 w-14" />
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Official Portrait
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          className={`text-center md:text-left transition-all duration-700 ease-out delay-150 ${
            visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
          }`}
        >
          {/* Identity Plate Style Header */}
          <div className="inline-flex items-center justify-center md:justify-start gap-2 mb-4">
            <div className={`h-px w-8 ${isLightMode ? "bg-[#002060]/30" : "bg-blue-400/30"}`} />
            <span className={`text-[10px] uppercase tracking-[0.25em] font-bold ${isLightMode ? "text-[#002060]" : "text-blue-300"}`}>
              {isCurrent ? "Current Commandant" : "Past Commandant"}
            </span>
            <div className={`h-px w-8 ${isLightMode ? "bg-[#002060]/30" : "bg-blue-400/30"}`} />
          </div>

          <h2
            className={`${isCompact ? "text-3xl md:text-[2.4rem]" : "text-4xl md:text-[3.2rem]"} font-bold mb-2 leading-tight uppercase tracking-tight ${isLightMode ? "text-[#002060]" : "text-white drop-shadow-md"}`}
          >
            {name}
          </h2>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-5">
             <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${isLightMode ? "bg-[#002060] text-white" : "bg-blue-900/40 text-blue-100 border border-blue-500/30"}`}>
                {tenureLabel}
             </span>
          </div>

          <p
            className={`${isCompact ? "text-sm md:text-base mb-4" : "text-base md:text-xl mb-6"} font-bold tracking-[0.1em] uppercase border-l-4 pl-4 italic ${isLightMode ? "text-[#FF0000] border-[#FF0000]" : "text-red-400 border-red-500/80"}`}
          >
            {titleText}
          </p>

          <div className="relative">
            <p
              className={`${isCompact ? "text-sm md:text-[15px]" : "text-sm md:text-base"} ${isLightMode ? "text-slate-700 font-medium" : "text-slate-300 font-normal"} leading-relaxed max-w-3xl transition-all duration-700 ease-out delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={
                compactDescription
                  ? {
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: 4,
                      overflow: "hidden",
                    }
                  : undefined
              }
            >
              {description}
            </p>
          </div>
        </div>
      </div>

      {/* Bottom Defence Colors Strip */}
      <div className="absolute bottom-0 inset-x-0 h-[6px] flex z-30">
        <div className="flex-1 bg-[#002060]" title="Navy" />
        <div className="flex-1 bg-[#FF0000]" title="Army" />
        <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
      </div>
    </section>
  );
}
