import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { Commandant } from "@/types/domain";
import ndcCrest from "/images/ndc-crest.png";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
import { getCommandantDisplayTitle } from "@/lib/utils";

interface CommandantSplitHeroProps {
  commandant?: Commandant;
  isAutoDisplay?: boolean;
}

export function CommandantSplitHero({ commandant, isAutoDisplay = false }: CommandantSplitHeroProps) {
  const name = commandant?.name ?? "No commandant record available";
  const titleText = getCommandantDisplayTitle(commandant);
  const description = commandant?.description ?? "No commandant biography is currently available from the database.";
  const isCurrent = commandant?.isCurrent ?? false;
  const commandantImageUrl = useResolvedMediaUrl(commandant?.imageUrl);
  const tenureLabel = commandant
    ? `${commandant.tenureStart}${commandant.tenureEnd ? ` - ${commandant.tenureEnd}` : " - Present"}`
    : "Tenure unavailable";

  return (
    <section className="relative w-full h-full min-h-[320px] flex flex-col items-center justify-center overflow-hidden bg-white text-slate-900 border border-slate-200">
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
        <img src={ndcCrest} alt="NDC Logo" className="h-[clamp(24px,6vh,64px)] w-auto object-contain filter drop-shadow-sm" />
      </div>
      <div className="absolute top-[4.5%] right-[3.5%] z-20">
        <img src={ndcCrest} alt="NDC Logo" className="h-[clamp(24px,6vh,64px)] w-auto object-contain filter drop-shadow-sm" />
      </div>

      {/* Main Content Container - SPLIT LAYOUT using Homepage Design Approach */}
      <div className="relative z-10 flex flex-col md:flex-row items-center justify-center w-full h-full max-w-[min(96vw,1400px)] mx-auto py-[max(10px,2vh)] px-[4vw] gap-[4vw] md:gap-[6vw]">
        
        {/* Left Side: Portrait */}
        <div className="flex justify-center items-center">
          <div className="relative w-fit flex justify-center items-center flex-shrink-0">
            {/* Professional Framed Portrait mirroring homepage */}
            <div className="p-[max(4px,0.4vh)] bg-[#FFD700] shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
              <div className="p-[max(4px,0.4vh)] bg-white">
                <div className="p-[max(2px,0.2vh)] bg-[#FFD700]">
                  <div className="relative bg-slate-100 overflow-hidden shadow-inner flex items-center justify-center h-[clamp(240px,55dvh,640px)] w-auto aspect-[4/5] max-h-[65dvh]">
                    {commandantImageUrl ? (
                      <div className="w-full h-full p-[max(16px,2.5vh)] bg-slate-100">
                        <img
                          src={commandantImageUrl}
                          alt={name}
                          className="w-full h-full object-contain object-center transition-transform duration-700 ease-out hover:scale-105"
                          loading="eager"
                        />
                      </div>
                    ) : (
                      <Shield className="h-24 w-24 text-slate-300 opacity-40" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Information / Writeup mirroring homepage */}
        <div className="flex-1 flex flex-col justify-center items-center md:items-start text-center md:text-left py-[2vh]">
          
          {/* Identity Plate Style Header */}
          <div className="inline-flex items-center justify-center md:justify-start gap-4 mb-[2vh]">
            <div className="h-px w-[clamp(20px,3vw,48px)] bg-[#002060]/40" />
            <span className="text-[clamp(0.6rem,1.8vh,1.2rem)] uppercase tracking-[0.25em] text-[#002060] font-bold">
              {isCurrent ? "Current Commandant" : "Past Commandant"}
            </span>
            <div className="h-px w-[clamp(20px,3vw,48px)] bg-[#002060]/40" />
          </div>

          {/* Name */}
          <h2 className="text-[clamp(2rem,5.5vh,4.2rem)] font-bold mb-[1vh] leading-tight text-[#002060] uppercase tracking-tight">
            {name}
          </h2>

          {/* Title */}
          <p className="text-[clamp(1rem,2.8vh,2rem)] text-[#FF0000] font-bold tracking-[0.1em] border-l-[clamp(3px,0.4vw,6px)] border-[#FF0000] pl-[clamp(10px,1.5vw,24px)] mb-[3vh] italic">
            {titleText}
          </p>

          {/* Tenure Tag */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-[3.5vh]">
             <span className="px-[clamp(10px,1vw,20px)] py-[clamp(4px,0.5vh,10px)] bg-[#002060] text-white text-[clamp(0.7rem,1.8vh,1.4rem)] font-bold uppercase tracking-[0.2em] shadow-md border border-[#FFD700]/20">
                {tenureLabel}
             </span>
          </div>

          {/* Description */}
          <div className="relative w-full max-w-[45vw]">
            <p className="text-[clamp(0.85rem,2.2vh,1.6rem)] text-slate-700 leading-[1.6] font-medium max-h-[25vh] overflow-hidden">
              {description}
            </p>
          </div>
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
