import { useMemo, useState, useEffect } from 'react';
import { Personnel, Category } from '@/types/domain';
import { ChevronLeft, ChevronRight, ArrowLeft, Shield, X } from 'lucide-react';
import { ProfileModal } from './ProfileModal';
import { useThemeMode } from '@/hooks/useThemeMode';
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl';
import ndcCrest from '/images/ndc-crest.png';
import { cn } from '@/lib/utils';

interface CourseGroup {
  year: number;
  courseNumber: number;
  designation: string;
  fellows: Personnel[];
  groupId: string;
}

// Helper component for individual card to use the media URL hook
function FellowCard({ person, isLightMode, onSelect }: { person: Personnel; isLightMode: boolean; onSelect: () => void }) {
  const resolvedImageUrl = useResolvedMediaUrl(person.imageUrl);
  
  return (
    <div
      className={`group flex flex-col gap-0 rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-2xl hover:scale-105 ${
        isLightMode
          ? 'bg-white border border-slate-200'
          : 'bg-slate-800 border border-slate-700'
      }`}
      onClick={onSelect}
    >
      {/* Tri-Color Strip */}
      <div className="h-2 flex">
        <div className="flex-1 bg-[#002060]" />
        <div className="flex-1 bg-[#FF0000]" />
        <div className="flex-1 bg-[#00B0F0]" />
      </div>

      {/* Profile Image - Larger */}
      <div className={`aspect-square w-full overflow-hidden flex items-center justify-center ${isLightMode ? 'bg-slate-100' : 'bg-slate-700'}`}>
        {resolvedImageUrl ? (
          <img
            src={resolvedImageUrl}
            alt={person.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <Shield className={`h-16 w-16 ${isLightMode ? 'text-slate-300' : 'text-slate-500'}`} />
        )}
      </div>

      {/* Info Section - Bottom Navy Bar */}
      <div className="bg-[#002060] p-3 flex flex-col gap-2 text-white">
        {/* Name */}
        <div className="text-sm font-bold text-center line-clamp-2">
          {person.name}
        </div>

        {/* Rank */}
        {person.rank && (
          <div className="text-xs text-center font-semibold line-clamp-2 text-[#FFD700]">
            {person.rank}
          </div>
        )}

        {/* Service Years */}
        {person.periodStart && (
          <div className="text-[10px] text-center text-white/80">
            {person.periodStart} - {person.periodEnd}
          </div>
        )}
      </div>

      {/* Tap to Open */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={`px-3 py-2 text-center border-t ${isLightMode ? 'border-slate-200 bg-slate-50 hover:bg-slate-100' : 'border-slate-700 bg-slate-900 hover:bg-slate-800'}`}
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#002060]">
          TAP TO OPEN FULL DETAILS
        </span>
      </button>
    </div>
  );
}

interface FellowsByCourseProps {
  personnel: Personnel[];
  category: Category;
  onBack?: () => void;
  title?: string;
  description?: string;
}

interface CourseGroup {
  year: number;
  courseNumber: number;
  designation: string;
  fellows: Personnel[];
  groupId: string;
}

export function FellowsByCourse({ 
  personnel, 
  category, 
  onBack, 
  title = 'Fellows by Course',
  description 
}: FellowsByCourseProps) {
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith('outdoor');
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Personnel | null>(null);
  const [autoDisplayActive, setAutoDisplayActive] = useState(false);
  const [autoDisplayIndex, setAutoDisplayIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  // Group fellows by course year and course number
  const courseGroups = useMemo(() => {
    const fellows = personnel.filter(p => p.category === category);
    const grouped: Record<string, { year: number; courseNumber: number; fellows: Personnel[] }> = {};
    const noCourseData: string[] = [];

    fellows.forEach(person => {
      let year = person.periodStart;
      let courseNum = 1;
      let hasCourseData = false;

      // Try to parse CSE format: "CSE X/YYYY"
      if (person.decoration && person.decoration.includes('CSE')) {
        let match = person.decoration.match(/CSE\s*(\d+)\s*\/\s*(\d{4})/);
        if (!match) {
          match = person.decoration.match(/CSE(\d+)\/(\d{4})/);
        }
        if (match) {
          courseNum = parseInt(match[1], 10);
          year = parseInt(match[2], 10);
          hasCourseData = true;
        }
      }

      // Try to parse NWC format: "NWC Course X" and use period_start as year
      if (!hasCourseData && person.decoration && person.decoration.includes('NWC Course')) {
        let match = person.decoration.match(/NWC\s+Course\s+(\d+)/i);
        if (match) {
          courseNum = parseInt(match[1], 10);
          year = person.periodStart || year;
          hasCourseData = true;
        }
      }

      if (!hasCourseData) {
        noCourseData.push(`${person.name} (${year})`);
      }

      const groupId = `${year}-${courseNum}`;

      if (!grouped[groupId]) {
        grouped[groupId] = { year, courseNumber: courseNum, fellows: [] };
      }
      grouped[groupId].fellows.push(person);
    });

    if (noCourseData.length > 0) {
      console.warn(`⚠️ ${category} without course data: ${noCourseData.join(', ')}`);
    }

    console.log(`✅ ${category} Grouping Complete:`, {
      total: fellows.length,
      uniqueGroups: Object.keys(grouped).length,
      groups: Object.keys(grouped).map(key => {
        const g = grouped[key];
        return `Course ${g.courseNumber}/${g.year} (${g.fellows.length} fellows)`;
      })
    });

    return Object.entries(grouped)
      .map(([groupId, data]) => ({
        year: data.year,
        courseNumber: data.courseNumber,
        designation: `Course ${data.courseNumber}/${data.year}`,
        fellows: data.fellows.sort((a, b) => {
          if (a.seniorityOrder !== b.seniorityOrder) {
            return a.seniorityOrder - b.seniorityOrder;
          }
          if (a.periodStart !== b.periodStart) {
            return a.periodStart - b.periodStart;
          }
          return a.name.localeCompare(b.name);
        }),
        groupId,
      }))
      .sort((a, b) => {
        const yearDiff = b.year - a.year;
        if (yearDiff !== 0) return yearDiff;
        return a.courseNumber - b.courseNumber;
      });
  }, [personnel, category]);

  const activeGroup = useMemo(
    () => courseGroups.find(g => g.groupId === selectedGroupId),
    [courseGroups, selectedGroupId]
  );

  const activeFellows = activeGroup?.fellows ?? [];

  // Auto-cycling effect
  useEffect(() => {
    if (!autoDisplayActive || activeFellows.length === 0 || !isAutoPlaying) return;

    const interval = setInterval(() => {
      setAutoDisplayIndex((prev) => (prev + 1) % activeFellows.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [autoDisplayActive, activeFellows.length, isAutoPlaying]);

  // Reset auto-display index when course selection changes
  useEffect(() => {
    if (autoDisplayActive && selectedGroupId) {
      setAutoDisplayIndex(0);
    }
  }, [selectedGroupId, autoDisplayActive]);

  const currentAutoDisplayPerson = autoDisplayActive && activeFellows[autoDisplayIndex] ? activeFellows[autoDisplayIndex] : null;

  return (
    <div className="space-y-3">
      {/* When no course selected - show course selection grid */}
      {!selectedGroupId && (
        <>
          {/* Back button */}
          {onBack && (
            <div className="flex items-center gap-2">
              <button
                onClick={onBack}
                className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                  isLightMode
                    ? 'border-[#002060]/25 text-[#002060] hover:bg-[#002060]/10 hover:border-[#002060]/40'
                    : 'border-white/10 text-white/75 hover:bg-white/[0.08] hover:border-white/20'
                }`}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back
              </button>
            </div>
          )}

          {/* Header section */}
          {title && (
            <div className={`rounded-lg border p-6 ${isLightMode ? 'bg-slate-50 border-slate-200' : 'bg-slate-800 border-slate-700'}`}>
              <h1 className={`text-2xl font-bold ${isLightMode ? 'text-slate-900' : 'text-white'}`}>
                {title}
              </h1>
              {description && (
                <p className={`mt-2 text-sm ${isLightMode ? 'text-slate-600' : 'text-slate-300'}`}>
                  {description}
                </p>
              )}
            </div>
          )}

          {/* Course Selection Box */}
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
                'text-2xl md:text-3xl font-bold mb-2 text-center',
                isLightMode ? 'text-[#002060]' : 'text-[#00B0F0]'
              )}>
                {category === 'FWC' ? 'FELLOW OF WAR COLLEGE' : 'FELLOW OF NATIONAL DEFENCE COLLEGE'}
              </h2>
              <p className={cn(
                'text-sm mb-3 text-center',
                isLightMode ? 'text-[#6f7682]' : 'text-white/70'
              )}>
                Click on a CSE course to view fellows
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
                {courseGroups.map((group) => (
                  <button
                    key={group.groupId}
                    onClick={() => {
                      setSelectedGroupId(group.groupId);
                      setAutoDisplayIndex(0);
                    }}
                    className={cn(
                      'group relative flex flex-col items-center justify-center gap-3 aspect-square rounded-lg border-2 p-4 transition-all duration-300',
                      'backdrop-blur-sm overflow-hidden hover:scale-105',
                      'border-[#00B0F0]/60 hover:border-[#00B0F0]/80 hover:shadow-md'
                    )}
                    style={{
                      background: 'linear-gradient(180deg, #ADD8E6 0%, #5B9BD5 50%, #1F4E78 100%)',
                    }}
                  >
                    {/* NDC Crest */}
                    <img
                      src={ndcCrest}
                      alt={`${group.designation} crest`}
                      className="h-16 w-16 object-contain relative z-10 opacity-90"
                    />

                    {/* Course Label */}
                    <div className="flex flex-col items-center gap-1 relative z-10">
                      <span className="font-bold text-base text-center leading-tight text-[#002060]">
                        {group.designation}
                      </span>
                      <span className="text-[10px] font-semibold text-center text-[#002060]/60">
                        {group.fellows.length} {group.fellows.length === 1 ? 'Fellow' : 'Fellows'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* When course selected - show full page view */}
      {selectedGroupId && (
        <div className="space-y-2">
          {/* Back button to course selection */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedGroupId(null)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                isLightMode
                  ? 'border-[#002060]/25 text-[#002060] hover:bg-[#002060]/10 hover:border-[#002060]/40'
                  : 'border-white/10 text-white/75 hover:bg-white/[0.08] hover:border-white/20'
              }`}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Courses
            </button>
          </div>

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
                <h1 className={`text-2xl md:text-3xl font-bold text-center uppercase tracking-widest leading-tight ${
                  isLightMode ? 'text-[#002060]' : 'text-white'
                }`}>
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
                  {activeGroup?.designation}
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
              <div className="absolute inset-0 pointer-events-none overflow-hidden flex items-center justify-center opacity-8">
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

              <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {activeFellows.map((person) => (
                <FellowCard 
                  key={person.id}
                  person={person}
                  isLightMode={isLightMode}
                  onSelect={() => setSelectedPerson(person)}
                />
              ))}
              </div>
            </div>
          ) : (
            <div className={`py-8 text-center ${isLightMode ? 'text-slate-500' : 'text-slate-400'}`}>
              No fellows found for this course.
            </div>
          )}
        </div>
      )}

      {/* Auto-Display Full-Screen Modal */}
      {autoDisplayActive && currentAutoDisplayPerson && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#001030] via-[#0a0a1f] to-[#001030] flex items-center justify-center p-4">
          {/* Tri-color header strip */}
          <div className="absolute top-0 left-0 right-0 h-1 flex z-30">
            <div className="flex-1 bg-[#002060]" />
            <div className="flex-1 bg-[#FF0000]" />
            <div className="flex-1 bg-[#00B0F0]" />
          </div>

          {/* Header */}
          <div className="absolute top-4 left-0 right-0 z-20 flex items-center justify-between px-6 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <img src={ndcCrest} alt="NDC" className="h-8 w-8 object-contain" />
              <div>
                <p className="text-[#FFD700] font-serif text-sm uppercase tracking-widest font-bold">
                  {activeGroup?.designation}
                </p>
                <p className="text-white/60 text-xs mt-1">
                  {autoDisplayIndex + 1} of {activeFellows.length}
                </p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAutoPlaying(!isAutoPlaying)}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"
                title={isAutoPlaying ? 'Pause' : 'Play'}
              >
                {isAutoPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
              </button>
              <button
                onClick={() => setAutoDisplayActive(false)}
                className="p-2 rounded-lg bg-white/10 hover:bg-red-500/20 text-white transition-all"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col items-center justify-center gap-8 max-w-2xl mt-8">
            {/* Large NDC Crest */}
            <img
              src={ndcCrest}
              alt="NDC"
              className="h-40 w-40 object-contain opacity-90 drop-shadow-lg"
            />

            {/* Person Info */}
            <div className="text-center space-y-4 w-full">
              <h2 className="text-4xl font-bold text-white">
                {currentAutoDisplayPerson.name}
              </h2>
              {currentAutoDisplayPerson.rank && (
                <p className="text-xl text-[#FFD700] font-semibold">
                  {currentAutoDisplayPerson.rank}
                </p>
              )}
              {currentAutoDisplayPerson.service && (
                <p className="text-sm text-white/70">
                  {currentAutoDisplayPerson.service}
                </p>
              )}
              <div className="flex flex-col gap-2 text-sm text-white/80">
                {currentAutoDisplayPerson.periodStart && (
                  <p>Service Years: {currentAutoDisplayPerson.periodStart} - {currentAutoDisplayPerson.periodEnd}</p>
                )}
                {currentAutoDisplayPerson.seniorityOrder && (
                  <p>Seniority Order: #{currentAutoDisplayPerson.seniorityOrder}</p>
                )}
              </div>
              {currentAutoDisplayPerson.decoration && (
                <p className="text-lg text-white/80 pt-2 border-t border-white/20">
                  {currentAutoDisplayPerson.decoration}
                </p>
              )}
            </div>

            {/* Person Image */}
            {currentAutoDisplayPerson.imageUrl && (
              <div className="w-full max-w-sm aspect-square rounded-lg overflow-hidden border-2 border-[#FFD700]/30">
                <img
                  src={currentAutoDisplayPerson.imageUrl}
                  alt={currentAutoDisplayPerson.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-4 mt-8">
              <button
                onClick={() => setAutoDisplayIndex((prev) => (prev - 1 + activeFellows.length) % activeFellows.length)}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <div className="text-white text-sm font-semibold">
                {autoDisplayIndex + 1} / {activeFellows.length}
              </div>

              <button
                onClick={() => setAutoDisplayIndex((prev) => (prev + 1) % activeFellows.length)}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {selectedPerson && (
        <ProfileModal person={selectedPerson} onClose={() => setSelectedPerson(null)} />
      )}
    </div>
  );
}
