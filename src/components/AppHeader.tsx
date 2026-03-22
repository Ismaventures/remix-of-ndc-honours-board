import ndcCrest from '/images/ndc-crest.png';

interface AppHeaderProps {
  onHomeClick?: () => void;
}

export function AppHeader({ onHomeClick }: AppHeaderProps) {
  return (
    <header className="min-h-16 sm:min-h-20 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-6 py-2 gold-border border-t-0 border-x-0 bg-navy-deep overflow-x-hidden">
      <button
        onClick={onHomeClick}
        className="flex items-center gap-2 sm:gap-4 hover:opacity-80 transition-opacity active:scale-[0.98] min-w-0"
      >
        <img src={ndcCrest} alt="NDC Crest" className="h-10 w-10 sm:h-14 sm:w-14 object-contain shrink-0" />
        <div className="flex flex-col min-w-0">
          <h1 className="text-sm sm:text-lg font-bold tracking-wide text-white leading-tight truncate">
            National Defence College Nigeria
          </h1>
          <p className="text-[10px] sm:text-xs text-white/70 tracking-[0.16em] uppercase truncate">
            Intellect · Courage · Patriotism
          </p>
        </div>
      </button>
      <div className="shrink-0" />
    </header>
  );
}
