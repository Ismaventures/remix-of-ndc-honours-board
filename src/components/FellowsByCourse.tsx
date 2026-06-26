import { useMemo, useState, useEffect, useRef } from 'react';
import { Personnel, Category } from '@/types/domain';
import { ChevronLeft, ChevronRight, ArrowLeft, X, Pause, Play, Monitor } from 'lucide-react';
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

const TRI_COLOR_BAR = (
  <div className="h-1.5 flex shrink-0">
    <div className="flex-1 bg-[#002060]" />
    <div className="flex-1 bg-[#FF0000]" />
    <div className="flex-1 bg-[#00B0F0]" />
  </div>
);

function AutoDisplaySlide({ person }: { person: FellowWithCourse }) {
  const resolvedImageUrl = useResolvedMediaUrl(person.imageUrl);

  return (
    <div key={person.id} className="flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-12 w-full max-w-4xl animate-fade-up">
      <div className="flex flex-col items-center gap-6 lg:flex-1">
        <img
          src={ndcCrest}
          alt="NDC"
          className="h-24 w-24 lg:h-28 lg:w-28 object-contain opacity-90 drop-shadow-[0_0_20px_rgba(255,215,0,0.2)]"
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
          <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[#002060] via-[#FF0000]/40 to-[#00B0F0] opacity-60 blur-sm" />
          <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-[#FFD700]/35 shadow-2xl">
            <img
              src={resolvedImageUrl}
              alt={person.name}
              className="w-full h-full object-cover"
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

  // Group fellows by course year and course number
  const courseGroups = useMemo(() => {
    // 1. Pre-populate course mapping based on category
    const courseMap: Record<number, { year: number; courseNumber: number; academicYear: string; fellows: Personnel[] }> = {};
    const startCourse = category === 'FWC' ? 1 : 16;
    const endCourse = 34;
    for (let c = startCourse; c <= endCourse; c++) {
      const startYear = 1991 + c;
      const endYear = 1992 + c;
      courseMap[c] = {
        year: startYear,
        courseNumber: c,
        academicYear: `${startYear}–${endYear}`,
        fellows: []
      };
    }

    const fellows = personnel.filter(p => p.category === category);
    const noCourseData: string[] = [];

    fellows.forEach(person => {
      let courseNum = null;

      // Priority 1: Use course field directly from seed data
      if (person.course) {
        courseNum = person.course;
      }

      // Priority 2: Try to parse CSE course number: "CSE X" or "CSE X/YYYY"
      if (!courseNum && person.decoration) {
        let match = person.decoration.match(/CSE\s*(\d+)/i);
        if (match) {
          courseNum = parseInt(match[1], 10);
        }
      }

      // Priority 3: Try to parse NWC course number: "NWC Course X"
      if (!courseNum && person.decoration) {
        let match = person.decoration.match(/NWC\s+Course\s+(\d+)/i);
        if (match) {
          courseNum = parseInt(match[1], 10);
        }
      }

      // Priority 4: Fallback: calculate course number based on periodStart (starts with Course 1 in 1992)
      if (!courseNum && person.periodStart) {
        courseNum = person.periodStart - 1991;
      }

      if (!courseNum || isNaN(courseNum)) {
        noCourseData.push(`${person.name} (${person.periodStart})`);
        courseNum = 1; // Default fallback to prevent crash
      }

      // Map to course slot
      if (courseMap[courseNum]) {
        courseMap[courseNum].fellows.push(person);
      } else {
        // Dynamic course slot if outside 1-34
        const startYear = 1991 + courseNum;
        const endYear = 1992 + courseNum;
        courseMap[courseNum] = {
          year: startYear,
          courseNumber: courseNum,
          academicYear: `${startYear}–${endYear}`,
          fellows: [person]
        };
      }
    });

    if (noCourseData.length > 0) {
      console.warn(`⚠️ ${category} without course data: ${noCourseData.join(', ')}`);
    }

    return Object.values(courseMap)
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
      .sort((a, b) => b.courseNumber - a.courseNumber); // Sort Course 34 to 1 descending
  }, [personnel, category]);

  const activeGroup = useMemo(
    () => courseGroups.find(g => g.groupId === selectedGroupId),
    [courseGroups, selectedGroupId]
  );

  const activeFellows = activeGroup?.fellows ?? [];

  // Notify parent of active course changes
  useEffect(() => {
    if (onCourseSelect) {
      onCourseSelect(activeGroup ? activeGroup.courseNumber : null);
    }
  }, [activeGroup, onCourseSelect]);

  const lastProcessedBackNonce = useRef(backTriggerNonce);

  // Handle universal back button trigger
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

  // Create flat list of all fellows with course info for all-courses auto display
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

  // Auto-cycling effect - support both modes
  useEffect(() => {
    if (!autoDisplayActive || !isAutoPlaying) return;

    const fellowsToDisplay = autoDisplayMode === 'all-courses' ? allCourseFellows : activeFellows;
    if (fellowsToDisplay.length === 0) return;

    const interval = setInterval(() => {
      setAutoDisplayIndex((prev) => (prev + 1) % fellowsToDisplay.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [autoDisplayActive, activeFellows.length, allCourseFellows.length, isAutoPlaying, autoDisplayMode]);

  // Reset auto-display index when mode changes
  useEffect(() => {
    if (autoDisplayActive) {
      setAutoDisplayIndex(0);
    }
  }, [autoDisplayMode, autoDisplayActive]);

  const currentAutoDisplayPerson: FellowWithCourse | null = autoDisplayActive && autoDisplayMode === 'all-courses'
    ? (allCourseFellows[autoDisplayIndex] ?? null)
    : (autoDisplayActive && activeFellows[autoDisplayIndex] ? activeFellows[autoDisplayIndex] : null);

  const courseTileGradient = category === 'FWC'
    ? 'from-[#0f2c4e] via-[#14365d] to-[#1a4373]'
    : 'from-[#0e2d4a] via-[#133e66] to-[#195080]';

  return (
    <div className="space-y-2">
      {/* When no course selected - show list of all fellows or course selection grid */}
      {!selectedGroupId && (
        <>
          {/* Header section - Single unified heading */}
          {title && (
            <div className={cn(
              'relative overflow-hidden rounded-xl border p-5 md:p-6',
              isLightMode ? 'bg-white/80 border-slate-200 shadow-sm' : 'bg-slate-800/80 border-slate-700'
            )}>
              {TRI_COLOR_BAR}
              <div className="pt-4 text-center">
                <h1 className={cn(
                  'text-2xl md:text-4xl font-bold font-serif text-center uppercase tracking-wider heading-accent',
                  isLightMode ? 'text-[#002060]' : 'text-white'
                )}>
                  {title.replace(' (FWC)', '').replace(' (FDC)', '')}
                </h1>
                {description && (
                  <p className={cn(
                    'mt-3 text-sm text-center max-w-2xl mx-auto leading-relaxed',
                    isLightMode ? 'text-slate-600' : 'text-slate-300'
                  )}>
                    {description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Pill Shaped Menu Switcher */}
          <div className="flex justify-center my-4">
            <div className={cn(
              "inline-flex p-1 rounded-full border transition-all duration-300 backdrop-blur-sm",
              isLightMode ? "bg-slate-100/90 border-slate-200 shadow-sm" : "bg-slate-900/60 border-slate-800/80"
            )}>
              <button
                onClick={() => setViewMode('all')}
                className={cn(
                  "px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300",
                  viewMode === 'all'
                    ? (isLightMode 
                        ? "bg-[#002060] text-white shadow-md" 
                        : "bg-gradient-to-r from-[#00B0F0] to-[#002060] text-white shadow-[0_2px_10px_rgba(0,176,240,0.3)]")
                    : (isLightMode 
                        ? "text-slate-600 hover:text-slate-900" 
                        : "text-white/60 hover:text-white")
                )}
              >
                All Fellows
              </button>
              <button
                onClick={() => setViewMode('courses')}
                className={cn(
                  "px-6 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300",
                  viewMode === 'courses'
                    ? (isLightMode 
                        ? "bg-[#002060] text-white shadow-md" 
                        : "bg-gradient-to-r from-[#00B0F0] to-[#002060] text-white shadow-[0_2px_10px_rgba(0,176,240,0.3)]")
                    : (isLightMode 
                        ? "text-slate-600 hover:text-slate-900" 
                        : "text-white/60 hover:text-white")
                )}
              >
                Filter by Courses
              </button>
            </div>
          </div>

          {viewMode === 'all' ? (
            /* All Fellows Grid View */
            <div className="relative">
              {/* Large Animated Background NDC Logo */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-[0.05]">
                <img
                  src={ndcCrest}
                  alt=""
                  className="ndc-logo-watermark absolute"
                  style={{
                    width: '450px',
                    height: '450px',
                  }}
                />
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
            /* Course Selection Box with Course Grid */
            <div className={cn(
              'relative overflow-hidden rounded-xl border p-6',
              isLightMode
                ? 'border-[#FFD700]/30 bg-slate-50'
                : 'border-[#00B0F0]/40 bg-[linear-gradient(135deg,rgba(0,40,80,0.95)_0%,rgba(0,80,120,0.9)_100%)]'
            )}>
              {/* Glow effect for dark mode */}
              {!isLightMode && (
                <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,176,240,0.1),transparent_70%)]" />
              )}

              <div className="relative z-10">
                <h2 className={cn(
                  'text-xl md:text-2xl font-bold font-serif mb-1 text-center uppercase tracking-wide',
                  isLightMode ? 'text-[#002060]' : 'text-[#00B0F0]'
                )}>
                  Select Course
                </h2>
                <p className={cn(
                  'text-sm mb-5 text-center',
                  isLightMode ? 'text-slate-500' : 'text-white/65'
                )}>
                  Choose a course to browse fellows, or use Auto Display to cycle through all
                </p>

                {courseGroups.length === 0 && (
                  <p className={cn(
                    'text-sm mb-6 p-4 rounded-lg border text-center',
                    isLightMode
                      ? 'border-orange-300 bg-orange-50 text-orange-700'
                      : 'border-orange-500/30 bg-orange-500/10 text-orange-300'
                  )}>
                    📌 No course data found. Add CSE designation (e.g., "CSE 1/1986") to the decoration field.
                  </p>
                )}

                {/* Course Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-5">
                  {courseGroups.map((group, index) => (
                    <button
                      key={group.groupId}
                      onClick={() => {
                        setSelectedGroupId(group.groupId);
                        setAutoDisplayIndex(0);
                      }}
                      className={cn(
                        'group relative flex flex-col items-center justify-center gap-2 aspect-square rounded-xl border-2 p-3 transition-all duration-300',
                        'backdrop-blur-sm overflow-hidden animate-fade-up hover:scale-[1.04]',
                        isLightMode
                          ? 'border-[#002060]/25 bg-gradient-to-b from-white via-slate-50 to-[#ADD8E6]/30 hover:border-[#00B0F0]/50 hover:shadow-[0_8px_28px_rgba(0,32,96,0.12)]'
                          : cn(
                              'border-[#00B0F0]/35 bg-gradient-to-br hover:border-[#00B0F0]/65',
                              'hover:shadow-[0_0_28px_rgba(0,176,240,0.22)]',
                              courseTileGradient
                            )
                      )}
                      style={{ animationDelay: `${Math.min(index * 0.04, 0.35)}s` }}
                    >
                      <div className="absolute top-0 left-0 right-0 flex h-1 opacity-90">
                        <div className="flex-1 bg-[#002060]" />
                        <div className="flex-1 bg-[#FF0000]" />
                        <div className="flex-1 bg-[#00B0F0]" />
                      </div>

                      <div className={cn(
                        'absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none',
                        isLightMode
                          ? 'bg-[radial-gradient(circle_at_center,rgba(0,176,240,0.08),transparent_70%)]'
                          : 'bg-[radial-gradient(circle_at_center,rgba(0,176,240,0.15),transparent_70%)]'
                      )} />

                      <img
                        src={ndcCrest}
                        alt={`${group.designation} crest`}
                        className={cn(
                          'h-14 w-14 md:h-16 md:w-16 object-contain relative z-10 transition-transform duration-300 group-hover:scale-110',
                          isLightMode ? 'opacity-85' : 'opacity-90 drop-shadow-md'
                        )}
                      />

                      <div className="flex flex-col items-center gap-0.5 relative z-10">
                        <span className={cn(
                          'font-bold text-sm md:text-base text-center leading-tight',
                          isLightMode ? 'text-[#002060]' : 'text-white'
                        )}>
                          {group.designation}
                        </span>
                        <span className={cn(
                          'text-[11px] text-center font-medium opacity-80',
                          isLightMode ? 'text-[#002060]/75' : 'text-white/75'
                        )}>
                          {group.academicYear}
                        </span>
                        <span className={cn(
                          'text-[10px] font-semibold text-center px-2 py-0.5 rounded-full mt-0.5',
                          isLightMode
                            ? 'text-[#002060]/60 bg-[#002060]/5'
                            : 'text-[#FFD700]/90 bg-white/10'
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

      {/* When course selected - show full page view */}
      {selectedGroupId && (
        <div className="space-y-2">
          {/* Header with category title - Enhanced with tri-color and scattered NDC logos */}
          <div className={`relative overflow-hidden rounded-xl border-2 p-3 ${
            isLightMode
              ? 'bg-slate-50 border-slate-200'
              : 'bg-gradient-to-br from-[#001a40] via-[#002060] to-[#001030] border-[#00B0F0]/40'
          }`}>
            {/* Large Background Watermark Logo */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
              <img
                src={ndcCrest}
                alt=""
                className="ndc-logo-watermark absolute"
                style={{
                  width: '180px',
                  height: '180px',
                }}
              />
            </div>

            {/* Animated Scattered NDC Logos Background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(4)].map((_, i) => (
                <img
                  key={`bg-logo-${i}`}
                  src={ndcCrest}
                  alt=""
                  className="ndc-logo-scattered absolute"
                  style={{
                    width: '80px',
                    height: '80px',
                    left: `${(i % 4) * 28 + 8}%`,
                    top: `${i < 2 ? 8 : 65}%`,
                    transform: `rotate(${(i * 30) % 360}deg)`,
                  }}
                />
              ))}
            </div>

            {/* Tri-Color Accent Lines */}
            <div className="absolute top-0 left-0 right-0 h-1.5 flex opacity-80">
              <div className="flex-1 bg-[#002060]" />
              <div className="flex-1 bg-[#FF0000]" />
              <div className="flex-1 bg-[#00B0F0]" />
            </div>

            {/* Content */}
            <div className="relative z-10 space-y-1">
              <div className="flex items-center justify-center gap-2">
                <img src={ndcCrest} alt="NDC" className={`${isLightMode ? 'h-8 w-8' : 'h-9 w-9'} object-contain`} />
              </div>

              <div className="space-y-1">
                <h1 className={cn(
                  'text-xl md:text-3xl font-bold font-serif text-center uppercase tracking-widest leading-tight',
                  isLightMode ? 'text-[#002060]' : 'text-white'
                )}>
                  {category === 'FWC' ? 'FELLOW OF WAR COLLEGE' : 'FELLOW OF NATIONAL DEFENCE COLLEGE'}
                </h1>

                {/* Tri-color underline */}
                <div className="flex h-1.5 rounded-full overflow-hidden mx-auto w-32">
                  <div className="flex-1 bg-[#002060]" />
                  <div className="flex-1 bg-[#FF0000]" />
                  <div className="flex-1 bg-[#00B0F0]" />
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <p className={`text-center font-bold text-lg ${isLightMode ? 'text-[#002060]' : 'text-[#FFD700]'}`}>
                  {activeGroup ? `${activeGroup.designation} (${activeGroup.academicYear})` : ''}
                </p>
                <p className={`text-center text-sm font-semibold ${isLightMode ? 'text-slate-600' : 'text-white/70'}`}>
                  {activeFellows.length} {activeFellows.length === 1 ? 'Fellow' : 'Fellows'}
                </p>
              </div>
            </div>

            {/* Bottom accent line */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 flex opacity-60">
              <div className="flex-1 bg-[#00B0F0]" />
              <div className="flex-1 bg-[#FF0000]" />
              <div className="flex-1 bg-[#002060]" />
            </div>
          </div>

          {/* Fellows Grid */}
          {activeFellows.length > 0 ? (
            <div className="relative">
              {/* Large Animated Background NDC Logo */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-[0.06]">
                <img
                  src={ndcCrest}
                  alt=""
                  className="ndc-logo-watermark absolute"
                  style={{
                    width: '500px',
                    height: '500px',
                  }}
                />
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
            <div className={`py-8 text-center ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              No fellows found for this course.
            </div>
          )}
          {/* Removed bottom back button */}
        </div>
      )}

      {/* Auto-Display Full-Screen Modal */}
      {autoDisplayActive && currentAutoDisplayPerson && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#001030] via-[#0a0a1f] to-[#001030] flex flex-col items-center justify-center p-4 overflow-hidden">
          {TRI_COLOR_BAR}

          {/* Background watermarks */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <img
              src={ndcCrest}
              alt=""
              className="ndc-logo-watermark absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.04]"
              style={{ width: '480px', height: '480px' }}
            />
            {[...Array(3)].map((_, i) => (
              <img
                key={`auto-bg-${i}`}
                src={ndcCrest}
                alt=""
                className="ndc-logo-scattered absolute opacity-[0.03]"
                style={{
                  width: '120px',
                  height: '120px',
                  left: `${15 + i * 30}%`,
                  top: `${20 + (i % 2) * 50}%`,
                }}
              />
            ))}
          </div>

          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 md:px-6 pt-5 pb-3 border-b border-white/10 bg-[#001030]/60 backdrop-blur-sm">
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
                  {autoDisplayMode === 'all-courses' && ' · All Courses'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                title={isAutoPlaying ? 'Pause' : 'Play'}
              >
                {isAutoPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setAutoDisplayActive(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-red-500/25 text-white transition-all"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {isAutoPlaying && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/10">
                <div
                  key={autoDisplayIndex}
                  className="h-full bg-gradient-to-r from-[#002060] via-[#FF0000] to-[#00B0F0] animate-[autoProgress_4s_linear]"
                />
              </div>
            )}
          </div>

          {/* Slide content */}
          <div className="relative z-10 flex-1 flex items-center justify-center w-full px-4 pt-20 pb-24">
            <AutoDisplaySlide key={currentAutoDisplayPerson.id} person={currentAutoDisplayPerson} />
          </div>

          {/* Navigation */}
          <div className="absolute bottom-6 left-0 right-0 z-20 flex items-center justify-center gap-4">
            <button
              onClick={() => {
                const maxIndex = autoDisplayMode === 'all-courses' ? allCourseFellows.length : activeFellows.length;
                setAutoDisplayIndex((prev) => (prev - 1 + maxIndex) % maxIndex);
              }}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
              title="Previous"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>

            <div className="px-4 py-1.5 rounded-full bg-white/10 border border-white/10 text-white text-sm font-semibold tabular-nums">
              {autoDisplayIndex + 1} / {autoDisplayMode === 'all-courses' ? allCourseFellows.length : activeFellows.length}
            </div>

            <button
              onClick={() => {
                const maxIndex = autoDisplayMode === 'all-courses' ? allCourseFellows.length : activeFellows.length;
                setAutoDisplayIndex((prev) => (prev + 1) % maxIndex);
              }}
              className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10"
              title="Next"
            >
              <ChevronRight className="h-6 w-6" />
            </button>
          </div>
        </div>
      )}

      {/* Profile Modal */}
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
