import { useEffect, useState } from "react";
import { Shield, Star } from "lucide-react";
import { Commandant } from "@/types/domain";
import ndcCrest from "/images/ndc-crest.png";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";

interface CommandantHeroProps {
  commandant?: Commandant;
  compactDescription?: boolean;
}

export function CommandantHero({
  commandant,
  compactDescription = true,
  isAutoDisplay = false,
}: CommandantHeroProps & { isAutoDisplay?: boolean }) {
  const [visible, setVisible] = useState(false);
  const isCompact = compactDescription;

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

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
  const isLightMode = true;
  const summaryText = commandant?.bioSummary ?? description;
  const fullBiography = commandant?.biographyFull ?? description;
  const yearsExperienceLabel = commandant?.yearsExperience
    ? `${commandant.yearsExperience} Years of Service`
    : null;
  const educationItems = commandant?.education ?? [];
  const trainingItems = commandant?.training ?? [];
  const appointmentItems = commandant?.pastAppointments ?? [];
  const honourItems = commandant?.honours ?? [];
  const familyNote = commandant?.familyNote ?? null;
  const impactStatement = commandant?.impactStatement ?? null;

  if (isAutoDisplay) {
    return (
      <section className="relative w-full h-full min-h-0 max-h-full flex flex-col items-stretch overflow-hidden bg-white text-slate-900 border border-slate-200">
        {/* Top Defence Colors Strip */}
        <div className="absolute top-0 inset-x-0 h-[8px] flex z-30">
          <div className="flex-1 bg-[#002060]" title="Navy" />
          <div className="flex-1 bg-[#FF0000]" title="Army" />
          <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
        </div>

        {/* Background elements */}
        <div className="absolute inset-0 z-0 opacity-40">
          <div className="absolute inset-0 bg-white" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:3vw_3vw]" />
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
                  <div className="relative mx-auto aspect-[3/4] h-[min(50vh,70dvh)] w-auto max-w-[min(90vw,420px)] bg-slate-100 shadow-inner overflow-hidden md:h-[min(70vh,80dvh)]">
                    {commandantImageUrl ? (
                      <img
                        src={commandantImageUrl}
                        alt={name}
                        className="w-full h-full object-contain object-top bg-slate-100"
                        loading="eager"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
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
            <div className="bg-white text-black text-[clamp(7px,1.1vh,14px)] font-bold px-[max(6px,1.1vw)] py-[max(2px,0.26vh)] border border-slate-400 shadow-md">
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
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.15)] ${isCurrent ? "commandant-hero-current" : ""} ${isCompact ? "mb-0" : "mb-8"} transition-all duration-500 group`}
    >
      {/* Top Defence Colors Strip - hidden in compact/home mode to avoid doubling with parent shell */}
      {!isCompact && (
        <div className="absolute top-0 inset-x-0 h-[8px] flex z-30">
          <div className="flex-1 bg-[#002060]" title="Nigerian Navy" />
          <div className="flex-1 bg-[#FF0000]" title="Nigerian Army" />
          <div className="flex-1 bg-[#00B0F0]" title="Nigerian Air Force" />
        </div>
      )}

      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:42px_42px]" />
      </div>

      <div
        className={`relative ${isCompact ? "grid items-center gap-6 md:gap-8 p-7 md:p-9 grid-cols-1 md:grid-cols-[1fr_240px]" : "grid items-start gap-8 md:gap-10 p-8 md:p-12 pt-14 grid-cols-1 md:grid-cols-[1fr_280px]"}`}
      >
        <div
          className={`transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
          }`}
        >
          <div className="relative mx-auto md:mx-0 w-fit">
            <div
              className={`relative rounded-lg bg-muted/70 border border-primary/45 flex items-center justify-center overflow-hidden z-10 shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1)] group-hover:shadow-[0_18px_50px_rgba(0,0,0,0.2),0_6px_16px_rgba(0,0,0,0.12)] transition-shadow duration-500 ${isCurrent ? "commandant-portrait-frame" : ""} ${isCompact ? "w-40 h-52 sm:w-44 sm:h-56 md:w-48 md:h-60" : "w-52 h-64 md:w-64 md:h-[22rem]"}`}
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
          <div className="inline-flex items-center justify-center md:justify-start gap-3 mb-5">
            <div className={`h-px w-10 ${isLightMode ? "bg-gradient-to-r from-transparent to-[#002060]/30" : "bg-gradient-to-r from-transparent to-blue-400/30"}`} />
            <span className={`text-[10px] uppercase tracking-[0.28em] font-bold px-2 py-0.5 rounded-sm ${isLightMode ? "text-[#002060] bg-[#002060]/5" : "text-blue-300 bg-blue-400/10"}`}>
              {isCurrent ? "Current Commandant" : "Past Commandant"}
            </span>
            <div className={`h-px w-10 ${isLightMode ? "bg-gradient-to-l from-transparent to-[#002060]/30" : "bg-gradient-to-l from-transparent to-blue-400/30"}`} />
          </div>

          <h2
            className={`${isCompact ? "text-3xl md:text-[2.4rem]" : "text-4xl md:text-[3.2rem]"} font-bold mb-2 leading-tight text-[#002060] uppercase tracking-tight`}
          >
            {name}
          </h2>

          <p
            className={`${isCompact ? "text-sm md:text-base mb-4" : "text-base md:text-xl mb-6"} text-[#FF0000] font-bold tracking-[0.1em] uppercase border-l-4 border-[#FF0000] pl-4 italic`}
          >
            {titleText}
          </p>

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
                <section className={`rounded-xl border px-5 py-4 ${isLightMode ? "border-slate-200 bg-slate-50/70" : "border-slate-700/70 bg-slate-900/35"}`}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold flex items-center gap-2"><span className="inline-block h-3 w-0.5 bg-primary/60 rounded-full" />Executive Summary</p>
                  <p className={`${isLightMode ? "text-slate-700" : "text-slate-200"} text-sm leading-relaxed mt-2`}>{summaryText}</p>
                </section>
              )}

              {yearsExperienceLabel && (
                <div className="inline-flex items-center rounded-lg border border-primary/25 bg-primary/10 px-4 py-2">
                  <p className="text-xs font-semibold tracking-wide text-primary">{yearsExperienceLabel}</p>
                </div>
              )}

              <section className={`rounded-xl border px-5 py-4 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold flex items-center gap-2"><span className="inline-block h-3 w-0.5 bg-primary/60 rounded-full" />Full Biography</p>
                <p className={`${isLightMode ? "text-slate-700" : "text-slate-200"} text-sm leading-relaxed mt-2 whitespace-pre-wrap`}>{fullBiography}</p>
              </section>

              {(educationItems.length > 0 || trainingItems.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {educationItems.length > 0 && (
                    <section className={`rounded-xl border px-5 py-4 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold flex items-center gap-2"><span className="inline-block h-3 w-0.5 bg-primary/60 rounded-full" />Education</p>
                      <ul className={`mt-2.5 space-y-2 text-sm ${isLightMode ? "text-slate-700" : "text-slate-200"}`}>
                        {educationItems.map((item, index) => (
                          <li key={`edu-${index}`} className="leading-relaxed pl-3 border-l border-primary/15">• {item}</li>
                        ))}
                      </ul>
                    </section>
                  )}

                  {trainingItems.length > 0 && (
                    <section className={`rounded-xl border px-5 py-4 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold flex items-center gap-2"><span className="inline-block h-3 w-0.5 bg-primary/60 rounded-full" />Training</p>
                      <ul className={`mt-2.5 space-y-2 text-sm ${isLightMode ? "text-slate-700" : "text-slate-200"}`}>
                        {trainingItems.map((item, index) => (
                          <li key={`training-${index}`} className="leading-relaxed pl-3 border-l border-primary/15">• {item}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}

              {appointmentItems.length > 0 && (
                <section className={`rounded-xl border px-5 py-4 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold flex items-center gap-2"><span className="inline-block h-3 w-0.5 bg-primary/60 rounded-full" />Key Past Appointments</p>
                  <ul className={`mt-2.5 space-y-2 text-sm ${isLightMode ? "text-slate-700" : "text-slate-200"}`}>
                    {appointmentItems.map((item, index) => (
                      <li key={`appointment-${index}`} className="leading-relaxed pl-3 border-l border-primary/15">• {item}</li>
                    ))}
                  </ul>
                </section>
              )}

              {honourItems.length > 0 && (
                <section className={`rounded-xl border px-5 py-4 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold flex items-center gap-2"><span className="inline-block h-3 w-0.5 bg-primary/60 rounded-full" />Honours and Decorations</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {honourItems.map((item, index) => (
                      <span key={`honour-${index}`} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors duration-200 ${isLightMode ? "border-amber-300/70 bg-amber-50 text-amber-900 hover:bg-amber-100/80" : "border-amber-500/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/15"}`}>
                        {item}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {(familyNote || impactStatement) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {familyNote && (
                    <section className={`rounded-xl border px-5 py-4 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold flex items-center gap-2"><span className="inline-block h-3 w-0.5 bg-primary/60 rounded-full" />Family Note</p>
                      <p className={`mt-2 text-sm leading-relaxed ${isLightMode ? "text-slate-700" : "text-slate-200"}`}>{familyNote}</p>
                    </section>
                  )}
                  {impactStatement && (
                    <section className={`rounded-xl border px-5 py-4 ${isLightMode ? "border-slate-200 bg-white" : "border-slate-700/70 bg-slate-950/35"}`}>
                      <p className="text-[11px] uppercase tracking-[0.16em] text-primary/80 font-semibold flex items-center gap-2"><span className="inline-block h-3 w-0.5 bg-primary/60 rounded-full" />Strategic Impact</p>
                      <p className={`mt-2 text-sm leading-relaxed ${isLightMode ? "text-slate-700" : "text-slate-200"}`}>{impactStatement}</p>
                    </section>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Defence Colors Strip - hidden in compact/home mode to avoid doubling with parent shell */}
      {!isCompact && (
        <div className="absolute bottom-0 inset-x-0 h-[6px] flex z-30">
          <div className="flex-1 bg-[#002060]" title="Nigerian Navy" />
          <div className="flex-1 bg-[#FF0000]" title="Nigerian Army" />
          <div className="flex-1 bg-[#00B0F0]" title="Nigerian Air Force" />
        </div>
      )}
    </section>
  );
}
