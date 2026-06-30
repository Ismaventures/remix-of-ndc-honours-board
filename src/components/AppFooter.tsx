import { useThemeMode } from "@/hooks/useThemeMode";

interface AppFooterProps {
  activeCourseNumber: number | null;
}

export function AppFooter({ activeCourseNumber }: AppFooterProps) {
  return (
    <footer className="relative w-full z-40 shrink-0 select-none bg-transparent">
      {/* Tri-service stripes */}
      <div className="w-full flex flex-col h-[30px]">
        <div className="h-[10px] bg-[#FF0000]" />
        <div className="h-[10px] bg-[#002060]" />
        <div className="h-[10px] bg-[#00B0F0]" />
      </div>

      {/* Powered by Xenolink badge on the left */}
      <div className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center gap-2.5 bg-white/95 border-y border-r border-[#002060]/20 shadow-md pl-4 pr-3.5 py-1.5 rounded-none z-50 transition-all duration-300 hover:shadow-lg hover:border-[#002060]/40 backdrop-blur-sm">
        <span className="text-[9px] uppercase tracking-wider text-slate-500 font-medium">
          Powered by
        </span>
        <div className="flex items-center border-r border-slate-200 pr-2.5">
          <img
            src="/images/xenonlink.png"
            alt="Xenolink"
            className="h-4 w-auto object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
        <a
          href="tel:+2348108405421"
          className="text-xs font-semibold text-[#00B0F0] hover:text-[#002060] transition-colors flex items-center gap-1"
        >
          <span className="text-[9px] text-slate-400 font-normal">Tel:</span>
          +234 810 840 5421
        </a>
      </div>

      {/* Course Number Box on the right */}
      {activeCourseNumber !== null && (
        <div className="absolute right-8 top-1/2 -translate-y-1/2 w-[40px] h-[40px] bg-white border border-[#002060]/30 shadow-md flex items-center justify-center rounded-md z-50">
          <span className="text-[#002060] font-extrabold text-lg font-serif">
            {activeCourseNumber}
          </span>
        </div>
      )}
    </footer>
  );
}
