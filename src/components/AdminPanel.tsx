import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, ArrowLeft } from 'lucide-react';
import { Personnel, DistinguishedVisit, Commandant, Category, Service } from '@/types/domain';
import { AdvancedAudioAdmin } from './AdvancedAudioAdmin';
import { saveMediaFile } from '@/lib/persistentMedia';
import { ThemeMode } from '@/hooks/useThemeMode';
import { BootSequenceSettings } from '@/hooks/useBootSequenceSettings';
import {
  AUTO_DISPLAY_CONTEXTS,
  AutoDisplayContextKey,
  AutoDisplaySettings,
  AutoDisplayTiming,
  AutoDisplayTransitionType,
  DEFAULT_AUTO_DISPLAY_SETTINGS,
  TRANSITION_TYPES,
} from '@/hooks/useAutoDisplaySettings';

interface AdminPanelProps {
  personnel: Personnel[];
  visits: DistinguishedVisit[];
  commandants: Commandant[];
  onAddPersonnel: (p: Omit<Personnel, 'id'>) => void;
  onUpdatePersonnel: (id: string, data: Partial<Personnel>) => void;
  onDeletePersonnel: (id: string) => void;
  onAddVisit: (v: Omit<DistinguishedVisit, 'id'>) => void;
  onUpdateVisit: (id: string, data: Partial<DistinguishedVisit>) => void;
  onDeleteVisit: (id: string) => void;
  onAddCommandant: (c: Omit<Commandant, 'id'>) => void;
  onUpdateCommandant: (id: string, data: Partial<Commandant>) => void;
  onDeleteCommandant: (id: string) => void;
  themeMode: ThemeMode;
  onThemeModeChange: (mode: ThemeMode) => void;
  onResetThemeMode: () => void;
  bootSequenceSettings: BootSequenceSettings;
  onBootSequenceSettingsChange: (settings: Partial<BootSequenceSettings>) => void;
  onResetBootSequenceSettings: () => void;
  autoDisplaySettings: AutoDisplaySettings;
  onAutoDisplayGlobalTimingChange: (timing: Partial<AutoDisplayTiming>) => void;
  onAutoDisplayContextTimingChange: (context: AutoDisplayContextKey, timing: Partial<AutoDisplayTiming>) => void;
  onAutoDisplayTransitionDurationChange: (transition: AutoDisplayTransitionType, durationMs: number) => void;
  onAutoDisplayTransitionSequenceChange: (sequence: AutoDisplayTransitionType[]) => void;
  onAutoDisplayContextTransitionSequenceChange: (context: AutoDisplayContextKey, sequence: AutoDisplayTransitionType[]) => void;
  onImportAutoDisplaySettings: (settings: Partial<AutoDisplaySettings>) => void;
  onResetAutoDisplaySettings: () => void;
  audioSettings?: { audioUrl: string | null };
  onUpdateAudioSettings?: (url: string | null) => void;
  onBack: () => void;
  onSignOut?: () => void;
}

const CATEGORIES: Category[] = ['FWC', 'FDC', 'Directing Staff', 'Allied'];
const SERVICES: Service[] = ['Army', 'Navy', 'Air Force', 'Civilian', 'Foreign'];
const MAX_MEDIA_SIZE_MB = 8;
const THEME_OPTIONS: Array<{ mode: ThemeMode; label: string; description: string }> = [
  {
    mode: 'outdoor-tactical-light',
    label: 'Outdoor 1 - Tactical Light',
    description: 'White-first NDC palette with deep navy foundations and gold accents for clean outdoor readability.',
  },
  {
    mode: 'outdoor-high-contrast-command',
    label: 'Outdoor 2 - High Contrast Command',
    description: 'Maximum visibility with command-grade contrast and signal accents.',
  },
  {
    mode: 'outdoor-tri-service',
    label: 'Outdoor 3 - Tri-Service Colors',
    description: 'Bright red, navy, and light blue combination for vivid presence.',
  },
  {
    mode: 'indoor-defence-classic',
    label: 'Indoor 1 - Defence Classic',
    description: 'Formal navy and gold style aligned to institutional identity.',
  },
  {
    mode: 'indoor-modern-command-ui',
    label: 'Indoor 2 - Modern Command UI',
    description: 'Modern charcoal and cyan interface for operations dashboards.',
  },
  {
    mode: 'indoor-tri-service',
    label: 'Indoor 3 - Tri-Service Colors',
    description: 'Rich dark navy with striking red and light blue accents.',
  },
];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function AdminPanel({
  personnel, visits, commandants,
  onAddPersonnel, onUpdatePersonnel, onDeletePersonnel,
  onAddVisit, onUpdateVisit, onDeleteVisit,
  onAddCommandant, onUpdateCommandant, onDeleteCommandant,
  themeMode, onThemeModeChange, onResetThemeMode,
  bootSequenceSettings, onBootSequenceSettingsChange, onResetBootSequenceSettings,
  autoDisplaySettings,
  onAutoDisplayGlobalTimingChange,
  onAutoDisplayContextTimingChange,
  onAutoDisplayTransitionDurationChange,
  onAutoDisplayTransitionSequenceChange,
  onAutoDisplayContextTransitionSequenceChange,
  onImportAutoDisplaySettings,
  onResetAutoDisplaySettings,
  audioSettings, onUpdateAudioSettings,
  onBack,
  onSignOut,
}: AdminPanelProps) {
  const [tab, setTab] = useState<'personnel' | 'visits' | 'commandants' | 'theme' | 'transitions' | 'audio'>('personnel');
  const [editingP, setEditingP] = useState<Personnel | null>(null);
  const [editingV, setEditingV] = useState<DistinguishedVisit | null>(null);
  const [editingC, setEditingC] = useState<Commandant | null>(null);
  const [showFormP, setShowFormP] = useState(false);
  const [showFormV, setShowFormV] = useState(false);
  const [showFormC, setShowFormC] = useState(false);
  const [sequenceContext, setSequenceContext] = useState<AutoDisplayContextKey>('commandants');
  const [settingsImportStatus, setSettingsImportStatus] = useState<string | null>(null);
  const [themeDraft, setThemeDraft] = useState<ThemeMode>(themeMode);
  const [bootDraft, setBootDraft] = useState<BootSequenceSettings>(bootSequenceSettings);
  const [autoDisplayDraft, setAutoDisplayDraft] = useState<AutoDisplaySettings>(autoDisplaySettings);
  const [previewTransition, setPreviewTransition] = useState<AutoDisplayTransitionType>('fade-zoom');
  const [previewNonce, setPreviewNonce] = useState(0);

  useEffect(() => {
    setThemeDraft(themeMode);
  }, [themeMode]);

  useEffect(() => {
    setBootDraft(bootSequenceSettings);
  }, [bootSequenceSettings]);

  useEffect(() => {
    setAutoDisplayDraft(autoDisplaySettings);
  }, [autoDisplaySettings]);

  const isThemeDirty = themeDraft !== themeMode;
  const isBootDirty =
    bootDraft.totalDurationMs !== bootSequenceSettings.totalDurationMs ||
    bootDraft.archiveTransitionMs !== bootSequenceSettings.archiveTransitionMs;
  const isAutoDisplayDirty = JSON.stringify(autoDisplayDraft) !== JSON.stringify(autoDisplaySettings);

  const toggleTransitionInSequence = (transition: AutoDisplayTransitionType, enabled: boolean) => {
    const current = autoDisplayDraft.transitionSequence;
    if (enabled) {
      if (current.includes(transition)) return;
      setAutoDisplayDraft(prev => ({
        ...prev,
        transitionSequence: [...current, transition],
      }));
      return;
    }

    const next = current.filter(item => item !== transition);
    if (next.length === 0) return;
    setAutoDisplayDraft(prev => ({
      ...prev,
      transitionSequence: next,
    }));
  };

  const moveTransitionInSequence = (transition: AutoDisplayTransitionType, direction: -1 | 1) => {
    const current = [...autoDisplayDraft.transitionSequence];
    const index = current.findIndex(item => item === transition);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= current.length) return;

    const temp = current[index];
    current[index] = current[target];
    current[target] = temp;
    setAutoDisplayDraft(prev => ({
      ...prev,
      transitionSequence: current,
    }));
  };

  const toggleTransitionInContextSequence = (context: AutoDisplayContextKey, transition: AutoDisplayTransitionType, enabled: boolean) => {
    const current = autoDisplayDraft.transitionSequenceByContext[context] ?? autoDisplayDraft.transitionSequence;
    if (enabled) {
      if (current.includes(transition)) return;
      setAutoDisplayDraft(prev => ({
        ...prev,
        transitionSequenceByContext: {
          ...prev.transitionSequenceByContext,
          [context]: [...current, transition],
        },
      }));
      return;
    }

    const next = current.filter(item => item !== transition);
    if (next.length === 0) return;
    setAutoDisplayDraft(prev => ({
      ...prev,
      transitionSequenceByContext: {
        ...prev.transitionSequenceByContext,
        [context]: next,
      },
    }));
  };

  const moveTransitionInContextSequence = (context: AutoDisplayContextKey, transition: AutoDisplayTransitionType, direction: -1 | 1) => {
    const current = [...(autoDisplayDraft.transitionSequenceByContext[context] ?? autoDisplayDraft.transitionSequence)];
    const index = current.findIndex(item => item === transition);
    if (index < 0) return;
    const target = index + direction;
    if (target < 0 || target >= current.length) return;
    const temp = current[index];
    current[index] = current[target];
    current[target] = temp;
    setAutoDisplayDraft(prev => ({
      ...prev,
      transitionSequenceByContext: {
        ...prev.transitionSequenceByContext,
        [context]: current,
      },
    }));
  };

  const exportSettingsBundle = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      bootSequenceSettings,
      autoDisplaySettings,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ndc-ui-settings.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importSettingsBundle = async (file: File | null) => {
    if (!file) return;

    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw) as {
        bootSequenceSettings?: Partial<BootSequenceSettings>;
        autoDisplaySettings?: Partial<AutoDisplaySettings>;
      };

      if (parsed.bootSequenceSettings) {
        setBootDraft(prev => ({ ...prev, ...parsed.bootSequenceSettings }));
      }

      if (parsed.autoDisplaySettings) {
        setAutoDisplayDraft(prev => ({
          ...prev,
          ...parsed.autoDisplaySettings,
          global: {
            ...prev.global,
            ...parsed.autoDisplaySettings.global,
          },
          byContext: {
            ...prev.byContext,
            ...parsed.autoDisplaySettings.byContext,
          },
          transitionDurationByTypeMs: {
            ...prev.transitionDurationByTypeMs,
            ...parsed.autoDisplaySettings.transitionDurationByTypeMs,
          },
          transitionSequenceByContext: {
            ...prev.transitionSequenceByContext,
            ...parsed.autoDisplaySettings.transitionSequenceByContext,
          },
        }));
      }

      setSettingsImportStatus('Settings imported into preview. Click Apply & Save to publish.');
      setTimeout(() => setSettingsImportStatus(null), 2500);
    } catch {
      setSettingsImportStatus('Could not import settings. Please use a valid JSON export file.');
      setTimeout(() => setSettingsImportStatus(null), 3500);
    }
  };

  const applyThemeSettings = () => {
    onThemeModeChange(themeDraft);
  };

  const applyBootAndTransitionsSettings = () => {
    onBootSequenceSettingsChange(bootDraft);
    onImportAutoDisplaySettings(autoDisplayDraft);
  };

  const getPreviewTransitionClasses = (transition: AutoDisplayTransitionType) => {
    switch (transition) {
      case 'slide-up':
        return 'animate-[preview-slide-up_900ms_ease-out_forwards]';
      case 'slide-left':
        return 'animate-[preview-slide-left_900ms_ease-out_forwards]';
      case 'slide-right':
        return 'animate-[preview-slide-right_900ms_ease-out_forwards]';
      case 'slide-down':
        return 'animate-[preview-slide-down_900ms_ease-out_forwards]';
      case 'zoom-out':
        return 'animate-[preview-zoom-out_900ms_ease-out_forwards]';
      case 'flip-x':
        return 'animate-[preview-flip-x_900ms_ease-out_forwards]';
      case 'flip-y':
        return 'animate-[preview-flip-y_900ms_ease-out_forwards]';
      case 'rotate-in':
        return 'animate-[preview-rotate-in_900ms_ease-out_forwards]';
      case 'blur-in':
        return 'animate-[preview-blur-in_900ms_ease-out_forwards]';
      case 'skew-lift':
        return 'animate-[preview-skew-lift_900ms_ease-out_forwards]';
      case 'scale-rise':
        return 'animate-[preview-scale-rise_900ms_ease-out_forwards]';
      case 'ndc-scatter':
        return 'animate-[preview-ndc-scatter_900ms_ease-out_forwards]';
      case 'fade-zoom':
      default:
        return 'animate-[preview-fade-zoom_900ms_ease-out_forwards]';
    }
  };

  const tabBtn = (key: typeof tab, label: string) => (
    <button
      onClick={() => setTab(key)}
      className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-all ${
        tab === key
          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-100'
          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground active:scale-95'
      }`}
    >
      {label}
    </button>
  );

  const EmptyState = ({ message, onAdd }: { message: string, onAdd: () => void }) => (
    <div className="flex flex-col items-center justify-center p-12 gold-border border-dashed rounded-xl bg-card/30 text-center view-enter">
      <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4">
        <Plus className="h-8 w-8 text-primary/50" />
      </div>
      <p className="text-muted-foreground mb-4">{message}</p>
      <button onClick={onAdd} className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-medium hover:bg-primary/90 transition-colors">
        Add First Record
      </button>
    </div>
  );

  return (
    <div className="page-enter-slide">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={onBack}
            className="p-2 rounded-full border border-primary/20 bg-card hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all active:scale-95 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold font-serif gold-text leading-tight truncate">Admin Console</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Manage records and system options</p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="px-3 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-primary/30 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            >
              Sign Out
            </button>
          )}
          <div className="flex gap-2 p-1 bg-card/60 backdrop-blur-sm rounded-full border border-primary/15 overflow-x-auto max-w-[calc(100vw-120px)] lg:max-w-none">
            {tabBtn('personnel', 'Personnel')}
            {tabBtn('visits', 'Visits')}
            {tabBtn('commandants', 'Commandants')}
            {tabBtn('theme', 'Theme')}
            {tabBtn('transitions', 'Transitions')}
            {tabBtn('audio', 'Audio Settings')}
          </div>
        </div>
      </div>

      <div className="relative">
        {tab === 'personnel' && (
          <div className="view-enter">
            {!showFormP && (
              <div className="flex justify-end mb-4">
                <button onClick={() => { setEditingP(null); setShowFormP(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.97]">
                  <Plus className="h-4 w-4" /> Add Personnel
                </button>
              </div>
            )}
            
            {showFormP ? (
              <PersonnelForm
                initial={editingP}
                onSave={(data) => {
                  if (editingP) onUpdatePersonnel(editingP.id, data);
                  else onAddPersonnel(data as Omit<Personnel, 'id'>);
                  setShowFormP(false); setEditingP(null);
                }}
                onCancel={() => { setShowFormP(false); setEditingP(null); }}
              />
            ) : personnel.length === 0 ? (
              <EmptyState message="No personnel records found." onAdd={() => setShowFormP(true)} />
            ) : (
              <div className="surface-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-primary text-xs uppercase tracking-wider border-b border-primary/10">
                        <th className="px-4 py-4 text-left font-semibold">Name</th>
                        <th className="px-4 py-4 text-left font-semibold">Category</th>
                        <th className="px-4 py-4 text-left font-semibold">Rank</th>
                        <th className="px-4 py-4 text-center font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {personnel.slice(0, 20).map(p => (
                        <tr key={p.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-4 py-3 font-medium text-foreground">{p.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                              {p.category}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{p.rank}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingP(p); setShowFormP(true); }} className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                              <button onClick={() => onDeletePersonnel(p.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'visits' && (
          <div className="view-enter">
            {!showFormV && (
              <div className="flex justify-end mb-4">
                <button onClick={() => { setEditingV(null); setShowFormV(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.97]">
                  <Plus className="h-4 w-4" /> Add Visit
                </button>
              </div>
            )}
            
            {showFormV ? (
              <VisitForm
                initial={editingV}
                onSave={(data) => {
                  if (editingV) onUpdateVisit(editingV.id, data);
                  else onAddVisit(data as Omit<DistinguishedVisit, 'id'>);
                  setShowFormV(false); setEditingV(null);
                }}
                onCancel={() => { setShowFormV(false); setEditingV(null); }}
              />
            ) : visits.length === 0 ? (
              <EmptyState message="No distinguished visits recorded." onAdd={() => setShowFormV(true)} />
            ) : (
              <div className="surface-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-primary text-xs uppercase tracking-wider border-b border-primary/10">
                        <th className="px-4 py-4 text-left font-semibold">Name</th>
                        <th className="px-4 py-4 text-left font-semibold">Country</th>
                        <th className="px-4 py-4 text-left font-semibold">Date</th>
                        <th className="px-4 py-4 text-center font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {visits.map(v => (
                        <tr key={v.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-4 py-3 font-medium text-foreground">{v.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{v.country}</td>
                          <td className="px-4 py-3 text-muted-foreground">{v.date}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingV(v); setShowFormV(true); }} className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                              <button onClick={() => onDeleteVisit(v.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'commandants' && (
          <div className="view-enter">
            {!showFormC && (
              <div className="flex justify-end mb-4">
                <button onClick={() => { setEditingC(null); setShowFormC(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-[0.97]">
                  <Plus className="h-4 w-4" /> Add Commandant
                </button>
              </div>
            )}
            
            {showFormC ? (
              <CommandantForm
                initial={editingC}
                onSave={(data) => {
                  if (editingC) onUpdateCommandant(editingC.id, data);
                  else onAddCommandant(data as Omit<Commandant, 'id'>);
                  setShowFormC(false); setEditingC(null);
                }}
                onCancel={() => { setShowFormC(false); setEditingC(null); }}
              />
            ) : commandants.length === 0 ? (
              <EmptyState message="No commandants on record." onAdd={() => setShowFormC(true)} />
            ) : (
              <div className="surface-panel overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/40 text-primary text-xs uppercase tracking-wider border-b border-primary/10">
                        <th className="px-4 py-4 text-left font-semibold">Name</th>
                        <th className="px-4 py-4 text-left font-semibold">Tenure</th>
                        <th className="px-4 py-4 text-left font-semibold">Status</th>
                        <th className="px-4 py-4 text-center font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-primary/5">
                      {commandants.map(c => (
                        <tr key={c.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-4 py-3 font-medium text-foreground">{c.name}</td>
                          <td className="px-4 py-3 text-muted-foreground">{c.tenureStart} – {c.tenureEnd ?? 'Present'}</td>
                          <td className="px-4 py-3">
                            {c.isCurrent ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-semibold bg-primary/20 text-primary border border-primary/30">
                                Current
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] uppercase font-medium bg-muted text-muted-foreground border border-muted-foreground/20">
                                Past
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => { setEditingC(c); setShowFormC(true); }} className="p-1.5 rounded-md hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"><Pencil className="h-4 w-4" /></button>
                              <button onClick={() => onDeleteCommandant(c.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'audio' && (
          <div className="view-enter">
            <AdvancedAudioAdmin />
          </div>
        )}

        {tab === 'theme' && (
          <div className="view-enter">
            <div className="surface-panel p-5 md:p-6">
              <div className="mb-5">
                <h4 className="text-base font-semibold gold-text">Display Theme Control</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  The selected theme is saved and reused whenever the application starts until an admin changes it.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {THEME_OPTIONS.map(option => {
                  const isActive = themeDraft === option.mode;
                  return (
                    <button
                      key={option.mode}
                      onClick={() => setThemeDraft(option.mode)}
                      className={`text-left rounded-lg border p-4 transition-all ${
                        isActive
                          ? 'border-primary/60 bg-primary/10 shadow-md shadow-primary/10'
                          : 'border-primary/15 bg-card/50 hover:border-primary/35 hover:bg-muted/30'
                      }`}
                    >
                      <p className="text-sm font-semibold text-foreground">{option.label}</p>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{option.description}</p>
                      <p className={`mt-3 text-[10px] uppercase tracking-wider font-semibold ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                        {isActive ? 'Active Mode' : 'Click to Activate'}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => setThemeDraft('indoor-defence-classic')}
                  className="px-4 py-2 rounded-md text-sm font-medium border border-primary/25 text-foreground bg-card hover:bg-muted/40 transition-colors"
                >
                  Reset Draft to Default (Indoor 1)
                </button>
                <button
                  onClick={applyThemeSettings}
                  disabled={!isThemeDirty}
                  className="px-4 py-2 rounded-md text-sm font-medium border border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Apply & Save Theme
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'transitions' && (
          <div className="view-enter">
            <div className="surface-panel p-5 md:p-6">
              <div className="mb-5">
                <h4 className="text-base font-semibold gold-text">Transition & Boot Experience</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Control boot timing, transition styles, and sequence behavior. These settings stay saved until an admin changes them.
                </p>
              </div>

              <div className="mt-2 border-t border-primary/10 pt-6">
                <h4 className="text-base font-semibold gold-text">Boot Sequence Timing</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Tune how fast archive portraits transition and how long the full initialization lasts.
                </p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Archive Transition</label>
                      <span className="text-xs text-foreground">{bootDraft.archiveTransitionMs} ms</span>
                    </div>
                    <input
                      type="range"
                      min={250}
                      max={2000}
                      step={50}
                      value={bootDraft.archiveTransitionMs}
                      onChange={e => setBootDraft(prev => ({ ...prev, archiveTransitionMs: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Boot Duration</label>
                      <span className="text-xs text-foreground">{bootDraft.totalDurationMs} ms</span>
                    </div>
                    <input
                      type="range"
                      min={7000}
                      max={24000}
                      step={500}
                      value={bootDraft.totalDurationMs}
                      onChange={e => setBootDraft(prev => ({ ...prev, totalDurationMs: Number(e.target.value) }))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={() => setBootDraft({ totalDurationMs: 11000, archiveTransitionMs: 600 })}
                    className="px-4 py-2 rounded-md text-sm font-medium border border-primary/25 text-foreground bg-card hover:bg-muted/40 transition-colors"
                  >
                    Reset Boot Draft Defaults
                  </button>
                </div>
              </div>

              <div className="mt-8 border-t border-primary/10 pt-6">
                <h4 className="text-base font-semibold gold-text">Auto Display Transition Control</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  All timing and sequence settings are saved locally and remain unchanged after closing and reopening the app until an admin updates them.
                </p>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Global Slide Time</label>
                      <span className="text-xs text-foreground">{autoDisplayDraft.global.slideDurationMs} ms</span>
                    </div>
                    <input
                      type="range"
                      min={3000}
                      max={30000}
                      step={250}
                      value={autoDisplayDraft.global.slideDurationMs}
                      onChange={e => setAutoDisplayDraft(prev => ({ ...prev, global: { ...prev.global, slideDurationMs: Number(e.target.value) } }))}
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Global Transition Time</label>
                      <span className="text-xs text-foreground">{autoDisplayDraft.global.transitionDurationMs} ms</span>
                    </div>
                    <input
                      type="range"
                      min={250}
                      max={2600}
                      step={50}
                      value={autoDisplayDraft.global.transitionDurationMs}
                      onChange={e => setAutoDisplayDraft(prev => ({ ...prev, global: { ...prev.global, transitionDurationMs: Number(e.target.value) } }))}
                      className="w-full"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Category-Specific Timing</p>
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {AUTO_DISPLAY_CONTEXTS.map(context => (
                      <div key={context.key} className="rounded-lg border border-primary/15 bg-card/60 p-3 space-y-3">
                        <p className="text-sm font-semibold text-foreground">{context.label}</p>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Slide Time</label>
                            <span className="text-[11px] text-foreground">{autoDisplayDraft.byContext[context.key].slideDurationMs} ms</span>
                          </div>
                          <input
                            type="range"
                            min={3000}
                            max={30000}
                            step={250}
                            value={autoDisplayDraft.byContext[context.key].slideDurationMs}
                            onChange={e => setAutoDisplayDraft(prev => ({
                              ...prev,
                              byContext: {
                                ...prev.byContext,
                                [context.key]: {
                                  ...prev.byContext[context.key],
                                  slideDurationMs: Number(e.target.value),
                                },
                              },
                            }))}
                            className="w-full"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] uppercase tracking-wider text-muted-foreground">Transition Base Time</label>
                            <span className="text-[11px] text-foreground">{autoDisplayDraft.byContext[context.key].transitionDurationMs} ms</span>
                          </div>
                          <input
                            type="range"
                            min={250}
                            max={2600}
                            step={50}
                            value={autoDisplayDraft.byContext[context.key].transitionDurationMs}
                            onChange={e => setAutoDisplayDraft(prev => ({
                              ...prev,
                              byContext: {
                                ...prev.byContext,
                                [context.key]: {
                                  ...prev.byContext[context.key],
                                  transitionDurationMs: Number(e.target.value),
                                },
                              },
                            }))}
                            className="w-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 xl:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-primary/15 bg-card/60 p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Transition Library (Enable / Disable)</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {TRANSITION_TYPES.map(transition => {
                        const enabled = autoDisplayDraft.transitionSequence.includes(transition.id);
                        return (
                          <label key={transition.id} className="flex items-center justify-between gap-2 rounded border border-primary/10 px-2 py-1.5 text-xs">
                            <span className="text-foreground">{transition.label}</span>
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={e => toggleTransitionInSequence(transition.id, e.target.checked)}
                            />
                          </label>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-3">At least one transition must stay enabled.</p>
                  </div>

                  <div className="rounded-lg border border-primary/15 bg-card/60 p-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Sequence Order</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                      {autoDisplayDraft.transitionSequence.map((transition, index) => {
                        const label = TRANSITION_TYPES.find(item => item.id === transition)?.label ?? transition;
                        return (
                          <div key={`${transition}-${index}`} className="flex items-center justify-between gap-2 rounded border border-primary/10 px-2 py-1.5 text-xs">
                            <span className="text-foreground">{index + 1}. {label}</span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveTransitionInSequence(transition, -1)}
                                className="px-2 py-1 rounded border border-primary/20 hover:bg-muted/40"
                              >
                                Up
                              </button>
                              <button
                                type="button"
                                onClick={() => moveTransitionInSequence(transition, 1)}
                                className="px-2 py-1 rounded border border-primary/20 hover:bg-muted/40"
                              >
                                Down
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-primary/15 bg-card/60 p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Per-Category Sequence Order</p>
                    <select
                      value={sequenceContext}
                      onChange={e => setSequenceContext(e.target.value as AutoDisplayContextKey)}
                      className="bg-background border border-primary/20 rounded-md px-2 py-1 text-xs text-foreground"
                    >
                      {AUTO_DISPLAY_CONTEXTS.map(context => (
                        <option key={context.key} value={context.key}>{context.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[11px] text-muted-foreground mb-2">Enable transitions for selected category</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {TRANSITION_TYPES.map(transition => {
                          const activeSequence = autoDisplayDraft.transitionSequenceByContext[sequenceContext] ?? autoDisplayDraft.transitionSequence;
                          const enabled = activeSequence.includes(transition.id);
                          return (
                            <label key={`${sequenceContext}-${transition.id}`} className="flex items-center justify-between gap-2 rounded border border-primary/10 px-2 py-1.5 text-xs">
                              <span className="text-foreground">{transition.label}</span>
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={e => toggleTransitionInContextSequence(sequenceContext, transition.id, e.target.checked)}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] text-muted-foreground mb-2">Order used for selected category</p>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {(autoDisplayDraft.transitionSequenceByContext[sequenceContext] ?? autoDisplayDraft.transitionSequence).map((transition, index) => {
                          const label = TRANSITION_TYPES.find(item => item.id === transition)?.label ?? transition;
                          return (
                            <div key={`${sequenceContext}-${transition}-${index}`} className="flex items-center justify-between gap-2 rounded border border-primary/10 px-2 py-1.5 text-xs">
                              <span className="text-foreground">{index + 1}. {label}</span>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => moveTransitionInContextSequence(sequenceContext, transition, -1)}
                                  className="px-2 py-1 rounded border border-primary/20 hover:bg-muted/40"
                                >
                                  Up
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveTransitionInContextSequence(sequenceContext, transition, 1)}
                                  className="px-2 py-1 rounded border border-primary/20 hover:bg-muted/40"
                                >
                                  Down
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-primary/15 bg-card/60 p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">Individual Transition Times</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {TRANSITION_TYPES.map(transition => (
                      <div key={transition.id} className="space-y-1.5 rounded border border-primary/10 p-2">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] text-foreground">{transition.label}</label>
                          <span className="text-[11px] text-muted-foreground">{autoDisplayDraft.transitionDurationByTypeMs[transition.id]} ms</span>
                        </div>
                        <input
                          type="range"
                          min={250}
                          max={3000}
                          step={50}
                          value={autoDisplayDraft.transitionDurationByTypeMs[transition.id]}
                          onChange={e => setAutoDisplayDraft(prev => ({
                            ...prev,
                            transitionDurationByTypeMs: {
                              ...prev.transitionDurationByTypeMs,
                              [transition.id]: Number(e.target.value),
                            },
                          }))}
                          className="w-full"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewTransition(transition.id);
                            setPreviewNonce(prev => prev + 1);
                          }}
                          className="w-full mt-1 px-2 py-1 rounded border border-primary/20 text-[11px] uppercase tracking-wider text-primary hover:bg-primary/10"
                        >
                          Preview
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-primary/15 bg-card/60 p-3">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">Transition Preview</p>
                  <div className="h-28 rounded-lg border border-primary/20 bg-slate-950/70 overflow-hidden relative flex items-center justify-center">
                    <div
                      key={`${previewTransition}-${previewNonce}`}
                      className={`px-6 py-3 rounded-md border border-primary/35 bg-primary/15 text-primary font-semibold tracking-wider ${getPreviewTransitionClasses(previewTransition)}`}
                    >
                      {TRANSITION_TYPES.find(item => item.id === previewTransition)?.label ?? previewTransition}
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">Use Preview to test animation before you apply and save.</p>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    onClick={exportSettingsBundle}
                    className="px-4 py-2 rounded-md text-sm font-medium border border-primary/25 text-foreground bg-card hover:bg-muted/40 transition-colors"
                  >
                    Export UI Settings
                  </button>
                  <label className="px-4 py-2 rounded-md text-sm font-medium border border-primary/25 text-foreground bg-card hover:bg-muted/40 transition-colors cursor-pointer">
                    Import UI Settings
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={e => {
                        void importSettingsBundle(e.target.files?.[0] ?? null);
                        e.currentTarget.value = '';
                      }}
                    />
                  </label>
                  <button
                    onClick={() => {
                      setBootDraft({ totalDurationMs: 11000, archiveTransitionMs: 600 });
                      setAutoDisplayDraft(DEFAULT_AUTO_DISPLAY_SETTINGS);
                    }}
                    className="px-4 py-2 rounded-md text-sm font-medium border border-primary/25 text-foreground bg-card hover:bg-muted/40 transition-colors"
                  >
                    Reset Auto Display Defaults
                  </button>
                  <button
                    onClick={applyBootAndTransitionsSettings}
                    disabled={!isBootDirty && !isAutoDisplayDirty}
                    className="px-4 py-2 rounded-md text-sm font-medium border border-primary/40 text-primary bg-primary/10 hover:bg-primary/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Apply & Save Transitions
                  </button>
                </div>
                {settingsImportStatus && (
                  <p className="text-xs text-primary mt-3">{settingsImportStatus}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes preview-fade-zoom { from { opacity: 0; transform: scale(0.92);} to { opacity: 1; transform: scale(1);} }
          @keyframes preview-slide-up { from { opacity: 0; transform: translateY(18px);} to { opacity: 1; transform: translateY(0);} }
          @keyframes preview-slide-left { from { opacity: 0; transform: translateX(-18px);} to { opacity: 1; transform: translateX(0);} }
          @keyframes preview-slide-right { from { opacity: 0; transform: translateX(18px);} to { opacity: 1; transform: translateX(0);} }
          @keyframes preview-slide-down { from { opacity: 0; transform: translateY(-18px);} to { opacity: 1; transform: translateY(0);} }
          @keyframes preview-zoom-out { from { opacity: 0; transform: scale(1.08);} to { opacity: 1; transform: scale(1);} }
          @keyframes preview-flip-x { from { opacity: 0; transform: perspective(800px) rotateX(14deg);} to { opacity: 1; transform: perspective(800px) rotateX(0deg);} }
          @keyframes preview-flip-y { from { opacity: 0; transform: perspective(800px) rotateY(14deg);} to { opacity: 1; transform: perspective(800px) rotateY(0deg);} }
          @keyframes preview-rotate-in { from { opacity: 0; transform: rotate(3deg) scale(0.95);} to { opacity: 1; transform: rotate(0deg) scale(1);} }
          @keyframes preview-blur-in { from { opacity: 0; filter: blur(8px); transform: scale(1.02);} to { opacity: 1; filter: blur(0); transform: scale(1);} }
          @keyframes preview-skew-lift { from { opacity: 0; transform: skewY(2deg) translateY(10px);} to { opacity: 1; transform: skewY(0deg) translateY(0);} }
          @keyframes preview-scale-rise { from { opacity: 0; transform: scale(0.9) translateY(8px);} to { opacity: 1; transform: scale(1) translateY(0);} }
          @keyframes preview-ndc-scatter { from { opacity: 0; transform: scale(0.6) rotate(-8deg); filter: blur(5px);} to { opacity: 1; transform: scale(1) rotate(0deg); filter: blur(0);} }
        `}</style>
      </div>
    </div>
  );
}

/* --- Forms --- */

function PersonnelForm({ initial, onSave, onCancel }: {
  initial: Personnel | null;
  onSave: (data: Partial<Personnel>) => void;
  onCancel: () => void;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initial?.name || '',
    rank: initial?.rank || '',
    category: initial?.category || 'FWC' as Category,
    service: initial?.service || 'Army' as Service,
    periodStart: initial?.periodStart || 2020,
    periodEnd: initial?.periodEnd || 2022,
    citation: initial?.citation || 'Recognized for outstanding contributions to strategic leadership and national defence development.',
    imageUrl: initial?.imageUrl || '',
    seniorityOrder: initial?.seniorityOrder || 10,
  });
  const update = (key: string, value: string | number) => setForm(prev => ({ ...prev, [key]: value }));

  const onUploadImage = async (file: File | null) => {
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image or animated image file.');
      return;
    }

    if (file.size > MAX_MEDIA_SIZE_MB * 1024 * 1024) {
      setUploadError(`File is too large. Maximum size is ${MAX_MEDIA_SIZE_MB}MB.`);
      return;
    }

    try {
      const mediaRef = await saveMediaFile(file);
      update('imageUrl', mediaRef);
    } catch {
      setUploadError('Could not process the selected file.');
    }
  };

  return (
    <div className="surface-panel p-5 mb-6 view-enter relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      <div className="flex items-center justify-between mb-5">
        <div>
          <h4 className="text-base font-semibold gold-text">{initial ? 'Edit' : 'Add'} Personnel</h4>
          <p className="text-xs text-muted-foreground mt-1">Enter the details for this personnel record.</p>
        </div>
        <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Full Name</label>
          <input placeholder="Name" value={form.name} onChange={e => update('name', e.target.value)} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Rank / Title</label>
          <input placeholder="Rank" value={form.rank} onChange={e => update('rank', e.target.value)} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Category</label>
          <select value={form.category} onChange={e => update('category', e.target.value)} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Service Branch</label>
          <select value={form.service} onChange={e => update('service', e.target.value)} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30">
            {SERVICES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Period Start (Year)</label>
          <input type="number" placeholder="Period Start" value={form.periodStart} onChange={e => update('periodStart', parseInt(e.target.value))} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Period End (Year)</label>
          <input type="number" placeholder="Period End" value={form.periodEnd} onChange={e => update('periodEnd', parseInt(e.target.value))} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Seniority Order</label>
          <input type="number" placeholder="Order (1=highest)" value={form.seniorityOrder} onChange={e => update('seniorityOrder', parseInt(e.target.value))} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Image URL</label>
          <input placeholder="Image URL (optional)" value={form.imageUrl} onChange={e => update('imageUrl', e.target.value)} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
          <div className="flex items-center gap-2">
            <label className="px-3 py-1.5 text-xs rounded border border-primary/25 bg-card hover:bg-muted/40 cursor-pointer transition-colors text-muted-foreground hover:text-foreground">
              Upload Image / GIF
              <input type="file" accept="image/*,.gif,.webp" className="hidden" onChange={e => onUploadImage(e.target.files?.[0] ?? null)} />
            </label>
            {form.imageUrl && (
              <button type="button" onClick={() => update('imageUrl', '')} className="px-3 py-1.5 text-xs rounded border border-primary/20 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                Clear
              </button>
            )}
          </div>
          {uploadError && <p className="text-[11px] text-destructive">{uploadError}</p>}
          <p className="text-[10px] text-muted-foreground">Stored locally in this browser for testing.</p>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Citation / Bio</label>
          <textarea placeholder="Citation" value={form.citation} onChange={e => update('citation', e.target.value)} rows={2} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30 resize-none" />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-5 border-t border-primary/10">
        <button onClick={onCancel} className="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors order-2 sm:order-1">Cancel</button>
        <button onClick={() => onSave(form)} className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg shadow-primary/20 active:scale-[0.98] order-1 sm:order-2">
          {initial ? 'Save Changes' : 'Create Record'}
        </button>
      </div>
    </div>
  );
}

function VisitForm({ initial, onSave, onCancel }: {
  initial: DistinguishedVisit | null;
  onSave: (data: Partial<DistinguishedVisit>) => void;
  onCancel: () => void;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initial?.name || '',
    title: initial?.title || '',
    country: initial?.country || '',
    date: initial?.date || '',
    imageUrl: initial?.imageUrl || '',
    description: initial?.description || '',
  });
  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const onUploadImage = async (file: File | null) => {
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image or animated image file.');
      return;
    }

    if (file.size > MAX_MEDIA_SIZE_MB * 1024 * 1024) {
      setUploadError(`File is too large. Maximum size is ${MAX_MEDIA_SIZE_MB}MB.`);
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      update('imageUrl', dataUrl);
    } catch {
      setUploadError('Could not process the selected file.');
    }
  };

  return (
    <div className="surface-panel p-5 mb-6 view-enter relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      <div className="flex items-center justify-between mb-5">
        <div>
          <h4 className="text-base font-semibold gold-text">{initial ? 'Edit' : 'Add'} Visit</h4>
          <p className="text-xs text-muted-foreground mt-1">Enter the details for this distinguished visit.</p>
        </div>
        <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Visitor Name</label>
          <input placeholder="Name" value={form.name} onChange={e => update('name', e.target.value)} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Title / Position</label>
          <input placeholder="Title/Position" value={form.title} onChange={e => update('title', e.target.value)} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Country</label>
          <input placeholder="Country" value={form.country} onChange={e => update('country', e.target.value)} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Date of Visit</label>
          <input type="date" value={form.date} onChange={e => update('date', e.target.value)} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Image URL</label>
          <input placeholder="Image URL (optional)" value={form.imageUrl} onChange={e => update('imageUrl', e.target.value)} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
          <div className="flex items-center gap-2">
            <label className="px-3 py-1.5 text-xs rounded border border-primary/25 bg-card hover:bg-muted/40 cursor-pointer transition-colors text-muted-foreground hover:text-foreground">
              Upload Image / GIF
              <input type="file" accept="image/*,.gif,.webp" className="hidden" onChange={e => onUploadImage(e.target.files?.[0] ?? null)} />
            </label>
            {form.imageUrl && (
              <button type="button" onClick={() => update('imageUrl', '')} className="px-3 py-1.5 text-xs rounded border border-primary/20 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                Clear
              </button>
            )}
          </div>
          {uploadError && <p className="text-[11px] text-destructive">{uploadError}</p>}
          <p className="text-[10px] text-muted-foreground">Stored locally in this browser for testing.</p>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Visit Description / Context</label>
          <textarea placeholder="Description" value={form.description} onChange={e => update('description', e.target.value)} rows={2} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30 resize-none" />
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-5 border-t border-primary/10">
        <button onClick={onCancel} className="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors order-2 sm:order-1">Cancel</button>
        <button onClick={() => onSave(form)} className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg shadow-primary/20 active:scale-[0.98] order-1 sm:order-2">
          {initial ? 'Save Changes' : 'Create Record'}
        </button>
      </div>
    </div>
  );
}

function CommandantForm({ initial, onSave, onCancel }: {
  initial: Commandant | null;
  onSave: (data: Partial<Commandant>) => void;
  onCancel: () => void;
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: initial?.name || '',
    title: initial?.title || 'Commandant',
    tenureStart: initial?.tenureStart || 2020,
    tenureEnd: initial?.tenureEnd ?? '',
    imageUrl: initial?.imageUrl || '',
    description: initial?.description || '',
    isCurrent: initial?.isCurrent || false,
  });
  const update = (key: string, value: string | number | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  const onUploadImage = async (file: File | null) => {
    if (!file) return;
    setUploadError(null);

    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image or animated image file.');
      return;
    }

    if (file.size > MAX_MEDIA_SIZE_MB * 1024 * 1024) {
      setUploadError(`File is too large. Maximum size is ${MAX_MEDIA_SIZE_MB}MB.`);
      return;
    }

    try {
      const dataUrl = await fileToDataUrl(file);
      update('imageUrl', dataUrl);
    } catch {
      setUploadError('Could not process the selected file.');
    }
  };

  return (
    <div className="surface-panel p-5 mb-6 view-enter relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
      <div className="flex items-center justify-between mb-5">
        <div>
          <h4 className="text-base font-semibold gold-text">{initial ? 'Edit' : 'Add'} Commandant</h4>
          <p className="text-xs text-muted-foreground mt-1">Manage commandant records and tenure details.</p>
        </div>
        <button onClick={onCancel} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><X className="h-4 w-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Commandant Name</label>
          <input placeholder="Name" value={form.name} onChange={e => update('name', e.target.value)} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Title</label>
          <input placeholder="Title" value={form.title} onChange={e => update('title', e.target.value)} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tenure Start</label>
          <input type="number" placeholder="Tenure Start" value={form.tenureStart} onChange={e => update('tenureStart', parseInt(e.target.value))} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
        </div>
        <div className="space-y-1.5 flex flex-col">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tenure End</label>
          <input type="number" disabled={form.isCurrent} placeholder={form.isCurrent ? 'Present' : 'Tenure End'} value={form.isCurrent ? '' : form.tenureEnd} onChange={e => update('tenureEnd', e.target.value ? parseInt(e.target.value) : '')} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30 disabled:opacity-50 disabled:cursor-not-allowed" />
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Image URL</label>
          <input placeholder="Image URL (optional)" value={form.imageUrl} onChange={e => update('imageUrl', e.target.value)} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30" />
          <div className="flex items-center gap-2">
            <label className="px-3 py-1.5 text-xs rounded border border-primary/25 bg-card hover:bg-muted/40 cursor-pointer transition-colors text-muted-foreground hover:text-foreground">
              Upload Image / GIF
              <input type="file" accept="image/*,.gif,.webp" className="hidden" onChange={e => onUploadImage(e.target.files?.[0] ?? null)} />
            </label>
            {form.imageUrl && (
              <button type="button" onClick={() => update('imageUrl', '')} className="px-3 py-1.5 text-xs rounded border border-primary/20 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors">
                Clear
              </button>
            )}
          </div>
          {uploadError && <p className="text-[11px] text-destructive">{uploadError}</p>}
          <p className="text-[10px] text-muted-foreground">Stored locally in this browser for testing.</p>
        </div>
        <div className="sm:col-span-2 space-y-1.5">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Biography / Description</label>
          <textarea placeholder="Description" value={form.description} onChange={e => update('description', e.target.value)} rows={2} className="w-full bg-background border border-primary/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all hover:border-primary/30 resize-none" />
        </div>
        <label className="flex items-center gap-3 text-sm text-foreground sm:col-span-2 p-3 rounded-md bg-primary/5 border border-primary/10 cursor-pointer hover:bg-primary/10 transition-colors">
          <div className={`w-5 h-5 rounded border ${form.isCurrent ? 'bg-primary border-primary text-primary-foreground' : 'border-primary/30 bg-background'} flex items-center justify-center transition-colors`}>
            {form.isCurrent && <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-3.5 h-3.5"><polyline points="20 6 9 17 4 12" /></svg>}
          </div>
          <input type="checkbox" checked={form.isCurrent} onChange={e => update('isCurrent', e.target.checked)} className="sr-only" />
          <div>
            <p className="font-medium text-primary">Current Commandant</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Check this if the commandant is currently serving.</p>
          </div>
        </label>
      </div>
      <div className="flex flex-col sm:flex-row justify-end gap-3 mt-6 pt-5 border-t border-primary/10">
        <button onClick={onCancel} className="px-5 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors order-2 sm:order-1">Cancel</button>
        <button onClick={() => onSave({ ...form, tenureEnd: form.tenureEnd === '' ? null : form.tenureEnd as number })} className="px-6 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-all hover:shadow-lg shadow-primary/20 active:scale-[0.98] order-1 sm:order-2">
          {initial ? 'Save Changes' : 'Create Record'}
        </button>
      </div>
    </div>
  );
}
