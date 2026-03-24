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
      <section className="relative w-full aspect-video flex flex-col items-center justify-center overflow-hidden bg-white text-slate-900 border border-slate-200">
        {/* Top Defence Colors Strip */}
        <div className="absolute top-0 inset-x-0 h-[3%] min-h-[10px] flex z-30">
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
        <div className="absolute top-[6%] left-[4%] z-20">
          <img src={ndcCrest} alt="NDC Logo" className="h-[clamp(32px,8vh,64px)] w-auto object-contain filter drop-shadow-sm" />
        </div>
        <div className="absolute top-[6%] right-[4%] z-20">
          <img src={ndcCrest} alt="NDC Logo" className="h-[clamp(32px,8vh,64px)] w-auto object-contain filter drop-shadow-sm" />
        </div>

        {/* Main Content Container */}
        <div className="relative z-10 flex flex-col items-center w-full h-full max-w-[95%] mx-auto justify-center py-[2vh] gap-[1vh] md:gap-[2vh]">
          {/* Portrait with Yellow/Gold frame */}
          <div className="relative w-full flex justify-center items-center flex-shrink min-h-0 overflow-hidden">
            <div className="p-[0.3vh] bg-[#FFD700] shadow-2xl transition-transform duration-500 max-h-[55vh] md:max-h-[60vh]">
              <div className="p-[0.3vh] bg-white">
                <div className="p-[0.2vh] bg-[#FFD700]">
                  <div className="relative aspect-[4/5] h-[45vh] sm:h-[50vh] md:h-[55vh] lg:h-[58vh] max-h-full w-auto bg-slate-100 overflow-hidden shadow-inner">
                    {commandantImageUrl ? (
                      <img
                        src={commandantImageUrl}
                        alt={name}
                        className="w-full h-full object-cover object-top"
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
          <div className="w-full relative flex-shrink-0 mt-[1vh] md:mt-[2vh]">
            {/* Top Red Bar */}
            <div className="h-[0.6vh] min-h-[2px] w-full bg-[#FF0000]" />
            {/* Main Info Bar */}
            <div className="bg-[#002060] w-full py-[1.5vh] md:py-[2.5vh] px-[4vw] flex flex-col items-center justify-center text-center shadow-2xl">
              <div className="flex flex-col items-center gap-[0.3vh] md:gap-[0.5vh] mb-[0.5vh] md:mb-[1vh]">
                <h2 className="text-[clamp(1.1rem,4.5vh,4.5rem)] font-bold tracking-tight text-[#FFD700] uppercase drop-shadow-md leading-tight">
                  {name}
                </h2>
                <span className="text-[clamp(0.5rem,2.2vh,1.8rem)] font-medium text-white/95 tracking-widest uppercase italic border-t border-white/10 pt-[0.3vh] mt-[0.3vh]">
                  {titleText}
                </span>
              </div>
              
              <div className="flex flex-col items-center gap-[0.1vh] md:gap-[0.2vh]">
                <p className="text-[clamp(0.7rem,2.4vh,2.2rem)] font-bold text-white tracking-[0.25em] uppercase">
                  {isCurrent ? "Current Commandant" : "Past Commandant"}
                </p>
                <div className="flex flex-col items-center gap-1 md:gap-2 mt-1 md:mt-2">
                  <p className="text-[clamp(0.6rem,2vh,1.6rem)] font-semibold text-[#FFD700] tracking-[0.15em] uppercase bg-white/5 px-3 py-0.5 md:px-4 md:py-1 rounded">
                    {tenureLabel}
                  </p>
                </div>
                <p className="text-[clamp(0.7rem,2.4vh,2.2rem)] font-bold text-[#FFD700] tracking-[0.25em] uppercase mt-2 md:mt-4">
                  National Defence College
                </p>
              </div>
            </div>
            {/* Bottom Red Bar */}
            <div className="h-[0.6vh] min-h-[2px] w-full bg-[#FF0000]" />
          </div>
        </div>
            
        {/* Sequence Number Indicator */}
        <div className="absolute bottom-[2%] right-[4vw] z-40">
           <div className="bg-white text-black text-[clamp(7px,1.2vh,14px)] font-bold px-[1.5vw] py-[0.3vh] border border-slate-400 shadow-md">
              c-{commandant?.id ?? "0"}
           </div>
        </div>

        {/* Bottom Defence Colors Strip */}
        <div className="absolute bottom-0 inset-x-0 h-[2.5%] min-h-[8px] flex z-30">
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
      {/* Top Defence Colors Strip */}
      <div className="absolute top-0 inset-x-0 h-[8px] flex z-30">
        <div className="flex-1 bg-[#002060]" title="Navy" />
        <div className="flex-1 bg-[#FF0000]" title="Army" />
        <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
      </div>

      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.02)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.02)_1px,transparent_1px)] bg-[size:42px_42px]" />
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
            {/* Professional Framed Portrait */}
            <div className="p-1 bg-[#FFD700] shadow-2xl transition-transform duration-500 group-hover:scale-[1.02]">
              <div className="p-1 bg-white">
                <div className="p-0.5 bg-[#FFD700]">
                  <div 
                    className={`relative bg-slate-100 overflow-hidden shadow-inner flex items-center justify-center ${isCompact ? "w-40 h-50 md:w-44 md:h-55" : "w-48 h-60 md:w-52 md:h-65"}`}
                  >
                    {commandantImageUrl ? (
                      <img
                        src={commandantImageUrl}
                        alt={name}
                        className="w-full h-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105"
                      />
                    ) : (
                      <Shield className="h-14 w-14 text-slate-300 opacity-40" />
                    )}
                  </div>
                </div>
              </div>
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
            <div className="h-px w-8 bg-[#002060]/30" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-[#002060] font-bold">
              {isCurrent ? "Current Commandant" : "Past Commandant"}
            </span>
            <div className="h-px w-8 bg-[#002060]/30" />
          </div>

          <h2
            className={`${isCompact ? "text-3xl md:text-[2.4rem]" : "text-4xl md:text-[3.2rem]"} font-bold mb-2 leading-tight text-[#002060] uppercase tracking-tight`}
          >
            {name}
          </h2>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 mb-5">
             <span className="px-3 py-1 bg-[#002060] text-white text-[11px] font-bold uppercase tracking-[0.2em]">
                {tenureLabel}
             </span>
          </div>

          <p
            className={`${isCompact ? "text-sm md:text-base mb-4" : "text-base md:text-xl mb-6"} text-[#FF0000] font-bold tracking-[0.1em] uppercase border-l-4 border-[#FF0000] pl-4 italic`}
          >
            {titleText}
          </p>

          <div className="relative">
            <p
              className={`${isCompact ? "text-sm md:text-[15px]" : "text-sm md:text-base"} text-slate-700 leading-relaxed max-w-3xl transition-all duration-700 ease-out delay-300 font-medium ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
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
