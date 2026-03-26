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
      className={`sticky top-0 z-40 min-h-16 sm:min-h-20 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 border-b backdrop-blur-md overflow-x-hidden shadow-sm transition-colors duration-500 ${
        isLightMode 
          ? "bg-white/90 border-slate-200" 
          : "bg-navy-deep/92 border-primary/25 shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
      }`}
    >
      <button
        onClick={onHomeClick}
        className={`flex items-center gap-2 sm:gap-4 transition-all duration-300 active:scale-[0.98] min-w-0 rounded-lg px-1.5 sm:px-2 py-1 ${
          isLightMode ? "hover:bg-slate-100" : "hover:bg-white/[0.04]"
        }`}
      >
        <img
          src={ndcCrest}
          alt="NDC Crest"
          className={`h-10 w-10 sm:h-14 sm:w-14 object-contain shrink-0 drop-shadow-sm transition-all duration-500 ${
            isLightMode ? "" : "drop-shadow-[0_0_10px_hsl(var(--primary)/0.35)]"
          }`}
        />
        <div className="flex flex-col min-w-0">
          <h1 className={`text-sm sm:text-lg lg:text-xl font-extrabold tracking-[0.06em] leading-tight truncate uppercase text-left transition-colors duration-500 ${
            isLightMode ? "text-slate-900" : "text-white"
          }`}>
            National Defence College Nigeria
          </h1>
          <p className={`inline-flex w-fit max-w-full items-center rounded-sm px-1.5 py-0.5 text-[10px] sm:text-xs tracking-[0.12em] sm:tracking-[0.18em] uppercase truncate text-left mt-0.5 font-semibold transition-colors duration-500 ${
            isLightMode 
              ? "bg-slate-100 text-slate-600 shadow-none border border-slate-200" 
              : "bg-black/15 text-white shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
          }`}>
            Intellect · Courage · Patriotism
          </p>
        </div>
      </button>
    </header>
  );
}
