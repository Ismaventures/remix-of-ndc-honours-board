import { Personnel, Category } from '@/types/domain';
import ndcCrest from '/images/ndc-crest.png';
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl';
import { ProfilePortraitFrame } from './ProfilePortraitFrame';

const SOFT_RED = '#C0392B';

interface FellowSplitHeroProps {
  person: Personnel;
  category: Category;
  courseDesignation?: string;
}

export function FellowSplitHero({ person, category, courseDesignation }: FellowSplitHeroProps) {
  const portraitUrl = useResolvedMediaUrl(person.imageUrl);

  return (
    <section className="relative w-full h-full flex flex-col overflow-hidden bg-white text-slate-900">
      <div className="h-[8px] flex z-30 shrink-0">
        <div className="flex-1 bg-[#002060]" title="Navy" />
        <div className="flex-1 bg-[#C0392B]" title="Army" />
        <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
      </div>

      <div className="relative flex flex-1 min-h-0 z-10">
        {/* Left: biography */}
        <div className="flex-1 overflow-y-auto pr-6 pl-8 py-8 flex flex-col items-center scrollbar-hide border-r-[3px] border-[#002060]/30">
          <div className="flex flex-col items-center justify-center gap-1 mb-4">
            {person.rank && (
              <p className="text-base md:text-lg text-[#002060] font-extrabold uppercase tracking-widest" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
                {person.rank}
              </p>
            )}

            <h2 className="text-2xl md:text-4xl font-serif font-extrabold text-[#002060] uppercase tracking-wide leading-tight" style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}>
              {person.name}
            </h2>
          </div>

          {person.decoration && (
            <div className="flex items-center gap-2.5 mb-3 justify-center max-w-2xl">
              <p className="text-[#C0392B] text-xs sm:text-sm md:text-base font-extrabold italic tracking-wider uppercase text-center">
                {person.decoration}
              </p>
            </div>
          )}

          <img
            src={ndcCrest}
            alt="NDC Logo"
            className="h-14 md:h-16 w-auto object-contain filter drop-shadow-sm mb-4"
          />

          {/* Service / Period info pills */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-5 text-[10px] font-bold uppercase tracking-widest" style={{ fontFamily: "'Manrope', sans-serif" }}>
            {person.service && (
              <span className="px-3 py-1 rounded-full bg-[#002060]/5 border border-[#002060]/15 text-[#002060]">
                {person.service}
              </span>
            )}
            {person.periodStart > 0 && (
              <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600">
                {person.periodStart} – {person.periodEnd}
              </span>
            )}
            {person.title && (
              <span className="px-3 py-1 rounded-full bg-[#002060]/5 border border-[#002060]/15 text-[#002060]">
                {person.title}
              </span>
            )}
          </div>

          <div className="bg-[#f8fafc] border border-slate-100 p-6 sm:p-8 rounded-xl w-full max-w-3xl shadow-sm mb-8">
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-slate-200/60">
              <div className="h-1.5 w-10 bg-[#C0392B]" />
              <h4 className="text-xs font-serif font-extrabold text-[#002060] uppercase tracking-[0.2em]">
                FULL BIOGRAPHY
              </h4>
            </div>
            <p className="text-xs md:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap font-medium">
              {person.citation?.trim() || 'No biography available for this fellow.'}
            </p>
          </div>
        </div>

        <ProfilePortraitFrame
          imageUrl={portraitUrl || undefined}
          alt={person.name}
        />
      </div>

      <div className="h-[8px] flex z-30 shrink-0">
        <div className="flex-1 bg-[#002060]" />
        <div className="flex-1 bg-[#C0392B]" />
        <div className="flex-1 bg-[#00B0F0]" />
      </div>
    </section>
  );
}
