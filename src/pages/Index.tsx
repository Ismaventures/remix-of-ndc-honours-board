import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { CommandantHero } from '@/components/CommandantHero';
import { PastCommandants } from '@/components/PastCommandants';
import { CategoryCards, ViewKey } from '@/components/CategoryCards';
import { OrganogramView } from '@/components/OrganogramView';
import { VisitsSection } from '@/components/VisitsSection';
import { AdminPanel } from '@/components/AdminPanel';
import { AutoRotationDisplay } from '@/components/AutoRotationDisplay';
import { usePersonnelStore, useVisitsStore, useCommandantsStore } from '@/hooks/useStore';
import { Category } from '@/data/mockData';

const SECTION_TITLES: Record<string, string> = {
  fwc: 'Distinguished Fellows of the War College (FWC)',
  fdc: 'Distinguished Fellows of the Defence College (FDC)',
  directing: 'Chronicle of Directing Staff',
  allied: 'Allied Officers',
};

const SECTION_CATEGORIES: Record<string, Category> = {
  fwc: 'FWC',
  fdc: 'FDC',
  directing: 'Directing Staff',
  allied: 'Allied',
};

const Index = () => {
  const [view, setView] = useState<ViewKey>('home');
  const { personnel, addPersonnel, updatePersonnel, deletePersonnel } = usePersonnelStore();
  const { visits, addVisit, updateVisit, deleteVisit } = useVisitsStore();
  const { commandants, addCommandant, updateCommandant, deleteCommandant } = useCommandantsStore();

  const currentCommandant = commandants.find(c => c.isCurrent);

  const renderContent = () => {
    if (view === 'home') {
      return (
        <>
          <CommandantHero commandant={currentCommandant} />
          <PastCommandants commandants={commandants} />
          <CategoryCards onSelect={setView} />
        </>
      );
    }

    if (view === 'visits') {
      return (
        <>
          <VisitsSection visits={visits} onBack={() => setView('home')} />
        </>
      );
    }

    if (view === 'admin') {
      return (
        <AdminPanel
          personnel={personnel}
          visits={visits}
          commandants={commandants}
          onAddPersonnel={addPersonnel}
          onUpdatePersonnel={updatePersonnel}
          onDeletePersonnel={deletePersonnel}
          onAddVisit={addVisit}
          onUpdateVisit={updateVisit}
          onDeleteVisit={deleteVisit}
          onAddCommandant={addCommandant}
          onUpdateCommandant={updateCommandant}
          onDeleteCommandant={deleteCommandant}
          onBack={() => setView('home')}
        />
      );
    }

    const category = SECTION_CATEGORIES[view];
    if (category) {
      return (
        <OrganogramView
          key={view}
          data={personnel}
          title={SECTION_TITLES[view]}
          category={category}
          onBack={() => setView('home')}
        />
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background animate-bg-sweep bg-gradient-to-br from-background via-background to-secondary/10">
      <AppHeader onHomeClick={() => setView('home')} />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          {/* Auto-rotation button */}
          <div className="flex justify-end mb-4">
            <AutoRotationDisplay personnel={personnel} visits={visits} />
          </div>

          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Index;
