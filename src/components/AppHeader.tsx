import ndcCrest from '/images/ndc-crest.png';

interface AppHeaderProps {
  onHomeClick?: () => void;
}

export function AppHeader({ onHomeClick }: AppHeaderProps) {
  return (
    <header className="h-20 flex items-center gap-4 px-6 gold-border border-t-0 border-x-0 bg-navy-deep">
      <button
        onClick={onHomeClick}
        className="flex items-center gap-4 hover:opacity-80 transition-opacity active:scale-[0.98]"
      >
        <img src={ndcCrest} alt="NDC Crest" className="h-14 w-14 object-contain" />
        <div className="flex flex-col">
          <h1 className="text-lg font-bold tracking-wide gold-text leading-tight">
            National Defence College Nigeria
          </h1>
          <p className="text-xs text-muted-foreground tracking-widest uppercase">
            Roll of Honour & Leadership Chronicle
          </p>
        </div>
      </button>
    </header>
  );
}
