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
