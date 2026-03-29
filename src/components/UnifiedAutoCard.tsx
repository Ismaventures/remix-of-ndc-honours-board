import { Shield } from "lucide-react";
import { Personnel, DistinguishedVisit } from "@/types/domain";
import ndcCrest from "/images/ndc-crest.png";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
import { useThemeMode } from "@/hooks/useThemeMode";

interface UnifiedAutoCardProps {
  type: "personnel" | "visit";
  data: Personnel | DistinguishedVisit;
  id?: string;
}

export function UnifiedAutoCard({ type, data, id }: UnifiedAutoCardProps) {
  const imageUrl = useResolvedMediaUrl(data.imageUrl);
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");

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
    <section
      className={`relative w-full h-full min-h-[320px] flex flex-col items-center justify-center overflow-hidden border ${
        isLightMode
          ? "auto-display-studio-surface text-slate-900 border-slate-200/80"
          : "bg-background text-foreground border-border"
      }`}
    >
      {/* Top Defence Colors Strip */}
      <div className="absolute top-0 inset-x-0 h-[3%] min-h-[10px] flex z-30">
        <div className="flex-1 bg-[#002060]" title="Nigerian Navy" />
        <div className="flex-1 bg-[#FF0000]" title="Nigerian Army" />
        <div className="flex-1 bg-[#00B0F0]" title="Nigerian Air Force" />
      </div>

      {/* Background: subtle paper grain (light) */}
      <div className={`absolute inset-0 z-0 ${isLightMode ? "opacity-100" : "opacity-40"}`}>
        {isLightMode ? (
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:min(3.2vw,20px)_min(3.2vw,20px)] mix-blend-multiply opacity-[0.35]" />
        ) : (
          <>
            <div className="absolute inset-0 bg-background" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:3vw_3vw]" />
          </>
        )}
      </div>

      {/* NDC Logos in corners */}
      <div className="absolute top-[6%] left-[4%] z-20">
        <img src={ndcCrest} alt="NDC Logo" className="h-[clamp(32px,8vh,64px)] w-auto object-contain filter drop-shadow-sm" />
      </div>
      <div className="absolute top-[6%] right-[4%] z-20">
        <img src={ndcCrest} alt="NDC Logo" className="h-[clamp(32px,8vh,64px)] w-auto object-contain filter drop-shadow-sm" />
      </div>

      {/* Main Content Container */}
      <div className="relative z-10 flex flex-col items-center w-full h-full max-w-[min(96vw,980px)] sm:max-w-[min(95vw,1050px)] md:max-w-[min(92vw,1120px)] mx-auto justify-center py-[max(10px,1.4vh)] gap-[max(8px,1.1vh)] md:gap-[2vh]">
        {/* Portrait with Yellow/Gold frame */}
        <div className="relative w-full flex justify-center items-center flex-shrink min-h-0 overflow-hidden">
          <div className="portrait-photo-mat rounded-sm p-[max(3px,0.28vh)] shadow-2xl transition-transform duration-500">
            <div className="rounded-[3px] bg-white p-[max(2px,0.22vh)] shadow-inner">
              <div className="portrait-photo-mat-inner rounded-[2px] bg-neutral-100/90 p-[max(1px,0.18vh)]">
                <div
                  className={`relative aspect-[4/5] ${
                    isPersonnel
                      ? "h-[clamp(300px,66dvh,760px)] sm:h-[clamp(330px,68dvh,820px)] md:h-[clamp(360px,72dvh,900px)] max-h-[78dvh]"
                      : "h-[clamp(220px,54dvh,560px)] sm:h-[clamp(260px,56dvh,600px)] md:h-[clamp(280px,58dvh,640px)] max-h-[62dvh]"
                  } w-auto overflow-hidden shadow-inner ${
                    isLightMode ? "bg-slate-100" : "bg-muted/30"
                  }`}
                >
                  {imageUrl ? (
                    <div
                      className={`w-full h-full ${isPersonnel ? "p-[max(2px,0.3vh)]" : "p-[max(4px,0.55vh)]"} ${
                        isLightMode ? "bg-slate-100" : "bg-muted/20"
                      }`}
                    >
                      <img
                        src={imageUrl}
                        alt={mainName}
                        className={`w-full h-full ${isPersonnel ? "object-contain object-top" : "object-contain object-center"}`}
                        loading="eager"
                      />
                    </div>
                  ) : (
                    <div
                      className={`w-full h-full flex flex-col items-center justify-center ${
                        isLightMode
                          ? "text-slate-300 bg-slate-50"
                          : "text-slate-500 bg-muted/20"
                      }`}
                    >
                      <Shield className="h-[15%] w-auto opacity-20" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Identity Plate */}
        <div className="w-full relative flex-shrink-0 mt-[0.5vh] md:mt-[1vh]">
          {/* Top Red Bar */}
          <div className="h-[0.6vh] min-h-[2px] w-full bg-[#FF0000]" />
          {/* Main Info Bar */}
          <div className="bg-[#002060] w-full py-[1.5vh] md:py-[2.5vh] px-[4vw] flex flex-col items-center justify-center text-center shadow-2xl">
            <div className="flex flex-col items-center gap-[0.3vh] md:gap-[0.4vh] mb-[0.5vh]">
              <h2 className="text-[clamp(0.95rem,3vh,2.35rem)] font-extrabold tracking-tight text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.3)] leading-tight max-w-full break-words [overflow-wrap:anywhere] max-h-[4.4em] overflow-y-auto">
                {mainName}
              </h2>
              <span className="text-[clamp(0.58rem,1.6vh,1.18rem)] font-extrabold text-[#FF3B30] tracking-[0.06em] italic border-t border-white/10 pt-[0.2vh] md:pt-[0.4vh] mt-[0.2vh] md:mt-[0.4vh] max-w-full break-words [overflow-wrap:anywhere] max-h-[4em] overflow-y-auto">
                {subTitle}
              </span>
            </div>
            
            <div className="flex flex-col items-center gap-[0.1vh] md:gap-[0.2vh]">
              <p className="text-[clamp(0.6rem,2.2vh,1.8rem)] font-bold text-white tracking-[0.2em] uppercase">
                {tertiaryTitle}
              </p>
              
              <p className="text-[clamp(0.7rem,2.4vh,2rem)] font-bold text-[#e8e2d6] tracking-[0.2em] uppercase mt-1 md:mt-2">
                National Defence College
              </p>
            </div>
          </div>
          {/* Bottom Red Bar */}
          <div className="h-[0.6vh] min-h-[2px] w-full bg-[#FF0000]" />
        </div>
          
        {/* Sequence Number Indicator */}
        {id && (
          <div className="absolute bottom-[2%] right-[4vw] z-40">
             <div className={`text-[clamp(7px,1.2vh,14px)] font-bold px-[1.5vw] py-[0.3vh] border shadow-md ${isLightMode ? "bg-white text-black border-slate-400" : "bg-background text-foreground border-border"}`}>
                {id}
             </div>
          </div>
        )}

        {/* Bottom Defence Colors Strip */}
        <div className="absolute bottom-0 inset-x-0 h-[2.5%] min-h-[8px] flex z-30">
          <div className="flex-1 bg-[#002060]" title="Nigerian Navy" />
          <div className="flex-1 bg-[#FF0000]" title="Nigerian Army" />
          <div className="flex-1 bg-[#00B0F0]" title="Nigerian Air Force" />
        </div>
      </div>
    </section>
  );
}

