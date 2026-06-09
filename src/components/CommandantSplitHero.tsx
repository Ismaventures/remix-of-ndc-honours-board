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
        <div className="flex-1 overflow-y-auto pr-4 pl-6 py-6 border-r border-slate-200 flex flex-col items-center">
          {/* Identity Plate Style Header */}
          <div className="flex items-center gap-3 mb-4 w-full justify-center">
            <div className="h-px w-10 bg-[#002060]/40" />
            <span className="text-xs uppercase tracking-[0.25em] text-[#002060] font-bold">
              {isCurrent ? "Current Commandant" : "Past Commandant"}
            </span>
            <div className="h-px w-10 bg-[#002060]/40" />
          </div>

          {/* Name */}
          <h2 className="text-3xl font-bold mb-2 leading-tight text-[#002060] uppercase tracking-tight text-center">
            {name}
          </h2>

          {/* Rank and Post-Nominals */}
          {commandant?.rank && (
            <p className="text-base text-slate-600 font-semibold mb-2 uppercase tracking-wide text-center">
              {commandant.rank}
              {commandant.postNominals && ` ${commandant.postNominals}`}
            </p>
          )}

          {/* Title */}
          <p className="text-lg text-[#FF0000] font-bold tracking-[0.1em] border-l-4 border-[#FF0000] pl-3 mb-4 italic text-center">
            {titleText}
          </p>

          {/* NDC Crest */}
          <img src={ndcCrest} alt="NDC Logo" className="h-16 w-auto object-contain filter drop-shadow-sm mb-4" />

          {/* Full Biography Section */}
          {commandant?.biographyFull && (
            <div className="bg-slate-50 p-3 rounded-lg border-l-4 border-slate-500 w-full">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">Full Biography</h4>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                {commandant.biographyFull}
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Full-Height Portrait */}
        <div className="w-[35%] shrink-0 bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center overflow-hidden border-l border-slate-200 relative p-4">
          {commandantImageUrl ? (
            <img
              src={commandantImageUrl}
              alt={name}
              className="h-full w-full object-contain transition-transform duration-700 ease-out"
              loading="eager"
            />
          ) : (
            <Shield className="h-20 w-20 text-slate-300 opacity-40" />
          )}
        </div>
      </div>

      {/* Bottom Defence Colors Strip */}
      <div className="h-[8px] flex z-30 shrink-0">
        <div className="flex-1 bg-[#002060]" title="Navy" />
        <div className="flex-1 bg-[#FF0000]" title="Army" />
        <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
      </div>
    </section>
  );
}

