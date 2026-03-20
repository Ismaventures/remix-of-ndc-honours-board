import { useState } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { AppSidebar, SectionKey } from '@/components/AppSidebar';
import { PersonnelTable } from '@/components/PersonnelTable';
import { VisitsSection } from '@/components/VisitsSection';
import { AdminPanel } from '@/components/AdminPanel';
import { CommandantHero } from '@/components/CommandantHero';
import { AutoRotationDisplay } from '@/components/AutoRotationDisplay';
import { usePersonnelStore, useVisitsStore } from '@/hooks/useStore';

const SECTION_TITLES: Record<SectionKey, string> = {
  fwc: 'Distinguished Fellows of the War College (FWC)',
  fdc: 'Distinguished Fellows of the Defence College (FDC)',
  directing: 'Chronicle of Directing Staff',
  allied: 'Allied Officers',
  visits: 'Distinguished Visits & Honours',
  admin: 'Admin Panel',
};

const SECTION_CATEGORIES = {
  fwc: 'FWC' as const,
  fdc: 'FDC' as const,
  directing: 'Directing Staff' as const,
  allied: 'Allied' as const,
};

const Index = () => {
  const [section, setSection] = useState<SectionKey>('fwc');
  const { personnel, addPersonnel, updatePersonnel, deletePersonnel } = usePersonnelStore();
  const { visits, addVisit, updateVisit, deleteVisit } = useVisitsStore();

  const showHero = section !== 'admin';

  const renderContent = () => {
    if (section === 'visits') {
      return <VisitsSection visits={visits} />;
    }
    if (section === 'admin') {
      return (
        <AdminPanel
          personnel={personnel}
          visits={visits}
          onAddPersonnel={addPersonnel}
          onUpdatePersonnel={updatePersonnel}
          onDeletePersonnel={deletePersonnel}
          onAddVisit={addVisit}
          onUpdateVisit={updateVisit}
          onDeleteVisit={deleteVisit}
        />
      );
    }
    const category = SECTION_CATEGORIES[section as keyof typeof SECTION_CATEGORIES];
    return (
      <PersonnelTable
        key={section}
        data={personnel}
        title={SECTION_TITLES[section]}
        category={category}
      />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-background animate-bg-sweep bg-gradient-to-br from-background via-background to-secondary/10">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <AppSidebar active={section} onNavigate={setSection} />
        <main className="flex-1 overflow-y-auto p-8">
          {/* Auto-rotation button */}
          <div className="flex justify-end mb-4">
            <AutoRotationDisplay personnel={personnel} visits={visits} />
          </div>

          {/* Commandant Hero — shown on all sections except admin */}
          {showHero && <CommandantHero />}

          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;
