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
    commandant?.postNominals?.trim() ||
    commandant?.title ||
    "Commandant record pending database data";
  const description =
    commandant?.description ??
    "No commandant biography is currently available from the database.";
  const summaryText = commandant?.bioSummary?.trim() || description;
  const fullBiography = commandant?.biographyFull?.trim() || description;
  const educationItems = commandant?.education ?? [];
  const trainingItems = commandant?.training ?? [];
  const appointmentItems = commandant?.pastAppointments ?? [];
  const honourItems = commandant?.honours ?? [];
  const familyNote = commandant?.familyNote?.trim() || "";
  const impactStatement = commandant?.impactStatement?.trim() || "";
  const yearsExperienceLabel =
    typeof commandant?.yearsExperience === "number" && commandant.yearsExperience > 0
      ? `${commandant.yearsExperience}+ years experience`
      : "";
  const isCurrent = commandant?.isCurrent ?? false;
  const commandantImageUrl = useResolvedMediaUrl(commandant?.imageUrl);
  const tenureLabel = commandant
    ? `${commandant.tenureStart}${commandant.tenureEnd ? ` - ${commandant.tenureEnd}` : " - Present"}`
    : "Tenure unavailable";

  if (isAutoDisplay) {
    return (
      <section className={`relative w-full h-full min-h-0 max-h-full flex flex-col items-stretch overflow-hidden border ${isLightMode ? "auto-display-studio-surface text-slate-900 border-slate-200/80" : "bg-background text-foreground border-border"}`}>
        {/* Top Defence Colors Strip */}
        <div className="absolute top-0 inset-x-0 h-[8px] flex z-30">
          <div className="flex-1 bg-[#002060]" title="Nigerian Navy" />
          <div className="flex-1 bg-[#FF0000]" title="Nigerian Army" />
          <div className="flex-1 bg-[#00B0F0]" title="Nigerian Air Force" />
        </div>

        {/* Background: subtle paper grain (light) / grid (dark) */}
        <div className={`absolute inset-0 z-0 ${isLightMode ? "opacity-100" : "opacity-40"}`}>
          {isLightMode ? (
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:min(3.2vw,20px)_min(3.2vw,20px)] mix-blend-multiply opacity-[0.35]" />
          ) : (
            <>
              <div className="absolute inset-0 bg-background" />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:3vw_3vw]" />
            </>
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
        <div className="relative z-10 mx-auto flex w-full max-w-[min(96vw,1400px)] flex-1 min-h-0 flex-col items-center justify-center gap-5 px-4 pb-6 pt-[max(4rem,12%)] sm:gap-6 sm:px-5 sm:pb-7 sm:pt-[max(4.25rem,11%)] md:flex-row-reverse md:items-center md:justify-center md:gap-7 md:px-7 md:py-7 lg:gap-8">
          {/* Portrait with Yellow/Gold frame — flex-shrink-0 so the info plate never overlaps a squashed portrait */}
          <div className="relative flex w-full flex-shrink-0 items-center justify-center md:max-w-[42%] md:w-auto lg:max-w-[40%]">
            <div className="portrait-photo-mat rounded-sm p-[3px] sm:p-[4px] shadow-2xl transition-transform duration-500 w-fit max-w-full">
              <div className="rounded-[3px] bg-white p-[2px] sm:p-[3px] shadow-inner">
                <div className="portrait-photo-mat-inner rounded-[2px] bg-neutral-100/90 p-[1px] sm:p-[2px]">
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
                <h2 className={`text-[clamp(0.84rem,2.2vh,2.2rem)] md:text-[clamp(1rem,2.8vh,3.2rem)] font-extrabold tracking-tight leading-tight max-w-full break-words [overflow-wrap:anywhere] max-h-[4.4em] overflow-y-auto ${isLightMode ? "text-[#0f2a5f]" : "text-slate-100"}`}>
                  {name}
                </h2>
                <span className="text-[clamp(0.56rem,1.5vh,1.2rem)] md:text-[clamp(0.62rem,1.6vh,1.35rem)] font-extrabold text-[#FF3B30] tracking-[0.07em] italic border-t border-white/10 pt-[0.2vh] mt-[0.2vh] max-w-full break-words [overflow-wrap:anywhere] max-h-[4em] overflow-y-auto">
                  {titleText}
                </span>
              </div>
              
              <div className="flex flex-col items-center gap-[0.1vh] md:gap-[0.2vh]">
                <p className="text-[clamp(0.56rem,1.8vh,1.9rem)] font-bold text-white tracking-[0.17em] sm:tracking-[0.25em] uppercase">
                  {isCurrent ? "Current Commandant" : "Past Commandant"}
                </p>
                <div className="flex flex-col items-center gap-1 md:gap-2 mt-1 md:mt-2">
                  <p className="text-[clamp(0.5rem,1.5vh,1.4rem)] font-semibold text-[#ebe6dc] tracking-[0.12em] sm:tracking-[0.15em] uppercase bg-white/5 px-2.5 py-0.5 md:px-4 md:py-1 rounded">
                    {tenureLabel}
                  </p>
                </div>
                <p className="text-[clamp(0.58rem,1.8vh,1.8rem)] font-bold text-[#e8e2d6] tracking-[0.15em] sm:tracking-[0.25em] uppercase mt-1.5 md:mt-4">
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
          <div className="flex-1 bg-[#002060]" title="Nigerian Navy" />
          <div className="flex-1 bg-[#FF0000]" title="Nigerian Army" />
          <div className="flex-1 bg-[#00B0F0]" title="Nigerian Air Force" />
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
        <div className="flex-1 bg-[#002060]" title="Nigerian Navy" />
        <div className="flex-1 bg-[#FF0000]" title="Nigerian Army" />
        <div className="flex-1 bg-[#00B0F0]" title="Nigerian Air Force" />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        {!isLightMode && (
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:42px_42px]" />
        )}
      </div>

      <div
        className={`relative ${isCompact ? "grid items-center gap-6 md:gap-8 p-7 md:p-9 pt-10 grid-cols-1 md:grid-cols-[1fr_240px]" : "grid items-start gap-8 md:gap-10 p-8 md:p-12 pt-14 grid-cols-1 md:grid-cols-[1fr_280px]"}`}
      >
        <div
          className={`md:order-2 transition-all duration-700 ease-out ${!isCompact ? "md:self-start md:pl-8 md:border-l md:border-slate-300/65" : ""} ${
            visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
          }`}
        >
          <div className="relative mx-auto md:ml-auto md:mr-0 w-fit">
            <div
              className={`relative rounded-lg bg-muted/70 border border-primary/45 flex items-center justify-center overflow-hidden z-10 shadow-2xl ${isCurrent ? "commandant-portrait-frame" : ""} ${isCompact ? "w-40 h-52 sm:w-44 sm:h-56 md:w-48 md:h-60" : "w-52 h-64 md:w-64 md:h-[22rem]"}`}
            >
              {commandantImageUrl ? (
                <img
                  src={commandantImageUrl}
                  alt={name}
                  className={`${isCompact ? "w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105" : "w-full h-full object-contain object-top p-2 bg-white"}`}
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
          className={`md:order-1 text-center md:text-left transition-all duration-700 ease-out delay-150 ${
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
            className={`${isCompact ? "text-[clamp(1.1rem,3.1vh,2.2rem)] md:text-[2.3rem]" : "text-[clamp(1.35rem,3.4vh,2.6rem)] md:text-[3rem]"} font-extrabold mb-2 leading-tight tracking-tight max-w-full break-words [overflow-wrap:anywhere] max-h-[4.6em] overflow-y-auto ${isLightMode ? "text-[#0f2a5f]" : "text-slate-100"}`}
          >
            {name}
          </h2>

          <p
            className={`${isCompact ? "text-[clamp(0.76rem,1.9vh,1.04rem)] md:text-[1.02rem] mb-4" : "text-[clamp(0.88rem,2.1vh,1.2rem)] md:text-[1.3rem] mb-6"} font-extrabold tracking-[0.06em] border-l-4 pl-4 italic text-[#FF3B30] border-[#FF3B30] max-w-full break-words [overflow-wrap:anywhere] max-h-[5.2em] overflow-y-auto`}
          >
            {titleText}
          </p>

           <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-5">
             <span className={`px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] ${isLightMode ? "bg-[#002060] text-white" : "bg-blue-900/40 text-blue-100 border border-blue-500/30"}`}>
               {tenureLabel}
             </span>
           </div>

          {isCompact ? (
            <div className="relative">
              <p
                className={`text-sm md:text-[15px] ${isLightMode ? "text-slate-700 font-medium" : "text-slate-300 font-normal"} leading-relaxed max-w-3xl transition-all duration-700 ease-out delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 10,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  wordWrap: "break-word"
                }}
              >
                {summaryText}
              </p>
            </div>
          ) : (
            <div className={`space-y-4 transition-all duration-700 ease-out delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              {summaryText && (
                <section className={`rounded-lg border px-4 py-3 ${isLightMode ? "border-slate-200 bg-slate-50/70" : "border-slate-700/70 bg-slate-900/35"}`}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold">Executive Summary</p>
                  <p className={`${isLightMode ? "text-slate-700" : "text-slate-200"} text-sm leading-relaxed mt-1`}>{summaryText}</p>
                </section>
              )}

              {yearsExperienceLabel && (
                <div className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-3 py-1.5">
                  <p className="text-xs font-semibold tracking-wide text-primary">{yearsExperienceLabel}</p>
                </div>
              )}

              <section className={`rounded-lg border px-4 py-3 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold">Full Biography</p>
                <p className={`${isLightMode ? "text-slate-700" : "text-slate-200"} text-sm leading-relaxed mt-1 whitespace-pre-wrap`}>{fullBiography}</p>
              </section>

              {(educationItems.length > 0 || trainingItems.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {educationItems.length > 0 && (
                    <section className={`rounded-lg border px-4 py-3 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold">Education</p>
                      <ul className={`mt-2 space-y-1.5 text-sm ${isLightMode ? "text-slate-700" : "text-slate-200"}`}>
                        {educationItems.map((item, index) => (
                          <li key={`edu-${index}`} className="leading-relaxed">• {item}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {trainingItems.length > 0 && (
                    <section className={`rounded-lg border px-4 py-3 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold">Training</p>
                      <ul className={`mt-2 space-y-1.5 text-sm ${isLightMode ? "text-slate-700" : "text-slate-200"}`}>
                        {trainingItems.map((item, index) => (
                          <li key={`training-${index}`} className="leading-relaxed">• {item}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}

              {appointmentItems.length > 0 && (
                <section className={`rounded-lg border px-4 py-3 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold">Key Past Appointments</p>
                  <ul className={`mt-2 space-y-1.5 text-sm ${isLightMode ? "text-slate-700" : "text-slate-200"}`}>
                    {appointmentItems.map((item, index) => (
                      <li key={`appointment-${index}`} className="leading-relaxed">• {item}</li>
                    ))}
                  </ul>
                </section>
              )}

              {honourItems.length > 0 && (
                <section className={`rounded-lg border px-4 py-3 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold">Honours and Decorations</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {honourItems.map((item, index) => (
                      <span key={`honour-${index}`} className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${isLightMode ? "border-amber-300/70 bg-amber-50 text-amber-900" : "border-amber-500/40 bg-amber-500/10 text-amber-200"}`}>
                        {item}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {(familyNote || impactStatement) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {familyNote && (
                    <section className={`rounded-lg border px-4 py-3 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold">Family Note</p>
                      <p className={`mt-1 text-sm leading-relaxed ${isLightMode ? "text-slate-700" : "text-slate-200"}`}>{familyNote}</p>
                    </section>
                  )}
                  {impactStatement && (
                    <section className={`rounded-lg border px-4 py-3 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold">Strategic Impact</p>
                      <p className={`mt-1 text-sm leading-relaxed ${isLightMode ? "text-slate-700" : "text-slate-200"}`}>{impactStatement}</p>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Defence Colors Strip */}
      <div className="absolute bottom-0 inset-x-0 h-[6px] flex z-30">
        <div className="flex-1 bg-[#002060]" title="Nigerian Navy" />
        <div className="flex-1 bg-[#FF0000]" title="Nigerian Army" />
        <div className="flex-1 bg-[#00B0F0]" title="Nigerian Air Force" />
      </div>
    </section>
  );
}

