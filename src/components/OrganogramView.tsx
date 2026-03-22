import { useState, useMemo, useEffect } from "react";
import {
  ArrowLeft,
  ArrowUpDown,
  User,
  Check,
  ChevronsUpDown,
  Search,
  CalendarDays,
} from "lucide-react";
import { Personnel, Category } from "@/types/domain";
import { ProfileModal } from "./ProfileModal";
import { useResolvedMediaUrl } from "@/hooks/useResolvedMediaUrl";
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
      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-primary/20 bg-muted/40 shadow-inner flex items-center justify-center shrink-0 relative overflow-hidden group-hover:border-primary/50 transition-colors">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent" />
        <User className="h-8 w-8 text-primary/40 group-hover:text-primary/70 transition-colors relative z-10" />
      </div>
    );
  }

  return (
    <div className="relative w-16 h-16 sm:w-20 sm:h-20 shrink-0">
      <div className="absolute inset-0 bg-primary/20 rounded-lg blur-[2px] scale-105 group-hover:bg-primary/40 transition-colors" />
      <img
        src={resolvedImageUrl}
        alt={person.name}
        className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg border-2 border-primary/30 object-cover shadow-[0_4px_12px_rgba(0,0,0,0.3)] group-hover:border-primary/70 transition-colors z-10"
      />
    </div>
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("oldest");
  const [rankFilter, setRankFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");

  const [rankOpen, setRankOpen] = useState(false);
  const [serviceOpen, setServiceOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Adjust based on preferences

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (forcedSelectedId === undefined) return;
    setRankFilter("all");
    setServiceFilter("all");
    setYearFilter("all");
    setCurrentPage(1);
    setSelectedId(forcedSelectedId);
  }, [forcedSelectedId, forcedSelectionNonce]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [rankFilter, serviceFilter, yearFilter, sortMode]);

  const categoryRecords = useMemo(
    () => data.filter((p) => p.category === category),
    [data, category],
  );

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
    const records = categoryRecords.filter((p) => {
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
  }, [categoryRecords, rankFilter, serviceFilter, yearFilter, sortMode]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  const selectedPerson = useMemo(
    () => filtered.find((p) => p.id === selectedId) || null,
    [filtered, selectedId],
  );

  return (
    <div
      className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <div className="flex flex-col gap-4 mb-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-full hover:bg-muted/50 transition-colors gold-border bg-background"
          >
            <ArrowLeft className="h-4 w-4 text-primary" />
          </button>
          <div>
            <h2 className="text-2xl font-bold font-serif gold-text">{title}</h2>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1 min-h-[16px]">
              Professional Archive List
            </p>
          </div>
        </div>

        <div className="inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-card/70 p-1">
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
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 p-4 rounded-xl border border-primary/20 bg-card/60 shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
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

      <div className="bg-card gold-border shadow-[inset_0_0_40px_rgba(0,0,0,0.05)] rounded-xl p-3 md:p-6 min-h-[520px] relative overflow-hidden flex flex-col">
        {filtered.length > 0 ? (
          <>
            <div className="space-y-4 flex-1">
              {paginatedRecords.map((person, index) => (
                <button
                  key={person.id}
                  onClick={() => setSelectedId(person.id)}
                  className="group relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-6 w-full text-left rounded-xl border border-primary/20 bg-card/60 p-4 sm:p-5 transition-all duration-300 hover:border-primary/50 hover:bg-card hover:shadow-[0_8px_30px_hsl(var(--primary)/0.2)] overflow-hidden"
                >
                  {/* Subtle hover gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/[0.04] to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                  {/* Left accent strip */}
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary/40 to-primary/10 opacity-60 group-hover:opacity-100 transition-opacity" />

                  <div className="flex items-center gap-4 sm:gap-6 w-full sm:w-auto z-10">
                    <div className="hidden sm:flex flex-col items-center justify-center min-w-[32px] text-muted-foreground group-hover:text-primary transition-colors">
                      <span className="text-sm font-bold opacity-60">
                        #{(currentPage - 1) * itemsPerPage + index + 1}
                      </span>
                    </div>

                    <ArchiveProfileImage person={person} />

                    <div className="flex flex-col gap-1.5 pr-4">
                      <h4 className="text-lg sm:text-xl font-bold font-serif text-foreground leading-tight group-hover:text-primary transition-colors drop-shadow-sm flex items-center flex-wrap">
                        <span className="text-primary/90 text-sm sm:text-base mr-2 uppercase tracking-widest font-sans">
                          {person.rank}
                        </span>{" "}
                        {person.name}
                      </h4>
                      <p className="text-sm text-muted-foreground/90 leading-relaxed line-clamp-2 max-w-2xl">
                        {person.citation}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:flex-col items-center sm:items-end flex-wrap gap-2 text-xs w-full sm:w-auto mt-2 sm:mt-0 z-10 pl-1 sm:pl-0 sm:shrink-0 border-t border-border/40 sm:border-0 pt-3 sm:pt-0 shrink-0">
                    <span className="px-3 py-1.5 rounded-md border border-primary/30 bg-primary/10 text-primary font-bold shadow-[0_0_15px_hsl(var(--primary)/0.2)] whitespace-nowrap">
                      {person.periodStart} - {person.periodEnd}
                    </span>
                    <div className="flex gap-2">
                      <span className="px-2.5 py-1 rounded bg-muted/40 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                        {person.service}
                      </span>
                      <span className="px-2.5 py-1 rounded bg-muted/40 text-muted-foreground font-medium uppercase tracking-wider text-[10px]">
                        {person.category}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* PAGINATION CONTROLS */}
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
        <ProfileModal
          person={selectedPerson}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
