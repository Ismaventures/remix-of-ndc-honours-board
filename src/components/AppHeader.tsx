import ndcCrest from "/images/ndc-crest.png";

interface AppHeaderProps {
  onHomeClick?: () => void;
}

export function AppHeader({ onHomeClick }: AppHeaderProps) {
  return (
    <header className="relative w-full z-40 shrink-0 select-none bg-white border-b border-slate-200/60">
      {/* NDC Header Banner */}
      <div className="flex items-center gap-4 px-6 py-2.5">
        {/* Left Crest */}
        <button
          onClick={onHomeClick}
          className="shrink-0 active:scale-95 transition-transform"
          aria-label="Home"
        >
          <img
            src={ndcCrest}
            alt="NDC Crest"
            className="h-11 w-11 object-contain"
          />
        </button>

        {/* Title & Motto */}
        <div className="flex flex-col justify-center min-w-0">
          <h1 className="font-serif text-[clamp(0.85rem,1.6vw,1.25rem)] font-bold uppercase tracking-[0.18em] text-[#002060] leading-tight whitespace-nowrap">
            National Defence College Nigeria
          </h1>
          <p className="text-[clamp(0.55rem,0.9vw,0.7rem)] uppercase tracking-[0.32em] text-[#8B7A2B] leading-tight mt-0.5 whitespace-nowrap">
            Excellence &middot; Courage &middot; Patriotism &middot; Integrity
          </p>
        </div>
      </div>

      {/* Tri-service stripe (thin, below header) */}
      <div className="w-full flex h-[6px]">
        <div className="flex-1 bg-[#002060]" />
        <div className="flex-1 bg-[#FF0000]" />
        <div className="flex-1 bg-[#00B0F0]" />
      </div>
    </header>
  );
}
