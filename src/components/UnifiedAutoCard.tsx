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
    ? (person.academicYear 
        ? `${person.service} • Course ${person.course}/${person.academicYear.split('–')[0]}`
        : `${person.service} • ${person.periodStart} - ${person.periodEnd}`)
    : `${visit.country} • ${visit.date}`;
  
  const citation = isPersonnel ? person.citation : visit.description;
  const serviceColor = (() => {
    if (!isPersonnel) return "tri-color";
    const s = (person.service || "").toLowerCase();
    if (s.includes("army")) return "#FF0000";
    if (s.includes("navy")) return "#002060";
    if (s.includes("air force") || s.includes("airforce")) return "#00B0F0";
    return "tri-color";
  })();

  return (
    <section
      className={`relative w-full h-full flex-1 min-h-0 flex flex-col items-center justify-center overflow-hidden border ${
        isLightMode
          ? "auto-display-studio-surface text-slate-900 border-slate-200/80"
          : "bg-background text-foreground border-border"
      }`}
    >
      {/* Top Defence Colors Strip - Removed as per user request */}

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
        {/* Portrait - no frame, just image with two-tone background */}
        <div className="relative w-full flex justify-center items-center flex-shrink min-h-0">
          <div className="relative flex flex-col shadow-2xl transition-transform duration-500">
            {/* Full-size image container with two-tone background */}
            <div className="relative w-full flex-1 flex" style={{ background: 'linear-gradient(to bottom, #C0392B 0%, #C0392B 45%, #002060 45%, #002060 100%)' }}>
              <div
                className={`relative aspect-[4/5] ${
                  isPersonnel
                    ? "h-[clamp(300px,66dvh,760px)] sm:h-[clamp(330px,68dvh,820px)] md:h-[clamp(360px,72dvh,900px)] max-h-[78dvh]"
                    : "h-[clamp(220px,54dvh,560px)] sm:h-[clamp(260px,56dvh,600px)] md:h-[clamp(280px,58dvh,640px)] max-h-[62dvh]"
                } w-auto overflow-hidden`}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={mainName}
                    className="absolute inset-0 h-full w-full object-cover object-top scale-[1.08]"
                    loading="eager"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60">
                    <Shield className="h-[15%] w-auto opacity-30" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Identity Plate */}
        <div className="w-full relative flex-shrink-0 mt-[0.5vh] md:mt-[1vh]">
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
        </div>
          
        {/* Sequence Number Indicator */}
        {id && (
          <div className="absolute bottom-[2%] right-[4vw] z-40">
             <div className={`text-[clamp(7px,1.2vh,14px)] font-bold px-[1.5vw] py-[0.3vh] border shadow-md ${isLightMode ? "bg-white text-black border-slate-400" : "bg-background text-foreground border-border"}`}>
                {id}
             </div>
          </div>
        )}

        {/* Bottom Defence Colors Strip - Removed as per user request */}
      </div>
    </section>
  );
}

