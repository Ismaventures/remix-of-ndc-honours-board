import { useMemo, useState, useEffect, useRef } from 'react';
import { Personnel, Category } from '@/types/domain';
import { ChevronLeft, ChevronRight, ArrowLeft, X, Pause, Play, Monitor, Users, GraduationCap, Shield } from 'lucide-react';
import { FellowProfileModal } from './FellowProfileModal';
import { PersonnelPortraitGrid } from './PersonnelPortraitCard';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl';
import ndcCrest from '/images/ndc-crest.png';
import { cn } from '@/lib/utils';

interface CourseGroup {
  year: number;
  courseNumber: number;
  academicYear: string;
  designation: string;
  fellows: Personnel[];
  groupId: string;
}

type FellowWithCourse = Personnel & {
  courseDesignation?: string;
  courseNumber?: number;
  courseYear?: number;
  courseAcademicYear?: string;
};

const TRI_BAR_THIN = (
  <div className="h-[3px] flex shrink-0">
    <div className="flex-1 bg-[#002060]" />
    <div className="flex-1 bg-[#C0392B]" />
    <div className="flex-1 bg-[#00B0F0]" />
  </div>
);

const DECORATIVE_STARS = (
  <div className="flex items-center justify-center gap-2 mb-2">
    <div className="w-2 h-2 rounded-full bg-[#002060]" />
    <div className="w-2.5 h-2.5 rounded-sm bg-[#C0392B] rotate-45" />
    <div className="w-2 h-2 rounded-full bg-[#002060]" />
  </div>
);

function AutoDisplaySlide({ person }: { person: FellowWithCourse }) {
  const resolvedImageUrl = useResolvedMediaUrl(person.imageUrl);

  return (
    <div key={person.id} className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 w-full max-w-4xl" style={{ contain: 'layout paint' }}>
      <div className="flex flex-col items-center gap-6 lg:flex-1">
        <img
          src={ndcCrest}
          alt="NDC"
          className="h-24 w-24 lg:h-28 lg:w-28 object-contain opacity-90"
          style={{ willChange: 'auto' }}
        />
        <div className="text-center space-y-3 w-full">
          <h2 className="text-3xl md:text-4xl font-bold font-serif text-white leading-tight">
            {person.name}
          </h2>
          {person.rank && (
            <p className="text-lg md:text-xl text-[#FFD700] font-semibold">{person.rank}</p>
          )}
          {person.service && (
            <p className="text-sm text-white/65">{person.service}</p>
          )}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-1 text-sm text-white/75 pt-1">
            {person.periodStart && (
              <span>{person.periodStart} – {person.periodEnd}</span>
            )}
            {person.seniorityOrder != null && person.seniorityOrder > 0 && (
              <span>Seniority #{person.seniorityOrder}</span>
            )}
          </div>
          {person.decoration && (
            <p className="text-base text-white/70 pt-3 border-t border-white/15 max-w-md mx-auto">
              {person.decoration}
            </p>
          )}
        </div>
      </div>

      {resolvedImageUrl && (
        <div className="relative w-full max-w-xs lg:max-w-sm shrink-0">
          <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-[#FFD700]/35 shadow-2xl" style={{ contain: 'layout paint' }}>
            <img
              src={resolvedImageUrl}
              alt={person.name}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface FellowsByCourseProps {
  personnel: Personnel[];
  category: Category;
  onBack?: () => void;
  title?: string;
  description?: string;
  onCourseSelect?: (courseNumber: number | null) => void;
  backTriggerNonce?: number;
}

export function FellowsByCourse({
  personnel,
  category,
  onBack,
  title = 'Fellows by Course',
  description,
  onCourseSelect,
  backTriggerNonce = 0
}: FellowsByCourseProps) {
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith('outdoor');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  const [autoDisplayActive, setAutoDisplayActive] = useState(false);
  const [autoDisplayIndex, setAutoDisplayIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const [autoDisplayMode, setAutoDisplayMode] = useState<'all-courses' | 'single-course'>('all-courses');
  const [viewMode, setViewMode] = useState<'all' | 'courses'>('all');

  const courseGroups = useMemo(() => {
    const courseMap: Record<number, { year: number; courseNumber: number; academicYear: string; fellows: Personnel[] }> = {};
    const startCourse = category === 'FWC' ? 1 : 16;
    const endCourse = category === 'FWC' ? 15 : 34;
    for (let c = startCourse; c <= endCourse; c++) {
      const startYear = 1991 + c;
      const endYear = 1992 + c;
      courseMap[c] = {
        year: startYear,
        courseNumber: c,
        academicYear: `${startYear}\u2013${endYear}`,
        fellows: []
      };
    }

    const fellows = personnel.filter(p => p.category === category);
    const noCourseData: string[] = [];

    fellows.forEach(person => {
      let courseNum = null;

      if (person.course) {
        courseNum = person.course;
      }

      if (!courseNum && person.decoration) {
        let match = person.decoration.match(/CSE\s*(\d+)/i);
        if (match) {
          courseNum = parseInt(match[1], 10);
        }
      }

      if (!courseNum && person.decoration) {
        let match = person.decoration.match(/NWC\s+Course\s+(\d+)/i);
        if (match) {
          courseNum = parseInt(match[1], 10);
        }
      }

      if (!courseNum && person.periodStart) {
        courseNum = person.periodStart - 1991;
      }

      if (!courseNum || isNaN(courseNum)) {
        noCourseData.push(`${person.name} (${person.periodStart})`);
        courseNum = 1;
      }

      if (courseMap[courseNum]) {
        courseMap[courseNum].fellows.push(person);
      } else {
        const startYear = 1991 + courseNum;
        const endYear = 1992 + courseNum;
        courseMap[courseNum] = {
          year: startYear,
          courseNumber: courseNum,
          academicYear: `${startYear}\u2013${endYear}`,
          fellows: [person]
        };
      }
    });

    if (noCourseData.length > 0) {
      console.warn(`\u26A0\uFE0F ${category} without course data: ${noCourseData.join(', ')}`);
    }

    return Object.values(courseMap)
      .filter(data => data.fellows.length > 0)
      .map((data) => ({
        year: data.year,
        courseNumber: data.courseNumber,
        academicYear: data.academicYear,
        designation: `Course ${data.courseNumber}`,
        fellows: data.fellows.sort((a, b) => {
          if (a.seniorityOrder !== b.seniorityOrder) {
            return a.seniorityOrder - b.seniorityOrder;
          }
          if (a.periodStart !== b.periodStart) {
            return a.periodStart - b.periodStart;
          }
          return a.name.localeCompare(b.name);
        }),
        groupId: `${data.year}-${data.courseNumber}`,
      }))
      .sort((a, b) => b.courseNumber - a.courseNumber);
  }, [personnel, category]);

  const activeGroup = useMemo(
    () => courseGroups.find(g => g.groupId === selectedGroupId),
    [courseGroups, selectedGroupId]
  );

  const activeFellows = activeGroup?.fellows ?? [];

  useEffect(() => {
    if (onCourseSelect) {
      onCourseSelect(activeGroup ? activeGroup.courseNumber : null);
    }
  }, [activeGroup, onCourseSelect]);

  const lastProcessedBackNonce = useRef(backTriggerNonce);

  useEffect(() => {
    if (backTriggerNonce === 0 || backTriggerNonce === lastProcessedBackNonce.current) {
      lastProcessedBackNonce.current = backTriggerNonce;
      return;
    }
    lastProcessedBackNonce.current = backTriggerNonce;

    if (autoDisplayActive) {
      setAutoDisplayActive(false);
    } else if (selectedPerson) {
      setSelectedPerson(null);
    } else if (selectedGroupId) {
      setSelectedGroupId(null);
    } else if (onBack) {
      onBack();
    }
  }, [backTriggerNonce]);

  const allCourseFellows = useMemo(() => {
    return courseGroups.flatMap(group =>
      group.fellows.map(fellow => ({
        ...fellow,
        courseDesignation: group.designation,
        courseNumber: group.courseNumber,
        courseYear: group.year,
        courseAcademicYear: group.academicYear,
      }))
    );
  }, [courseGroups]);

  useEffect(() => {
    if (!autoDisplayActive || !isAutoPlaying) return;

    const fellowsToDisplay = autoDisplayMode === 'all-courses' ? allCourseFellows : activeFellows;
    if (fellowsToDisplay.length === 0) return;

    const interval = setInterval(() => {
      setAutoDisplayIndex((prev) => (prev + 1) % fellowsToDisplay.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [autoDisplayActive, activeFellows.length, allCourseFellows.length, isAutoPlaying, autoDisplayMode]);

  useEffect(() => {
    if (autoDisplayActive) {
      setAutoDisplayIndex(0);
    }
  }, [autoDisplayMode, autoDisplayActive]);

  const currentAutoDisplayPerson: FellowWithCourse | null = autoDisplayActive && autoDisplayMode === 'all-courses'
    ? (allCourseFellows[autoDisplayIndex] ?? null)
    : (autoDisplayActive && activeFellows[autoDisplayIndex] ? activeFellows[autoDisplayIndex] : null);

  const pageTitle = category === 'FWC'
    ? 'DISTINGUISHED FELLOWS OF THE WAR COLLEGE'
    : 'DISTINGUISHED FELLOWS OF THE DEFENCE COLLEGE';
  const pageDescription = category === 'FWC'
    ? `Distinguished Fellows of the War College, categorized by CSE course year.`
    : `Distinguished Fellows of the Defence College, categorized by CSE course year.`;

  return (
    <div className="space-y-0">
      {!selectedGroupId && (
        <>
          {/* Hero Section */}
          <div className={cn(
            'relative overflow-hidden rounded-xl mb-6',
            isLightMode ? 'bg-white/70' : 'bg-slate-800/30'
          )}>
            {TRI_BAR_THIN}

            {/* Subtle faded military background imagery */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className={cn(
                'absolute left-0 top-0 w-1/3 h-full opacity-[0.04]',
                isLightMode ? 'bg-[radial-gradient(ellipse_at_left,rgba(0,32,96,0.3),transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_left,rgba(0,176,240,0.15),transparent_70%)]'
              )} />
              <div className={cn(
                'absolute right-0 top-0 w-1/3 h-full opacity-[0.04]',
                isLightMode ? 'bg-[radial-gradient(ellipse_at_right,rgba(0,32,96,0.3),transparent_70%)]' : 'bg-[radial-gradient(ellipse_at_right,rgba(0,176,240,0.15),transparent_70%)]'
              )} />
            </div>

            <div className="relative z-10 py-6 md:py-8 px-6 text-center">
              {DECORATIVE_STARS}

              <h1 className={cn(
                'text-2xl md:text-4xl lg:text-[2.5rem] font-serif font-bold uppercase tracking-[0.08em] leading-tight mb-3',
                isLightMode ? 'text-[#002060]' : 'text-white'
              )}>
                {title.replace(' (FWC)', '').replace(' (FDC)', '') || pageTitle}
              </h1>

              {description ? (
                <p className={cn(
                  'text-sm md:text-base max-w-2xl mx-auto leading-relaxed',
                  isLightMode ? 'text-slate-500' : 'text-white/60'
                )}>
                  {description}
                </p>
              ) : (
                <p className={cn(
                  'text-sm md:text-base max-w-2xl mx-auto leading-relaxed',
                  isLightMode ? 'text-slate-500' : 'text-white/60'
                )}>
                  {pageDescription}
                </p>
              )}

              {/* Decorative line */}
              <div className="flex items-center justify-center gap-3 mt-4">
                <div className={cn('h-px w-12', isLightMode ? 'bg-[#002060]/20' : 'bg-white/15')} />
                <Shield className={cn('w-3.5 h-3.5', isLightMode ? 'text-[#002060]/30' : 'text-white/20')} />
                <div className={cn('h-px w-12', isLightMode ? 'bg-[#002060]/20' : 'bg-white/15')} />
              </div>
            </div>

            {TRI_BAR_THIN}
          </div>

          {/* Filter Controls */}
          <div className="flex justify-center mb-6">
            <div className={cn(
              "inline-flex p-1 rounded-full border transition-all duration-300",
              isLightMode ? "bg-slate-100/80 border-slate-200/80 shadow-sm" : "bg-slate-900/60 border-slate-700/80"
            )}>
              <button
                onClick={() => setViewMode('all')}
                className={cn(
                  "inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300",
                  viewMode === 'all'
                    ? "bg-[#002060] text-white shadow-md"
                    : (isLightMode ? "text-slate-600 hover:text-slate-900" : "text-white/60 hover:text-white")
                )}
              >
                <Users className="w-3.5 h-3.5" />
                All Fellows
              </button>
              <button
                onClick={() => setViewMode('courses')}
                className={cn(
                  "inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300",
                  viewMode === 'courses'
                    ? "bg-[#002060] text-white shadow-md"
                    : (isLightMode ? "text-slate-600 hover:text-slate-900" : "text-white/60 hover:text-white")
                )}
              >
                <GraduationCap className="w-3.5 h-3.5" />
                Filter by Courses
              </button>
            </div>
          </div>

          {viewMode === 'all' ? (
            <div className="relative">
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-[0.03]">
                <img src={ndcCrest} alt="" className="ndc-logo-watermark absolute" style={{ width: '400px', height: '400px' }} />
              </div>
              <div className="relative z-10">
                <PersonnelPortraitGrid
                  personnel={allCourseFellows}
                  isLightMode={isLightMode}
                  onSelectPerson={setSelectedPerson}
                />
              </div>
            </div>
          ) : (
            <div className={cn(
              'relative overflow-hidden rounded-xl',
              isLightMode ? 'bg-white/70 border border-slate-200/60 shadow-sm' : 'bg-slate-800/25 border border-slate-700/40'
            )}>
              <div className="p-5 md:p-6">
                <h2 className={cn(
                  'text-lg md:text-xl font-bold font-serif mb-1 text-center uppercase tracking-wide',
                  isLightMode ? 'text-[#002060]' : 'text-white'
                )}>
                  Select Course
                </h2>
                <p className={cn(
                  'text-xs mb-4 text-center',
                  isLightMode ? 'text-slate-500' : 'text-white/55'
                )}>
                  Choose a course to browse fellows, or use Auto Display to cycle through all
                </p>

                {courseGroups.length === 0 && (
                  <p className={cn(
                    'text-sm mb-6 p-4 rounded-lg border text-center',
                    isLightMode ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                  )}>
                    No course data found.
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
                  {courseGroups.map((group, index) => (
                    <button
                      key={group.groupId}
                      onClick={() => {
                        setSelectedGroupId(group.groupId);
                        setAutoDisplayIndex(0);
                      }}
                      className={cn(
                        'group relative flex flex-col items-center justify-center gap-2 aspect-square rounded-lg border p-3 transition-all duration-300',
                        'overflow-hidden animate-fade-up hover:scale-[1.03]',
                        isLightMode
                          ? 'border-slate-200/80 bg-gradient-to-b from-white/80 to-slate-50/80 hover:border-[#00B0F0]/40 hover:shadow-[0_6px_24px_rgba(0,32,96,0.1)]'
                          : 'border-slate-600/40 bg-gradient-to-br from-slate-800/40 to-slate-850/40 hover:border-[#00B0F0]/40 hover:shadow-[0_0_20px_rgba(0,176,240,0.12)]'
                      )}
                      style={{ animationDelay: `${Math.min(index * 0.04, 0.35)}s` }}
                    >
                      <div className="absolute top-0 left-0 right-0 flex h-[3px] opacity-90">
                        <div className="flex-1 bg-[#002060]" />
                        <div className="flex-1 bg-[#C0392B]" />
                        <div className="flex-1 bg-[#00B0F0]" />
                      </div>

                      <img
                        src={ndcCrest}
                        alt={`${group.designation} crest`}
                        className={cn(
                          'h-12 w-12 md:h-14 md:w-14 object-contain relative z-10 transition-transform duration-300 group-hover:scale-110',
                          isLightMode ? 'opacity-80' : 'opacity-85 drop-shadow-sm'
                        )}
                      />

                      <div className="flex flex-col items-center gap-0.5 relative z-10">
                        <span className={cn(
                          'font-bold text-sm text-center leading-tight',
                          isLightMode ? 'text-[#002060]' : 'text-white'
                        )}>
                          {group.designation}
                        </span>
                        <span className={cn(
                          'text-[10px] text-center font-medium',
                          isLightMode ? 'text-slate-500' : 'text-white/60'
                        )}>
                          {group.academicYear}
                        </span>
                        <span className={cn(
                          'text-[9px] font-semibold text-center px-2 py-0.5 rounded-full mt-0.5',
                          isLightMode ? 'text-[#002060]/60 bg-[#002060]/5' : 'text-[#FFD700]/80 bg-white/10'
                        )}>
                          {group.fellows.length} {group.fellows.length === 1 ? 'Fellow' : 'Fellows'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Selected Course View */}
      {selectedGroupId && (
        <div className="space-y-4">
          <div className={cn(
            'relative overflow-hidden rounded-xl',
            isLightMode ? 'bg-white/70 border border-slate-200/60 shadow-sm' : 'bg-slate-800/25 border border-slate-700/40'
          )}>
            {TRI_BAR_THIN}

            <div className="relative z-10 py-5 px-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <img src={ndcCrest} alt="NDC" className="h-8 w-8 object-contain" />
              </div>

              <h1 className={cn(
                'text-xl md:text-2xl font-bold uppercase tracking-[0.08em] leading-tight',
                isLightMode ? 'text-[#002060]' : 'text-white'
              )} style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                {category === 'FWC' ? 'DISTINGUISHED FELLOW OF THE WAR COLLEGE' : 'DISTINGUISHED FELLOW OF THE DEFENCE COLLEGE'}
              </h1>

              <div className="flex items-center justify-center gap-2 mt-2 mb-2">
                <div className={cn('h-px w-10', isLightMode ? 'bg-[#C0392B]/30' : 'bg-[#C0392B]/25')} />
                <div className="h-[3px] w-20 rounded-full overflow-hidden flex">
                  <div className="flex-1 bg-[#002060]" />
                  <div className="flex-1 bg-[#C0392B]" />
                  <div className="flex-1 bg-[#00B0F0]" />
                </div>
                <div className={cn('h-px w-10', isLightMode ? 'bg-[#00B0F0]/30' : 'bg-[#00B0F0]/25')} />
              </div>

              <p className={cn(
                'text-base font-bold',
                isLightMode ? 'text-[#002060]' : 'text-[#FFD700]'
              )}>
                {activeGroup ? `${activeGroup.designation} (${activeGroup.academicYear})` : ''}
              </p>
              <p className={cn(
                'text-xs font-medium mt-0.5',
                isLightMode ? 'text-slate-500' : 'text-white/60'
              )}>
                {activeFellows.length} {activeFellows.length === 1 ? 'Fellow' : 'Fellows'}
              </p>
            </div>

            {TRI_BAR_THIN}
          </div>

          {activeFellows.length > 0 ? (
            <div className="relative">
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-[0.03]">
                <img src={ndcCrest} alt="" className="ndc-logo-watermark absolute" style={{ width: '400px', height: '400px' }} />
              </div>
              <div className="relative z-10">
                <PersonnelPortraitGrid
                  personnel={activeFellows}
                  isLightMode={isLightMode}
                  onSelectPerson={setSelectedPerson}
                />
              </div>
            </div>
          ) : (
            <div className={cn('py-8 text-center', isLightMode ? 'text-slate-500' : 'text-slate-400')}>
              No fellows found for this course.
            </div>
          )}
        </div>
      )}

      {/* Auto-Display Modal */}
      {autoDisplayActive && currentAutoDisplayPerson && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#001030] via-[#0a0a1f] to-[#001030] flex flex-col items-center justify-center p-4 overflow-hidden" style={{ contain: 'layout' }}>
          <div className="h-[3px] w-full flex shrink-0 absolute top-0 left-0 right-0">
            <div className="flex-1 bg-[#002060]" />
            <div className="flex-1 bg-[#C0392B]" />
            <div className="flex-1 bg-[#00B0F0]" />
          </div>

          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img src={ndcCrest} alt="" className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]" style={{ width: '480px', height: '480px' }} />
          </div>

          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 md:px-6 pt-5 pb-3 border-b border-white/10 bg-[#001030]/80">
            <div className="flex items-center gap-3 min-w-0">
              <img src={ndcCrest} alt="NDC" className="h-8 w-8 object-contain shrink-0" />
              <div className="min-w-0">
                <p className="text-[#FFD700] font-serif text-xs md:text-sm uppercase tracking-widest font-bold truncate">
                  {autoDisplayMode === 'all-courses'
                    ? `${currentAutoDisplayPerson.courseDesignation} (${currentAutoDisplayPerson.courseAcademicYear})`
                    : activeGroup ? `${activeGroup.designation} (${activeGroup.academicYear})` : ''}
                </p>
                <p className="text-white/55 text-xs mt-0.5">
                  {autoDisplayIndex + 1} of {autoDisplayMode === 'all-courses' ? allCourseFellows.length : activeFellows.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setIsAutoPlaying(!isAutoPlaying)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all" title={isAutoPlaying ? 'Pause' : 'Play'}>
                {isAutoPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button onClick={() => setAutoDisplayActive(false)} className="p-2 rounded-lg bg-white/10 hover:bg-red-500/25 text-white transition-all" title="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            {isAutoPlaying && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                <div key={autoDisplayIndex} className="h-full bg-gradient-to-r from-[#002060] via-[#C0392B] to-[#00B0F0] animate-[autoProgress_4s_linear]" />
              </div>
            )}
          </div>

          <div className="relative z-10 flex-1 flex items-center justify-center w-full px-4 pt-20 pb-24">
            <AutoDisplaySlide person={currentAutoDisplayPerson} />
          </div>

          <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-4">
            <button onClick={() => { const maxIndex = autoDisplayMode === 'all-courses' ? allCourseFellows.length : activeFellows.length; setAutoDisplayIndex((prev) => (prev - 1 + maxIndex) % maxIndex); }} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10" title="Previous">
              <ChevronLeft className="h-6 w-6" />
            </button>
            <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-white text-sm font-semibold tabular-nums">
              {autoDisplayIndex + 1} / {autoDisplayMode === 'all-courses' ? allCourseFellows.length : activeFellows.length}
            </div>
            <button onClick={() => { const maxIndex = autoDisplayMode === 'all-courses' ? allCourseFellows.length : activeFellows.length; setAutoDisplayIndex((prev) => (prev + 1) % maxIndex); }} className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10" title="Next">
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {selectedPerson && (
        <FellowProfileModal
          person={selectedPerson}
          fellows={viewMode === 'all' ? allCourseFellows : activeFellows}
          category={category}
          courseDesignation={
            activeGroup
              ? `${activeGroup.designation} (${activeGroup.academicYear})`
              : (selectedPerson as FellowWithCourse).courseDesignation
                ? `${(selectedPerson as FellowWithCourse).courseDesignation} (${(selectedPerson as FellowWithCourse).courseAcademicYear})`
                : undefined
          }
          onClose={() => setSelectedPerson(null)}
          onSelectPerson={setSelectedPerson}
        />
      )}
    </div>
  );
}
