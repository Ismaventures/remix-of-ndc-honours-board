import { useCallback, useRef } from 'react';
import { Personnel, Category } from '@/types/domain';
import { FellowSplitHero } from './FellowSplitHero';
import { SplitProfileModal } from './SplitProfileModal';
import { usePersonnelProfileAudio } from '@/hooks/useProfileSectionAudioSession';

interface FellowProfileModalProps {
  person: Personnel;
  fellows: Personnel[];
  category: Category;
  courseDesignation?: string;
  onClose: () => void;
  onSelectPerson: (person: Personnel) => void;
}

export function FellowProfileModal({
  person,
  fellows,
  category,
  courseDesignation,
  onClose,
  onSelectPerson,
}: FellowProfileModalProps) {
  const slideDir = useRef<'left' | 'right' | null>(null);
  usePersonnelProfileAudio(category);

  const currentIndex = fellows.findIndex((f) => {
    if (f.id !== person.id) return false;
    const fCourse = (f as any).courseNumber;
    const pCourse = (person as any).courseNumber;
    if (fCourse !== undefined && pCourse !== undefined) {
      return fCourse === pCourse;
    }
    return true;
  });
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < fellows.length - 1;

  const navigate = useCallback((direction: 'prev' | 'next') => {
    if (currentIndex === -1) return;
    const nextIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    const nextPerson = fellows[nextIndex];
    if (!nextPerson) return;
    slideDir.current = direction === 'next' ? 'left' : 'right';
    onSelectPerson(nextPerson);
  }, [currentIndex, fellows, onSelectPerson]);

  return (
    <SplitProfileModal
      slideKey={person.id}
      slideDir={slideDir.current}
      currentIndex={currentIndex}
      totalCount={fellows.length}
      hasPrev={hasPrev}
      hasNext={hasNext}
      onClose={onClose}
      onPrev={() => navigate('prev')}
      onNext={() => navigate('next')}
      onSelectIndex={(index) => {
        const target = fellows[index];
        if (!target) return;
        slideDir.current = index > currentIndex ? 'left' : 'right';
        onSelectPerson(target);
      }}
      getItemLabel={(index) => fellows[index]?.name ?? `Profile ${index + 1}`}
    >
      <FellowSplitHero
        person={person}
        category={category}
        courseDesignation={courseDesignation}
      />
    </SplitProfileModal>
  );
}

/** Alias for allied officers and other personnel categories using the same layout. */
export const PersonnelProfileModal = FellowProfileModal;
