import { useState, useMemo, useEffect, useRef } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  User,
  Check,
  ChevronsUpDown,
  Search,
  CalendarDays,
  Play,
  Pause,
  X,
  Shield,
} from "lucide-react";
import { Personnel, Category } from "@/types/domain";
import { PersonnelProfileModal } from './FellowProfileModal';
import { PersonnelPortraitGrid } from './PersonnelPortraitCard';
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
import ndcCrest from "/images/ndc-crest.png";
import { useThemeMode } from "@/hooks/useThemeMode";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface OrganogramViewProps {
  data: Personnel[];
  title: string;
  category: Category;
  onBack: () => void;
  forcedSelectedId?: string | null;
  forcedSelectionNonce?: number;
}

type SortMode = "oldest" | "rank";

function rankPriority(rank: string): number {
  const key = rank.toLowerCase().replace(/[^a-z0-9]/g, "");

  // 4-Star
  if (
    key.includes("general") &&
    !key.includes("lt") &&
    !key.includes("maj") &&
    !key.includes("brig")
  )
    return 1;
  if (
    key === "admiral" ||
    (key.includes("admiral") && !key.includes("vice") && !key.includes("rear"))
  )
    return 1;
  if (key.includes("airchiefmarshal")) return 1;

  // 3-Star
  if (key.includes("ltgen") || key.includes("lieutenantgen")) return 2;
  if (key.includes("viceadmiral") || key.includes("vadm")) return 2;
  if (
    key.includes("airmarshal") &&
    !key.includes("chief") &&
    !key.includes("vice")
  )
    return 2;

  // 2-Star
  if (key.includes("majgen") || key.includes("majorgen")) return 3;
  if (key.includes("rearadmiral") || key.includes("radm")) return 3;
  if (key.includes("airvicemarshal") || key.includes("avm")) return 3;

  // 1-Star
  if (key.includes("briggen") || key.includes("brigadier")) return 4;
  if (key.includes("cdre") || key.includes("commodore") || key === "cmde")
    return 4;
  if (key.includes("aircdre") || key.includes("aircommodore")) return 4;

  // Colonel equivalent
  if (
    key.includes("col") &&
    !key.includes("ltcol") &&
    !key.includes("lieutenantcol")
  )
    return 5;
  if (
    (key.includes("capt") || key.includes("captain")) &&
    !key.includes("gp") &&
    !key.includes("group")
  )
    return 5;
  if (key.includes("gpcapt") || key.includes("groupcapt")) return 5;

  // Lt Col equivalent
  if (key.includes("ltcol") || key.includes("lieutenantcol")) return 6;
  if (
    (key.includes("cdr") || key.includes("commander")) &&
    !key.includes("ltcdr")
  )
    return 6;
  if (
    key.includes("wgcdr") ||
    key.includes("wingcdr") ||
    key.includes("wingcommander")
  )
    return 6;

  // Major equivalent
  if (key.includes("maj") && !key.includes("gen")) return 7;
  if (key.includes("ltcdr") || key.includes("lieutenantcdr")) return 7;
  if (
    key.includes("sqnldr") ||
    key.includes("squadronldr") ||
    key.includes("squadronleader")
  )
    return 7;

  // Captain (Army) equivalent
  if (key === "capt") return 8;
  if (
    key.includes("fltlt") ||
    key.includes("flightlt") ||
    key.includes("flightlieutenant")
  )
    return 8;

  // Civilians & Others
  if (key.includes("amb") || key.includes("ambassador")) return 15;
  if (key.includes("prof") || key.includes("professor")) return 16;
  if (key.includes("dr") || key.includes("doctor")) return 17;

  return 99;
}

function ArchiveProfileImage({ person }: { person: Personnel }) {
  const resolvedImageUrl = useResolvedMediaUrl(person.imageUrl);

  if (!resolvedImageUrl) {
    return (
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-[#FFD700]/70 bg-[#002060]/10 shadow-inner flex items-center justify-center shrink-0 relative overflow-hidden group-hover:border-[#FFD700] transition-colors">
        <div className="absolute inset-0 bg-gradient-to-tr from-[#002060]/15 to-transparent" />
        <User className="h-8 w-8 text-[#002060]/45 group-hover:text-[#002060]/75 transition-colors relative z-10" />
      </div>
    );
  }

  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
      <div className="absolute inset-0 bg-[#002060]/20 rounded-lg blur-[2px] scale-105 group-hover:bg-[#002060]/35 transition-colors" />
      <img
        src={resolvedImageUrl}
        alt={person.name}
        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-[#FFD700]/70 object-cover shadow-[0_4px_12px_rgba(0,0,0,0.3)] group-hover:border-[#FFD700] transition-colors z-10"
      />
    </div>
  );
}

function GridAlliedCard({
  person,
  onClick,
  isLightMode,
}: {
  person: Personnel;
  onClick: () => void;
  isLightMode: boolean;
}) {
  const resolvedSrc = useResolvedMediaUrl(person.imageUrl);

  const normalizedRank = person.rank?.trim() || "";
  const normalizedName = person.name?.trim() || "";
  const hasRankPrefix =
    normalizedRank.length > 0 &&
    normalizedName.toLowerCase().startsWith(normalizedRank.toLowerCase());
  const displayName =
    normalizedRank.length > 0 && normalizedName.length > 0 && !hasRankPrefix
      ? `${normalizedRank} ${normalizedName}`
      : normalizedName || "Name unavailable";

  return (
    <button
      onClick={onClick}
      className={`group relative overflow-hidden rounded-xl border text-left flex flex-col transition-all duration-300 hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 w-full shadow-lg ${
        isLightMode
          ? "bg-white border-slate-200/80 hover:shadow-xl hover:border-slate-300"
          : "bg-slate-950 border-slate-800 hover:shadow-2xl hover:border-slate-700"
      }`}
      style={{ minHeight: "410px" }}
    >
      {/* Top tri-service strip */}
      <div className="absolute inset-x-0 top-0 h-[4px] flex z-20">
        <div className="flex-1 bg-[#002060]" />
        <div className="flex-1 bg-[#FF0000]" />
        <div className="flex-1 bg-[#00B0F0]" />
      </div>

      {/* Main card container with padding */}
      <div className="p-3.5 pb-2.5 flex-1 flex flex-col justify-between w-full">
        {/* Frame for the photo */}
        <div className="w-full aspect-[4/5] rounded border border-slate-200 bg-white flex items-center justify-center relative overflow-hidden shadow-inner p-2">
          {resolvedSrc ? (
            <img
              src={resolvedSrc}
              alt={person.name}
              className="w-full h-full object-contain"
            />
          ) : (
            <Shield className="h-10 w-10 text-slate-300 animate-pulse" />
          )}
        </div>

        {/* Plaque block (dark blue container) */}
        <div className="bg-[#002060] border border-[#FFD700] rounded p-2.5 text-center mt-3 flex flex-col justify-center min-h-[110px] w-full shadow-[inset_0_0_15px_rgba(0,0,0,0.4)]">
          <h4 className="text-amber-400 text-xs font-serif font-extrabold tracking-wide leading-tight line-clamp-2 px-0.5">
            {displayName}
          </h4>

          {person.service && (
            <p className="text-[#FF0000] text-[8.5px] font-bold font-sans mt-1 leading-tight line-clamp-1">
              {person.service}
            </p>
          )}

          <p className="text-slate-300 text-[7.5px] font-mono tracking-widest uppercase mt-1">
            {person.category}
          </p>

          <p className="text-slate-300 text-[8px] font-mono tracking-widest uppercase mt-0.5">
            YEAR: {person.periodStart} – {person.periodEnd}
          </p>
        </div>

        {/* Tap to open bar */}
        <div className="py-2.5 text-center text-[9px] sm:text-[10px] font-extrabold tracking-wider text-sky-600 uppercase w-full">
          TAP TO OPEN FULL DETAILS
        </div>
      </div>

      {/* Bottom tri-service strip */}
      <div className="absolute inset-x-0 bottom-0 h-[4px] flex z-20">
        <div className="flex-1 bg-[#00B0F0]" />
        <div className="flex-1 bg-[#FF0000]" />
        <div className="flex-1 bg-[#002060]" />
      </div>
    </button>
  );
}

export function OrganogramView({
  data,
  title,
  category,
  onBack,
  forcedSelectedId = undefined,
  forcedSelectionNonce = 0,
}: OrganogramViewProps) {
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("oldest");
  const [searchQuery, setSearchQuery] = useState("");
  const [rankFilter, setRankFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  // Auto-display states
  const [autoDisplayActive, setAutoDisplayActive] = useState(false);
  const [autoDisplayIndex, setAutoDisplayIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  const [rankOpen, setRankOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (forcedSelectedId === undefined) return;
    setSearchQuery("");
    setRankFilter("all");
    setServiceFilter("all");
    setYearFilter("all");
    setSelectedId(forcedSelectedId);
  }, [forcedSelectedId, forcedSelectionNonce]);

  const categoryRecords = useMemo(
    () => data.filter((p) => p.category === category),
    [data, category],
  );

  // Auto-cycling effect for autodisplay
  useEffect(() => {
    if (!autoDisplayActive || categoryRecords.length === 0 || !isAutoPlaying) return;

    const interval = setInterval(() => {
      setAutoDisplayIndex((prev) => (prev + 1) % categoryRecords.length);
    }, 4000); // Change every 4 seconds

    return () => clearInterval(interval);
  }, [autoDisplayActive, categoryRecords.length, isAutoPlaying]);

  const currentAutoDisplayPerson = autoDisplayActive && categoryRecords[autoDisplayIndex] ? categoryRecords[autoDisplayIndex] : null;

  const rankOptions = useMemo(() => {
    return [...new Set(categoryRecords.map((p) => p.rank))].sort((a, b) => {
      const byPriority = rankPriority(a) - rankPriority(b);
      if (byPriority !== 0) return byPriority;
      return a.localeCompare(b);
    });
  }, [categoryRecords]);

  const serviceOptions = useMemo(() => {
    return [...new Set(categoryRecords.map((p) => p.service))].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [categoryRecords]);

  const yearOptions = useMemo(() => {
    const years = new Set<number>();
    categoryRecords.forEach((p) => {
      for (let y = p.periodStart; y <= p.periodEnd; y += 1) {
        years.add(y);
      }
    });

    return [...years].sort((a, b) => a - b);
  }, [categoryRecords]);

  const filtered = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const records = categoryRecords.filter((p) => {
      if (normalizedQuery) {
        const searchable = [
          p.name,
          p.rank,
          p.service,
          p.citation,
          String(p.periodStart),
          String(p.periodEnd),
        ]
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(normalizedQuery)) return false;
      }
      if (rankFilter !== "all" && p.rank !== rankFilter) return false;
      if (serviceFilter !== "all" && p.service !== serviceFilter) return false;
      if (yearFilter !== "all") {
        const year = Number(yearFilter);
        if (Number.isNaN(year) || year < p.periodStart || year > p.periodEnd)
          return false;
      }
      return true;
    });

    records.sort((a, b) => {
      if (sortMode === "oldest") {
        if (a.periodStart !== b.periodStart)
          return a.periodStart - b.periodStart;
        const rankDiff = rankPriority(a.rank) - rankPriority(b.rank);
        if (rankDiff !== 0) return rankDiff;
        return a.name.localeCompare(b.name);
      }

      const rankDiff = rankPriority(a.rank) - rankPriority(b.rank);
      if (rankDiff !== 0) return rankDiff;
      if (a.periodStart !== b.periodStart) return a.periodStart - b.periodStart;
      return a.name.localeCompare(b.name);
    });

    return records;
  }, [
    categoryRecords,
    rankFilter,
    searchQuery,
    serviceFilter,
    sortMode,
    yearFilter,
  ]);

<<<<<<< HEAD
=======
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  useEffect(() => {
    if (totalPages === 0 && currentPage !== 1) {
      setCurrentPage(1);
      return;
    }
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const usePortraitGrid = category === "Allied";

  const loopedRecords = useMemo(() => {
    if (filtered.length <= 1) return filtered;
    return [...filtered, ...filtered, ...filtered];
  }, [filtered]);

  const normalizeLoopPosition = () => {
    const container = scrollRef.current;
    if (!container || filtered.length <= 1) return;

    const segmentWidth = container.scrollWidth / 3;

    while (container.scrollLeft >= segmentWidth * 2) {
      container.scrollLeft -= segmentWidth;
    }

    while (container.scrollLeft < segmentWidth) {
      container.scrollLeft += segmentWidth;
    }
  };

  const scrollCarousel = (dir: "left" | "right") => {
    const container = scrollRef.current;
    if (!container) return;

    normalizeLoopPosition();
    autoPauseUntilRef.current = performance.now() + 900;

    if (navRafRef.current) {
      window.cancelAnimationFrame(navRafRef.current);
      navRafRef.current = null;
    }

    const delta = dir === "left" ? -360 : 360;
    const start = container.scrollLeft;
    const end = start + delta;
    const durationMs = 420;
    const startAt = performance.now();
    const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const progress = Math.min(1, (now - startAt) / durationMs);
      const eased = easeOutCubic(progress);

      container.scrollLeft = start + (end - start) * eased;
      normalizeLoopPosition();

      if (progress < 1) {
        navRafRef.current = window.requestAnimationFrame(step);
      } else {
        navRafRef.current = null;
      }
    };

    navRafRef.current = window.requestAnimationFrame(step);
  };

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || filtered.length <= 1 || displayMode !== "scroll") return;

    const segmentWidth = container.scrollWidth / 3;
    container.scrollLeft = segmentWidth;
  }, [filtered.length, mounted, displayMode]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || filtered.length <= 1 || displayMode !== "scroll") return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReducedMotion) return;

    let rafId = 0;
    let last = performance.now();
    const speedPxPerMs = 0.03;

    const tick = (now: number) => {
      const elapsed = now - last;
      last = now;

      if (!isCarouselPaused) {
        if (now < autoPauseUntilRef.current) {
          rafId = window.requestAnimationFrame(tick);
          return;
        }

        container.scrollLeft += elapsed * speedPxPerMs;
        normalizeLoopPosition();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => {
      window.cancelAnimationFrame(rafId);
      if (navRafRef.current) {
        window.cancelAnimationFrame(navRafRef.current);
        navRafRef.current = null;
      }
    };
  }, [isCarouselPaused, filtered.length, displayMode]);

>>>>>>> 5150c0706c6226fe7946678363018ec35443990a
  const selectedPerson = useMemo(
    () => filtered.find((p) => p.id === selectedId) || null,
    [filtered, selectedId],
  );

  return (
    <div
      className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          onClick={onBack}
          className={`group inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold uppercase tracking-wider transition-all duration-200 active:scale-95 shadow-sm ${
            isLightMode
              ? 'border-[#002060]/20 text-[#002060] bg-white hover:bg-[#002060]/5 hover:border-[#002060]/35'
              : 'border-white/10 text-white/80 bg-slate-950/20 hover:bg-white/[0.08] hover:border-white/20'
          }`}
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back
        </button>

        <div className="flex items-center gap-4">
          <div className="text-xs uppercase tracking-widest text-[#002060]/80 font-semibold">
            {filtered.length} Records
          </div>
          {filtered.length > 0 && (
            <button
              onClick={() => {
                setAutoDisplayActive(true);
                setAutoDisplayIndex(0);
                setIsAutoPlaying(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#002060] text-white text-xs font-semibold uppercase tracking-wider hover:bg-[#003080] transition-all duration-200 shadow-sm"
            >
              <Play className="h-3.5 w-3.5" />
              Auto Display
            </button>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold font-serif text-[#002060]">{title}</h2>
        <p className="text-xs text-[#002060]/80 uppercase tracking-widest mt-1 min-h-[16px] font-semibold">
          Professional Archive List
        </p>
      </div>

      <div className="mb-6 p-4 md:p-5 rounded-xl border border-[#002060]/25 bg-[linear-gradient(140deg,rgba(0,32,96,0.06)_0%,rgba(255,255,255,0.92)_42%,rgba(0,176,240,0.08)_100%)] shadow-[inset_0_0_20px_rgba(0,32,96,0.12)] space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-primary/90 font-semibold">
            Search and Filters
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setRankFilter("all");
              setServiceFilter("all");
              setYearFilter("all");
              setSortMode("oldest");
            }}
            className="px-3 py-1.5 text-xs rounded-md border border-primary/25 text-muted-foreground hover:text-foreground hover:border-primary/45 transition-colors"
          >
            Reset All
          </button>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, rank, service, citation, or year..."
            className="h-11 w-full rounded-lg border-2 border-primary/20 bg-background/80 pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/60 transition-colors shadow-sm"
          />
        </div>

        <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-background/70 p-1 w-full md:w-auto">
          <button
            onClick={() => setSortMode("oldest")}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
              sortMode === "oldest"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Oldest First
          </button>
          <button
            onClick={() => setSortMode("rank")}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
              sortMode === "rank"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="inline-flex items-center gap-1">
              <ArrowUpDown className="h-3.5 w-3.5" /> Highest Rank First
            </span>
          </button>
        </div>

<<<<<<< HEAD
        {/* displayMode toggle removed */}
=======
        {!usePortraitGrid && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-background/70 p-1 w-full md:w-auto">
          <button
            onClick={() => setDisplayMode("scroll")}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
              displayMode === "scroll"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Scrolling View
          </button>
          <button
            onClick={() => setDisplayMode("list")}
            className={`px-3 py-2 text-xs font-semibold rounded-md transition-colors ${
              displayMode === "list"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            List View
          </button>
        </div>
        )}
>>>>>>> 5150c0706c6226fe7946678363018ec35443990a

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
        {/* RANK FILTER COMBOBOX */}
        <Popover open={rankOpen} onOpenChange={setRankOpen}>
          <PopoverTrigger asChild>
            <button
              aria-expanded={rankOpen}
              className="flex h-11 w-full items-center justify-between rounded-lg border-2 border-primary/20 bg-background/80 px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 focus:outline-none focus:border-primary/60 transition-colors shadow-sm"
            >
              {rankFilter === "all" ? "Military Rank (All)" : rankFilter}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search rank..." />
              <CommandList>
                <CommandEmpty>No rank found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      setRankFilter("all");
                      setRankOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        rankFilter === "all" ? "opacity-100" : "opacity-0",
                      )}
                    />
                    (All Ranks)
                  </CommandItem>
                  {rankOptions.map((rank) => (
                    <CommandItem
                      key={rank}
                      value={rank}
                      onSelect={(value) => {
                        setRankFilter(value);
                        setRankOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          rankFilter === rank ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {rank}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* SERVICE FILTER COMBOBOX */}
        <Popover open={serviceOpen} onOpenChange={setServiceOpen}>
          <PopoverTrigger asChild>
            <button
              aria-expanded={serviceOpen}
              className="flex h-11 w-full items-center justify-between rounded-lg border-2 border-primary/20 bg-background/80 px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 focus:outline-none focus:border-primary/60 transition-colors shadow-sm"
            >
              {serviceFilter === "all" ? "Arm of Service (All)" : serviceFilter}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search service..." />
              <CommandList>
                <CommandEmpty>No service found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="all"
                    onSelect={() => {
                      setServiceFilter("all");
                      setServiceOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        serviceFilter === "all" ? "opacity-100" : "opacity-0",
                      )}
                    />
                    (All Services)
                  </CommandItem>
                  {serviceOptions.map((service) => (
                    <CommandItem
                      key={service}
                      value={service}
                      onSelect={(value) => {
                        setServiceFilter(value);
                        setServiceOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          serviceFilter === service
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {service}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* YEAR FILTER COMBOBOX / GRID */}
        <Popover open={yearOpen} onOpenChange={setYearOpen}>
          <PopoverTrigger asChild>
            <button
              aria-expanded={yearOpen}
              className="flex h-11 w-full items-center justify-between rounded-lg border-2 border-primary/20 bg-background/80 px-4 py-2 text-sm font-medium text-foreground hover:border-primary/40 focus:outline-none focus:border-primary/60 transition-colors shadow-sm"
            >
              <span className="flex items-center">
                <CalendarDays className="mr-2 h-4 w-4 text-muted-foreground" />
                {yearFilter === "all" ? "Service Year (All)" : yearFilter}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-3"
            align="start"
          >
            <div className="mb-2 px-1">
              <h4 className="text-sm font-semibold mb-1">Select Year</h4>
              <p className="text-xs text-muted-foreground">
                Filter records by period
              </p>
            </div>

            <button
              onClick={() => {
                setYearFilter("all");
                setYearOpen(false);
              }}
              className={cn(
                "w-full mb-3 text-left px-3 py-2 text-sm rounded-md transition-colors",
                yearFilter === "all"
                  ? "bg-primary text-primary-foreground font-bold"
                  : "hover:bg-muted font-medium",
              )}
            >
              All Years
            </button>

            <div className="grid grid-cols-4 gap-1 max-h-[220px] overflow-y-auto pr-1 select-year-scroll">
              {yearOptions.map((year) => (
                <button
                  key={year}
                  onClick={() => {
                    setYearFilter(String(year));
                    setYearOpen(false);
                  }}
                  className={cn(
                    "h-9 rounded-md text-sm transition-colors flex items-center justify-center border",
                    yearFilter === String(year)
                      ? "bg-primary text-primary-foreground border-primary font-bold shadow-md"
                      : "bg-background border-border hover:border-primary/50 hover:bg-muted",
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
        </div>
      </div>

<<<<<<< HEAD
      <div className="rounded-xl p-3 md:p-6 relative overflow-hidden flex flex-col border border-[#002060]/30 bg-[linear-gradient(165deg,#f9fbff_0%,#eef3fb_55%,#e6f8ff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_0_28px_rgba(0,32,96,0.08),0_16px_45px_rgba(0,0,0,0.16)]">
=======
      <div className={`rounded-xl p-3 md:p-6 ${usePortraitGrid ? "min-h-[520px]" : displayMode === "scroll" ? "min-h-[300px]" : "min-h-[520px]"} relative overflow-hidden flex flex-col border border-[#002060]/30 bg-[linear-gradient(165deg,#f9fbff_0%,#eef3fb_55%,#e6f8ff_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_0_28px_rgba(0,32,96,0.08),0_16px_45px_rgba(0,0,0,0.16)]`}>
>>>>>>> 5150c0706c6226fe7946678363018ec35443990a
        <div className="absolute top-0 inset-x-0 h-[7px] flex">
          <div className="flex-1 bg-[#002060]" />
          <div className="flex-1 bg-[#FF0000]" />
          <div className="flex-1 bg-[#00B0F0]" />
        </div>
        <div className="absolute bottom-0 inset-x-0 h-[6px] flex">
          <div className="flex-1 bg-[#002060]" />
          <div className="flex-1 bg-[#FF0000]" />
          <div className="flex-1 bg-[#00B0F0]" />
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-[0.1] bg-[linear-gradient(45deg,rgba(0,32,96,0.06)_25%,transparent_25%,transparent_75%,rgba(0,32,96,0.06)_75%),linear-gradient(45deg,rgba(0,32,96,0.06)_25%,transparent_25%,transparent_75%,rgba(0,32,96,0.06)_75%)] bg-[length:52px_52px] bg-[position:0_0,26px_26px]" />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(140%_100%_at_50%_0%,rgba(0,32,96,0.1),transparent_60%)]" />
        {filtered.length > 0 ? (
<<<<<<< HEAD
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6 mt-6 pb-8">
            {filtered.map((person) => (
              <GridAlliedCard
                key={person.id}
                person={person}
                onClick={() => setSelectedId(person.id)}
                isLightMode={isLightMode}
              />
            ))}
          </div>
=======
          <>
            {usePortraitGrid ? (
              <>
                <div className="relative z-10 mb-4 rounded-xl border p-4 bg-white/90 border-[#002060]/15 shadow-sm">
                  <div className="h-1.5 flex rounded-full overflow-hidden mb-3">
                    <div className="flex-1 bg-[#002060]" />
                    <div className="flex-1 bg-[#FF0000]" />
                    <div className="flex-1 bg-[#00B0F0]" />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold font-serif text-center uppercase tracking-wider text-[#002060]">
                    International Allied Officers
                  </h3>
                  <p className="text-sm text-center text-slate-600 mt-1">
                    {filtered.length} {filtered.length === 1 ? "Officer" : "Officers"} — tap a portrait for full biography
                  </p>
                </div>

                <PersonnelPortraitGrid
                  personnel={paginatedRecords}
                  isLightMode={isLightMode}
                  onSelectPerson={(person) => setSelectedId(person.id)}
                />

                {totalPages > 1 && (
                  <div className="pt-6 mt-4 border-t border-primary/10 relative z-10">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            className={
                              currentPage === 1
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                        <div className="flex items-center mx-2 text-sm text-muted-foreground font-medium">
                          Page {currentPage} of {totalPages}
                        </div>
                        <PaginationItem>
                          <PaginationNext
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            className={
                              currentPage === totalPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            ) : displayMode === "scroll" ? (
              <>
                <div className="flex items-center justify-end gap-1 mb-3">
                  <button
                    onClick={() => scrollCarousel("left")}
                    type="button"
                    aria-label="Scroll to previous personnel"
                    className="p-2 rounded transition-all active:scale-95 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => scrollCarousel("right")}
                    type="button"
                    aria-label="Scroll to next personnel"
                    className="p-2 rounded transition-all active:scale-95 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div
                  ref={scrollRef}
                  className="flex gap-4 overflow-x-auto pb-4 pt-1 scrollbar-hide px-1"
                  onMouseEnter={() => setIsCarouselPaused(true)}
                  onMouseLeave={() => setIsCarouselPaused(false)}
                  onFocus={() => setIsCarouselPaused(true)}
                  onBlur={() => setIsCarouselPaused(false)}
                >
                  {loopedRecords.map((person, index) => (
                    <button
                      key={`${person.id}-${index}`}
                      onClick={() => setSelectedId(person.id)}
                      className="group relative w-[340px] md:w-[380px] shrink-0 text-left rounded-xl border border-[#002060]/20 bg-white p-3.5 sm:p-4 transition-all duration-300 hover:border-[#00B0F0] hover:shadow-[0_12px_38px_rgba(0,32,96,0.22)] overflow-hidden flex flex-col"
                    >
                      <div className="absolute top-0 inset-x-0 h-[6px] flex z-20">
                        <div className="flex-1 bg-[#002060]" />
                        <div className="flex-1 bg-[#FF0000]" />
                        <div className="flex-1 bg-[#00B0F0]" />
                      </div>
                      <div className="absolute inset-0 pointer-events-none opacity-[0.08] bg-[linear-gradient(45deg,rgba(0,32,96,0.08)_25%,transparent_25%,transparent_75%,rgba(0,32,96,0.08)_75%),linear-gradient(45deg,rgba(0,32,96,0.08)_25%,transparent_25%,transparent_75%,rgba(0,32,96,0.08)_75%)] bg-[length:34px_34px] bg-[position:0_0,17px_17px]" />
                      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(120%_100%_at_0%_0%,rgba(0,176,240,0.14),transparent_55%)]" />
                      <div className="absolute inset-x-0 top-0 h-16 pointer-events-none bg-gradient-to-b from-white/[0.07] to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00B0F0]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#002060]/70 via-[#FF0000]/70 to-[#00B0F0]/70 opacity-80 group-hover:opacity-100 transition-opacity" />

                      <div className="relative z-10 flex items-center justify-between mb-3">
                        <span className="text-sm font-bold opacity-75 text-[#002060]/75 group-hover:text-[#002060] transition-colors">
                          #{(index % Math.max(filtered.length, 1)) + 1}
                        </span>
                        <span className="px-3 py-1.5 rounded-md border border-[#002060]/35 bg-[#002060]/8 text-[#002060] font-bold shadow-[0_0_16px_rgba(0,32,96,0.18)] whitespace-nowrap text-xs">
                          {person.periodStart} - {person.periodEnd}
                        </span>
                      </div>

                      <div className="relative z-10 flex items-start gap-4 sm:gap-5 flex-1 min-h-0">
                        <div className="shrink-0 pt-0.5">
                          <ArchiveProfileImage person={person} />
                        </div>

                        <div className="flex flex-col gap-2 min-w-0">
                          <h4 className="text-base sm:text-lg font-bold font-serif text-[#0f172a] leading-tight group-hover:text-[#002060] transition-colors drop-shadow-sm flex items-center flex-wrap">
                            <span className="text-[#002060] text-[11px] sm:text-xs mr-2 uppercase tracking-widest font-sans">
                              {person.rank}
                            </span>
                            {person.name}
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2 max-w-2xl">
                            {person.citation}
                          </p>

                          <div className="flex flex-wrap gap-2 pt-1">
                            <span className="px-2.5 py-1 rounded border border-[#002060]/20 bg-[#002060]/5 text-[#002060]/80 font-semibold uppercase tracking-wider text-[10px]">
                              {person.service}
                            </span>
                            <span className="px-2.5 py-1 rounded border border-[#00B0F0]/30 bg-[#00B0F0]/8 text-[#005f7e] font-semibold uppercase tracking-wider text-[10px]">
                              {person.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4 md:gap-5 flex-1 auto-rows-fr">
                  {paginatedRecords.map((person, index) => (
                    <button
                      key={person.id}
                      onClick={() => setSelectedId(person.id)}
                      className="group relative w-full h-full text-left rounded-xl border border-[#002060]/20 bg-white p-3.5 sm:p-4 transition-all duration-300 hover:border-[#00B0F0] hover:shadow-[0_12px_38px_rgba(0,32,96,0.22)] overflow-hidden flex flex-col"
                    >
                      <div className="absolute top-0 inset-x-0 h-[6px] flex z-20">
                        <div className="flex-1 bg-[#002060]" />
                        <div className="flex-1 bg-[#FF0000]" />
                        <div className="flex-1 bg-[#00B0F0]" />
                      </div>
                      <div className="absolute inset-0 pointer-events-none opacity-[0.08] bg-[linear-gradient(45deg,rgba(0,32,96,0.08)_25%,transparent_25%,transparent_75%,rgba(0,32,96,0.08)_75%),linear-gradient(45deg,rgba(0,32,96,0.08)_25%,transparent_25%,transparent_75%,rgba(0,32,96,0.08)_75%)] bg-[length:34px_34px] bg-[position:0_0,17px_17px]" />
                      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(120%_100%_at_0%_0%,rgba(0,176,240,0.14),transparent_55%)]" />
                      <div className="absolute inset-x-0 top-0 h-16 pointer-events-none bg-gradient-to-b from-white/[0.07] to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#00B0F0]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#002060]/70 via-[#FF0000]/70 to-[#00B0F0]/70 opacity-80 group-hover:opacity-100 transition-opacity" />

                      <div className="relative z-10 flex items-center justify-between mb-3">
                        <span className="text-sm font-bold opacity-75 text-[#002060]/75 group-hover:text-[#002060] transition-colors">
                          #{(currentPage - 1) * itemsPerPage + index + 1}
                        </span>
                        <span className="px-3 py-1.5 rounded-md border border-[#002060]/35 bg-[#002060]/8 text-[#002060] font-bold shadow-[0_0_16px_rgba(0,32,96,0.18)] whitespace-nowrap text-xs">
                          {person.periodStart} - {person.periodEnd}
                        </span>
                      </div>

                      <div className="relative z-10 flex items-start gap-4 sm:gap-5 flex-1 min-h-0">
                        <div className="shrink-0 pt-0.5">
                          <ArchiveProfileImage person={person} />
                        </div>

                        <div className="flex flex-col gap-2 min-w-0">
                          <h4 className="text-base sm:text-lg font-bold font-serif text-[#0f172a] leading-tight group-hover:text-[#002060] transition-colors drop-shadow-sm flex items-center flex-wrap">
                            <span className="text-[#002060] text-[11px] sm:text-xs mr-2 uppercase tracking-widest font-sans">
                              {person.rank}
                            </span>
                            {person.name}
                          </h4>
                          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2 max-w-2xl">
                            {person.citation}
                          </p>

                          <div className="flex flex-wrap gap-2 pt-1">
                            <span className="px-2.5 py-1 rounded border border-[#002060]/20 bg-[#002060]/5 text-[#002060]/80 font-semibold uppercase tracking-wider text-[10px]">
                              {person.service}
                            </span>
                            <span className="px-2.5 py-1 rounded border border-[#00B0F0]/30 bg-[#00B0F0]/8 text-[#005f7e] font-semibold uppercase tracking-wider text-[10px]">
                              {person.category}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="pt-6 mt-4 border-t border-primary/10">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious
                            onClick={() =>
                              setCurrentPage((p) => Math.max(1, p - 1))
                            }
                            className={
                              currentPage === 1
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>

                        <div className="flex items-center mx-2 text-sm text-muted-foreground font-medium">
                          Page {currentPage} of {totalPages}
                        </div>

                        <PaginationItem>
                          <PaginationNext
                            onClick={() =>
                              setCurrentPage((p) => Math.min(totalPages, p + 1))
                            }
                            className={
                              currentPage === totalPages
                                ? "pointer-events-none opacity-50"
                                : "cursor-pointer"
                            }
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
              </>
            )}
          </>
>>>>>>> 5150c0706c6226fe7946678363018ec35443990a
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="w-16 h-16 rounded-full gold-border flex items-center justify-center bg-muted/20 mb-4 animate-pulse-slow">
              <span className="text-primary text-2xl">?</span>
            </div>
            <h3 className="text-lg font-bold font-serif text-muted-foreground">
              No personnel records found
            </h3>
          </div>
        )}
      </div>

      {selectedPerson && (
        <PersonnelProfileModal
          person={selectedPerson}
          fellows={filtered}
          category={category}
          onClose={() => setSelectedId(null)}
          onSelectPerson={(next) => setSelectedId(next.id)}
        />
      )}

      {/* Auto-Display Full-Screen Modal */}
      {autoDisplayActive && currentAutoDisplayPerson && (
        <div className="fixed inset-0 z-[100] bg-gradient-to-br from-[#001030] via-[#0a0a1f] to-[#001030] flex items-center justify-center p-4">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <img src={ndcCrest} alt="NDC" className="h-8 w-8 object-contain" />
              <div>
                <p className="text-[#FFD700] font-serif text-sm uppercase tracking-widest font-bold">
                  {title}
                </p>
                <p className="text-white/60 text-xs mt-1">
                  {autoDisplayIndex + 1} of {categoryRecords.length}
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
          <div className="flex flex-col items-center justify-center gap-8 max-w-2xl">
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
                <p className="text-lg text-white/80">
                  {currentAutoDisplayPerson.service}
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
                onClick={() => setAutoDisplayIndex((prev) => (prev - 1 + categoryRecords.length) % categoryRecords.length)}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Previous"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>

              <div className="text-white text-sm font-semibold">
                {autoDisplayIndex + 1} / {categoryRecords.length}
              </div>

              <button
                onClick={() => setAutoDisplayIndex((prev) => (prev + 1) % categoryRecords.length)}
                className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                title="Next"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
