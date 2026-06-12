import { useCallback, useRef } from 'react';
import { Commandant } from '@/types/domain';
import { CommandantSplitHero } from './CommandantSplitHero';
import { SplitProfileModal } from './SplitProfileModal';
import { useCommandantProfileAudio } from '@/hooks/useProfileSectionAudioSession';

interface CommandantProfileOverlayProps {
  commandant: Commandant;
  commandants: Commandant[];
  onClose: () => void;
  onSelectCommandant: (commandant: Commandant) => void;
}

export function CommandantProfileOverlay({
  commandant,
  commandants,
  onClose,
  onSelectCommandant,
}: CommandantProfileOverlayProps) {
  const slideDir = useRef<'left' | 'right' | null>(null);
  useCommandantProfileAudio();

  const currentIndex = commandants.findIndex((c) => c.id === commandant.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < commandants.length - 1;

  const navigate = useCallback((direction: 'prev' | 'next') => {
    if (currentIndex === -1) return;
    const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    const nextCommandant = commandants[nextIndex];
    if (!nextCommandant) return;
    slideDir.current = direction === 'next' ? 'left' : 'right';
    onSelectCommandant(nextCommandant);
  }, [currentIndex, commandants, onSelectCommandant]);

  return (
    <SplitProfileModal
      slideKey={commandant.id}
      slideDir={slideDir.current}
      currentIndex={currentIndex}
      totalCount={commandants.length}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onClose={onClose}
      onPrev={() => navigate('prev')}
      onNext={() => navigate('next')}
      onSelectIndex={(index) => {
        const target = commandants[index];
        if (!target) return;
        slideDir.current = index > currentIndex ? 'left' : 'right';
        onSelectCommandant(target);
      }}
      getItemLabel={(index) => commandants[index]?.name ?? `Commandant ${index + 1}`}
    >
      <CommandantSplitHero commandant={commandant} />
    </SplitProfileModal>
  );
}
