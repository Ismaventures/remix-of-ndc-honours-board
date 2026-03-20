import { X, User, Shield } from 'lucide-react';
import { Personnel } from '@/data/mockData';
import { useEffect, useState } from 'react';

interface ProfileModalProps {
  person: Personnel;
  onClose: () => void;
}

export function ProfileModal({ person, onClose }: ProfileModalProps) {
  const [detailsVisible, setDetailsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDetailsVisible(true), 200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm modal-backdrop-enter" onClick={onClose}>
      <div
        className="bg-card gold-border rounded-lg max-w-lg w-full mx-4 overflow-hidden gold-glow modal-enter"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/15">
          <h3 className="text-lg font-bold gold-text font-serif">Officer Profile</h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground active:scale-95">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-5 mb-6">
            <div className="h-24 w-24 rounded bg-muted flex items-center justify-center text-primary gold-border shrink-0 animate-float" style={{ animationDuration: '3s' }}>
              {person.imageUrl ? (
                <img src={person.imageUrl} alt={person.name} className="h-full w-full object-cover rounded" />
              ) : (
                <User className="h-10 w-10" />
              )}
            </div>
            <div
              className={`flex flex-col justify-center transition-all duration-700 ease-out ${
                detailsVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
              }`}
            >
              <h4 className="text-xl font-bold font-serif">{person.name}</h4>
              <p className="text-sm gold-text font-medium">{person.rank}</p>
              <p className="text-xs text-muted-foreground mt-1">{person.service}</p>
            </div>
          </div>

          <div
            className={`grid grid-cols-2 gap-4 mb-6 transition-all duration-700 ease-out delay-100 ${
              detailsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            <div className="bg-muted/50 rounded p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Category</p>
              <p className="text-sm font-medium">{person.category}</p>
            </div>
            <div className="bg-muted/50 rounded p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Period</p>
              <p className="text-sm font-medium">{person.periodStart} – {person.periodEnd}</p>
            </div>
          </div>

          <div
            className={`bg-muted/30 rounded p-4 gold-border transition-all duration-700 ease-out delay-200 ${
              detailsVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
          >
            <p className="text-[10px] uppercase tracking-wider gold-text mb-2">Citation</p>
            <p className="text-sm leading-relaxed text-muted-foreground italic">
              "{person.citation}"
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
