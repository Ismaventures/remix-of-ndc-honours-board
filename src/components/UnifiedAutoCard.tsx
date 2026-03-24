import { Shield } from "lucide-react";
import { Personnel, DistinguishedVisit } from "@/types/domain";
import ndcCrest from "/images/ndc-crest.png";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";

interface UnifiedAutoCardProps {
  type: "personnel" | "visit";
  data: Personnel | DistinguishedVisit;
  id?: string;
}

export function UnifiedAutoCard({ type, data, id }: UnifiedAutoCardProps) {
  const imageUrl = useResolvedMediaUrl(data.imageUrl);

  // Unified theme colors
  const NAVY = "#002060";
  const ARMY = "#FF0000";
  const AIRFORCE = "#00B0F0";
  const GOLD = "#FFD700";

  const isPersonnel = type === "personnel";
  const person = data as Personnel;
  const visit = data as DistinguishedVisit;

  const mainName = isPersonnel ? `${person.rank} ${person.name}` : visit.name;
  const subTitle = isPersonnel ? person.category : "Distinguished Visit";
  const tertiaryTitle = isPersonnel 
    ? `${person.service} • ${person.periodStart} - ${person.periodEnd}`
    : `${visit.country} • ${visit.date}`;
  
  const citation = isPersonnel ? person.citation : visit.description;

  return (
    <section className="relative w-full aspect-video flex flex-col items-center justify-center overflow-hidden bg-white text-slate-900 border border-slate-200">
      {/* Top Defence Colors Strip */}
      <div className="absolute top-0 inset-x-0 h-[3%] min-h-[10px] flex z-30">
        <div className="flex-1 bg-[#002060]" title="Navy" />
        <div className="flex-1 bg-[#FF0000]" title="Army" />
        <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
        <div className="flex-1 bg-[#00FFFF]" title="Cyan" />
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
        <div className="relative w-full flex justify-center items-center flex-shrink min-h-0 overflow-hidden px-[2vw]">
          <div className="p-[0.3vh] bg-[#FFD700] shadow-2xl transition-transform duration-500 max-h-[50vh] md:max-h-[55vh]">
            <div className="p-[0.3vh] bg-white">
              <div className="p-[0.2vh] bg-[#FFD700]">
                <div className="relative aspect-[4/5] h-[35vh] sm:h-[40vh] md:h-[48vh] lg:h-[52vh] max-h-full w-auto bg-slate-100 overflow-hidden shadow-inner">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={mainName}
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
        <div className="w-full relative max-w-[90%] md:max-w-[85%] flex-shrink-0 mt-[0.5vh] md:mt-[1vh]">
          {/* Top Red Bar */}
          <div className="h-[0.6vh] min-h-[2px] w-full bg-[#FF0000]" />
          {/* Main Info Bar */}
          <div className="bg-[#002060] w-full py-[1.5vh] md:py-[2.5vh] px-[4vw] flex flex-col items-center justify-center text-center shadow-2xl">
            <div className="flex flex-col items-center gap-[0.3vh] md:gap-[0.4vh] mb-[0.5vh]">
              <h2 className="text-[clamp(1rem,4vh,3.5rem)] font-bold tracking-tight text-[#FFD700] uppercase drop-shadow-md leading-tight">
                {mainName}
              </h2>
              <span className="text-[clamp(0.5rem,1.6vh,1.2rem)] font-medium text-white/95 tracking-widest uppercase italic border-t border-white/10 pt-[0.2vh] md:pt-[0.4vh] mt-[0.2vh] md:mt-[0.4vh]">
                {subTitle}
              </span>
            </div>
            
            <div className="flex flex-col items-center gap-[0.1vh] md:gap-[0.2vh]">
              <p className="text-[clamp(0.6rem,2vh,1.5rem)] font-bold text-white tracking-[0.2em] uppercase">
                {tertiaryTitle}
              </p>
              
              <p className="text-[clamp(0.7rem,2.2vh,1.8rem)] font-bold text-[#FFD700] tracking-[0.2em] uppercase mt-1 md:mt-2">
                National Defence College
              </p>
            </div>
          </div>
          {/* Bottom Red Bar */}
          <div className="h-[0.6vh] min-h-[2px] w-full bg-[#FF0000]" />
          
          {/* Sequence Number Indicator */}
          {id && (
            <div className="absolute -bottom-[1.5vh] right-0 translate-y-1/2">
               <div className="bg-white text-black text-[clamp(7px,1.2vh,14px)] font-bold px-[1.5vw] py-[0.3vh] border border-slate-400 shadow-md">
                  {id}
               </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
