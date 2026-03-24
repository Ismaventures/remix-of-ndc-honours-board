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

  if (isAutoDisplay) {
    return (
      <section className="relative w-full aspect-[16/9] flex flex-col items-center justify-center overflow-hidden bg-[#001D3D] text-white">
        {/* Background elements */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[#001D3D]" />
          <div className="absolute inset-0 opacity-[0.05] bg-[linear-gradient(90deg,white_1px,transparent_1px),linear-gradient(white_1px,transparent_1px)] bg-[size:50px_50px]" />
          <div className="absolute top-0 inset-x-0 h-1 bg-[#2C5282] opacity-50" />
          <div className="absolute bottom-0 inset-x-0 h-1 bg-[#2C5282] opacity-50" />
        </div>

        {/* NDC Logos in corners */}
        <div className="absolute top-4 left-6 z-20">
          <img src={ndcCrest} alt="NDC Logo" className="h-10 w-10 object-contain drop-shadow-md" />
        </div>
        <div className="absolute top-4 right-6 z-20">
          <img src={ndcCrest} alt="NDC Logo" className="h-10 w-10 object-contain drop-shadow-md" />
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 flex flex-col items-center w-full max-w-4xl px-8">
          {/* Portrait with triple border */}
          <div className="relative mb-6">
            <div className="p-1 bg-[#FFD700] rounded-sm shadow-2xl">
              <div className="p-1 bg-[#001D3D] rounded-sm">
                <div className="p-0.5 bg-[#FFD700] rounded-sm">
                  <div className="w-[300px] h-[380px] bg-slate-800 overflow-hidden relative">
                    {commandantImageUrl ? (
                      <img
                        src={commandantImageUrl}
                        alt={name}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-primary/40 bg-slate-900">
                        <Shield className="h-20 w-20" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Identity Plate */}
          <div className="w-full relative">
            {/* Top Red Bar */}
            <div className="h-1.5 w-full bg-[#E53E3E]" />
            {/* Main Blue Info Bar */}
            <div className="bg-[#1A365D] w-full py-4 px-6 border-y-2 border-[#4A5568] flex flex-col items-center justify-center text-center shadow-lg">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-[#FFD700] uppercase mb-1">
                {name}
              </h2>
              <p className="text-lg md:text-xl font-bold text-white tracking-wide mb-1">
                Commandant
              </p>
              <p className="text-lg md:text-xl font-bold text-[#FFD700] tracking-wide">
                National Defence College
              </p>
            </div>
            {/* Bottom Red Bar */}
            <div className="h-1.5 w-full bg-[#E53E3E]" />
            
            {/* Sequence Number Indicator (Bottom Right) */}
            <div className="absolute -bottom-4 right-0 transform translate-y-full">
               <div className="bg-white text-black text-[10px] font-bold px-2 py-0.5 border border-slate-300">
                  {commandant?.id ?? "0"}
               </div>
            </div>
          </div>
        </div>
        
        {/* Subtle Side Accents */}
        <div className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-transparent via-[#FFD700]/30 to-transparent" />
        <div className="absolute inset-y-0 right-0 w-1 bg-gradient-to-b from-transparent via-[#FFD700]/30 to-transparent" />
      </section>
    );
  }

  return (
    <section
      className={`relative overflow-hidden rounded-2xl border border-primary/35 bg-gradient-to-br from-[#071427]/95 via-card/95 to-[#0b1f3a]/95 backdrop-blur-md shadow-[0_24px_70px_rgba(0,0,0,0.34)] ${isCurrent ? "commandant-hero-current" : ""} ${isCompact ? "mb-0" : "mb-8"} transition-all duration-500 group`}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {isCurrent && (
          <>
            <div className="absolute inset-0 command-sweep-light" />
            <div className="absolute top-0 left-0 h-[1px] w-full bg-gradient-to-r from-transparent via-primary/90 to-transparent animate-command-topline" />
          </>
        )}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_right,hsl(var(--primary)/0.12)_0%,transparent_60%)]" />
        <div className="absolute inset-0 opacity-[0.14] bg-[linear-gradient(90deg,hsl(var(--foreground)/0.08)_1px,transparent_1px),linear-gradient(hsl(var(--foreground)/0.08)_1px,transparent_1px)] bg-[size:42px_42px]" />
        <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-white/[0.06] to-transparent" />
      </div>

      <div
        className={`relative grid items-center ${isCompact ? "gap-6 md:gap-8 p-5 md:p-7 grid-cols-1 md:grid-cols-[240px_1fr]" : "gap-8 md:gap-10 p-7 md:p-10 grid-cols-1 md:grid-cols-[280px_1fr]"}`}
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
                  className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
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
            <div className="absolute -inset-2 rounded-xl border border-primary/20 pointer-events-none" />
          </div>
        </div>

        <div
          className={`text-center md:text-left transition-all duration-700 ease-out delay-150 ${
            visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
          }`}
        >
          <div className="inline-flex items-center justify-center md:justify-start gap-2.5 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/25 mb-4 backdrop-blur">
            <Star className="h-3.5 w-3.5 text-primary fill-primary/30" />
            <span className="text-[10px] uppercase tracking-[0.22em] text-primary/90 font-semibold">
              {isCurrent ? "Current Commandant" : "Past Commandant"}
            </span>
            <Star className="h-3.5 w-3.5 text-primary fill-primary/30" />
          </div>

          <h2
            className={`${isCompact ? "text-3xl md:text-[2.4rem]" : "text-4xl md:text-[3rem]"} font-bold font-serif mb-2 leading-tight text-white`}
          >
            {name}
          </h2>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-4 text-[11px] uppercase tracking-[0.18em] text-primary/90">
            <span>{tenureLabel}</span>
          </div>

          <div className="h-px w-full max-w-xl mx-auto md:mx-0 mb-4 bg-gradient-to-r from-primary/70 via-primary/35 to-transparent" />

          <p
            className={`${isCompact ? "text-sm md:text-base mb-3" : "text-base md:text-lg mb-4"} text-primary/95 font-semibold tracking-[0.05em] uppercase`}
          >
            {titleText}
          </p>

          <p
            className={`${isCompact ? "text-sm md:text-[15px]" : "text-sm md:text-base"} text-muted-foreground/95 leading-relaxed max-w-3xl transition-all duration-700 ease-out delay-300 font-medium ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={
              compactDescription
                ? {
                    display: "-webkit-box",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 3,
                    overflow: "hidden",
                  }
                : undefined
            }
          >
            {description}
          </p>
        </div>
      </div>
    </section>
  );
}
