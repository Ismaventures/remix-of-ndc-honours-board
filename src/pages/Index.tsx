import { useState, useEffect } from 'react';
import { AppHeader } from '@/components/AppHeader';
import { CommandantHero } from '@/components/CommandantHero';
import { PastCommandants } from '@/components/PastCommandants';
import { CategoryCards, ViewKey } from '@/components/CategoryCards';
import { OrganogramView } from '@/components/OrganogramView';
import { VisitsSection } from '@/components/VisitsSection';
import { AdminPanel } from '@/components/AdminPanel';
import { AdminLogin } from '@/components/AdminLogin';
import { AutoRotationDisplay } from '@/components/AutoRotationDisplay';
import { BootSequence } from '@/components/BootSequence';
import { AudioManager } from '@/components/AudioManager';
import { usePersonnelStore, useVisitsStore, useCommandantsStore } from '@/hooks/useStore';
import { useThemeMode } from '@/hooks/useThemeMode';
import { Category } from '@/types/domain';
import { supabase } from '@/lib/supabaseClient';

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
  const [isBooting, setIsBooting] = useState(true);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const [view, setView] = useState<ViewKey>('home');
  const { themeMode, setThemeMode, resetThemeMode } = useThemeMode();
  const { personnel, addPersonnel, updatePersonnel, deletePersonnel } = usePersonnelStore();
  const { visits, addVisit, updateVisit, deleteVisit } = useVisitsStore();
  const { commandants, addCommandant, updateCommandant, deleteCommandant } = useCommandantsStore();

  const currentCommandant = commandants.find(c => c.isCurrent);
  const activeCategory = SECTION_CATEGORIES[view] ?? null;
  const activeView = view === 'visits' ? 'visits' : view === 'home' ? 'home' : view === 'admin' ? 'admin' : 'category';

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setAdminAuthenticated(Boolean(data.session));
      setAuthReady(true);
    };

    void initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAdminAuthenticated(Boolean(session));
      setAuthReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
      if (!authReady) {
        return <div className="text-sm text-muted-foreground">Checking admin session...</div>;
      }

      if (!adminAuthenticated) {
        return <AdminLogin onSuccess={() => setAdminAuthenticated(true)} />;
      }

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
          themeMode={themeMode}
          onThemeModeChange={setThemeMode}
          onResetThemeMode={resetThemeMode}
          onSignOut={() => {
            void supabase.auth.signOut();
            setAdminAuthenticated(false);
          }}
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
    <>
      <AudioManager />
      {isBooting && <BootSequence onComplete={() => setIsBooting(false)} />}
      <div className={`min-h-screen flex flex-col bg-background animate-bg-sweep bg-gradient-to-br from-background via-background to-secondary/10 transition-opacity duration-1000 ${isBooting ? 'opacity-0' : 'opacity-100'}`}>
        <AppHeader onHomeClick={() => setView('home')} />
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-8">
            {/* Auto-rotation button */}
            <div className="flex justify-end mb-4">
              <AutoRotationDisplay personnel={personnel} visits={visits} commandants={commandants} activeCategory={activeCategory} activeView={activeView} />
            </div>

            {renderContent()}
          </div>
        </main>
      </div>
    </>
  );
};

export default Index;
