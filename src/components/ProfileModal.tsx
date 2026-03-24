import { X, User, Shield } from "lucide-react";
import { Personnel } from "@/types/domain";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";

interface ProfileModalProps {
  person: Personnel;
  onClose: () => void;
}

export function ProfileModal({ person, onClose }: ProfileModalProps) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const resolvedImageUrl = useResolvedMediaUrl(person.imageUrl);

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

  const isLongCitation = person.citation && person.citation.length > 200;
  const displayCitation =
    isLongCitation && !isExpanded
      ? person.citation.substring(0, 200) + "..."
      : person.citation;

  if (!portalReady) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md modal-backdrop-enter p-3 md:p-6 overflow-hidden overscroll-none"
      onClick={onClose}
    >
      <div
        className="bg-white border border-slate-200 rounded-xl max-w-5xl w-full overflow-hidden shadow-[0_30px_90px_rgba(0,0,0,0.4)] modal-enter relative max-h-[94dvh] flex flex-col transition-all duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Defence Colors Strip */}
        <div className="h-[10px] w-full flex shrink-0">
          <div className="flex-1 bg-[#002060]" title="Navy" />
          <div className="flex-1 bg-[#FF0000]" title="Army" />
          <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
        </div>

        <div className="flex items-center justify-between px-8 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <Shield className="h-6 w-6 text-[#002060]" />
            <h3 className="text-xl font-bold tracking-[0.15em] text-[#002060] uppercase">
              OFFICIAL PROFILE
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 transition-all text-slate-500 hover:text-slate-800 active:scale-90 bg-white border border-slate-200 shadow-sm"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 md:p-10 overflow-y-auto overscroll-contain bg-[linear-gradient(90deg,rgba(0,0,0,0.01)_1px,transparent_1px),linear-gradient(rgba(0,0,0,0.01)_1px,transparent_1px)] bg-[size:40px_40px]">
          <div className="flex flex-col md:row gap-10 mb-10 items-center md:items-start md:flex-row">
            {/* Professional Framed Portrait */}
            <div className="relative shrink-0">
              <div className="p-1.5 bg-[#FFD700] shadow-2xl transition-transform duration-500 hover:scale-[1.03]">
                <div className="p-1.5 bg-white">
                  <div className="p-1 bg-[#FFD700]">
                    <div className="relative aspect-[4/5] h-60 sm:h-72 md:h-80 w-auto bg-slate-50 overflow-hidden shadow-inner flex items-center justify-center">
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
              <div className="inline-block px-4 py-1.5 bg-[#002060] text-white text-[11px] font-bold uppercase tracking-[0.25em] mb-5 self-center md:self-start shadow-md">
                {person.rank}
              </div>
              <h4 className="text-3xl md:text-4xl lg:text-5xl font-bold text-[#002060] mb-4 leading-tight uppercase tracking-tight">
                {person.name}
              </h4>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                <div className="px-4 py-1.5 border-l-4 border-[#FF0000] bg-slate-100/80 text-sm font-bold text-slate-700 uppercase tracking-widest italic">
                  {person.service}
                </div>
                <div className="h-2 w-2 rounded-full bg-slate-300" />
                <p className="text-base text-slate-500 font-bold tracking-widest">
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
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">
                Service Category
              </p>
              <p className="text-lg font-bold text-[#002060] uppercase tracking-wider">
                {person.category}
              </p>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-lg shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mb-2">
                Personnel Reference
              </p>
              <p className="text-lg font-bold text-[#002060] uppercase tracking-wider">
                ID-{person.id.substring(0, 8)}
              </p>
            </div>
          </div>

          <div
            className={`bg-white rounded-xl p-6 md:p-8 border border-slate-100 shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all duration-700 ease-out delay-200 ${
              detailsVisible
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-3"
            }`}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1.5 w-10 bg-[#FF0000]" />
              <p className="text-[10px] uppercase tracking-[0.3em] font-black text-slate-400">
                OFFICIAL CITATION
              </p>
            </div>
            <div className="relative group/citation">
              <p className="text-lg md:text-xl leading-relaxed text-slate-700 font-medium transition-all duration-300">
                {displayCitation}
              </p>
              {isLongCitation && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-6 flex items-center gap-2 text-xs font-black text-[#002060] hover:text-[#FF0000] transition-all uppercase tracking-[0.2em] border-b-2 border-[#002060]/10 pb-1"
                >
                  {isExpanded ? "Minimize Full Bio" : "View Complete Citation"}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Defence Colors Strip */}
        <div className="h-[8px] w-full flex shrink-0">
          <div className="flex-1 bg-[#002060]" title="Navy" />
          <div className="flex-1 bg-[#FF0000]" title="Army" />
          <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
        </div>
      </div>
    </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
