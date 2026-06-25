import ndcCrest from "/images/ndc-crest.png";

interface AppHeaderProps {
  onHomeClick?: () => void;
}

export function AppHeader({ onHomeClick }: AppHeaderProps) {
  return (
    <header className="relative w-full z-40 shrink-0 select-none bg-transparent">
      {/* Tri-service stripes */}
      <div className="w-full flex flex-col h-[30px]">
        <div className="h-[10px] bg-[#FF0000]" />
        <div className="h-[10px] bg-[#002060]" />
        <div className="h-[10px] bg-[#00B0F0]" />
      </div>

      {/* Left Crest */}
      <button 
        onClick={onHomeClick}
        className="absolute left-6 top-1/2 -translate-y-1/2 active:scale-95 transition-transform"
        aria-label="Home Left logo"
      >
        <img
          src={ndcCrest}
          alt="NDC Crest Left"
          className="h-12 w-12 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
        />
      </button>

      {/* Right Crest */}
      <button 
        onClick={onHomeClick}
        className="absolute right-6 top-1/2 -translate-y-1/2 active:scale-95 transition-transform"
        aria-label="Home Right logo"
      >
        <img
          src={ndcCrest}
          alt="NDC Crest Right"
          className="h-12 w-12 object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.15)]"
        />
      </button>
    </header>
  );
}
