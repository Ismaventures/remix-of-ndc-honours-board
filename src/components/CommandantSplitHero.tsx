import { Shield } from "lucide-react";
import { Commandant } from "@/types/domain";
import ndcCrest from "/images/ndc-crest.png";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
import { useThemeMode } from "@/hooks/useThemeMode";

interface CommandantSplitHeroProps {
  commandant?: Commandant;
  isAutoDisplay?: boolean;
}

export function CommandantSplitHero({ commandant, isAutoDisplay = false }: CommandantSplitHeroProps) {
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");
  const name = commandant?.name ?? "No commandant record available";
  const titleText = commandant?.title ?? "Commandant record pending database data";
  const description = commandant?.description ?? "No commandant biography is currently available from the database.";
  const isCurrent = commandant?.isCurrent ?? false;
  const commandantImageUrl = useResolvedMediaUrl(commandant?.imageUrl);
  const tenureLabel = commandant
    ? `${commandant.tenureStart}${commandant.tenureEnd ? ` - ${commandant.tenureEnd}` : " - Present"}`
    : "Tenure unavailable";

  return (
    <section className={`relative w-full h-full min-h-[320px] flex flex-col items-center justify-center overflow-hidden border ${isLightMode ? "bg-white text-slate-900 border-slate-200" : "bg-background text-foreground border-border"}`}>
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
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3vw_3vw]" />
        )}
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
                  <div className={`relative overflow-hidden shadow-inner flex items-center justify-center h-[clamp(240px,55dvh,640px)] w-auto aspect-[4/5] max-h-[65dvh] ${isLightMode ? "bg-slate-100" : "bg-muted/30"}`}>
                    {commandantImageUrl ? (
                      <div className={`w-full h-full p-[max(16px,2.5vh)] ${isLightMode ? "bg-slate-100" : "bg-muted/20"}`}>
                        <img
                          src={commandantImageUrl}
                          alt={name}
                          className="w-full h-full object-contain object-center transition-transform duration-700 ease-out hover:scale-105"
                          loading="eager"
                        />
                      </div>
                    ) : (
                      <Shield className={`h-24 w-24 opacity-40 ${isLightMode ? "text-slate-300" : "text-slate-500"}`} />
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
            <div className={`h-px w-[clamp(20px,3vw,48px)] ${isLightMode ? "bg-[#002060]/40" : "bg-blue-400/30"}`} />
            <span className={`text-[clamp(0.6rem,1.8vh,1.2rem)] uppercase tracking-[0.25em] font-bold ${isLightMode ? "text-[#002060]" : "text-blue-300"}`}>
              {isCurrent ? "Current Commandant" : "Past Commandant"}
            </span>
            <div className={`h-px w-[clamp(20px,3vw,48px)] ${isLightMode ? "bg-[#002060]/40" : "bg-blue-400/30"}`} />
          </div>

          {/* Name */}
          <h2 className={`text-[clamp(2rem,5.5vh,4.2rem)] font-bold mb-[1vh] leading-tight uppercase tracking-tight ${isLightMode ? "text-[#002060]" : "text-white drop-shadow-md"}`}>
            {name}
          </h2>

          {/* Title */}
          <p className={`text-[clamp(1rem,2.8vh,2rem)] font-bold tracking-[0.1em] uppercase border-l-[clamp(3px,0.4vw,6px)] pl-[clamp(10px,1.5vw,24px)] mb-[3vh] italic ${isLightMode ? "text-[#FF0000] border-[#FF0000]" : "text-red-400 border-red-500/80"}`}>
            {titleText}
          </p>

          {/* Tenure Tag */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-[3.5vh]">
             <span className={`px-[clamp(10px,1vw,20px)] py-[clamp(4px,0.5vh,10px)] text-[clamp(0.7rem,1.8vh,1.4rem)] font-bold uppercase tracking-[0.2em] shadow-md ${isLightMode ? "bg-[#002060] text-white border border-[#FFD700]/20" : "bg-blue-900/40 text-blue-100 border border-blue-500/30"}`}>
                {tenureLabel}
             </span>
          </div>

          {/* Description */}
          <div className="relative w-full max-w-[45vw]">
            <p className={`text-[clamp(0.85rem,2.2vh,1.6rem)] leading-[1.6] max-h-[25vh] overflow-hidden ${isLightMode ? "text-slate-700 font-medium" : "text-slate-300"}`}>
              {description}
            </p>
          </div>
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
