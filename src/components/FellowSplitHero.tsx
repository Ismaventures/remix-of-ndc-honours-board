import { Personnel, Category } from '@/types/domain';
import ndcCrest from '/images/ndc-crest.png';
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl';
import { ProfilePortraitFrame } from './ProfilePortraitFrame';

interface FellowSplitHeroProps {
  person: Personnel;
  category: Category;
  courseDesignation?: string;
}

function getCategoryLabel(category: Category) {
  if (category === 'FWC') return 'FELLOW OF WAR COLLEGE';
  if (category === 'FDC') return 'FELLOW OF NATIONAL DEFENCE COLLEGE';
  if (category === 'Allied') return 'INTERNATIONAL ALLIED OFFICER';
  if (category === 'Directing Staff') return 'DIRECTING STAFF';
  return 'DISTINGUISHED FELLOW';
}

export function FellowSplitHero({ person, category, courseDesignation }: FellowSplitHeroProps) {
  const portraitUrl = useResolvedMediaUrl(person.imageUrl);
  const categoryLabel = getCategoryLabel(category);

  return (
    <section className="relative w-full h-full flex flex-col overflow-hidden bg-white text-slate-900">
      <div className="h-[8px] flex z-30 shrink-0">
        <div className="flex-1 bg-[#002060]" title="Navy" />
        <div className="flex-1 bg-[#FF0000]" title="Army" />
        <div className="flex-1 bg-[#00B0F0]" title="Air Force" />
      </div>

      <div className="relative flex flex-1 min-h-0 z-10">
        {/* Left: biography */}
        <div className="flex-1 overflow-y-auto pr-6 pl-8 py-8 flex flex-col items-center scrollbar-hide border-r-4 border-[#FF0000]/80">
          <div className="flex items-center gap-4 mb-4 w-full justify-center">
            <div className="h-px w-20 bg-slate-300" />
            <span className="text-sm md:text-base lg:text-lg uppercase tracking-[0.05em] text-[#FF0000] font-extrabold text-center drop-shadow-sm">
              {categoryLabel}
            </span>
            <div className="h-px w-20 bg-slate-300" />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-3">
            {person.rank && (
              <p className="text-xs md:text-sm text-slate-500 font-bold uppercase tracking-widest">
                {person.rank}
              </p>
            )}

            <h2 className="text-2xl md:text-4xl font-serif font-extrabold text-[#002060] uppercase tracking-wide leading-tight">
              {person.name}
            </h2>
          </div>

          {person.decoration && (
            <div className="flex items-center gap-2.5 mb-4 justify-center max-w-2xl">
              <span className="text-[#FF0000] text-xl font-extrabold font-serif shrink-0">|</span>
              <p className="text-[#FF0000] text-xs sm:text-sm md:text-base font-extrabold italic tracking-wider uppercase text-center">
                {person.decoration}
              </p>
            </div>
          )}

          <img
            src={ndcCrest}
            alt="NDC Logo"
            className="h-16 md:h-20 w-auto object-contain filter drop-shadow-sm mb-5"
          />

          <div className="flex flex-wrap items-center justify-center gap-3 mb-6 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            {person.service && (
              <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                {person.service}
              </span>
            )}
            {person.periodStart > 0 && (
              <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200">
                {person.periodStart} – {person.periodEnd}
              </span>
            )}
            {courseDesignation && (
              <span className="px-3 py-1 rounded-full bg-[#002060]/5 border border-[#002060]/15 text-[#002060]">
                {courseDesignation}
              </span>
            )}
          </div>

          <div className="bg-[#f8fafc] border border-slate-100 p-6 sm:p-8 rounded-xl w-full max-w-3xl shadow-sm mb-8">
            <h4 className="text-xs font-serif font-extrabold text-[#002060] uppercase tracking-[0.2em] mb-4 pb-2 border-b border-slate-200/60">
              FULL BIOGRAPHY
            </h4>
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
        <div className="flex-1 bg-[#FF0000]" />
        <div className="flex-1 bg-[#00B0F0]" />
      </div>
    </section>
  );
}
