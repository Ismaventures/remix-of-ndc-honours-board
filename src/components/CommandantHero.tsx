import { useEffect, useState } from "react";
import { Shield, Star } from "lucide-react";
import { Commandant } from "@/types/domain";
import ndcCrest from "/images/ndc-crest.png";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
import { getCommandantDisplayTitle } from "@/lib/utils";

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
  const titleText = getCommandantDisplayTitle(commandant);
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
                <span className="text-[clamp(0.46rem,1.4vh,1.5rem)] font-medium text-white/95 tracking-[0.18em] sm:tracking-widest italic border-t border-white/10 pt-[0.2vh] mt-[0.2vh]">
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

  /* ─── Full Profile (non-compact) — premium dark navy glassmorphism redesign ─── */
  if (!isCompact) {
    const decorationText = commandant?.decoration || null;
    return (
      <section
        className={`relative overflow-hidden rounded-2xl border border-[#FFD700]/30 bg-gradient-to-br from-[#001030] via-[#001845] to-[#00102a] shadow-[0_30px_80px_rgba(0,0,0,0.5)] ${isCurrent ? "commandant-hero-current" : ""} mb-8 transition-all duration-500 group md:flex md:flex-col md:max-h-[88vh]`}
      >
        {/* Subtle diagonal lines background */}
        <div className="absolute inset-0 pointer-events-none z-0 opacity-[0.04]">
          <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,transparent,transparent_40px,rgba(255,255,255,0.08)_40px,rgba(255,255,255,0.08)_41px)]" />
        </div>

        {/* Soft radial glow */}
        <div className="absolute top-0 right-0 w-[60%] h-[60%] bg-[radial-gradient(ellipse_at_top_right,rgba(0,60,140,0.25),transparent_70%)] pointer-events-none z-0" />

        {/* Top defence colors strip */}
        <div className="absolute top-0 inset-x-0 h-[6px] flex z-30">
          <div className="flex-1 bg-[#002060]" />
          <div className="flex-1 bg-[#FF0000]" />
          <div className="flex-1 bg-[#00B0F0]" />
        </div>

        {/* Main two-column layout */}
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8 md:gap-10 p-8 md:p-12 pt-12 md:flex-1 md:min-h-0 md:overflow-hidden">

          {/* Portrait column — stays fixed in view */}
          <div className={`md:self-start md:sticky md:top-0 transition-all duration-700 ease-out ${visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}>
            <div className="relative mx-auto md:mx-0 w-fit">
              {/* Gold metallic frame */}
              <div className="p-[3px] rounded-xl bg-gradient-to-br from-[#FFD700] via-[#C79600] to-[#FFD700] shadow-[0_0_30px_rgba(255,215,0,0.15)]">
                <div className="p-[2px] rounded-[10px] bg-[#001030]">
                  <div className="relative w-60 h-[20rem] md:w-[17rem] md:h-[22rem] rounded-[9px] bg-[#001845] overflow-hidden flex items-center justify-center">
                    {commandantImageUrl ? (
                      <img
                        src={commandantImageUrl}
                        alt={name}
                        className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-3">
                        <img src={ndcCrest} alt="NDC Crest" className="h-16 w-16 object-contain opacity-40" />
                        <span className="text-[10px] uppercase tracking-[0.2em] text-white/30 font-semibold">Official Portrait</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Tenure pill badge below portrait */}
            <div className="flex justify-center md:justify-start mt-5">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/[0.06] backdrop-blur-sm border border-[#FFD700]/25 shadow-sm">
                <div className="h-1.5 w-1.5 rounded-full bg-[#FFD700]" />
                <span className="text-xs font-bold tracking-[0.18em] uppercase text-[#FFD700]/90">{tenureLabel}</span>
              </div>
            </div>
          </div>

          {/* Identity and content column — scrollable */}
          <div
            className={`text-center md:text-left transition-all duration-700 ease-out delay-150 md:overflow-y-auto md:min-h-0 md:pr-3 scroll-smooth ${visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"}`}
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,215,0,0.2) transparent' }}
          >
            {/* Status label */}
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-[#FFD700]/40" />
              <span className="text-[10px] uppercase tracking-[0.3em] font-bold px-3 py-1 rounded-sm bg-white/[0.06] text-[#FFD700]/80 border border-[#FFD700]/15">
                {isCurrent ? "Current Commandant" : "Past Commandant"}
              </span>
              <div className="h-px w-8 bg-gradient-to-l from-transparent to-[#FFD700]/40" />
            </div>

            {/* Name */}
            <h2 className="text-3xl sm:text-4xl md:text-[3.4rem] font-extrabold leading-[1.1] text-white uppercase tracking-tight mb-3">
              {name}
            </h2>

            {/* Credentials / title */}
            <p className="text-sm sm:text-base md:text-lg font-bold tracking-[0.1em] text-[#FF4444] italic border-l-4 border-[#FFD700]/60 pl-4 mb-2 inline-block">
              {titleText}
            </p>

            {/* Decoration badge */}
            {decorationText && (
              <div className="mt-3 mb-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#FFD700]/10 to-[#C79600]/10 border border-[#FFD700]/30">
                  <Star className="h-3.5 w-3.5 text-[#FFD700]" />
                  <span className="text-xs font-bold tracking-[0.12em] text-[#FFD700] uppercase">{decorationText}</span>
                </div>
              </div>
            )}

            {/* Gold accent separator */}
            <div className="my-5 h-px w-full bg-gradient-to-r from-[#FFD700]/40 via-[#FFD700]/15 to-transparent" />

            {/* Content sections */}
            <div className={`space-y-4 transition-all duration-700 ease-out delay-300 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
              {/* Executive Summary */}
              {summaryText && (
                <section className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-5 py-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD700]/70 font-semibold flex items-center gap-2 mb-2">
                    <span className="inline-block h-3 w-0.5 bg-[#FFD700]/50 rounded-full" />Executive Summary
                  </p>
                  <p className="text-white/80 text-sm leading-relaxed">{summaryText}</p>
                </section>
              )}

              {yearsExperienceLabel && (
                <div className="inline-flex items-center rounded-full border border-[#FFD700]/20 bg-[#FFD700]/[0.06] px-4 py-2">
                  <p className="text-xs font-semibold tracking-wide text-[#FFD700]/90">{yearsExperienceLabel}</p>
                </div>
              )}

              {/* Full Biography */}
              <section className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-5 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD700]/70 font-semibold flex items-center gap-2 mb-2">
                  <span className="inline-block h-3 w-0.5 bg-[#FFD700]/50 rounded-full" />Full Biography
                </p>
                <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">{fullBiography}</p>
              </section>

              {/* Education & Training */}
              {(educationItems.length > 0 || trainingItems.length > 0) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {educationItems.length > 0 && (
                    <section className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-5 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD700]/70 font-semibold flex items-center gap-2 mb-2">
                        <span className="inline-block h-3 w-0.5 bg-[#FFD700]/50 rounded-full" />Education
                      </p>
                      <ul className="mt-1 space-y-2 text-sm text-white/70">
                        {educationItems.map((item, index) => (
                          <li key={`edu-${index}`} className="leading-relaxed pl-3 border-l border-[#FFD700]/20">• {item}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                  {trainingItems.length > 0 && (
                    <section className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-5 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD700]/70 font-semibold flex items-center gap-2 mb-2">
                        <span className="inline-block h-3 w-0.5 bg-[#FFD700]/50 rounded-full" />Training
                      </p>
                      <ul className="mt-1 space-y-2 text-sm text-white/70">
                        {trainingItems.map((item, index) => (
                          <li key={`training-${index}`} className="leading-relaxed pl-3 border-l border-[#FFD700]/20">• {item}</li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              )}

              {/* Key Past Appointments */}
              {appointmentItems.length > 0 && (
                <section className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-5 py-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD700]/70 font-semibold flex items-center gap-2 mb-2">
                    <span className="inline-block h-3 w-0.5 bg-[#FFD700]/50 rounded-full" />Key Past Appointments
                  </p>
                  <ul className="mt-1 space-y-2 text-sm text-white/70">
                    {appointmentItems.map((item, index) => (
                      <li key={`appointment-${index}`} className="leading-relaxed pl-3 border-l border-[#FFD700]/20">• {item}</li>
                    ))}
                  </ul>
                </section>
              )}

              {/* Honours */}
              {honourItems.length > 0 && (
                <section className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-5 py-4">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD700]/70 font-semibold flex items-center gap-2 mb-2">
                    <span className="inline-block h-3 w-0.5 bg-[#FFD700]/50 rounded-full" />Honours and Decorations
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {honourItems.map((item, index) => (
                      <span key={`honour-${index}`} className="px-3 py-1.5 rounded-lg border border-[#FFD700]/25 bg-[#FFD700]/[0.06] text-xs font-semibold text-[#FFD700] transition-colors duration-200 hover:bg-[#FFD700]/[0.12]">
                        {item}
                      </span>
                    ))}
                  </div>
                </section>
              )}

              {/* Family Note & Impact Statement */}
              {(familyNote || impactStatement) && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {familyNote && (
                    <section className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-5 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD700]/70 font-semibold flex items-center gap-2 mb-2">
                        <span className="inline-block h-3 w-0.5 bg-[#FFD700]/50 rounded-full" />Family Note
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-white/70">{familyNote}</p>
                    </section>
                  )}
                  {impactStatement && (
                    <section className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm px-5 py-4">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD700]/70 font-semibold flex items-center gap-2 mb-2">
                        <span className="inline-block h-3 w-0.5 bg-[#FFD700]/50 rounded-full" />Strategic Impact
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-white/70">{impactStatement}</p>
                    </section>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom defence colors strip */}
        <div className="absolute bottom-0 inset-x-0 h-[6px] flex z-30">
          <div className="flex-1 bg-[#002060]" />
          <div className="flex-1 bg-[#FF0000]" />
          <div className="flex-1 bg-[#00B0F0]" />
        </div>
      </section>
    );
  }

  /* ─── Compact / Home card (unchanged) ─── */
  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_70px_rgba(0,0,0,0.15)] ${isCurrent ? "commandant-hero-current" : ""} mb-0 transition-all duration-500 group`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:42px_42px]" />
      </div>

      <div className="relative grid items-center gap-6 md:gap-8 p-5 md:p-7 grid-cols-1 md:grid-cols-[220px_1fr]">
        <div
          className={`transition-all duration-700 ease-out ${
            visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
          }`}
        >
          <div className="relative mx-auto md:mx-0 w-fit">
            <div
              className={`relative rounded-lg bg-muted/70 border border-primary/45 flex items-center justify-center overflow-hidden z-10 shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_12px_rgba(0,0,0,0.1)] group-hover:shadow-[0_18px_50px_rgba(0,0,0,0.2),0_6px_16px_rgba(0,0,0,0.12)] transition-shadow duration-500 ${isCurrent ? "commandant-portrait-frame" : ""} w-40 h-52 sm:w-44 sm:h-56 md:w-48 md:h-60`}
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
          <div className="inline-flex items-center justify-center md:justify-start gap-3 mb-5">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#002060]/30" />
            <span className="text-[10px] uppercase tracking-[0.28em] font-bold px-2 py-0.5 rounded-sm text-[#002060] bg-[#002060]/5">
              {isCurrent ? "Current Commandant" : "Past Commandant"}
            </span>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#002060]/30" />
          </div>

          <h2 className="text-2xl md:text-3xl font-bold mb-2 leading-tight text-[#002060] uppercase tracking-tight">
            {name}
          </h2>

          <p className="text-xs md:text-sm mb-3 text-[#FF0000] font-bold tracking-[0.08em] border-l-4 border-[#FF0000] pl-3 italic">
            {titleText}
          </p>

          <div className="relative">
            <p
              className="text-sm md:text-[15px] text-slate-700 font-medium leading-relaxed max-w-3xl transition-all duration-700 ease-out delay-300"
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 10,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                textOverflow: "ellipsis",
                wordWrap: "break-word",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(1rem)",
              }}
            >
              {summaryText}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
