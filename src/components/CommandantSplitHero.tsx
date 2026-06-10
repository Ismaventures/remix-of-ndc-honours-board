import { Commandant } from "@/types/domain";
import ndcCrest from "/images/ndc-crest.png";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
import { getCommandantDisplayTitle } from "@/lib/utils";
import { Shield } from "lucide-react";

interface CommandantSplitHeroProps {
  commandant?: Commandant;
  isAutoDisplay?: boolean;
}

export function CommandantSplitHero({ commandant, isAutoDisplay = false }: CommandantSplitHeroProps) {
  const name = commandant?.name ?? "No commandant record available";
  const titleText = getCommandantDisplayTitle(commandant);
  const isCurrent = commandant?.isCurrent ?? false;
  const commandantImageUrl = useResolvedMediaUrl(commandant?.imageUrl);

  return (
    <section className="relative w-full h-full flex flex-col overflow-hidden bg-white text-slate-900">
      {/* Top Defence Colors Strip */}
      <div className="h-[8px] flex z-30 shrink-0">
        <div className="flex-1 bg-[#002060]" title="Navy" />
        <div className="flex-1 bg-[#FF0000]" title="Army" />
        <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
      </div>

      {/* Main Content Container - Two Column Layout */}
      <div className="relative flex flex-1 min-h-0 z-10">
        
        {/* Left Side: Scrollable Biography Content */}
        <div className="flex-1 overflow-y-auto pr-6 pl-8 py-8 flex flex-col items-center scrollbar-hide">
          {/* Identity Plate Style Header */}
          <div className="flex items-center gap-4 mb-4 w-full justify-center">
            <div className="h-[1px] w-20 bg-slate-300" />
            <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#002060] font-bold">
              {isCurrent ? "CURRENT COMMANDANT" : "PAST COMMANDANT"}
            </span>
            <div className="h-[1px] w-20 bg-slate-300" />
          </div>

          {/* Name */}
          <h2 className="text-2xl md:text-4xl font-serif font-extrabold mb-1 text-[#002060] uppercase tracking-wide text-center">
            {name}
          </h2>

          {/* Rank */}
          {commandant?.rank && (
            <p className="text-xs md:text-sm text-slate-500 font-bold mb-3 uppercase tracking-widest text-center">
              {commandant.rank}
            </p>
          )}

          {/* Red Credentials Line */}
          {(() => {
            const displayTitle = getCommandantDisplayTitle(commandant, "");
            return displayTitle ? (
              <div className="flex items-center gap-2.5 mb-6 justify-center">
                <span className="text-[#FF0000] text-xl font-extrabold font-serif">|</span>
                <p className="text-[#FF0000] text-xs sm:text-sm md:text-base font-extrabold italic tracking-wider uppercase">
                  {displayTitle}
                </p>
              </div>
            ) : null;
          })()}

          {/* NDC Crest */}
          <img src={ndcCrest} alt="NDC Logo" className="h-16 md:h-20 w-auto object-contain filter drop-shadow-sm mb-6" />

          {/* Full Biography Section */}
          {commandant?.biographyFull && (
            <div className="bg-[#f8fafc] border border-slate-100 p-6 sm:p-8 rounded-xl w-full max-w-3xl shadow-sm mb-4">
              <h4 className="text-xs font-serif font-extrabold text-[#002060] uppercase tracking-[0.2em] mb-4 pb-2 border-b border-slate-200/60">
                FULL BIOGRAPHY
              </h4>
              <p className="text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
                {commandant.biographyFull}
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Full-Height Portrait */}
        <div className="w-[35%] shrink-0 bg-slate-900 flex h-full relative p-0 overflow-hidden">
          {/* Vertical Defence Strip on the left side */}
          <div className="w-[8px] h-full flex flex-col shrink-0">
            <div className="flex-1 bg-[#002060]" title="Navy" />
            <div className="flex-1 bg-[#FF0000]" title="Army" />
            <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
          </div>

          {/* Image container */}
          <div className="flex-1 h-full relative overflow-hidden flex items-center justify-center">
            {commandantImageUrl ? (
              <img
                src={commandantImageUrl}
                alt={name}
                className="h-full w-full object-cover object-top transition-transform duration-700 ease-out"
                loading="eager"
              />
            ) : (
              <Shield className="h-20 w-20 text-slate-500 opacity-30" />
            )}
          </div>
        </div>
      </div>

      {/* Bottom Defence Colors Strip */}
      <div className="h-[8px] flex z-30 shrink-0">
        <div className="flex-1 bg-[#002060]" />
        <div className="flex-1 bg-[#FF0000]" />
        <div className="flex-1 bg-[#00B0F0]" />
      </div>
    </section>
  );
}

