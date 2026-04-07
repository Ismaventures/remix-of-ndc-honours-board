import { X, User, Shield } from "lucide-react";
import { Personnel } from "@/types/domain";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
import { useThemeMode } from "@/hooks/useThemeMode";

interface ProfileModalProps {
  person: Personnel;
  onClose: () => void;
}

export function ProfileModal({ person, onClose }: ProfileModalProps) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const resolvedImageUrl = useResolvedMediaUrl(person.imageUrl);
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");
  const normalizedRank = person.rank?.trim() || "";
  const normalizedName = person.name?.trim() || "";
  const hasRankPrefix =
    normalizedRank.length > 0 &&
    normalizedName.toLowerCase().startsWith(normalizedRank.toLowerCase());
  const displayName =
    normalizedRank.length > 0 && normalizedName.length > 0 && !hasRankPrefix
      ? `${normalizedRank} ${normalizedName}`
      : normalizedName || "Name unavailable";

  useEffect(() => {
    const timer = setTimeout(() => setDetailsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setPortalReady(true);
    return () => setPortalReady(false);
  }, []);

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  if (!portalReady) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md modal-backdrop-enter p-3 md:p-6 overflow-hidden overscroll-none"
      onClick={onClose}
    >
      <div
        className={`rounded-xl max-w-5xl w-full overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.4)] modal-enter relative max-h-[94dvh] flex flex-col transition-all duration-500 border ${isLightMode ? "bg-white border-slate-200" : "bg-card border-primary/20"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Defence Colors Strip */}
        <div className="h-[10px] w-full flex shrink-0">
          <div className="flex-1 bg-[#002060]" title="Nigerian Navy" />
          <div className="flex-1 bg-[#FF0000]" title="Nigerian Army" />
          <div className="flex-1 bg-[#00B0F0]" title="Nigerian Air Force" />
        </div>

        <div className={`flex items-center justify-between px-4 sm:px-6 md:px-8 py-3 sm:py-5 border-b ${isLightMode ? "border-slate-100 bg-slate-50/50" : "border-primary/20 bg-muted/20"}`}>
          <div className="flex items-center gap-4">
            <Shield className={`h-6 w-6 ${isLightMode ? "text-[#002060]" : "text-primary"}`} />
            <h3 className={`text-xl font-bold tracking-[0.15em] uppercase ${isLightMode ? "text-[#002060]" : "text-foreground"}`}>
              OFFICIAL PROFILE
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-all active:scale-90 border shadow-sm ${isLightMode ? "hover:bg-slate-200 text-slate-500 hover:text-slate-800 bg-white border-slate-200" : "hover:bg-muted text-muted-foreground hover:text-foreground bg-background border-border"}`}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className={`p-6 md:p-10 overflow-y-auto overscroll-contain ${isLightMode ? "bg-[linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px)]" : "bg-[linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px)]"} bg-[size:40px_40px]`}>
          <div className="flex flex-col md:flex-row gap-6 md:gap-10 mb-6 md:mb-10 items-center md:items-start">
            {/* Professional Framed Portrait */}
            <div className="relative shrink-0">
              <div className="p-1.5 bg-[#FFD700] shadow-2xl transition-transform duration-500 hover:scale-[1.03]">
                <div className="p-1.5 bg-white">
                  <div className="p-1 bg-[#FFD700]">
                    <div className="relative aspect-[4/5] h-48 sm:h-60 md:h-72 lg:h-80 w-auto bg-slate-50 overflow-hidden shadow-inner flex items-center justify-center">
                      {resolvedImageUrl ? (
                        <img
                          src={resolvedImageUrl}
                          alt={person.name}
                          className="h-full w-full object-cover object-top"
                        />
                      ) : (
                        <User className="h-20 w-20 text-slate-200" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              className={`flex flex-col justify-center flex-1 transition-all duration-700 ease-out text-center md:text-left ${
                detailsVisible
                  ? "opacity-100 translate-x-0"
                  : "opacity-0 translate-x-4"
              }`}
            >
              <div className={`inline-block px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.25em] mb-5 self-center md:self-start shadow-md ${isLightMode ? "bg-[#002060] text-white" : "bg-blue-900/40 text-blue-100 border border-blue-500/30"}`}>
                {person.rank}
              </div>
              <h4 className={`text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold mb-4 leading-tight uppercase tracking-tight ${isLightMode ? "text-[#002060]" : "text-foreground"}`}>
                {displayName}
              </h4>
              {person.decoration && (
                <div className="mb-4 inline-flex max-w-full self-center md:self-start items-center rounded-md border border-[#FFD700]/80 bg-[linear-gradient(140deg,#FFF5BF_0%,#FFD700_45%,#C79600_100%)] px-3 py-1.5 shadow-[0_0_18px_rgba(255,215,0,0.33)]">
                  <p className="text-xs md:text-sm font-bold tracking-[0.09em] text-[#1f2937] break-words">
                    {person.decoration}
                  </p>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <div className={`px-4 py-1.5 border-l-4 text-sm font-bold uppercase tracking-widest italic ${isLightMode ? "border-[#FF0000] bg-slate-100/80 text-slate-700" : "border-red-500/80 bg-muted/40 text-slate-200"}`}>
                  {person.service}
                </div>
                <div className={`h-2 w-2 rounded-full ${isLightMode ? "bg-slate-300" : "bg-slate-500"}`} />
                <p className={`text-base font-bold tracking-widest ${isLightMode ? "text-slate-500" : "text-slate-300"}`}>
                  {person.periodStart} – {person.periodEnd}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 transition-all duration-700 ease-out delay-100 ${
              detailsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3"
            }`}
          >
            <div className={`p-5 rounded-lg shadow-sm border ${isLightMode ? "bg-slate-50 border-slate-200" : "bg-muted/30 border-border"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${isLightMode ? "text-slate-400" : "text-muted-foreground"}`}>
                Service Category
              </p>
              <p className={`text-lg font-bold uppercase tracking-wider ${isLightMode ? "text-[#002060]" : "text-foreground"}`}>
                {person.category}
              </p>
            </div>
            
            <div className={`p-5 rounded-lg shadow-sm border ${isLightMode ? "bg-slate-50 border-slate-200" : "bg-muted/30 border-border"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${isLightMode ? "text-slate-400" : "text-muted-foreground"}`}>
                Personnel Reference
              </p>
              <p className={`text-lg font-bold uppercase tracking-wider ${isLightMode ? "text-[#002060]" : "text-foreground"}`}>
                ID-{person.id.substring(0, 8)}
              </p>
            </div>

            <div className={`p-5 rounded-lg shadow-sm border md:col-span-2 ${isLightMode ? "bg-slate-50 border-slate-200" : "bg-muted/30 border-border"}`}>
              <p className={`text-[10px] font-bold uppercase tracking-[0.2em] mb-2 ${isLightMode ? "text-slate-400" : "text-muted-foreground"}`}>
                Decoration
              </p>
              <div className="inline-flex max-w-full items-center rounded-md border border-[#D4AF37]/80 bg-[linear-gradient(140deg,#FFF8CF_0%,#EBCB59_45%,#C49A2C_100%)] px-3 py-1.5 shadow-[0_0_14px_rgba(212,175,55,0.3)]">
                <p className="text-[#1f2937] text-sm md:text-base font-bold tracking-[0.08em] break-words">
                  {person.decoration || "N/A"}
                </p>
              </div>
            </div>
          </div>

          <div
            className={`rounded-xl p-6 md:p-8 border shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-700 ease-out delay-200 ${isLightMode ? "bg-white border-slate-100" : "bg-card border-border"} ${
              detailsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3"
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1.5 w-10 bg-[#FF0000]" />
              <p className={`text-[10px] uppercase tracking-[0.3em] font-black ${isLightMode ? "text-slate-400" : "text-muted-foreground"}`}>
                OFFICIAL CITATION
              </p>
            </div>
            <div className="relative group/citation">
              <p className={`text-lg md:text-xl leading-relaxed transition-all duration-300 ${isLightMode ? "text-slate-700 font-medium" : "text-slate-300"}`}>
                {person.citation || "No citation available."}
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Defence Colors Strip */}
        <div className="h-[8px] w-full flex shrink-0">
          <div className="flex-1 bg-[#002060]" title="Nigerian Navy" />
          <div className="flex-1 bg-[#FF0000]" title="Nigerian Army" />
          <div className="flex-1 bg-[#00B0F0]" title="Nigerian Air Force" />
        </div>
      </div>
    </div>,
    document.body,
  );
}

