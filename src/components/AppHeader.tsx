import ndcCrest from "/images/ndc-crest.png";

interface AppHeaderProps {
  onHomeClick?: () => void;
}

export function AppHeader({ onHomeClick }: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-40 min-h-16 sm:min-h-20 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 border-b border-primary/25 bg-navy-deep/92 backdrop-blur-md overflow-x-hidden shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
      <button
        onClick={onHomeClick}
        className="flex items-center gap-2 sm:gap-4 transition-all duration-300 active:scale-[0.98] min-w-0 rounded-lg px-1.5 sm:px-2 py-1 hover:bg-white/[0.04]"
      >
        <img
          src={ndcCrest}
          alt="NDC Crest"
          className="h-10 w-10 sm:h-14 sm:w-14 object-contain shrink-0 drop-shadow-[0_0_10px_hsl(var(--primary)/0.35)]"
        />
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm sm:text-lg lg:text-xl font-extrabold tracking-[0.06em] text-white leading-tight truncate uppercase text-left">
            National Defence College Nigeria
          </h1>
          <p className="text-[10px] sm:text-xs text-primary/80 tracking-[0.12em] sm:tracking-[0.18em] uppercase truncate text-left mt-0.5">
            Intellect · Courage · Patriotism
          </p>
        </div>
      </button>
    </header>
  );
}
