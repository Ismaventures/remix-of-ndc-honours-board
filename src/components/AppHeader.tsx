import ndcCrest from "/images/ndc-crest.png";
import { useThemeMode } from "@/hooks/useThemeMode";

interface AppHeaderProps {
  onHomeClick?: () => void;
}

export function AppHeader({ onHomeClick }: AppHeaderProps) {
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");

  return (
    <header 
      className={`header-shine sticky top-0 z-40 min-h-16 sm:min-h-20 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 border-b backdrop-blur-md overflow-x-hidden transition-colors duration-500 ${
        isLightMode 
          ? "bg-white/90 border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.06),0_4px_12px_rgba(0,0,0,0.04)]" 
          : "bg-navy-deep/92 border-primary/25 shadow-[0_1px_0_hsl(var(--primary)/0.1),0_10px_30px_rgba(0,0,0,0.25)]"
      }`}
    >
      <button
        onClick={onHomeClick}
        className={`flex items-center gap-3 sm:gap-4 transition-all duration-300 active:scale-[0.98] min-w-0 rounded-lg px-2 sm:px-3 py-1.5 group ${
          isLightMode ? "hover:bg-slate-50" : "hover:bg-white/[0.04]"
        }`}
      >
        <div className="relative">
          <img
            src={ndcCrest}
            alt="NDC Crest"
            className={`h-10 w-10 sm:h-14 sm:w-14 object-contain shrink-0 transition-all duration-500 group-hover:scale-105 ${
              isLightMode 
                ? "drop-shadow-[0_1px_3px_rgba(0,0,0,0.12)]" 
                : "drop-shadow-[0_0_10px_hsl(var(--primary)/0.35)]"
            }`}
          />
          <div className={`absolute -inset-1 rounded-full transition-opacity duration-500 opacity-0 group-hover:opacity-100 ${
            isLightMode ? "bg-slate-200/30" : "bg-primary/10"
          }`} />
        </div>
        <div className="flex flex-col min-w-0 gap-0.5">
          <h1 className={`text-sm sm:text-lg lg:text-xl font-extrabold tracking-[0.08em] leading-tight truncate uppercase text-left transition-colors duration-500 ${
            isLightMode ? "text-slate-900" : "text-white"
          }`}>
            National Defence College Nigeria
          </h1>
          <div className="flex items-center gap-2">
            <div className={`h-px flex-1 max-w-8 ${isLightMode ? "bg-slate-300" : "bg-white/15"}`} />
            <p className={`inline-flex w-fit max-w-full items-center rounded-sm px-2 py-0.5 text-[10px] sm:text-xs tracking-[0.12em] sm:tracking-[0.22em] uppercase truncate text-left font-semibold transition-colors duration-500 ${
              isLightMode 
                ? "bg-slate-50 text-slate-500 border border-slate-200/80" 
                : "bg-white/[0.06] text-white/80 border border-white/[0.08]"
            }`}>
              Intellect · Courage · Patriotism
            </p>
            <div className={`h-px flex-1 max-w-8 ${isLightMode ? "bg-slate-300" : "bg-white/15"}`} />
          </div>
        </div>
      </button>
    </header>
  );
}
