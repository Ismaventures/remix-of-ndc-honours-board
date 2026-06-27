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
  if (category === 'FWC') return 'DISTINGUISHED FELLOW OF THE WAR COLLEGE';
  if (category === 'FDC') return 'DISTINGUISHED FELLOW OF THE DEFENCE COLLEGE';
  if (category === 'Allied') return 'INTERNATIONAL ALLIED OFFICER';
  if (category === 'Directing Staff') return 'DIRECTING STAFF';
  return 'DISTINGUISHED FELLOW';
}

export function FellowSplitHero({ person, category, courseDesignation }: FellowSplitHeroProps) {
  const portraitUrl = useResolvedMediaUrl(person.imageUrl);
  const categoryLabel = getCategoryLabel(category);

  const normalizedRank = person.rank?.trim() || "";
  const normalizedName = person.name?.trim() || "";
  const hasRankPrefix =
    normalizedRank.length > 0 &&
    normalizedName.toLowerCase().startsWith(normalizedRank.toLowerCase());
  const fullName =
    normalizedRank.length > 0 && normalizedName.length > 0 && !hasRankPrefix
      ? `${normalizedRank} ${normalizedName}`
      : normalizedName || "Name unavailable";

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
          {/* Category label with decorative lines */}
          <div className="flex items-center gap-4 mb-4 w-full justify-center">
            <div className="h-[1px] w-20 bg-slate-300" />
            <span className="text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#002060] font-bold" style={{ fontFamily: "'Manrope', sans-serif" }}>
              {categoryLabel}
            </span>
            <div className="h-[1px] w-20 bg-slate-300" />
          </div>

          {/* Rank + Name on same line — matches commandant style */}
          <h2
            className="text-3xl md:text-5xl font-black mb-4 text-[#002060] uppercase tracking-wide text-center leading-tight"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", textShadow: "0 2px 8px rgba(0,32,96,0.10)" }}
          >
            {fullName}
          </h2>

          {/* NDC Crest */}
          <img src={ndcCrest} alt="NDC Logo" className="h-16 md:h-20 w-auto object-contain filter drop-shadow-sm mb-6" />

          {/* Full Biography Section */}
          <div className="bg-[#f8fafc] border border-slate-100 p-6 sm:p-8 rounded-xl w-full max-w-3xl shadow-sm mb-4">
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
        <div className="flex-1 bg-[#C0392B]" />
        <div className="flex-1 bg-[#00B0F0]" />
      </div>
    </section>
  );
}
