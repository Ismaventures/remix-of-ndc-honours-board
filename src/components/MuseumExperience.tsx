import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Award,
  ChevronLeft,
  ChevronRight,
  Filter,
  Frame,
  GalleryHorizontalEnd,
  Globe2,
  Landmark,
  MapPin,
  Pause,
  Play,
  Route,
  ScrollText,
  Search,
  Shield,
  SlidersHorizontal,
  Tag,
  Star,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import ndcCrest from "/images/ndc-crest.png";
import { useThemeMode } from "@/hooks/useThemeMode";
import { useMuseumCollectionItems } from "@/hooks/useMuseumCollectionItems";
import { useMuseumSections } from "@/hooks/useMuseumSections";
import { useAboutItems } from "@/hooks/useAboutItems";
import { useCollectionWings } from "@/hooks/useCollectionWings";
import { useTourRoutes } from "@/hooks/useTourRoutes";
import { cn, getCommandantDisplayTitle } from "@/lib/utils";
import { useAudioStore, getAudioUrl } from "@/hooks/useAudioStore";
import {
  CINEMATIC_EASE,
  MUSEUM_EASE,
  museumFadeUpVariant,
  museumSlideVariants,
  museumStaggerContainer,
  museumStaggerItem,
  textStaggerContainer,
  textStaggerItem,
} from "@/lib/cinematicMotion";
import type { Commandant, DistinguishedVisit, Personnel } from "@/types/domain";
import type { ViewKey } from "./CategoryCards";
import { AutoTourGuide } from "./AutoTourGuide";
import { MuseumObjectViewer } from "./MuseumObjectViewer";
import type { AnimationPreset } from "./MuseumObjectViewer";
import { useCategoryAnimationSettings } from "@/hooks/useCategoryAnimationSettings";
import { useCategoryImageDefaults } from "@/hooks/useCategoryImageDefaults";

type MuseumFeatureKey = Extract<
  ViewKey,
  "about-ndc" | "museum-collections" | "guided-tours" | "hall-of-fame"
>;

/* ---------- Animation helpers ---------- */
const fadeUpVariant = {
  initial: { opacity: 0, y: 24, filter: "blur(8px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.82, ease: MUSEUM_EASE } },
};

const collectionSlideVariants = {
  initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 84 : -84, y: 16, scale: 0.985, filter: "blur(10px)" }),
  animate: { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.82, ease: MUSEUM_EASE } },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -64 : 64, y: -8, scale: 0.99, filter: "blur(8px)", transition: { duration: 0.45, ease: MUSEUM_EASE } }),
};

/* ---------- Types ---------- */
type MuseumEntry = {
  key: MuseumFeatureKey;
  title: string;
  subtitle: string;
  description: string;
  icon: typeof Landmark;
  accent: string;
  serviceColor: string;
};

type CollectionFeature = {
  id: string;
  title: string;
  category: string;
  summary: string;
  curatorialNote: string;
  highlights: string[];
  featuredFact: string;
};

type CollectionItem = {
  id: string;
  name: string;
  imageUrl: string;
  mediaUrls?: string[];
  description: string;
  era: string;
  tag: string;
  location?: string;
  imageSettings?: {
    brightness?: number;
    contrast?: number;
    saturation?: number;
    opacity?: number;
    hueRotate?: number;
    sepia?: number;
    blur?: number;
    warmth?: number;
    bgPreset?: string;
    bgCustomUrl?: string;
    depthZ?: number;
    perspective?: number;
    objectInset?: number;
    freeRotation?: boolean;
    animation?: string;
    animationSpeed?: number;
    bgFade?: number;
  };
};

function getCollectionItemMediaSources(item: CollectionItem) {
  if (item.mediaUrls && item.mediaUrls.length > 0) {
    return item.mediaUrls;
  }

  return item.imageUrl ? [item.imageUrl] : [];
}

/** Background preset key → CSS gradient */
const BG_PRESET_MAP: Record<string, string> = {
  "navy-gold": "linear-gradient(135deg, #001a33 0%, #002060 40%, #1a1200 100%)",
  "museum-dark": "linear-gradient(160deg, #0a0a0a 0%, #1a1a2e 50%, #0d0d1a 100%)",
  "velvet-drape": "linear-gradient(180deg, #1a0000 0%, #330000 35%, #1a0a00 100%)",
  "continental": "linear-gradient(135deg, #1a1200 0%, #332200 40%, #0d0d00 100%)",
  "global-blue": "linear-gradient(135deg, #001030 0%, #002050 40%, #001a40 100%)",
  "archive-parchment": "linear-gradient(180deg, #1a1710 0%, #262015 50%, #131008 100%)",
  "midnight": "linear-gradient(180deg, #000005 0%, #0a0a1e 50%, #000010 100%)",
  "warm-amber": "linear-gradient(135deg, #1a1000 0%, #332200 50%, #1a0d00 100%)",
  "forest-green": "linear-gradient(135deg, #001a0a 0%, #003318 50%, #001a10 100%)",
};

/** Convert saved imageSettings to MuseumObjectViewer override props.
 *  categoryAnim provides collection-level animation defaults.
 *  categoryImageDefaults provides collection-level image settings defaults.
 */
function resolveImageOverrides(
  s?: CollectionItem["imageSettings"],
  categoryAnim?: { animation: AnimationPreset; speed: number; bgFade?: number },
  categoryImageDefaults?: Partial<CollectionItem["imageSettings"]>,
) {
  // Merge: per-artifact settings override category image defaults
  const merged = categoryImageDefaults ? { ...categoryImageDefaults, ...Object.fromEntries(Object.entries(s ?? {}).filter(([, v]) => v != null)) } : s;
  if (!merged && !categoryAnim) return {};
  if (!merged) return categoryAnim ? { animation: categoryAnim.animation, animationSpeed: categoryAnim.speed, bgFade: categoryAnim.bgFade } : {};
  const parts: string[] = [];
  if ((merged.brightness ?? 100) !== 100) parts.push(`brightness(${(merged.brightness ?? 100) / 100})`);
  if ((merged.contrast ?? 100) !== 100) parts.push(`contrast(${(merged.contrast ?? 100) / 100})`);
  if ((merged.saturation ?? 100) !== 100) parts.push(`saturate(${(merged.saturation ?? 100) / 100})`);
  if ((merged.hueRotate ?? 0) !== 0) parts.push(`hue-rotate(${merged.hueRotate}deg)`);
  if ((merged.sepia ?? 0) !== 0) parts.push(`sepia(${(merged.sepia ?? 0) / 100})`);
  if ((merged.blur ?? 0) !== 0) parts.push(`blur(${merged.blur}px)`);
  const w = merged.warmth ?? 0;
  if (w > 0) { parts.push(`sepia(${Math.min((merged.sepia ?? 0) + w * 0.6, 100) / 100})`); parts.push(`hue-rotate(-${w * 0.3}deg)`); }
  else if (w < 0) parts.push(`hue-rotate(${Math.abs(w) * 0.8}deg)`);

  const imageFilterOverride = parts.length > 0 ? parts.join(" ") : undefined;
  const imageOpacityOverride = (merged.opacity ?? 100) < 100 ? (merged.opacity ?? 100) / 100 : undefined;
  let stageBgOverride: string | undefined;
  if (merged.bgCustomUrl) stageBgOverride = merged.bgCustomUrl;
  else if (merged.bgPreset && BG_PRESET_MAP[merged.bgPreset]) stageBgOverride = BG_PRESET_MAP[merged.bgPreset];

  // Per-artifact depth overrides (only include non-zero values)
  const dpOverride: Record<string, number> = {};
  if (merged.depthZ) dpOverride.depthZ = merged.depthZ;
  if (merged.perspective) dpOverride.perspective = merged.perspective;
  if (merged.objectInset) dpOverride.objectInset = merged.objectInset;
  const displayParamsOverride = Object.keys(dpOverride).length ? dpOverride : undefined;

  const freeRotation = merged.freeRotation || undefined;
  // Per-artifact animation overrides category defaults
  const animation = (merged.animation as AnimationPreset) || categoryAnim?.animation || undefined;
  const animationSpeed = merged.animationSpeed || categoryAnim?.speed || undefined;
  const bgFade = merged.bgFade ?? categoryAnim?.bgFade ?? undefined;

  return { imageFilterOverride, imageOpacityOverride, stageBgOverride, displayParamsOverride, freeRotation, animation, animationSpeed, bgFade };
}

type TourFeature = {
  title: string;
  duration: string;
  audience: string;
  description: string;
  stops: string[];
  serviceColor: string;
  collectionId: string;
};

/* ---------- Icon name → component map (for DB-driven icon names) ---------- */
const ICON_MAP: Record<string, typeof Landmark> = {
  Landmark, GalleryHorizontalEnd, Route, Trophy, Award, Globe2, MapPin, ScrollText, Shield, Star, Users,
};

function resolveIcon(name: string): typeof Landmark {
  return ICON_MAP[name] ?? Landmark;
}

/* ---------- Static fallback data (used until DB tables are populated) ---------- */
const MUSEUM_ENTRY_POINTS: MuseumEntry[] = [
  {
    key: "about-ndc",
    title: "About NDC",
    subtitle: "History, mandate & leadership context",
    description:
      "Established in 1992, the National Defence College is Nigeria's apex institution for strategic and security studies. Explore its founding charter, mandate, and leadership continuity.",
    icon: Landmark,
    accent: "from-[#002060] via-[#003090] to-[#004dc0]",
    serviceColor: "#002060",
  },
  {
    key: "museum-collections",
    title: "Museum Collections",
    subtitle: "Curated exhibition journeys",
    description:
      "Five curated collection lanes — from the NDC's institutional memory to its global defence education footprint — presented as professional museum exhibitions.",
    icon: GalleryHorizontalEnd,
    accent: "from-[#5c4117] via-[#8b6526] to-[#FFD700]",
    serviceColor: "#FFD700",
  },
  {
    key: "guided-tours",
    title: "Guided Tours",
    subtitle: "Narrated visitor routes",
    description:
      "Auto and manual guided tour routes with narration, covering orientation, leadership trails, collection highlights, and the Hall of Fame honour gallery.",
    icon: Route,
    accent: "from-[#8B0000] via-[#CC0000] to-[#FF0000]",
    serviceColor: "#FF0000",
  },
  {
    key: "hall-of-fame",
    title: "Hall of Fame",
    subtitle: "Honours gallery",
    description:
      "Commandants, Fellows of the War College, Fellows of the Defence College, Directing Staff, Allied Officers, and Distinguished Visitors — grouped as one ceremonial honour gallery.",
    icon: Trophy,
    accent: "from-[#005070] via-[#0088b0] to-[#00B0F0]",
    serviceColor: "#00B0F0",
  },
];

const ABOUT_HISTORY_ITEMS = [
  {
    eyebrow: "Founded 1992",
    title: "Establishment of the NDC",
    body:
      "The National Defence College, Abuja was established in 1992 as Nigeria's premier institution for higher strategic and security studies, serving as the apex military educational establishment for senior officers and select civilian leaders.",
  },
  {
    eyebrow: "Mandate",
    title: "Strategic leadership development",
    body:
      "The NDC prepares selected senior military officers and civilian equivalents for higher command and strategic leadership through joint and combined operations thinking, national security policy, and defence management.",
  },
  {
    eyebrow: "Evolution",
    title: "From founding to national prominence",
    body:
      "Since its inception, the NDC has evolved from a nascent defence study centre into a nationally and internationally recognised institution, shaping Nigeria's strategic thinking through thousands of graduates across military and civilian sectors.",
  },
  {
    eyebrow: "Tri-Service Heritage",
    title: "Army, Navy & Air Force synergy",
    body:
      "As a tri-service institution, the NDC embodies the joint operational philosophy of the Nigerian Armed Forces — bringing together Army, Navy, and Air Force perspectives under one strategic education framework.",
  },
  {
    eyebrow: "Collaborations",
    title: "International partnerships & engagement",
    body:
      "The NDC maintains partnerships with defence colleges worldwide, hosts distinguished visitors from allied nations, and contributes to regional security dialogue through ECOWAS and AU frameworks.",
  },
];

const COLLECTION_FEATURES: CollectionFeature[] = [
  {
    id: "history",
    title: "History Collection",
    category: "Institutional memory",
    summary:
      "Documenting the NDC story from its 1992 founding charter through to its evolution as Nigeria's premier joint military education establishment — early records, symbolic artefacts, photographs, and ceremonial milestones.",
    curatorialNote:
      "Presented as a chronology-led gallery with highlighted milestones, interpretive captions, and the narrative thread of how the college grew from its founding vision to national prominence.",
    highlights: [
      "1992 founding artefacts and charter documents",
      "College milestones and ceremonial records",
      "Photographic archive of institutional growth",
    ],
    featuredFact: "The NDC has trained over 3,000 senior officers and strategic leaders since its founding in 1992.",
  },
  {
    id: "state",
    title: "State Collection",
    category: "National identity",
    summary:
      "National symbols, honours, and artefacts connecting the NDC to Nigeria's defence heritage — state-linked memorabilia, national service records, and civic ceremony items that frame the college within the national identity.",
    curatorialNote:
      "This civic layer connects the institution to the nation it serves, presenting Nigeria's defence heritage through the lens of the college's contribution to national security.",
    highlights: [
      "National defence heritage displays",
      "State ceremony and honours memorabilia",
      "Nigerian Armed Forces institutional linkages",
    ],
    featuredFact: "The NDC serves as the only institution in Nigeria mandated to provide the highest level of strategic defence education.",
  },
  {
    id: "regional",
    title: "Regional Collection",
    category: "Continental context",
    summary:
      "ECOWAS partnerships, African Union peacekeeping contributions, and the NDC's role in continental security education — regional perspectives, neighbouring contexts, and professional exchange programmes.",
    curatorialNote:
      "Showcases how the NDC connects to the broader African security landscape through West African and continental military education partnerships.",
    highlights: [
      "ECOWAS and AU partnership artefacts",
      "West African security dialogue records",
      "Pan-African defence education exchanges",
    ],
    featuredFact: "NDC graduates have served in senior peacekeeping roles across multiple African Union and UN missions.",
  },
  {
    id: "world",
    title: "World Collection",
    category: "Global perspective",
    summary:
      "International defence education exchanges, partnership memoranda with global war colleges, and the NDC's position on the world strategic education map — a collection that situates the college within a global professional peer network.",
    curatorialNote:
      "This lane represents the outward-looking, modern side of the NDC — its connections, exchange programmes, and comparative standing among peer defence institutions worldwide.",
    highlights: [
      "Bilateral MoUs with international war colleges",
      "International exchange officer records",
      "Global strategic education comparison",
    ],
    featuredFact: "The NDC maintains formal partnerships with defence colleges across four continents.",
  },
  {
    id: "archives",
    title: "Archives",
    category: "Hall of Fame bridge",
    summary:
      "The formal gateway into the Honours Board — linking curated exhibition content to the full institutional records of commandants, fellows, directing staff, allied officers, and distinguished visitors.",
    curatorialNote:
      "The archive collection serves as the visitor's transition from curated museum storytelling into the deeper institutional records and the Hall of Fame honour gallery.",
    highlights: [
      "Direct bridge into the Hall of Fame",
      "Fast access to existing archive categories",
      "Seamless transition from exhibition to records",
    ],
    featuredFact: "The NDC archives preserve records dating back to its very first course in 1992.",
  },
];

const COLLECTION_ITEMS: Record<string, CollectionItem[]> = {
  history: [
    { id: "h1", name: "Founding Charter & Establishment Order", imageUrl: "", description: "The original presidential directive establishing the National Defence College as Nigeria's apex strategic studies institution.", era: "1992", tag: "Founding Document" },
    { id: "h2", name: "First NDC Course Group Assembly", imageUrl: "", description: "Photographic record of the pioneering Course 1 participants who launched the college's academic tradition.", era: "1992", tag: "Academic Heritage" },
    { id: "h3", name: "College Seal & Crest Evolution", imageUrl: "", description: "Tracing the evolution of the NDC's institutional identity through its official emblems and heraldic symbols.", era: "1992–Present", tag: "Institutional Identity" },
    { id: "h4", name: "10th Anniversary Milestone Archive", imageUrl: "", description: "Commemorative records marking a decade of strategic education excellence at the National Defence College.", era: "2002", tag: "Milestone" },
    { id: "h5", name: "Silver Jubilee Commemorative Collection", imageUrl: "", description: "Artefacts and documentation from the NDC's 25th anniversary celebrations and institutional retrospective.", era: "2017", tag: "Anniversary" },
  ],
  state: [
    { id: "s1", name: "Nigerian Armed Forces Colours", imageUrl: "", description: "The national defence colours representing the Nigerian Army, Navy, and Air Force — the tri-service foundation of the NDC.", era: "National Heritage", tag: "State Symbol", location: "Abuja, FCT" },
    { id: "s2", name: "Presidential Visit Ceremonial Archive", imageUrl: "", description: "Memorabilia from presidential visits to the NDC, including addresses, gifts of state, and official photographs.", era: "State Occasions", tag: "Diplomatic", location: "Lagos, Nigeria" },
    { id: "s3", name: "Defence Medal & Honours Register", imageUrl: "", description: "A curated display of national defence medals, awards, and distinctions conferred on NDC personnel and graduates.", era: "National Awards", tag: "Honours", location: "Kaduna, Nigeria" },
    { id: "s4", name: "Armed Forces Day Commemoration", imageUrl: "", description: "Records from the NDC's participation in national Armed Forces Remembrance Day ceremonies and memorial activities.", era: "Annual Observance", tag: "Commemoration", location: "Abuja, FCT" },
    { id: "s5", name: "National Security Architecture Exhibit", imageUrl: "", description: "An interpretive display explaining the NDC's place within Nigeria's broader national security and defence apparatus.", era: "Strategic Framework", tag: "Policy", location: "Abuja, FCT" },
  ],
  regional: [
    { id: "r1", name: "ECOWAS Defence Cooperation Archive", imageUrl: "", description: "Documents and artefacts from the NDC's partnerships with ECOWAS member states on collective regional security education.", era: "West Africa", tag: "Partnership", location: "Accra, Ghana" },
    { id: "r2", name: "African Union Peacekeeping Contributions", imageUrl: "", description: "Records of NDC graduates' service in AU peacekeeping operations across the African continent.", era: "Continental Missions", tag: "Peacekeeping", location: "Addis Ababa, Ethiopia" },
    { id: "r3", name: "West African Officers Exchange Programme", imageUrl: "", description: "Photographic and documentary records of military officer exchanges with defence institutions across West Africa.", era: "Professional Exchange", tag: "Exchange", location: "Dakar, Senegal" },
    { id: "r4", name: "Regional Security Dialogue Archive", imageUrl: "", description: "Materials from NDC participation in sub-regional and continental security conferences and strategic dialogue forums.", era: "Multilateral Forums", tag: "Dialogue", location: "Nairobi, Kenya" },
    { id: "r5", name: "Pan-African Defence Education Network", imageUrl: "", description: "Records of collaboration with peer defence colleges in Ghana, Kenya, South Africa, and other African nations.", era: "Educational Partnerships", tag: "Network", location: "Pretoria, South Africa" },
  ],
  world: [
    { id: "w1", name: "International War College MoU Archive", imageUrl: "", description: "Signed memoranda of understanding with defence colleges across four continents, establishing academic and research cooperation.", era: "Global Partnerships", tag: "Agreements", location: "Washington D.C., USA" },
    { id: "w2", name: "International Exchange Officer Programme", imageUrl: "", description: "Photographic and service records of international officers who have attended courses or served at the NDC.", era: "Global Exchange", tag: "Exchange", location: "London, United Kingdom" },
    { id: "w3", name: "Global Strategic Studies Conference Records", imageUrl: "", description: "Materials from NDC participation in international strategic studies conferences, symposia, and research collaborations.", era: "Academic Outreach", tag: "Conference", location: "Beijing, China" },
    { id: "w4", name: "Allied Nations Diplomatic Gift Collection", imageUrl: "", description: "A curated collection of ceremonial gifts presented to the NDC by visiting defence delegations from partner nations worldwide.", era: "International Relations", tag: "Diplomatic", location: "New Delhi, India" },
    { id: "w5", name: "World Defence College Comparative Study", imageUrl: "", description: "Research materials positioning the NDC within the global network of senior military education institutions.", era: "Benchmarking", tag: "Research", location: "Paris, France" },
  ],
  archives: [
    { id: "a1", name: "Commandant Succession Master Registry", imageUrl: "", description: "The complete institutional record of all NDC commandants from founding to present, with biographical data and tenure details.", era: "Leadership Archive", tag: "Registry" },
    { id: "a2", name: "Course Participants Comprehensive Register", imageUrl: "", description: "Master enrolment records covering all FWC, FDC, and course participants through every NDC academic year.", era: "Academic Records", tag: "Enrolment" },
    { id: "a3", name: "Distinguished Visitors Official Registry", imageUrl: "", description: "The formal guest book and photographic registry of heads of state, defence chiefs, and dignitaries who have visited the NDC.", era: "Diplomatic Archive", tag: "Visitors" },
    { id: "a4", name: "Directing Staff Service Records", imageUrl: "", description: "Service histories and academic profiles of directing staff members who have shaped the NDC's educational programmes.", era: "Faculty Archive", tag: "Personnel" },
    { id: "a5", name: "Institutional Research & Publications", imageUrl: "", description: "The NDC's body of published research, strategic papers, dissertations, and policy recommendations.", era: "Academic Output", tag: "Publications" },
  ],
};

const TOUR_FEATURES: TourFeature[] = [
  {
    title: "State Collection Tour",
    duration: "7–10 mins",
    audience: "National identity & heritage",
    description:
      "A curated tour through Nigeria's defence heritage artefacts — national colours, presidential memorabilia, defence medals, Armed Forces Day records, and the national security architecture exhibit.",
    stops: ["Nigerian Armed Forces Colours", "Presidential Visit Archive", "Defence Medal Register", "Armed Forces Day", "Security Architecture"],
    serviceColor: "#002060",
    collectionId: "state",
  },
  {
    title: "Regional Collection Tour",
    duration: "8–12 mins",
    audience: "Continental & West African context",
    description:
      "Explore the NDC's ECOWAS partnerships, African Union peacekeeping contributions, West African officer exchanges, regional security dialogue records, and pan-African defence education networks.",
    stops: ["ECOWAS Cooperation", "AU Peacekeeping", "Officers Exchange", "Security Dialogue", "Pan-African Network"],
    serviceColor: "#FF0000",
    collectionId: "regional",
  },
  {
    title: "World Collection Tour",
    duration: "8–12 mins",
    audience: "Global partnerships & perspective",
    description:
      "Discover the NDC's international connections — bilateral MoUs with war colleges worldwide, exchange officer programmes, global conference records, diplomatic gift collections, and comparative defence studies.",
    stops: ["International MoUs", "Exchange Officers", "Global Conferences", "Diplomatic Gifts", "Comparative Study"],
    serviceColor: "#00B0F0",
    collectionId: "world",
  },
];

/* ---------- Tri-Service Defense Strip ---------- */
function TriColorStrip({ className }: { className?: string }) {
  return (
    <div className={cn("flex h-[4px]", className)}>
      <div className="flex-1 bg-[#002060]" />
      <div className="flex-1 bg-[#FF0000]" />
      <div className="flex-1 bg-[#00B0F0]" />
    </div>
  );
}

function PageBackButton({ onBack }: { onBack: () => void }) {
  return (
    <motion.button
      initial={{ opacity: 0, x: -12, filter: "blur(6px)" }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.55, ease: MUSEUM_EASE }}
      onClick={onBack}
      className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/30 bg-[#d4af37]/8 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#d4af37] transition-all duration-300 hover:bg-[#d4af37]/14 hover:border-[#d4af37]/50"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      Return
    </motion.button>
  );
}

function PageShell({
  eyebrow,
  title,
  description,
  onBack,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  onBack: () => void;
  children: React.ReactNode;
}) {
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");

  return (
    <section className="space-y-6 md:space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PageBackButton onBack={onBack} />
      </div>

      <motion.div
        variants={museumFadeUpVariant}
        initial="initial"
        animate="animate"
        className={cn(
          "museum-grain museum-ledger museum-plaque-shadow relative overflow-hidden rounded-[20px] sm:rounded-[28px] md:rounded-[34px] border",
          isLightMode
            ? "border-[#bca46a]/20 bg-[hsl(var(--vault-base))] text-[#132136]"
            : "border-[#d4af37]/14 bg-[hsl(var(--vault-base))] text-white",
        )}
      >
        <TriColorStrip className="h-[3px]" />
        <div className={cn(
          "pointer-events-none absolute inset-0",
          isLightMode
            ? "bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_38%)]"
            : "bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.1),transparent_36%)]",
        )} />
        <div className="p-5 sm:p-6 md:p-8">
          <img
            src={ndcCrest}
            alt=""
            className={cn(
              "pointer-events-none absolute -right-10 top-5 h-36 w-36 object-contain",
              isLightMode ? "opacity-[0.06]" : "opacity-[0.08] invert",
            )}
          />

          <motion.div
            className="relative z-10 max-w-4xl"
            variants={museumStaggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.p variants={museumStaggerItem} className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
              {eyebrow}
            </motion.p>
            <motion.h2 variants={museumStaggerItem} className={cn("museum-display-title mt-3 text-3xl sm:text-4xl lg:text-5xl font-semibold leading-[1.04]", isLightMode ? "text-[#16243c]" : "text-[#f8f3e8]")}>
              {title}
            </motion.h2>
            <motion.div variants={museumStaggerItem} className="mt-4 museum-metal-rule max-w-xs" />
            <motion.p variants={museumStaggerItem} className={cn("mt-4 max-w-3xl text-sm sm:text-base leading-7", isLightMode ? "text-[#44546b]" : "text-[#d6dbe3]/82")}>
              {description}
            </motion.p>
          </motion.div>
        </div>
      </motion.div>

      {children}
    </section>
  );
}

export function MuseumExperienceSection({
  onSelect,
}: {
  onSelect: (key: ViewKey) => void;
}) {
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");

  // Live data from Supabase — falls back to static constants
  const { sections: liveSections } = useMuseumSections();
  const entryPoints: MuseumEntry[] = useMemo(() => {
    if (liveSections.length === 0) return MUSEUM_ENTRY_POINTS;
    return liveSections.filter((s) => s.is_published).map((s) => ({
      key: s.id as MuseumFeatureKey,
      title: s.title,
      subtitle: s.subtitle,
      description: s.description,
      icon: resolveIcon(s.icon_name),
      accent: s.accent,
      serviceColor: s.service_color,
    }));
  }, [liveSections]);

  const featuredEntry =
    entryPoints.find((entry) => entry.key === "museum-collections") ??
    entryPoints[0];
  const secondaryEntries = entryPoints.filter(
    (entry) => entry.key !== featuredEntry.key,
  );

  return (
    <section className="mb-10 sm:mb-12">
      <motion.div
        className="mb-8 flex flex-col items-center text-center"
        variants={museumStaggerContainer}
        initial="initial"
        animate="animate"
      >
        <motion.p variants={museumStaggerItem} className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
          Digital Museum Atrium
        </motion.p>
        <motion.h2 variants={museumStaggerItem} className="museum-display-title mt-4 text-3xl sm:text-4xl lg:text-5xl font-semibold text-foreground uppercase tracking-[0.08em]">
          Museum Experience
        </motion.h2>
        <motion.div variants={museumStaggerItem} className="mt-5 museum-metal-rule max-w-xs" />
        <motion.p variants={museumStaggerItem} className="mt-5 max-w-3xl text-sm sm:text-base leading-8 text-muted-foreground">
          Enter through a quieter foyer, move between curated wings, and let each route feel like a guided walk through rooms rather than a stack of interface cards.
        </motion.p>
      </motion.div>

      <div
        className={cn(
          "museum-grain museum-ledger museum-plaque-shadow relative overflow-hidden rounded-[20px] sm:rounded-[28px] md:rounded-[34px] border p-4 sm:p-5 md:p-6",
          isLightMode
            ? "border-[#bca46a]/20 bg-[hsl(var(--vault-base))]"
            : "border-[#d4af37]/14 bg-[hsl(var(--vault-base))]",
        )}
      >
        <TriColorStrip className="mb-4 rounded-full h-[3px]" />
        <div className={cn(
          "pointer-events-none absolute inset-0",
          isLightMode
            ? "bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.12),transparent_32%)]"
            : "bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.08),transparent_28%)]",
        )} />
        <img
          src={ndcCrest}
          alt=""
          className={cn(
            "pointer-events-none absolute -right-8 top-4 h-40 w-40 object-contain",
            isLightMode ? "opacity-[0.06]" : "opacity-[0.08] invert",
          )}
        />

        <div className="relative z-10 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(min(320px,100%),0.9fr)]">
          <motion.button
            variants={museumFadeUpVariant}
            initial="initial"
            animate="animate"
            whileHover={{ y: -2, scale: 1.01 }}
            whileTap={{ scale: 0.992 }}
            onClick={() => onSelect(featuredEntry.key)}
            className={cn(
              "museum-grain museum-plaque-shadow group relative overflow-hidden rounded-[20px] sm:rounded-[24px] md:rounded-[30px] border p-6 sm:p-7 md:p-8 text-left transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/70",
              isLightMode
                ? "border-[#bca46a]/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.78)_0%,rgba(244,239,226,0.96)_100%)]"
                : "border-[#d4af37]/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)]",
            )}
          >
            <div className={cn("absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r", featuredEntry.accent)} />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>Featured Wing</p>
                <h3 className={cn("museum-display-title mt-4 text-2xl sm:text-3xl lg:text-5xl font-semibold leading-[1.04]", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
                  Enter the Collections Wing
                </h3>
                <p className={cn("mt-3 text-sm uppercase tracking-[0.22em]", isLightMode ? "text-[#6f7682]" : "text-white/42")}>
                  {featuredEntry.subtitle}
                </p>
              </div>
              <div className={cn(
                "rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em]",
                isLightMode
                  ? "border-[#bca46a]/30 bg-[#d4af37]/10 text-[#7f6112]"
                  : "border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d8bf76]",
              )}>
                Curated Route
              </div>
            </div>

            <div className="mt-6 museum-metal-rule max-w-md" />
            <p className={cn("mt-6 max-w-2xl text-base leading-8", isLightMode ? "text-[#445267]" : "text-[#d6dbe3]/84")}>
              {featuredEntry.description}
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                "Institutional memory galleries",
                "Narrated exhibition pathways",
                "Direct bridge into honours records",
              ].map((point) => (
                <div
                  key={point}
                  className={cn(
                    "rounded-2xl border px-4 py-4 text-sm leading-6",
                    isLightMode
                      ? "border-[#bca46a]/16 bg-white/68 text-[#314259]"
                      : "border-white/8 bg-white/[0.035] text-white/72",
                  )}
                >
                  {point}
                </div>
              ))}
            </div>

            <div className={cn(
              "mt-8 inline-flex items-center gap-2 rounded-full border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] transition-all duration-300 group-hover:translate-x-1",
              isLightMode
                ? "border-[#17253b]/14 bg-[#17253b]/6 text-[#17253b]"
                : "border-[#d4af37]/18 bg-[#d4af37]/10 text-[#f1dd9b]",
            )}>
              Begin Museum Journey
              <ArrowRight className="h-4 w-4" />
            </div>
          </motion.button>

          <motion.div
            className="grid gap-4"
            variants={museumStaggerContainer}
            initial="initial"
            animate="animate"
          >
            {/* ── Artifact Frame Gallery – highlight card ── */}
            <motion.button
              variants={museumStaggerItem}
              whileHover={{ y: -2, scale: 1.01 }}
              whileTap={{ scale: 0.992 }}
              onClick={() => onSelect("artifact-gallery" as ViewKey)}
              className={cn(
                "museum-grain museum-plaque-shadow group relative overflow-hidden rounded-[16px] sm:rounded-[20px] md:rounded-[26px] border p-4 sm:p-5 md:p-6 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/70",
                isLightMode
                  ? "border-[#bca46a]/22 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(244,239,226,0.94)_100%)]"
                  : "border-[#d4af37]/18 bg-[linear-gradient(180deg,rgba(212,175,55,0.06)_0%,rgba(255,255,255,0.02)_100%)]",
              )}
            >
              <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-[#d4af37] via-[#f4e198] to-[#d4af37]" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>Curated Exhibit</p>
                  <h3 className={cn("mt-3 text-2xl font-semibold", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
                    Artefact Collection Frame
                  </h3>
                  <p className={cn("mt-2 text-[11px] uppercase tracking-[0.18em]", isLightMode ? "text-[#6f7682]" : "text-white/38")}>
                    Interactive glass-case display
                  </p>
                </div>
                <div
                  className={cn(
                    "rounded-full border p-3",
                    isLightMode
                      ? "border-[#bca46a]/30 bg-[#d4af37]/10 text-[#7f6112]"
                      : "border-[#d4af37]/25 bg-[#d4af37]/14 text-[#d4af37]",
                  )}
                >
                  <Frame className="h-5 w-5" />
                </div>
              </div>

              <p className={cn("mt-4 text-sm leading-7", isLightMode ? "text-[#445267]" : "text-white/72")}>
                Browse all artefacts arranged in the museum glass case — curated by the exhibit administrator with cinematic lighting, audio narration, and categorised presentation.
              </p>

              <div className={cn("mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]", isLightMode ? "text-[#17253b]" : "text-[#d8bf76]")}>
                View Exhibit
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </motion.button>

            {secondaryEntries.map((entry) => {
              const Icon = entry.icon;

              return (
                <motion.button
                  key={entry.key}
                  variants={museumStaggerItem}
                  whileHover={{ y: -2, scale: 1.01 }}
                  whileTap={{ scale: 0.992 }}
                  onClick={() => onSelect(entry.key)}
                  className={cn(
                    "museum-grain museum-plaque-shadow group relative overflow-hidden rounded-[16px] sm:rounded-[20px] md:rounded-[26px] border p-4 sm:p-5 md:p-6 text-left transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/70",
                    isLightMode
                      ? "border-[#bca46a]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(244,239,226,0.94)_100%)]"
                      : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_100%)]",
                  )}
                >
                  <div className={cn("absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r", entry.accent)} />
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>Gallery Directory</p>
                      <h3 className={cn("mt-3 text-2xl font-semibold", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
                        {entry.title}
                      </h3>
                      <p className={cn("mt-2 text-[11px] uppercase tracking-[0.18em]", isLightMode ? "text-[#6f7682]" : "text-white/38")}>
                        {entry.subtitle}
                      </p>
                    </div>
                    <div
                      className="rounded-full border p-3"
                      style={{
                        borderColor: isLightMode ? `${entry.serviceColor}2D` : `${entry.serviceColor}25`,
                        backgroundColor: isLightMode ? `${entry.serviceColor}10` : `${entry.serviceColor}14`,
                        color: entry.serviceColor,
                      }}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>

                  <p className={cn("mt-4 text-sm leading-7", isLightMode ? "text-[#445267]" : "text-white/72")}>
                    {entry.description}
                  </p>

                  <div className={cn("mt-5 inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em]", isLightMode ? "text-[#17253b]" : "text-[#d8bf76]")}>
                    Open Wing
                    <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export function AboutNdcView({
  onBack,
  onOpenCommandants,
  onOpenHallOfFame,
  onOpenVisits,
  currentCommandant,
  commandants,
  visitsCount,
}: {
  onBack: () => void;
  onOpenCommandants: () => void;
  onOpenHallOfFame: () => void;
  onOpenVisits: () => void;
  currentCommandant: Commandant | null;
  commandants: Commandant[];
  visitsCount: number;
}) {
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");

  // Live about items from Supabase — falls back to static
  const { items: liveAboutItems } = useAboutItems();
  const aboutItems = useMemo(() => {
    if (liveAboutItems.length === 0) return ABOUT_HISTORY_ITEMS;
    return liveAboutItems.filter((i) => i.is_published).map((i) => ({
      eyebrow: i.eyebrow,
      title: i.title,
      body: i.body,
    }));
  }, [liveAboutItems]);

  const archivedLeadership = commandants.filter((entry) => !entry.isCurrent).slice(0, 4);
  const currentLeadershipTitle = currentCommandant
    ? getCommandantDisplayTitle(currentCommandant)
    : "Leadership profile pending";
  const currentLeadershipTenure = currentCommandant
    ? `${currentCommandant.tenureStart}${currentCommandant.tenureEnd ? ` - ${currentCommandant.tenureEnd}` : " - Present"}`
    : "Tenure archive pending";

  return (
    <PageShell
      eyebrow="About NDC"
      title="National Defence College, Abuja"
      description="Established in 1992 as Nigeria's apex institution for strategic and security studies, the NDC develops senior military officers and select civilian leaders for higher command and policy dialogue. Explore its founding, mandate, leadership, and partnerships."
      onBack={onBack}
    >
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.div
          className="grid grid-cols-1 gap-4 md:grid-cols-2"
          variants={textStaggerContainer}
          initial="initial"
          animate="animate"
        >
          {aboutItems.map((item) => (
            <motion.article
              key={item.title}
              variants={textStaggerItem}
              className={cn(
                "rounded-2xl border p-5 shadow-sm relative overflow-hidden",
                isLightMode
                  ? "border-[#002060]/10 bg-white/85"
                  : "border-white/10 bg-white/[0.04]",
              )}
            >
              <TriColorStrip className="absolute inset-x-0 top-0 h-[3px]" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                {item.eyebrow}
              </p>
              <h3 className={cn("mt-2 text-lg font-bold", isLightMode ? "text-[#0f2a5f]" : "text-white")}>
                {item.title}
              </h3>
              <p className={cn("mt-3 text-sm leading-relaxed", isLightMode ? "text-slate-600" : "text-white/75")}>
                {item.body}
              </p>
            </motion.article>
          ))}
        </motion.div>

        <div className="space-y-4">
          <article
            className={cn(
              "rounded-2xl border p-5 overflow-hidden relative",
              isLightMode
                ? "border-[#002060]/10 bg-[linear-gradient(160deg,#ffffff_0%,#f4f7fb_100%)]"
                : "border-white/10 bg-[linear-gradient(160deg,rgba(11,23,39,0.95)_0%,rgba(19,37,61,0.98)_100%)]",
            )}
          >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#002060] via-[#FF0000] to-[#00B0F0]" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
              Leadership
            </p>
            <h3 className={cn("mt-2 text-xl font-bold", isLightMode ? "text-[#0f2a5f]" : "text-white")}>
              Current leadership anchor
            </h3>
            <div className="mt-4 rounded-2xl border border-primary/15 bg-primary/5 p-4">
              <p className={cn("text-base font-bold", isLightMode ? "text-slate-900" : "text-white")}>
                {currentCommandant?.name ?? "Commandant profile pending"}
              </p>
              <p className="mt-1 text-sm text-primary/90 font-semibold">
                {currentLeadershipTitle}
              </p>
              <p className={cn("mt-1 text-xs uppercase tracking-[0.18em]", isLightMode ? "text-slate-500" : "text-white/60")}>
                {currentLeadershipTenure}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className={cn("rounded-xl border p-3", isLightMode ? "border-[#002060]/10 bg-white/80" : "border-white/10 bg-white/[0.04]")}>
                <p className="text-[10px] uppercase tracking-[0.18em] text-primary/80 font-semibold">
                  Archived Profiles
                </p>
                <p className={cn("mt-1 text-2xl font-bold", isLightMode ? "text-[#0f2a5f]" : "text-white")}>
                  {commandants.length}
                </p>
              </div>
              <div className={cn("rounded-xl border p-3", isLightMode ? "border-[#002060]/10 bg-white/80" : "border-white/10 bg-white/[0.04]")}>
                <p className="text-[10px] uppercase tracking-[0.18em] text-primary/80 font-semibold">
                  Collaboration Records
                </p>
                <p className={cn("mt-1 text-2xl font-bold", isLightMode ? "text-[#0f2a5f]" : "text-white")}>
                  {visitsCount}
                </p>
              </div>
            </div>

            {archivedLeadership.length > 0 && (
              <div className="mt-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-primary/80 font-semibold">
                  Past Commandants Preview
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {archivedLeadership.map((entry) => (
                    <span
                      key={entry.id}
                      className={cn(
                        "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-medium",
                        isLightMode
                          ? "bg-[#002060]/[0.06] text-slate-700 border border-[#002060]/10"
                          : "bg-white/[0.06] text-white/75 border border-white/10",
                      )}
                    >
                      {entry.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </article>

          <article className={cn("rounded-2xl border p-5", isLightMode ? "border-[#002060]/10 bg-white/85" : "border-white/10 bg-white/[0.04]")}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
              Quick Access
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                onClick={onOpenCommandants}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/25 bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary hover:bg-primary/15 transition-colors"
              >
                <Shield className="h-3.5 w-3.5" />
                Open Commandants
              </button>
              <button
                onClick={onOpenHallOfFame}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary hover:bg-primary/10 transition-colors"
              >
                <Trophy className="h-3.5 w-3.5" />
                Open Hall of Fame
              </button>
              <button
                onClick={onOpenVisits}
                className="inline-flex items-center gap-2 rounded-lg border border-primary/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary hover:bg-primary/10 transition-colors"
              >
                <Globe2 className="h-3.5 w-3.5" />
                Open Collaborations
              </button>
            </div>
          </article>
        </div>
      </div>
    </PageShell>
  );
}

/* ---------- Collection Auto Display ---------- */

const itemSlideVariants = {
  initial: (dir: number) => ({ opacity: 0, x: dir > 0 ? 200 : -200, scale: 0.92 }),
  animate: { opacity: 1, x: 0, scale: 1, transition: { duration: 0.5, ease: CINEMATIC_EASE } },
  exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -200 : 200, scale: 0.92, transition: { duration: 0.35, ease: CINEMATIC_EASE } }),
};

function CollectionItemCard({
  item,
  isLightMode,
  variant = "full",
  onItemClick,
  categoryAnimConfig,
  categoryImageDefaults,
}: {
  item: CollectionItem;
  isLightMode: boolean;
  variant?: "full" | "slider" | "grid";
  onItemClick?: (item: CollectionItem) => void;
  categoryAnimConfig?: { animation: AnimationPreset; speed: number; bgFade?: number };
  categoryImageDefaults?: Partial<CollectionItem["imageSettings"]>;
}) {
  const isFull = variant === "full";
  const isGrid = variant === "grid";

  return (
    <motion.button
      type="button"
      whileHover={isFull ? { y: -4, scale: 1.012 } : { y: -3, scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.4, ease: MUSEUM_EASE }}
      className={cn(
        "museum-grain museum-ledger relative overflow-hidden rounded-[16px] sm:rounded-[20px] md:rounded-[26px] border text-left group cursor-pointer transition-shadow duration-500",
        isFull
          ? "w-full max-w-[560px] mx-auto"
          : isGrid
            ? "w-full min-w-0"
            : "w-[min(300px,85vw)] sm:w-[320px] shrink-0 snap-center",
        isLightMode
          ? "border-[#bca46a]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.76)_0%,rgba(244,239,226,0.96)_100%)] hover:border-[#bca46a]/35 hover:shadow-[0_20px_60px_rgba(0,0,0,0.1),0_8px_24px_rgba(188,164,106,0.12)]"
          : "border-[#d4af37]/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.015)_100%)] hover:border-[#d4af37]/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.35),0_0_40px_rgba(212,175,55,0.04)]",
      )}
      onClick={() => onItemClick?.(item)}
    >
      {/* Top gold accent line with shimmer on hover */}
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/70 to-transparent transition-opacity duration-500 group-hover:opacity-100 opacity-60" />

      {/* Hover ambient glow */}
      <div className={cn(
        "pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700",
        isLightMode
          ? "bg-gradient-to-b from-[#bca46a]/[0.04] via-transparent to-transparent"
          : "bg-gradient-to-b from-[#d4af37]/[0.03] via-transparent to-transparent",
      )} />

      <div className="relative z-10 p-3">
        <MuseumObjectViewer
          title={item.name}
          mediaSources={getCollectionItemMediaSources(item)}
          isLightMode={isLightMode}
          compact
          topLabel="Object Stage"
          topRightLabel="360"
          showTopRightBadge={Boolean(item.mediaUrls && item.mediaUrls.length > 1)}
          footerLabel={item.era}
          loading="eager"
          emptyLabel="Image pending"
          {...resolveImageOverrides(item.imageSettings, categoryAnimConfig, categoryImageDefaults)}
        />
      </div>

      <div className={cn("relative z-10 px-4 pb-4", isFull ? "px-5 pb-5" : "px-4 pb-4")}>
        <p className={cn("museum-kicker", isLightMode ? "text-[#7f6112]" : "text-[#d8bf76]")}>
          {item.tag}
        </p>
        <h3 className={cn("museum-display-title mt-3 font-semibold leading-tight transition-colors duration-300", isFull ? "text-2xl" : "text-lg", isLightMode ? "text-[#17253b] group-hover:text-[#0d1928]" : "text-[#f8f3e8] group-hover:text-white")}>
          {item.name}
        </h3>
        <p className={cn("mt-3 leading-7", isFull ? "text-sm" : "text-[13px] line-clamp-3", isLightMode ? "text-[#4c5b70]" : "text-white/65")}>
          {item.description}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className={cn("rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors duration-300", isLightMode ? "border-[#bca46a]/18 bg-[#f3ecdb]/78 text-[#7f6112]" : "border-[#d4af37]/15 bg-[#d4af37]/[0.06] text-[#d8bf76] group-hover:border-[#d4af37]/25 group-hover:bg-[#d4af37]/10")}>
            {item.era}
          </span>
          {item.location && (
            <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]", isLightMode ? "border-[#17253b]/10 bg-white/70 text-[#435267]" : "border-white/[0.06] bg-white/[0.03] text-white/60")}>
              <MapPin className="h-3 w-3" />
              {item.location}
            </span>
          )}
        </div>

        <div className={cn("mt-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] transition-all duration-300", isLightMode ? "text-[#17253b] group-hover:text-[#7f6112]" : "text-[#d8bf76]/70 group-hover:text-[#d8bf76]")}>
          View Artefact
          <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1.5" />
        </div>
      </div>

      {/* Bottom accent strip with glow */}
      <div className="relative">
        <TriColorStrip className="h-[2px] opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
      </div>
    </motion.button>
  );
}

/* ---------- Full-View Profile Modal for Collection Artefacts ---------- */

/* Cinematic keyframes for modal ambient effects */
const MODAL_KEYFRAMES_ID = "museum-modal-cinematic-fx";
function ensureModalKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(MODAL_KEYFRAMES_ID)) return;
  const style = document.createElement("style");
  style.id = MODAL_KEYFRAMES_ID;
  style.textContent = `
@keyframes modal-spotlight-drift {
  0%, 100% { background-position: 30% 20%; }
  25% { background-position: 60% 15%; }
  50% { background-position: 55% 50%; }
  75% { background-position: 35% 45%; }
}
@keyframes modal-scan-beam {
  0% { transform: translateY(-100%) scaleY(0.5); opacity: 0; }
  15% { opacity: 0.6; }
  50% { transform: translateY(100%) scaleY(1); opacity: 0.3; }
  100% { transform: translateY(300%) scaleY(0.5); opacity: 0; }
}
@keyframes modal-ring-pulse {
  0% { transform: scale(1); opacity: 0.25; }
  50% { transform: scale(1.15); opacity: 0.08; }
  100% { transform: scale(1); opacity: 0.25; }
}
@keyframes modal-glow-breathe {
  0%, 100% { opacity: 0.08; }
  50% { opacity: 0.18; }
}
@keyframes modal-float-particle {
  0% { transform: translateY(0) translateX(0) scale(1); opacity: 0; }
  10% { opacity: 1; }
  90% { opacity: 1; }
  100% { transform: translateY(-120px) translateX(30px) scale(0.4); opacity: 0; }
}
@keyframes modal-title-underline {
  0% { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}
@keyframes modal-card-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
`;
  document.head.appendChild(style);
}

function CollectionItemProfileModal({
  item,
  isLightMode,
  onClose,
}: {
  item: CollectionItem;
  isLightMode: boolean;
  onClose: () => void;
}) {
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [showFullNote, setShowFullNote] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(ensureModalKeyframes, []);

  useEffect(() => {
    const timer = setTimeout(() => setDetailsVisible(true), 320);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const prevBody = document.body.style.overflow;
    const prevHtml = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBody;
      document.documentElement.style.overflow = prevHtml;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const metaItems = [
    { key: "era", label: "Era", value: item.era },
    { key: "ref", label: "Reference", value: `ID-${item.id.toUpperCase()}` },
    { key: "loc", label: "Archive Location", value: item.location ?? "Museum archive collection" },
  ];

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: MUSEUM_EASE }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden overscroll-none bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* ── Main card — Commandant-style fullscreen profile ── */}
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, scale: 0.92, y: 30, filter: "blur(12px)" }}
        animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
        exit={{ opacity: 0, scale: 0.94, y: 20, filter: "blur(8px)" }}
        transition={{ duration: 0.7, ease: MUSEUM_EASE }}
        className={cn(
          "relative flex h-[95dvh] w-[96vw] max-w-[1800px] flex-col overflow-hidden border shadow-2xl",
          isLightMode
            ? "border-slate-200 bg-white text-slate-900"
            : "border-slate-500/35 bg-slate-950/95 text-white",
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Top Tri-Color Defence Strip ── */}
        <div className="absolute inset-x-0 top-0 z-30 flex h-[8px]">
          <div className="flex-1 bg-[#002060]" />
          <div className="flex-1 bg-[#FF0000]" />
          <div className="flex-1 bg-[#00B0F0]" />
        </div>

        {/* ── Bottom Tri-Color Defence Strip ── */}
        <div className="absolute inset-x-0 bottom-0 z-30 flex h-[8px]">
          <div className="flex-1 bg-[#002060]" />
          <div className="flex-1 bg-[#FF0000]" />
          <div className="flex-1 bg-[#00B0F0]" />
        </div>

        {/* ── Background grid pattern (matches commandant display) ── */}
        <div className={cn(
          "pointer-events-none absolute inset-0 z-0",
          isLightMode ? "opacity-40" : "opacity-20",
        )}>
          <div className={cn(
            "h-full w-full",
            isLightMode ? "bg-white" : "bg-slate-950",
          )} style={{
            backgroundImage: "linear-gradient(90deg,rgba(0,0,0,0.02) 1px,transparent 1px),linear-gradient(rgba(0,0,0,0.02) 1px,transparent 1px)",
            backgroundSize: "3vw 3vw",
          }} />
        </div>

        {/* ── NDC Crests in top corners ── */}
        <motion.img
          src={ndcCrest}
          alt=""
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: MUSEUM_EASE, delay: 0.3 }}
          className="absolute left-[3.5%] top-[4.5%] z-20 h-[clamp(20px,4.8vh,56px)] w-auto object-contain drop-shadow-sm"
        />
        <motion.img
          src={ndcCrest}
          alt=""
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: MUSEUM_EASE, delay: 0.4 }}
          className="absolute right-[3.5%] top-[4.5%] z-20 h-[clamp(20px,4.8vh,56px)] w-auto object-contain drop-shadow-sm"
        />

        {/* ── Close button ── */}
        <motion.button
          onClick={onClose}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          transition={{ duration: 0.3, ease: MUSEUM_EASE }}
          className={cn(
            "absolute right-[3.5%] top-[calc(4.5%+clamp(20px,4.8vh,56px)+12px)] z-40 rounded-full border p-2 transition-all duration-300",
            isLightMode
              ? "border-slate-300 bg-white/90 text-slate-700 hover:bg-white hover:shadow-lg"
              : "border-white/15 bg-black/50 text-white/70 hover:bg-black/70 hover:text-white",
          )}
        >
          <X className="h-4 w-4" />
        </motion.button>

        {/* ── Scan beam effect (matches commandant auto-display) ── */}
        <motion.div
          className={cn(
            "pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/3",
            "bg-gradient-to-r from-transparent via-primary/20 to-transparent",
          )}
          initial={{ x: "-10%" }}
          animate={{ x: "460%" }}
          transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 3.5 }}
        />

        {/* ── Main content: Split layout (portrait left, details right) ── */}
        <div className="relative z-10 mx-auto flex h-full w-full max-w-[min(97vw,1520px)] flex-1 min-h-0 flex-col items-center justify-center gap-5 px-4 pb-6 pt-[max(4rem,12%)] md:flex-row md:items-center md:justify-center md:gap-8 lg:gap-10 md:px-7 md:py-7">

          {/* ── LEFT: Cinematic artifact showcase ── */}
          <motion.div
            initial={{ opacity: 0, x: -40, scale: 0.95, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
            transition={{ duration: 1, ease: CINEMATIC_EASE, delay: 0.2 }}
            className="group relative flex w-full items-center justify-center md:max-w-[min(54vw,860px)] md:flex-[1.08]"
          >
            {/* Ambient glow behind the frame */}
            <div className={cn(
              "pointer-events-none absolute -inset-4 z-0 rounded-[32px] opacity-60 blur-2xl md:-inset-6 lg:-inset-8",
              isLightMode ? "bg-[#bca46a]/20" : "bg-[#FFD700]/8",
            )} />

            {/* Outer gold frame */}
            <div className="relative z-10 w-full max-w-[min(92vw,760px)] rounded-md bg-gradient-to-b from-[#FFD700] via-[#C5A028] to-[#FFD700] p-[3px] shadow-[0_16px_60px_rgba(212,175,55,0.24),0_6px_22px_rgba(0,0,0,0.28)] md:max-w-[min(54vw,820px)]">
              {/* White separator */}
              <div className="rounded-[5px] bg-white p-[3px]">
                {/* Inner gold frame */}
                <div className="rounded-[4px] bg-gradient-to-b from-[#FFD700] via-[#DAA520] to-[#FFD700] p-[2px]">
                  {/* Artifact display container — generous sizing for the viewer */}
                  <div className={cn(
                    "relative w-full overflow-hidden rounded-[3px] shadow-inner",
                    "h-[clamp(300px,44dvh,540px)]",
                    "sm:h-[clamp(340px,50dvh,620px)]",
                    "md:h-[clamp(390px,58dvh,760px)]",
                    isLightMode ? "bg-[#f4f1ea]" : "bg-[#0a0e16]",
                  )}>
                    {/* Soft blurred background fill */}
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-xl"
                      />
                    )}
                    {/* Main artifact — full MuseumObjectViewer with all admin animations/settings */}
                    <MuseumObjectViewer
                      title={item.name}
                      mediaSources={getCollectionItemMediaSources(item)}
                      isLightMode={isLightMode}
                      className="h-full w-full"
                      topLabel="Collection Artefact"
                      topRightLabel={item.mediaUrls && item.mediaUrls.length > 1 ? "360° Inspect" : "Glass Case"}
                      footerLabel={`Object ${item.id.toUpperCase()}`}
                      showControls
                      loading="eager"
                      emptyLabel="Image pending"
                      {...resolveImageOverrides(item.imageSettings)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── RIGHT: Details panel (commandant split-hero style) ── */}
          <motion.div
            initial={{ opacity: 0, x: 40, filter: "blur(8px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            transition={{ duration: 1, ease: CINEMATIC_EASE, delay: 0.35 }}
            className="flex min-h-0 max-h-full w-full flex-1 flex-col items-center justify-center overflow-y-auto md:items-start md:max-w-[min(34vw,520px)]"
          >
            {/* ── Tag / category badge with flanking lines ── */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={detailsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
              transition={{ duration: 0.6, ease: MUSEUM_EASE, delay: 0.5 }}
              className="flex items-center gap-3"
            >
              <div className={cn("h-px w-[clamp(20px,3vw,48px)]", isLightMode ? "bg-[#002060]/40" : "bg-[#FFD700]/30")} />
              <p className={cn(
                "text-[clamp(0.6rem,1.8vh,1.2rem)] font-bold uppercase tracking-[0.25em]",
                isLightMode ? "text-[#002060]" : "text-[#FFD700]",
              )}>
                {item.tag}
              </p>
              <div className={cn("h-px w-[clamp(20px,3vw,48px)]", isLightMode ? "bg-[#002060]/40" : "bg-[#FFD700]/30")} />
            </motion.div>

            {/* ── Artifact name (large title, matches commandant name style) ── */}
            <motion.h2
              initial={{ opacity: 0, y: 20, filter: "blur(6px)" }}
              animate={detailsVisible ? { opacity: 1, y: 0, filter: "blur(0px)" } : { opacity: 0, y: 20, filter: "blur(6px)" }}
              transition={{ duration: 0.8, ease: MUSEUM_EASE, delay: 0.6 }}
              className={cn(
                "mt-4 text-center text-[clamp(1.8rem,5vh,3.8rem)] font-bold uppercase leading-tight tracking-tight md:text-left",
                isLightMode ? "text-[#002060]" : "text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]",
              )}
            >
              {item.name}
            </motion.h2>

            {/* ── Era subtitle (red accent, italic — matches commandant title style) ── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={detailsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.7, ease: MUSEUM_EASE, delay: 0.7 }}
              className={cn(
                "mt-3 border-l-[clamp(3px,0.4vw,6px)] pl-[clamp(10px,1.5vw,24px)]",
                isLightMode ? "border-[#FF0000]" : "border-[#FF0000]",
              )}
            >
              <p className={cn(
                "text-[clamp(0.9rem,2.5vh,1.8rem)] font-bold italic tracking-[0.1em]",
                isLightMode ? "text-[#FF0000]" : "text-[#FF3B30]",
              )}>
                {item.era}
              </p>
            </motion.div>

            {/* ── Identity plate (navy blue with gold text — commandant style) ── */}
            <motion.div
              initial={{ opacity: 0, y: 16, scaleX: 0.9 }}
              animate={detailsVisible ? { opacity: 1, y: 0, scaleX: 1 } : { opacity: 0, y: 16, scaleX: 0.9 }}
              transition={{ duration: 0.8, ease: MUSEUM_EASE, delay: 0.85 }}
              className="mt-6 w-full max-w-[min(90vw,480px)]"
            >
              {/* Red bar top */}
              <div className="h-[0.6vh] min-h-[2px] w-full bg-[#FF0000]" />
              {/* Navy plate */}
              <div className="bg-[#002060] px-[3vw] py-[max(8px,1.5vh)] text-center md:text-left">
                <p className="text-[clamp(0.56rem,1.6vh,1.4rem)] font-bold uppercase tracking-[0.17em] text-white">
                  Collection Artefact
                </p>
                <p className="mt-1 text-[clamp(0.5rem,1.3vh,1.2rem)] font-semibold uppercase tracking-[0.12em] text-[#FFD700]">
                  {item.location ?? "NDC Museum Archive"}
                </p>
              </div>
              {/* Red bar bottom */}
              <div className="h-[0.6vh] min-h-[2px] w-full bg-[#FF0000]" />
            </motion.div>

            {/* ── Description text ── */}
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={detailsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.7, ease: MUSEUM_EASE, delay: 1.0 }}
              className={cn(
                "mt-5 max-h-[22vh] overflow-y-auto text-center text-[clamp(0.82rem,2vh,1.4rem)] font-medium leading-[1.65] md:text-left",
                isLightMode ? "text-slate-700" : "text-white/80",
              )}
            >
              {item.description}
            </motion.p>

            {/* ── Metadata tags row (commandant tenure-tag style) ── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={detailsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.7, ease: MUSEUM_EASE, delay: 1.1 }}
              className="mt-5 flex flex-wrap items-center justify-center gap-2 md:justify-start"
            >
              {metaItems.map((meta) => (
                <span
                  key={meta.key}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[clamp(0.55rem,1.2vh,0.85rem)] font-bold uppercase tracking-[0.15em]",
                    isLightMode
                      ? "border-[#002060]/20 bg-[#002060] text-white"
                      : "border-[#FFD700]/20 bg-[#002060] text-[#FFD700]",
                  )}
                >
                  {meta.label}: {meta.value}
                </span>
              ))}
            </motion.div>

            {/* ── Expandable curatorial note ── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={detailsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.7, ease: MUSEUM_EASE, delay: 1.2 }}
              className={cn(
                "mt-5 w-full max-w-[min(90vw,480px)] cursor-pointer overflow-hidden rounded-lg border transition-all duration-300",
                isLightMode
                  ? "border-slate-200 bg-slate-50 hover:bg-slate-100"
                  : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]",
              )}
              onClick={() => setShowFullNote(!showFullNote)}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <ScrollText className={cn("h-3.5 w-3.5", isLightMode ? "text-[#002060]" : "text-[#FFD700]")} />
                  <span className={cn(
                    "text-[clamp(0.6rem,1.2vh,0.8rem)] font-bold uppercase tracking-[0.2em]",
                    isLightMode ? "text-[#002060]" : "text-[#FFD700]",
                  )}>Curatorial Note</span>
                </div>
                <motion.div animate={{ rotate: showFullNote ? 180 : 0 }} transition={{ duration: 0.3 }}>
                  <ChevronRight className={cn("h-4 w-4 rotate-90", isLightMode ? "text-slate-400" : "text-white/30")} />
                </motion.div>
              </div>
              <AnimatePresence>
                {showFullNote && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: MUSEUM_EASE }}
                  >
                    <div className={cn("mx-4 h-px", isLightMode ? "bg-slate-200" : "bg-white/10")} />
                    <p className={cn("px-4 py-3 text-[clamp(0.7rem,1.4vh,0.95rem)] leading-7", isLightMode ? "text-slate-600" : "text-white/60")}>
                      Presented as part of the NDC digital museum archive, this object is staged as a standalone exhibit with contextual metadata, provenance cues, and a narrative wall label rather than a conventional application card.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── Action buttons ── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={detailsVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
              transition={{ duration: 0.7, ease: MUSEUM_EASE, delay: 1.3 }}
              className="mt-5 flex flex-wrap items-center justify-center gap-3 md:justify-start"
            >
              <motion.button
                type="button"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-[clamp(0.6rem,1.2vh,0.8rem)] font-bold uppercase tracking-[0.18em] transition-all duration-300",
                  isLightMode
                    ? "border-[#002060]/30 bg-[#002060] text-[#FFD700] hover:bg-[#001845] shadow-md"
                    : "border-[#FFD700]/20 bg-[#002060] text-[#FFD700] hover:bg-[#001845] shadow-lg",
                )}
                onClick={(e) => { e.stopPropagation(); }}
              >
                <Globe2 className="h-3.5 w-3.5" />
                Explore Object
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
              </motion.button>
              <motion.button
                type="button"
                whileHover={{ scale: 1.03, y: -1 }}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-md border px-4 py-2 text-[clamp(0.6rem,1.2vh,0.8rem)] font-bold uppercase tracking-[0.18em] transition-all duration-300",
                  isLightMode
                    ? "border-slate-300 bg-white text-[#002060] hover:bg-slate-50 shadow-sm"
                    : "border-white/15 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]",
                )}
                onClick={(e) => { e.stopPropagation(); }}
              >
                <Award className="h-3.5 w-3.5" />
                Provenance
              </motion.button>
            </motion.div>
          </motion.div>
        </div>

        {/* ── Sequence badge (bottom-right, like commandant) ── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: MUSEUM_EASE, delay: 1.4 }}
          className={cn(
            "absolute bottom-[2.2%] right-[3.5vw] z-30 rounded border px-2.5 py-1 text-[clamp(7px,1.1vh,14px)] font-bold uppercase tracking-[0.12em] shadow-md",
            isLightMode
              ? "border-slate-400 bg-white text-black"
              : "border-slate-500 bg-slate-900 text-white",
          )}
        >
          Object {item.id.toUpperCase()}
        </motion.div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

/* ---------- Continuous Auto-Scroll Slider for Collection Items ---------- */
function CollectionItemsSlider({
  items,
  isLightMode,
  onAutoDisplay,
  onItemClick,
  categoryAnimConfig,
  categoryImageDefaults,
}: {
  items: CollectionItem[];
  isLightMode: boolean;
  onAutoDisplay: () => void;
  onItemClick?: (item: CollectionItem) => void;
  categoryAnimConfig?: { animation: AnimationPreset; speed: number; bgFade?: number };
  categoryImageDefaults?: Partial<CollectionItem["imageSettings"]>;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const rafRef = useRef<number>(0);
  const lastRef = useRef(0);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tag.toLowerCase().includes(q) ||
        item.era.toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  // Triple items for seamless infinite loop
  const loopedItems = useMemo(() => {
    if (filteredItems.length <= 1) return filteredItems;
    return [...filteredItems, ...filteredItems, ...filteredItems];
  }, [filteredItems]);

  // Auto-scroll engine (same as PastCommandants)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container || filteredItems.length <= 1) return;
    const speedPxPerMs = 0.03;

    const tick = (now: number) => {
      if (!lastRef.current) lastRef.current = now;
      const elapsed = now - lastRef.current;
      lastRef.current = now;
      if (!isPaused && elapsed < 200) {
        container.scrollLeft += elapsed * speedPxPerMs;
        const segmentWidth = container.scrollWidth / 3;
        if (container.scrollLeft >= segmentWidth * 2) {
          container.scrollLeft -= segmentWidth;
        } else if (container.scrollLeft < segmentWidth * 0.1) {
          container.scrollLeft += segmentWidth;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    // Start in the middle segment
    const segmentWidth = container.scrollWidth / 3;
    container.scrollLeft = segmentWidth;
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPaused, filteredItems.length]);

  const scroll = useCallback((dir: number) => {
    const container = scrollRef.current;
    if (!container) return;
    const target = container.scrollLeft + dir * 340;
    container.scrollTo({ left: target, behavior: "smooth" });
  }, []);

  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {showSearch ? (
            <div className={cn("flex items-center gap-1.5 rounded-full border px-3 py-2", isLightMode ? "border-[#bca46a]/20 bg-white/80" : "border-white/15 bg-white/[0.05]")}>
              <Search className="h-3.5 w-3.5 text-primary/60 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search artefacts..."
                className={cn("bg-transparent outline-none text-xs w-32 sm:w-40", isLightMode ? "text-[#17253b] placeholder:text-[#7a8596]" : "text-white placeholder:text-white/40")}
                autoFocus
              />
              <button onClick={() => { setShowSearch(false); setSearchQuery(""); }} className="text-primary/60 hover:text-primary">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowSearch(true)}
              className={cn("rounded-full border p-2 text-primary transition-colors", isLightMode ? "border-[#17253b]/10 bg-white/70 hover:bg-[#17253b]/6" : "border-white/12 bg-white/[0.04] hover:bg-white/[0.08]")}
              aria-label="Search"
            >
              <Search className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Manual scroll arrows */}
          <button
            onClick={() => scroll(-1)}
            className={cn("rounded-full border p-2 transition-colors", isLightMode ? "border-[#17253b]/10 bg-white/70 text-[#17253b] hover:bg-white" : "border-white/12 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white")}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => scroll(1)}
            className={cn("rounded-full border p-2 transition-colors", isLightMode ? "border-[#17253b]/10 bg-white/70 text-[#17253b] hover:bg-white" : "border-white/12 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white")}
            aria-label="Scroll right"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            onClick={onAutoDisplay}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/24 bg-[#d4af37]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d4af37] hover:bg-[#d4af37]/16 transition-colors"
          >
            <Play className="h-3 w-3" />
            Auto Display
          </button>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className={cn("rounded-[22px] border p-6 text-center", isLightMode ? "border-[#bca46a]/16 bg-white/70" : "border-white/10 bg-white/[0.035]")}>
          <p className={cn("text-sm", isLightMode ? "text-[#5e6a79]" : "text-white/60")}>No artefacts match &ldquo;{searchQuery}&rdquo;</p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto pb-4 pt-1 px-1 scrollbar-hide"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {loopedItems.map((item, i) => (
            <motion.div
              key={`${item.id}-${i}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: Math.min(i % filteredItems.length, 5) * 0.06, ease: CINEMATIC_EASE }}
              className="shrink-0 w-[min(320px,85vw)] sm:w-[340px] snap-center"
            >
              <CollectionItemCard item={item} isLightMode={isLightMode} variant="grid" onItemClick={onItemClick} categoryAnimConfig={categoryAnimConfig} categoryImageDefaults={categoryImageDefaults} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function CollectionAutoDisplay({
  collections,
  collectionItemsById,
  initialCollectionId,
  isLightMode,
  onClose,
  onItemClick,
}: {
  collections: CollectionFeature[];
  collectionItemsById: Record<string, CollectionItem[]>;
  initialCollectionId: string;
  isLightMode: boolean;
  onClose: () => void;
  onItemClick?: (item: CollectionItem) => void;
}) {
  const [activeCollId, setActiveCollId] = useState(initialCollectionId);
  const activeCollIdx = collections.findIndex((c) => c.id === activeCollId);
  const activeCol = collections[activeCollIdx] ?? collections[0];
  const items = collectionItemsById[activeCol.id] ?? [];
  const { getConfig: getCategoryAnim } = useCategoryAnimationSettings();
  const activeCategoryAnim = getCategoryAnim(activeCol.id);
  const { getDefaults: getCategoryImageDefs } = useCategoryImageDefaults();
  const activeCategoryImageDefs = getCategoryImageDefs(activeCol.id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [direction, setDirection] = useState(1);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedByHoverRef = useRef(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [hasReadCollSummary, setHasReadCollSummary] = useState(false);
  const speechSupported = typeof window !== "undefined" && "speechSynthesis" in window;

  // ── Background audio for current collection ──
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const { assignments: audioAssignments, masterVolume } = useAudioStore();

  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.volume = 0;
    } else {
      // Keep bg audio softer (40% of master) while narration plays, 60% otherwise
      audio.volume = (isSpeaking ? 0.4 : 0.6) * (masterVolume ?? 1);
    }
  }, [isMuted, isSpeaking, masterVolume]);

  // Load & play the assigned track when collection changes
  useEffect(() => {
    const contextKey = `collection_${activeCol.id}` as keyof typeof audioAssignments;
    const trackId = audioAssignments[contextKey];
    const audio = bgAudioRef.current;
    if (!audio) return;

    if (!trackId) {
      audio.pause();
      audio.removeAttribute("src");
      return;
    }

    let cancelled = false;
    (async () => {
      const url = await getAudioUrl(trackId);
      if (cancelled || !url) return;
      audio.src = url;
      audio.loop = true;
      audio.volume = isMuted ? 0 : 0.6 * (masterVolume ?? 1);
      try { await audio.play(); } catch { /* autoplay blocked — ignore */ }
    })();

    return () => { cancelled = true; audio.pause(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCol.id, audioAssignments]);

  const stopSpeech = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (speechSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [speechSupported]);

  const speak = useCallback((text: string, onEnd: () => void) => {
    if (!speechSupported || isMuted || !text.trim()) {
      timerRef.current = setTimeout(onEnd, 3000);
      return;
    }
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.lang = "en-NG";
    utt.rate = 0.95;
    utt.pitch = 0.96;
    const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.startsWith("en"));
    const preferred = voices.find((v) => /female|zira|aria|samantha|sonia|ava/i.test(v.name)) ?? voices[0];
    if (preferred) utt.voice = preferred;
    utt.onstart = () => setIsSpeaking(true);
    utt.onend = () => { setIsSpeaking(false); onEnd(); };
    utt.onerror = () => { setIsSpeaking(false); onEnd(); };
    window.speechSynthesis.speak(utt);
  }, [speechSupported, isMuted]);

  // Reset item index and read collection summary when collection changes
  useEffect(() => {
    setCurrentIndex(0);
    setIsPlaying(true);
    setHasReadCollSummary(false);
  }, [activeCol.id]);

  // TTS-driven auto-advance: read collection summary first, then item descriptions
  useEffect(() => {
    if (!isPlaying || items.length === 0) return;

    // First: read collection summary if not yet read
    if (!hasReadCollSummary) {
      const summaryText = `${activeCol.title}. ${activeCol.summary}`;
      speak(summaryText, () => setHasReadCollSummary(true));
      return () => { stopSpeech(); };
    }

    // Then: read current item description, then advance
    const currentItem = items[currentIndex];
    if (!currentItem) return;
    const itemText = `${currentItem.name}. ${currentItem.description}${currentItem.location ? `. Located at ${currentItem.location}` : ""}`;
    speak(itemText, () => {
      timerRef.current = setTimeout(() => {
        const nextItemIdx = currentIndex + 1;
        if (nextItemIdx < items.length) {
          setDirection(1);
          setCurrentIndex(nextItemIdx);
        } else {
          const nextCollIdx = (activeCollIdx + 1) % collections.length;
          setDirection(1);
          setActiveCollId(collections[nextCollIdx].id);
        }
      }, 800);
    });
    return () => { stopSpeech(); };
  }, [isPlaying, currentIndex, items.length, activeCollIdx, collections, hasReadCollSummary, activeCol, items, speak, stopSpeech]);

  const goToItem = useCallback((index: number, dir?: number) => {
    stopSpeech();
    const bounded = ((index % items.length) + items.length) % items.length;
    setDirection(dir ?? (bounded > currentIndex ? 1 : -1));
    setCurrentIndex(bounded);
  }, [currentIndex, items.length, stopSpeech]);

  const goToCollection = useCallback((collId: string) => {
    stopSpeech();
    setActiveCollId(collId);
  }, [stopSpeech]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSpeech();
      const audio = bgAudioRef.current;
      if (audio) { audio.pause(); audio.removeAttribute("src"); }
    };
  }, [stopSpeech]);

  if (items.length === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.6, ease: MUSEUM_EASE }}
      className="fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-background"
      onMouseEnter={() => { if (isPlaying) { pausedByHoverRef.current = true; stopSpeech(); setIsPlaying(false); } }}
      onMouseLeave={() => { if (pausedByHoverRef.current) { pausedByHoverRef.current = false; setIsPlaying(true); } }}
    >
      {/* Hidden background audio element */}
      <audio ref={bgAudioRef} preload="none" />

      {/* ── Header bar (matches AutoRotationDisplay) ── */}
      <div className={cn(
        "relative z-[100] flex shrink-0 items-center justify-between gap-3 border-b px-3 py-2 backdrop-blur-md",
        isLightMode
          ? "border-slate-200 bg-white/90"
          : "border-border/60 bg-background/90",
      )}>
        <div className="flex items-center gap-3">
          <p className={cn("text-xs font-bold uppercase tracking-[0.2em]", isLightMode ? "text-[#002060]" : "text-[#FFD700]")}>
            {activeCol.title}
          </p>
          {isSpeaking && (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/18 bg-[#d4af37]/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-[#d4af37] animate-pulse">
              <Volume2 className="h-3 w-3" />
              Narrating
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setIsMuted((m) => !m); if (!isMuted) stopSpeech(); }}
            className={cn("h-10 w-10 rounded-full border flex items-center justify-center transition-colors", isMuted ? "border-[#ff6b6b]/28 text-[#ff6b6b] bg-[#ff6b6b]/10" : isLightMode ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "border-primary/35 bg-background/70 text-primary/70 backdrop-blur hover:text-primary")}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <button
            onClick={() => { stopSpeech(); setIsPlaying((p) => !p); }}
            className={cn("h-10 w-10 rounded-full border flex items-center justify-center transition-colors", isPlaying ? "border-[#d4af37]/28 text-[#d4af37] bg-[#d4af37]/10" : isLightMode ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "border-primary/35 bg-background/70 text-primary/70 backdrop-blur hover:text-primary")}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <button
            onClick={() => { stopSpeech(); onClose(); }}
            className={cn("h-10 w-10 rounded-full border flex items-center justify-center transition-colors", isLightMode ? "border-slate-200 bg-white text-slate-700 hover:bg-slate-50" : "border-primary/35 bg-background/70 text-primary/70 backdrop-blur hover:text-primary")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── Slide content area ── */}
      <div className="relative flex flex-1 min-h-0 items-center justify-center overflow-hidden px-2 sm:px-4 md:px-6">
        {/* Cinematic parallax background blur */}
        {currentItem.imageUrl && (
          <motion.div
            className="absolute inset-0 -z-10 overflow-hidden rounded-xl"
            animate={{ opacity: [0.2, 0.32, 0.22], scale: [1, 1.03, 1.01], x: [0, 10, -6, 0], y: [0, -6, 4, 0] }}
            transition={{ duration: 14, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" }}
          >
            <img src={currentItem.imageUrl} alt="" className="h-full w-full object-contain object-top blur-[2.5px]" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/76 via-slate-950/68 to-slate-950/82" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_25%,hsl(var(--primary)/0.22)_0%,transparent_40%),radial-gradient(circle_at_85%_78%,hsl(var(--primary)/0.16)_0%,transparent_44%)]" />
          </motion.div>
        )}

        {/* Scan beam (commandant-style) */}
        <motion.div
          className="pointer-events-none absolute inset-y-0 -left-1/3 z-10 w-1/3 bg-gradient-to-r from-transparent via-primary/20 to-transparent"
          animate={{ x: ["-10%", "360%"] }}
          transition={{ duration: 2.8, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.4 }}
        />

        {/* ── Commandant-style fullscreen card ── */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={`${activeCol.id}-${currentItem.id}`}
            custom={direction}
            initial={(d: number) => ({ opacity: 0, x: d * 210, y: 14, scale: 0.94, rotateZ: d * 0.7, filter: "blur(11px)" })}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1, rotateZ: 0, filter: "blur(0px)" }}
            exit={(d: number) => ({ opacity: 0, x: -d * 170, y: -10, scale: 0.965, rotateZ: -d * 0.45, filter: "blur(9px)" })}
            transition={{ duration: 1, ease: CINEMATIC_EASE }}
            className={cn(
              "relative flex h-full min-h-0 max-h-full w-full max-w-6xl flex-col items-stretch overflow-hidden border",
              isLightMode
                ? "border-slate-200 bg-white text-slate-900"
                : "border-slate-500/35 bg-slate-950/95 text-white",
            )}
          >
            {/* Top Tri-Color Defence Strip */}
            <div className="absolute inset-x-0 top-0 z-30 flex h-[8px]">
              <div className="flex-1 bg-[#002060]" />
              <div className="flex-1 bg-[#FF0000]" />
              <div className="flex-1 bg-[#00B0F0]" />
            </div>

            {/* Bottom Tri-Color Defence Strip */}
            <div className="absolute inset-x-0 bottom-0 z-30 flex h-[8px]">
              <div className="flex-1 bg-[#002060]" />
              <div className="flex-1 bg-[#FF0000]" />
              <div className="flex-1 bg-[#00B0F0]" />
            </div>

            {/* Background grid pattern */}
            <div className={cn("pointer-events-none absolute inset-0 z-0", isLightMode ? "opacity-40" : "opacity-20")}>
              <div className={cn("h-full w-full", isLightMode ? "bg-white" : "bg-slate-950")} style={{
                backgroundImage: "linear-gradient(90deg,rgba(0,0,0,0.02) 1px,transparent 1px),linear-gradient(rgba(0,0,0,0.02) 1px,transparent 1px)",
                backgroundSize: "3vw 3vw",
              }} />
            </div>

            {/* NDC Crests */}
            <img src={ndcCrest} alt="" className="absolute left-[3.5%] top-[4.5%] z-20 h-[clamp(20px,4.8vh,56px)] w-auto object-contain drop-shadow-sm" />
            <img src={ndcCrest} alt="" className="absolute right-[3.5%] top-[4.5%] z-20 h-[clamp(20px,4.8vh,56px)] w-auto object-contain drop-shadow-sm" />

            {/* ── Main split content ── */}
            <div className="relative z-10 mx-auto flex h-full w-full max-w-[min(97vw,1520px)] flex-1 min-h-0 flex-col items-center justify-center gap-5 px-4 pb-6 pt-[max(4rem,12%)] md:flex-row md:items-center md:justify-center md:gap-8 lg:gap-10 md:px-7 md:py-7">

              {/* LEFT: Cinematic artifact showcase */}
              <div className="relative flex w-full items-center justify-center md:max-w-[min(54vw,860px)] md:flex-[1.08]">
                {/* Ambient glow behind the frame */}
                <div className={cn(
                  "pointer-events-none absolute -inset-4 z-0 rounded-[32px] opacity-60 blur-2xl md:-inset-6 lg:-inset-8",
                  isLightMode ? "bg-[#bca46a]/20" : "bg-[#FFD700]/8",
                )} />

                {/* Outer gold frame */}
                <div className="relative z-10 w-full max-w-[min(92vw,760px)] rounded-md bg-gradient-to-b from-[#FFD700] via-[#C5A028] to-[#FFD700] p-[3px] shadow-[0_16px_60px_rgba(212,175,55,0.24),0_6px_22px_rgba(0,0,0,0.28)] md:max-w-[min(54vw,820px)]">
                  {/* White separator */}
                  <div className="rounded-[5px] bg-white p-[3px]">
                    {/* Inner gold frame */}
                    <div className="rounded-[4px] bg-gradient-to-b from-[#FFD700] via-[#DAA520] to-[#FFD700] p-[2px]">
                      {/* Artifact display container — generous sizing */}
                      <div className={cn(
                        "relative w-full overflow-hidden rounded-[3px] shadow-inner",
                        "h-[clamp(300px,44dvh,540px)]",
                        "sm:h-[clamp(340px,50dvh,620px)]",
                        "md:h-[clamp(390px,58dvh,760px)]",
                        isLightMode ? "bg-[#f4f1ea]" : "bg-[#0a0e16]",
                      )}>
                        {/* Soft blurred background fill */}
                        {currentItem.imageUrl && (
                          <img src={currentItem.imageUrl} alt="" className="pointer-events-none absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-xl" />
                        )}
                        {/* Main artifact — full MuseumObjectViewer with all admin animations/settings */}
                        <MuseumObjectViewer
                          title={currentItem.name}
                          mediaSources={getCollectionItemMediaSources(currentItem)}
                          isLightMode={isLightMode}
                          className="h-full w-full"
                          topLabel={`Object ${(currentIndex + 1).toString().padStart(2, "0")}`}
                          topRightLabel={currentItem.mediaUrls && currentItem.mediaUrls.length > 1 ? "360° Inspect" : "Glass Case"}
                          footerLabel={currentItem.era}
                          showControls
                          loading="eager"
                          emptyLabel="Image pending"
                          {...resolveImageOverrides(currentItem.imageSettings, activeCategoryAnim, activeCategoryImageDefs)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT: Details panel (commandant split-hero style) */}
              <div className="flex min-h-0 max-h-full w-full flex-1 flex-col items-center justify-center overflow-y-auto md:items-start md:max-w-[min(34vw,520px)]">
                {/* Tag with flanking lines */}
                <div className="flex items-center gap-3">
                  <div className={cn("h-px w-[clamp(20px,3vw,48px)]", isLightMode ? "bg-[#002060]/40" : "bg-[#FFD700]/30")} />
                  <p className={cn("text-[clamp(0.6rem,1.8vh,1.2rem)] font-bold uppercase tracking-[0.25em]", isLightMode ? "text-[#002060]" : "text-[#FFD700]")}>
                    {currentItem.tag}
                  </p>
                  <div className={cn("h-px w-[clamp(20px,3vw,48px)]", isLightMode ? "bg-[#002060]/40" : "bg-[#FFD700]/30")} />
                </div>

                {/* Artifact name */}
                <h2 className={cn(
                  "mt-4 text-center text-[clamp(1.8rem,5vh,3.8rem)] font-bold uppercase leading-tight tracking-tight md:text-left",
                  isLightMode ? "text-[#002060]" : "text-[#FFD700] drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]",
                )}>
                  {currentItem.name}
                </h2>

                {/* Era — red accent italic */}
                <div className={cn("mt-3 border-l-[clamp(3px,0.4vw,6px)] pl-[clamp(10px,1.5vw,24px)] border-[#FF0000]")}>
                  <p className={cn("text-[clamp(0.9rem,2.5vh,1.8rem)] font-bold italic tracking-[0.1em]", isLightMode ? "text-[#FF0000]" : "text-[#FF3B30]")}>
                    {currentItem.era}
                  </p>
                </div>

                {/* Identity plate */}
                <div className="mt-6 w-full max-w-[min(90vw,480px)]">
                  <div className="h-[0.6vh] min-h-[2px] w-full bg-[#FF0000]" />
                  <div className="bg-[#002060] px-[3vw] py-[max(8px,1.5vh)] text-center md:text-left">
                    <p className="text-[clamp(0.56rem,1.6vh,1.4rem)] font-bold uppercase tracking-[0.17em] text-white">
                      {activeCol.category}
                    </p>
                    <p className="mt-1 text-[clamp(0.5rem,1.3vh,1.2rem)] font-semibold uppercase tracking-[0.12em] text-[#FFD700]">
                      {currentItem.location ?? "NDC Museum Archive"}
                    </p>
                  </div>
                  <div className="h-[0.6vh] min-h-[2px] w-full bg-[#FF0000]" />
                </div>

                {/* Description */}
                <p className={cn(
                  "mt-5 max-h-[20vh] overflow-y-auto text-center text-[clamp(0.82rem,2vh,1.4rem)] font-medium leading-[1.65] md:text-left",
                  isLightMode ? "text-slate-700" : "text-white/80",
                )}>
                  {currentItem.description}
                </p>

                {/* Metadata tags */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                  <span className="rounded-md border border-[#FFD700]/20 bg-[#002060] px-2.5 py-1 text-[clamp(0.55rem,1.2vh,0.85rem)] font-bold uppercase tracking-[0.15em] text-[#FFD700]">
                    Ref: ID-{currentItem.id.toUpperCase()}
                  </span>
                  {currentItem.tag && (
                    <span className="rounded-md border border-[#FFD700]/20 bg-[#002060] px-2.5 py-1 text-[clamp(0.55rem,1.2vh,0.85rem)] font-bold uppercase tracking-[0.15em] text-[#FFD700]">
                      {currentItem.tag}
                    </span>
                  )}
                </div>

                {/* View Full Profile button */}
                {onItemClick && (
                  <button
                    onClick={() => { stopSpeech(); onItemClick(currentItem); }}
                    className={cn(
                      "mt-5 inline-flex items-center gap-2 rounded-md border px-4 py-2 text-[clamp(0.6rem,1.2vh,0.8rem)] font-bold uppercase tracking-[0.18em] transition-all",
                      isLightMode
                        ? "border-[#002060]/30 bg-[#002060] text-[#FFD700] hover:bg-[#001845] shadow-md"
                        : "border-[#FFD700]/20 bg-[#002060] text-[#FFD700] hover:bg-[#001845] shadow-lg",
                    )}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    View Full Profile
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Sequence badge */}
            <div className={cn(
              "absolute bottom-[2.2%] right-[3.5vw] z-30 rounded border px-2.5 py-1 text-[clamp(7px,1.1vh,14px)] font-bold uppercase tracking-[0.12em] shadow-md",
              isLightMode ? "border-slate-400 bg-white text-black" : "border-slate-500 bg-slate-900 text-white",
            )}>
              {(currentIndex + 1).toString().padStart(2, "0")} / {items.length.toString().padStart(2, "0")}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation: left/right arrows */}
        <button
          onClick={() => goToItem(currentIndex - 1, -1)}
          className={cn(
            "absolute left-3 top-1/2 z-20 -translate-y-1/2 h-10 w-10 md:left-6 md:h-12 md:w-12 rounded-full border flex items-center justify-center backdrop-blur transition-all",
            isLightMode
              ? "border-slate-300 bg-white/80 text-slate-700 hover:bg-white"
              : "border-primary/35 bg-background/70 text-primary/70 hover:text-primary",
          )}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => goToItem(currentIndex + 1, 1)}
          className={cn(
            "absolute right-3 top-1/2 z-20 -translate-y-1/2 h-10 w-10 md:right-6 md:h-12 md:w-12 rounded-full border flex items-center justify-center backdrop-blur transition-all",
            isLightMode
              ? "border-slate-300 bg-white/80 text-slate-700 hover:bg-white"
              : "border-primary/35 bg-background/70 text-primary/70 hover:text-primary",
          )}
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* ── Progress dots + collection pickers footer ── */}
      <div className={cn(
        "relative z-[100] flex shrink-0 flex-col gap-3 border-t px-4 py-3",
        isLightMode ? "border-slate-200 bg-white/90" : "border-border/60 bg-background/90 backdrop-blur-md",
      )}>
        {/* Collection switcher */}
        <div className="flex gap-2 flex-wrap justify-center">
          {collections.map((col) => (
            <button
              key={col.id}
              onClick={() => goToCollection(col.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] transition-all duration-300",
                col.id === activeCol.id
                  ? "border-[#d4af37]/30 bg-[#d4af37]/15 text-[#d4af37]"
                  : isLightMode ? "border-slate-200 bg-white text-slate-500 hover:bg-slate-50" : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]",
              )}
            >
              {col.title.replace(" Collection", "").replace(" Hall of Fame", "")}
            </button>
          ))}
        </div>

        {/* Progress dots */}
        <div className="flex justify-center gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goToItem(i)}
              className={cn(
                "rounded-full transition-all duration-500",
                i === currentIndex
                  ? "h-1 w-6 bg-primary"
                  : "h-1.5 w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50",
              )}
              aria-label={`Go to item ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}

export function MuseumCollectionsView({
  onBack,
  onOpenHallOfFame,
  onOpenRelatedView,
  commandants,
  personnel,
  visits,
}: {
  onBack: () => void;
  onOpenHallOfFame: () => void;
  onOpenRelatedView: (view: ViewKey) => void;
  commandants: Commandant[];
  personnel: Personnel[];
  visits: DistinguishedVisit[];
}) {
  const { themeMode } = useThemeMode();
  const { collectionItemsById } = useMuseumCollectionItems(COLLECTION_ITEMS);
  const isLightMode = themeMode.startsWith("outdoor");
  const { getConfig: getCategoryAnim } = useCategoryAnimationSettings();
  const { getDefaults: getCategoryImageDefs } = useCategoryImageDefaults();

  // Live collection wings from Supabase — falls back to static
  const { wings: liveWings } = useCollectionWings();
  const collectionFeatures: CollectionFeature[] = useMemo(() => {
    if (liveWings.length === 0) return COLLECTION_FEATURES;
    return liveWings.filter((w) => w.is_published).map((w) => ({
      id: w.id,
      title: w.title,
      category: w.category,
      summary: w.summary,
      curatorialNote: w.curatorial_note,
      highlights: w.highlights,
      featuredFact: w.featured_fact,
    }));
  }, [liveWings]);

  const [activeCollectionId, setActiveCollectionId] = useState(COLLECTION_FEATURES[0].id);
  const [slideDirection, setSlideDirection] = useState(1);
  const [isAutoSpotlight, setIsAutoSpotlight] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showAutoDisplay, setShowAutoDisplay] = useState(false);
  const [selectedArtefact, setSelectedArtefact] = useState<CollectionItem | null>(null);

  // ── Global search & filter state ──
  const [globalSearch, setGlobalSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterEra, setFilterEra] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterTag, setFilterTag] = useState<string>("all");

  // All items flattened for global search
  const allItems = useMemo(() => {
    const result: (CollectionItem & { _collectionId: string; _collectionTitle: string })[] = [];
    for (const col of collectionFeatures) {
      const items = collectionItemsById[col.id] ?? [];
      for (const item of items) {
        result.push({ ...item, _collectionId: col.id, _collectionTitle: col.title });
      }
    }
    return result;
  }, [collectionFeatures, collectionItemsById]);

  // Extract unique filter options
  const filterOptions = useMemo(() => {
    const eras = new Set<string>();
    const locations = new Set<string>();
    const tags = new Set<string>();
    for (const item of allItems) {
      if (item.era) eras.add(item.era);
      if (item.location) locations.add(item.location);
      if (item.tag) tags.add(item.tag);
    }
    return {
      eras: Array.from(eras).sort(),
      locations: Array.from(locations).sort(),
      tags: Array.from(tags).sort(),
    };
  }, [allItems]);

  // Global filtered results (only when search or filters are active)
  const isFilterActive = globalSearch.trim() !== "" || filterCategory !== "all" || filterEra !== "all" || filterLocation !== "all" || filterTag !== "all";

  const globalFilteredItems = useMemo(() => {
    if (!isFilterActive) return [];
    const q = globalSearch.toLowerCase().trim();
    return allItems.filter((item) => {
      if (filterCategory !== "all" && item._collectionId !== filterCategory) return false;
      if (filterEra !== "all" && item.era !== filterEra) return false;
      if (filterLocation !== "all" && (item.location ?? "") !== filterLocation) return false;
      if (filterTag !== "all" && item.tag !== filterTag) return false;
      if (q) {
        return (
          item.name.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.tag.toLowerCase().includes(q) ||
          item.era.toLowerCase().includes(q) ||
          (item.location ?? "").toLowerCase().includes(q) ||
          item._collectionTitle.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allItems, globalSearch, filterCategory, filterEra, filterLocation, filterTag, isFilterActive]);

  const clearAllFilters = useCallback(() => {
    setGlobalSearch("");
    setFilterCategory("all");
    setFilterEra("all");
    setFilterLocation("all");
    setFilterTag("all");
  }, []);

  const activeIndex = collectionFeatures.findIndex((c) => c.id === activeCollectionId);
  const activeCollection = collectionFeatures[activeIndex] ?? collectionFeatures[0];
  const activeCollectionItems = collectionItemsById[activeCollection.id] ?? [];

  const goToCollection = useCallback((index: number, dir?: number) => {
    const bounded = ((index % collectionFeatures.length) + collectionFeatures.length) % collectionFeatures.length;
    const inferredDir = dir ?? (bounded > activeIndex ? 1 : -1);
    setSlideDirection(inferredDir);
    setActiveCollectionId(collectionFeatures[bounded].id);
  }, [activeIndex, collectionFeatures]);

  // Auto-spotlight timer
  useEffect(() => {
    if (!isAutoSpotlight || !isAutoPlaying) return;
    autoTimerRef.current = setTimeout(() => {
      goToCollection(activeIndex + 1, 1);
    }, 6000);
    return () => { if (autoTimerRef.current) clearTimeout(autoTimerRef.current); };
  }, [isAutoSpotlight, isAutoPlaying, activeIndex, goToCollection]);

  const handleManualSelect = useCallback((id: string) => {
    const idx = collectionFeatures.findIndex((c) => c.id === id);
    goToCollection(idx);
    if (isAutoSpotlight) setIsAutoPlaying(false);
  }, [goToCollection, isAutoSpotlight, collectionFeatures]);

  return (
    <PageShell
      eyebrow="Museum Collections"
      title="NDC Curated Collections"
      description="Five exhibition wings — institutional memory, national identity, continental partnerships, global defence education, and the honours archive bridge."
      onBack={onBack}
    >
      <AnimatePresence>
        {showAutoDisplay && (
          <CollectionAutoDisplay
            collections={collectionFeatures}
            collectionItemsById={collectionItemsById}
            initialCollectionId={activeCollectionId}
            isLightMode={isLightMode}
            onClose={() => setShowAutoDisplay(false)}
            onItemClick={(item) => { setShowAutoDisplay(false); setSelectedArtefact(item); }}
          />
        )}
      </AnimatePresence>

      {!showAutoDisplay && (
        <>
        {/* Category Tabs — horizontal, compact */}
        <motion.div
          variants={museumFadeUpVariant}
          initial="initial"
          animate="animate"
          className={cn(
            "museum-grain museum-plaque-shadow rounded-[24px] border p-3 sm:p-4",
            isLightMode
              ? "border-[#bca46a]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(244,239,226,0.94)_100%)]"
              : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%)]",
          )}
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hidden">
            {collectionFeatures.map((collection, index) => (
              <button
                key={collection.id}
                onClick={() => handleManualSelect(collection.id)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-300 whitespace-nowrap",
                  activeCollection.id === collection.id
                    ? isLightMode
                      ? "border-[#bca46a]/30 bg-[#f3ecdb] text-[#7f6112] shadow-sm"
                      : "border-[#d4af37]/24 bg-[#d4af37]/14 text-[#d8bf76]"
                    : isLightMode
                      ? "border-transparent bg-transparent text-[#435267] hover:bg-white/80 hover:border-[#bca46a]/14"
                      : "border-transparent bg-transparent text-white/55 hover:bg-white/[0.06] hover:text-white/80",
                )}
              >
                {collection.title}
              </button>
            ))}
            <div className="ml-auto shrink-0 flex items-center gap-2">
              <button
                onClick={() => { setIsAutoSpotlight((p) => !p); setIsAutoPlaying(true); }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all",
                  isAutoSpotlight
                    ? "border-[#d4af37]/24 bg-[#d4af37]/10 text-[#d4af37]"
                    : isLightMode
                      ? "border-[#17253b]/10 bg-white/72 text-[#435267] hover:bg-white"
                      : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]",
                )}
              >
                {isAutoSpotlight ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                {isAutoSpotlight ? "Stop" : "Spotlight"}
              </button>
              <button
                onClick={() => setShowAutoDisplay(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/24 bg-[#d4af37]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d4af37] hover:bg-[#d4af37]/16 transition-colors"
              >
                <GalleryHorizontalEnd className="h-3 w-3" />
                Auto Display
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Search & Filter Bar ── */}
        <motion.div
          variants={museumFadeUpVariant}
          initial="initial"
          animate="animate"
          className={cn(
            "museum-grain museum-plaque-shadow rounded-[20px] border p-3 sm:p-4 space-y-3",
            isLightMode
              ? "border-[#bca46a]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(244,239,226,0.94)_100%)]"
              : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%)]",
          )}
        >
          <div className="flex items-center gap-2">
            {/* Search input */}
            <div className={cn(
              "relative flex-1 flex items-center rounded-full border transition-colors",
              isLightMode ? "border-[#bca46a]/18 bg-white/80" : "border-white/10 bg-white/[0.04]",
            )}>
              <Search className={cn("absolute left-3 h-3.5 w-3.5", isLightMode ? "text-[#7f6112]/50" : "text-white/35")} />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                placeholder="Search artefacts by name, era, location…"
                className={cn(
                  "w-full rounded-full bg-transparent py-2.5 pl-9 pr-8 text-xs outline-none placeholder:tracking-wide",
                  isLightMode ? "text-[#17253b] placeholder:text-[#7f6112]/40" : "text-white/90 placeholder:text-white/30",
                )}
              />
              {globalSearch && (
                <button onClick={() => setGlobalSearch("")} className="absolute right-2.5 p-0.5">
                  <X className={cn("h-3 w-3", isLightMode ? "text-[#5e6a79]" : "text-white/45")} />
                </button>
              )}
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters((p) => !p)}
              className={cn(
                "inline-flex items-center gap-1.5 shrink-0 rounded-full border px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all",
                showFilters || isFilterActive
                  ? "border-[#d4af37]/24 bg-[#d4af37]/10 text-[#d4af37]"
                  : isLightMode
                    ? "border-[#17253b]/10 bg-white/72 text-[#435267] hover:bg-white"
                    : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]",
              )}
            >
              <SlidersHorizontal className="h-3 w-3" />
              Filters
              {isFilterActive && (
                <span className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#d4af37]/20 text-[8px] font-bold text-[#d4af37]">
                  {[filterCategory, filterEra, filterLocation, filterTag].filter((v) => v !== "all").length + (globalSearch.trim() ? 1 : 0)}
                </span>
              )}
            </button>

            {isFilterActive && (
              <button
                onClick={clearAllFilters}
                className="shrink-0 rounded-full border border-red-400/20 bg-red-400/8 px-3 py-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-red-400 transition-colors hover:bg-red-400/14"
              >
                Clear All
              </button>
            )}
          </div>

          {/* Expandable filter dropdowns */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1">
                  {/* Category filter */}
                  <div className="space-y-1">
                    <label className={cn("flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em]", isLightMode ? "text-[#7f6112]/60" : "text-white/35")}>
                      <Filter className="h-2.5 w-2.5" /> Wing
                    </label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      className={cn(
                        "w-full rounded-lg border px-2.5 py-2 text-[11px] outline-none transition-colors cursor-pointer",
                        isLightMode
                          ? "border-[#bca46a]/18 bg-white/90 text-[#17253b]"
                          : "border-white/10 bg-white/[0.06] text-white/80",
                      )}
                    >
                      <option value="all">All Wings</option>
                      {collectionFeatures.map((cf) => (
                        <option key={cf.id} value={cf.id}>{cf.title}</option>
                      ))}
                    </select>
                  </div>

                  {/* Era/Year filter */}
                  <div className="space-y-1">
                    <label className={cn("flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em]", isLightMode ? "text-[#7f6112]/60" : "text-white/35")}>
                      <ScrollText className="h-2.5 w-2.5" /> Era / Year
                    </label>
                    <select
                      value={filterEra}
                      onChange={(e) => setFilterEra(e.target.value)}
                      className={cn(
                        "w-full rounded-lg border px-2.5 py-2 text-[11px] outline-none transition-colors cursor-pointer",
                        isLightMode
                          ? "border-[#bca46a]/18 bg-white/90 text-[#17253b]"
                          : "border-white/10 bg-white/[0.06] text-white/80",
                      )}
                    >
                      <option value="all">All Eras</option>
                      {filterOptions.eras.map((era) => (
                        <option key={era} value={era}>{era}</option>
                      ))}
                    </select>
                  </div>

                  {/* Location filter */}
                  <div className="space-y-1">
                    <label className={cn("flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em]", isLightMode ? "text-[#7f6112]/60" : "text-white/35")}>
                      <MapPin className="h-2.5 w-2.5" /> Location
                    </label>
                    <select
                      value={filterLocation}
                      onChange={(e) => setFilterLocation(e.target.value)}
                      className={cn(
                        "w-full rounded-lg border px-2.5 py-2 text-[11px] outline-none transition-colors cursor-pointer",
                        isLightMode
                          ? "border-[#bca46a]/18 bg-white/90 text-[#17253b]"
                          : "border-white/10 bg-white/[0.06] text-white/80",
                      )}
                    >
                      <option value="all">All Locations</option>
                      {filterOptions.locations.map((loc) => (
                        <option key={loc} value={loc}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  {/* Tag/Classification filter */}
                  <div className="space-y-1">
                    <label className={cn("flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.18em]", isLightMode ? "text-[#7f6112]/60" : "text-white/35")}>
                      <Tag className="h-2.5 w-2.5" /> Classification
                    </label>
                    <select
                      value={filterTag}
                      onChange={(e) => setFilterTag(e.target.value)}
                      className={cn(
                        "w-full rounded-lg border px-2.5 py-2 text-[11px] outline-none transition-colors cursor-pointer",
                        isLightMode
                          ? "border-[#bca46a]/18 bg-white/90 text-[#17253b]"
                          : "border-white/10 bg-white/[0.06] text-white/80",
                      )}
                    >
                      <option value="all">All Tags</option>
                      {filterOptions.tags.map((tag) => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Active filter pills */}
                {isFilterActive && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {globalSearch.trim() && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#d4af37]/12 border border-[#d4af37]/20 px-2.5 py-1 text-[10px] font-medium text-[#d4af37]">
                        Search: "{globalSearch.trim()}"
                        <button onClick={() => setGlobalSearch("")}><X className="h-2.5 w-2.5" /></button>
                      </span>
                    )}
                    {filterCategory !== "all" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#d4af37]/12 border border-[#d4af37]/20 px-2.5 py-1 text-[10px] font-medium text-[#d4af37]">
                        Wing: {collectionFeatures.find((c) => c.id === filterCategory)?.title}
                        <button onClick={() => setFilterCategory("all")}><X className="h-2.5 w-2.5" /></button>
                      </span>
                    )}
                    {filterEra !== "all" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#d4af37]/12 border border-[#d4af37]/20 px-2.5 py-1 text-[10px] font-medium text-[#d4af37]">
                        Era: {filterEra}
                        <button onClick={() => setFilterEra("all")}><X className="h-2.5 w-2.5" /></button>
                      </span>
                    )}
                    {filterLocation !== "all" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#d4af37]/12 border border-[#d4af37]/20 px-2.5 py-1 text-[10px] font-medium text-[#d4af37]">
                        Location: {filterLocation}
                        <button onClick={() => setFilterLocation("all")}><X className="h-2.5 w-2.5" /></button>
                      </span>
                    )}
                    {filterTag !== "all" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#d4af37]/12 border border-[#d4af37]/20 px-2.5 py-1 text-[10px] font-medium text-[#d4af37]">
                        Tag: {filterTag}
                        <button onClick={() => setFilterTag("all")}><X className="h-2.5 w-2.5" /></button>
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Search results (cross-wing) or standard collection view ── */}
        {isFilterActive ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            {/* Results header */}
            <div className={cn(
              "flex items-center justify-between rounded-[16px] border px-4 py-3",
              isLightMode
                ? "border-[#bca46a]/16 bg-white/60"
                : "border-white/8 bg-white/[0.03]",
            )}>
              <p className={cn("text-sm font-medium", isLightMode ? "text-[#17253b]" : "text-white/80")}>
                <span className="text-[#d4af37] font-bold">{globalFilteredItems.length}</span>{" "}
                {globalFilteredItems.length === 1 ? "artefact" : "artefacts"} found
              </p>
              <button
                onClick={clearAllFilters}
                className={cn("text-[10px] uppercase tracking-[0.14em] font-semibold transition-colors", isLightMode ? "text-[#5e6a79] hover:text-[#17253b]" : "text-white/40 hover:text-white/70")}
              >
                Back to Wings
              </button>
            </div>

            {globalFilteredItems.length > 0 ? (
              <CollectionItemsSlider
                items={globalFilteredItems}
                isLightMode={isLightMode}
                onAutoDisplay={() => setShowAutoDisplay(true)}
                onItemClick={setSelectedArtefact}
                categoryAnimConfig={getCategoryAnim(activeCollection.id)}
                categoryImageDefaults={getCategoryImageDefs(activeCollection.id)}
              />
            ) : (
              <div className={cn(
                "museum-grain museum-plaque-shadow rounded-[24px] border p-10 text-center",
                isLightMode ? "border-[#bca46a]/16 bg-white/70" : "border-white/10 bg-white/[0.035]",
              )}>
                <Search className={cn("mx-auto mb-3 h-8 w-8", isLightMode ? "text-[#bca46a]/40" : "text-white/20")} />
                <p className={cn("text-sm font-medium", isLightMode ? "text-[#435267]" : "text-white/55")}>
                  No artefacts match your filters
                </p>
                <p className={cn("mt-1 text-xs", isLightMode ? "text-[#6f7682]" : "text-white/35")}>
                  Try broadening your search or removing a filter
                </p>
              </div>
            )}
          </motion.div>
        ) : (
          <>
            {/* Selected collection — compact header + artefacts grid */}
            <AnimatePresence mode="wait" custom={slideDirection}>
          <motion.div
            key={activeCollection.id}
            custom={slideDirection}
            variants={collectionSlideVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="space-y-4"
          >
            {/* Compact collection info bar */}
            <div className={cn(
              "museum-grain museum-plaque-shadow flex flex-wrap items-center justify-between gap-4 rounded-[20px] border px-5 py-4",
              isLightMode
                ? "border-[#bca46a]/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.7)_0%,rgba(244,239,226,0.92)_100%)]"
                : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%)]",
            )}>
              <div className="flex items-center gap-4">
                <div>
                  <h3 className={cn("text-xl sm:text-2xl font-semibold", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
                    {activeCollection.title}
                  </h3>
                  <p className={cn("mt-1 text-xs uppercase tracking-[0.18em]", isLightMode ? "text-[#6f7682]" : "text-white/42")}>
                    {activeCollection.category}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={cn(
                  "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                  isLightMode ? "border-[#bca46a]/18 bg-[#f3ecdb]/72 text-[#7f6112]" : "border-[#d4af37]/18 bg-[#d4af37]/10 text-[#d8bf76]",
                )}>
                  {activeCollectionItems.length} Objects
                </div>
                {activeCollection.id === "archives" && (
                  <button
                    onClick={onOpenHallOfFame}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all",
                      isLightMode
                        ? "border-[#17253b]/12 bg-[#17253b]/8 text-[#17253b] hover:bg-[#17253b]/12"
                        : "border-[#d4af37]/18 bg-[#d4af37]/10 text-[#d8bf76] hover:bg-[#d4af37]/16",
                    )}
                  >
                    <Trophy className="h-3 w-3" />
                    Hall of Fame
                  </button>
                )}
                <button
                  onClick={() => goToCollection(activeIndex - 1, -1)}
                  className={cn("rounded-full border p-2 transition-colors", isLightMode ? "border-[#17253b]/10 bg-white/72 text-[#17253b] hover:bg-white" : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]")}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => goToCollection(activeIndex + 1, 1)}
                  className={cn("rounded-full border p-2 transition-colors", isLightMode ? "border-[#17253b]/10 bg-white/72 text-[#17253b] hover:bg-white" : "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08]")}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Artefacts grid — primary content */}
            {activeCollectionItems.length > 0 && (
              <CollectionItemsSlider
                items={activeCollectionItems}
                isLightMode={isLightMode}
                onAutoDisplay={() => setShowAutoDisplay(true)}
                onItemClick={setSelectedArtefact}
                categoryAnimConfig={getCategoryAnim(activeCollection.id)}
                categoryImageDefaults={getCategoryImageDefs(activeCollection.id)}
              />
            )}

            {activeCollectionItems.length === 0 && (
              <div className={cn(
                "museum-grain museum-plaque-shadow rounded-[24px] border p-10 text-center",
                isLightMode ? "border-[#bca46a]/16 bg-white/70" : "border-white/10 bg-white/[0.035]",
              )}>
                <p className={cn("text-sm", isLightMode ? "text-[#5e6a79]" : "text-white/55")}>
                  No artefacts in this collection yet. Upload media via the admin panel.
                </p>
              </div>
            )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
        
        <AutoTourGuide
          commandants={commandants}
          personnel={personnel}
          visits={visits}
          onOpenRelatedView={onOpenRelatedView}
        />
        </>
      )}

      {/* Artefact Profile Modal */}
      <AnimatePresence>
        {selectedArtefact && (
          <CollectionItemProfileModal
            item={selectedArtefact}
            isLightMode={isLightMode}
            onClose={() => setSelectedArtefact(null)}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

export function GuidedToursView({
  onBack,
  onOpenHallOfFame,
  onOpenCollections,
  onOpenRelatedView,
  commandants,
  personnel,
  visits,
}: {
  onBack: () => void;
  onOpenHallOfFame: () => void;
  onOpenCollections: () => void;
  onOpenRelatedView: (view: ViewKey) => void;
  commandants: Commandant[];
  personnel: Personnel[];
  visits: DistinguishedVisit[];
}) {
  const { themeMode } = useThemeMode();
  const { collectionItemsById } = useMuseumCollectionItems(COLLECTION_ITEMS);
  const isLightMode = themeMode.startsWith("outdoor");

  // Live tour routes from Supabase — falls back to static
  const { routes: liveRoutes } = useTourRoutes();
  const tourFeatures: TourFeature[] = useMemo(() => {
    if (liveRoutes.length === 0) return TOUR_FEATURES;
    return liveRoutes.filter((r) => r.is_published).map((r) => ({
      title: r.title,
      duration: r.duration,
      audience: r.audience,
      description: r.description,
      stops: r.stops,
      serviceColor: r.service_color,
      collectionId: r.collection_id ?? "",
    }));
  }, [liveRoutes]);

  // Live collection wings (needed for auto display mapping)
  const { wings: liveWings } = useCollectionWings();
  const collectionFeatures: CollectionFeature[] = useMemo(() => {
    if (liveWings.length === 0) return COLLECTION_FEATURES;
    return liveWings.filter((w) => w.is_published).map((w) => ({
      id: w.id,
      title: w.title,
      category: w.category,
      summary: w.summary,
      curatorialNote: w.curatorial_note,
      highlights: w.highlights,
      featuredFact: w.featured_fact,
    }));
  }, [liveWings]);

  const [activeTourId, setActiveTourId] = useState(TOUR_FEATURES[0].collectionId);
  const [showTourAutoDisplay, setShowTourAutoDisplay] = useState(false);
  const [selectedArtefact, setSelectedArtefact] = useState<CollectionItem | null>(null);
  const activeTour = tourFeatures.find((tour) => tour.collectionId === activeTourId) ?? tourFeatures[0];

  return (
    <PageShell
      eyebrow="Guided Tours"
      title="Collection Tour Routes"
      description="Three curated tour routes — State, Regional, and World collections — each with narrated artefacts specific to their category."
      onBack={onBack}
    >
      <AnimatePresence>
        {showTourAutoDisplay && (
          <CollectionAutoDisplay
            collections={tourFeatures.map((t) => collectionFeatures.find((c) => c.id === t.collectionId)!).filter(Boolean)}
            collectionItemsById={collectionItemsById}
            initialCollectionId={activeTourId}
            isLightMode={isLightMode}
            onClose={() => setShowTourAutoDisplay(false)}
            onItemClick={(item) => { setShowTourAutoDisplay(false); setSelectedArtefact(item); }}
          />
        )}
      </AnimatePresence>

      {!showTourAutoDisplay && (
      <>
        {/* Tour Tabs + controls — compact horizontal */}
        <motion.div
          variants={museumFadeUpVariant}
          initial="initial"
          animate="animate"
          className={cn(
            "museum-grain museum-plaque-shadow rounded-[24px] border p-3 sm:p-4",
            isLightMode
              ? "border-[#bca46a]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.72)_0%,rgba(244,239,226,0.94)_100%)]"
              : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%)]",
          )}
        >
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hidden">
            {tourFeatures.map((tour) => (
              <button
                key={tour.collectionId}
                onClick={() => setActiveTourId(tour.collectionId)}
                className={cn(
                  "shrink-0 rounded-full border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] transition-all duration-300 whitespace-nowrap",
                  activeTourId === tour.collectionId
                    ? isLightMode
                      ? "border-[#bca46a]/30 bg-[#f3ecdb] text-[#7f6112] shadow-sm"
                      : "border-[#d4af37]/24 bg-[#d4af37]/14 text-[#d8bf76]"
                    : isLightMode
                      ? "border-transparent bg-transparent text-[#435267] hover:bg-white/80 hover:border-[#bca46a]/14"
                      : "border-transparent bg-transparent text-white/55 hover:bg-white/[0.06] hover:text-white/80",
                )}
              >
                <span className="inline-block w-2 h-2 rounded-full mr-2" style={{ backgroundColor: tour.serviceColor }} />
                {tour.title}
              </button>
            ))}
            <div className="ml-auto shrink-0 flex items-center gap-2">
              <button
                onClick={() => setShowTourAutoDisplay(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#d4af37]/24 bg-[#d4af37]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d4af37] hover:bg-[#d4af37]/16 transition-colors"
              >
                <Play className="h-3 w-3" />
                Auto Display
              </button>
              <button
                onClick={onOpenCollections}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all",
                  isLightMode
                    ? "border-[#17253b]/10 bg-white/72 text-[#435267] hover:bg-white"
                    : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]",
                )}
              >
                <GalleryHorizontalEnd className="h-3 w-3" />
                Collections
              </button>
              <button
                onClick={onOpenHallOfFame}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-all",
                  isLightMode
                    ? "border-[#17253b]/10 bg-white/72 text-[#435267] hover:bg-white"
                    : "border-white/10 bg-white/[0.04] text-white/55 hover:bg-white/[0.08]",
                )}
              >
                <Trophy className="h-3 w-3" />
                Hall of Fame
              </button>
            </div>
          </div>
        </motion.div>

        {/* Selected tour — compact header + artefacts */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTour.collectionId}
            initial={{ opacity: 0, y: 18, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -14, filter: "blur(6px)" }}
            transition={{ duration: 0.6, ease: MUSEUM_EASE }}
            className="space-y-4"
          >
            {/* Compact tour info bar */}
            <div className={cn(
              "museum-grain museum-plaque-shadow flex flex-wrap items-center justify-between gap-4 rounded-[20px] border px-5 py-4",
              isLightMode
                ? "border-[#bca46a]/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.7)_0%,rgba(244,239,226,0.92)_100%)]"
                : "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%)]",
            )}>
              <div className="h-[2px] absolute inset-x-0 top-0 rounded-t-[20px] overflow-hidden" style={{ background: `linear-gradient(90deg, ${activeTour.serviceColor}, #d4af37, ${activeTour.serviceColor})` }} />
              <div className="flex items-center gap-4">
                <div>
                  <h3 className={cn("text-xl sm:text-2xl font-semibold", isLightMode ? "text-[#17253b]" : "text-[#f8f3e8]")}>
                    {activeTour.title}
                  </h3>
                  <p className={cn("mt-1 text-xs uppercase tracking-[0.18em]", isLightMode ? "text-[#6f7682]" : "text-white/42")}>
                    {activeTour.audience} · {activeTour.duration}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em]",
                  isLightMode ? "border-[#bca46a]/18 bg-[#f3ecdb]/72 text-[#7f6112]" : "border-[#d4af37]/18 bg-[#d4af37]/10 text-[#d8bf76]",
                )}>
                  {activeTour.stops.length} Stops
                </span>
              </div>
            </div>

            {/* Route stops — compact horizontal chips */}
            <div className="flex flex-wrap gap-2">
              {activeTour.stops.map((stop, index) => (
                <span
                  key={stop}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-medium",
                    isLightMode
                      ? "border-[#17253b]/10 bg-white/80 text-[#435267]"
                      : "border-white/10 bg-white/[0.04] text-white/65",
                  )}
                >
                  <span className="font-semibold" style={{ color: activeTour.serviceColor }}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {stop}
                </span>
              ))}
            </div>

            {/* Artefacts grid */}
            {(collectionItemsById[activeTour.collectionId] ?? []).length > 0 && (
              <CollectionItemsSlider
                items={collectionItemsById[activeTour.collectionId] ?? []}
                isLightMode={isLightMode}
                onAutoDisplay={() => setShowTourAutoDisplay(true)}
                onItemClick={setSelectedArtefact}
                categoryAnimConfig={getCategoryAnim(activeTour.collectionId)}
                categoryImageDefaults={getCategoryImageDefs(activeTour.collectionId)}
              />
            )}

            {(collectionItemsById[activeTour.collectionId] ?? []).length === 0 && (
              <div className={cn(
                "museum-grain museum-plaque-shadow rounded-[24px] border p-10 text-center",
                isLightMode ? "border-[#bca46a]/16 bg-white/70" : "border-white/10 bg-white/[0.035]",
              )}>
                <p className={cn("text-sm", isLightMode ? "text-[#5e6a79]" : "text-white/55")}>
                  No artefacts in this tour yet.
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        <AutoTourGuide
          commandants={commandants}
          personnel={personnel}
          visits={visits}
          onOpenRelatedView={onOpenRelatedView}
        />
      </>
      )}

      {/* Artefact Profile Modal */}
      <AnimatePresence>
        {selectedArtefact && (
          <CollectionItemProfileModal
            item={selectedArtefact}
            isLightMode={isLightMode}
            onClose={() => setSelectedArtefact(null)}
          />
        )}
      </AnimatePresence>
    </PageShell>
  );
}

export function HallOfFameView({
  onBack,
  onSelect,
  personnel,
  commandants,
  visits,
}: {
  onBack: () => void;
  onSelect: (key: ViewKey) => void;
  personnel: Personnel[];
  commandants: Commandant[];
  visits: DistinguishedVisit[];
}) {
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");

  const hallOfFameCategories = useMemo(
    () => [
      {
        key: "commandants" as const,
        label: "Commandants",
        description: "Leadership profiles and the commandant succession that has shaped the NDC since 1992.",
        count: commandants.length,
        icon: Shield,
      },
      {
        key: "fwc" as const,
        label: "FWC",
        description: "Fellows of the War College — distinguished graduates of the NDC's war course programme.",
        count: personnel.filter((entry) => entry.category === "FWC").length,
        icon: Award,
      },
      {
        key: "fdc" as const,
        label: "FDC",
        description: "Fellows of the Defence College — honoured alumni of the NDC's defence programme.",
        count: personnel.filter((entry) => entry.category === "FDC").length,
        icon: Star,
      },
      {
        key: "directing" as const,
        label: "Directing Staff",
        description: "Directing staff who have guided courses and shaped the NDC academic framework.",
        count: personnel.filter((entry) => entry.category === "Directing Staff").length,
        icon: Users,
      },
      {
        key: "allied" as const,
        label: "Allied Officers",
        description: "International officers from partner nations who have attended or contributed to the NDC.",
        count: personnel.filter((entry) => entry.category === "Allied").length,
        icon: Globe2,
      },
      {
        key: "visits" as const,
        label: "Distinguished Visits",
        description: "Heads of state, defence chiefs, and diplomats who have honoured the NDC with official visits.",
        count: visits.length,
        icon: ScrollText,
      },
    ],
    [commandants.length, personnel, visits.length],
  );

  const totalHonours = useMemo(
    () => hallOfFameCategories.reduce((sum, cat) => sum + cat.count, 0),
    [hallOfFameCategories],
  );

  return (
    <PageShell
      eyebrow="Hall of Fame"
      title="NDC Honours Gallery"
      description="All existing archive categories — commandants, fellows, staff, allied officers, and distinguished visitors — grouped as one ceremonial honour gallery. These remain accessible from the homepage exactly as before."
      onBack={onBack}
    >
      {/* Total Honours Banner */}
      <motion.div
        {...fadeUpVariant}
        className={cn(
          "rounded-2xl border overflow-hidden",
          isLightMode ? "border-[#FFD700]/30 bg-[linear-gradient(135deg,#fffdf5_0%,#fff8e1_100%)]" : "border-[#FFD700]/20 bg-[linear-gradient(135deg,rgba(20,16,4,0.9)_0%,rgba(40,32,10,0.95)_100%)]",
        )}
      >
        <TriColorStrip />
        <div className="p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-7 w-7 text-[#FFD700]" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#FFD700]">
                Total Honours
              </p>
              <p className={cn("text-3xl font-bold", isLightMode ? "text-[#0f2a5f]" : "text-white")}>
                {totalHonours.toLocaleString()}
              </p>
            </div>
          </div>
          <p className={cn("text-sm leading-relaxed max-w-md", isLightMode ? "text-slate-600" : "text-white/75")}>
            Records across {hallOfFameCategories.length} honour categories, available both here and on the homepage archive.
          </p>
        </div>
      </motion.div>

      <motion.div
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
        variants={textStaggerContainer}
        initial="initial"
        animate="animate"
      >
        {hallOfFameCategories.map((entry) => {
          const Icon = entry.icon;

          return (
            <motion.button
              key={entry.key}
              variants={textStaggerItem}
              whileHover={{ y: -4, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(entry.key)}
              className={cn(
                "group rounded-2xl border p-5 text-left transition-all duration-300 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70",
                isLightMode
                  ? "border-[#002060]/10 bg-white/88 hover:shadow-[0_18px_36px_rgba(0,32,96,0.12)]"
                  : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06] hover:shadow-[0_18px_44px_rgba(0,0,0,0.18)]",
              )}
            >
              <TriColorStrip className="absolute inset-x-0 top-0 h-[3px]" />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                    Honour Category
                  </p>
                  <h3 className={cn("mt-2 text-xl font-bold", isLightMode ? "text-[#0f2a5f]" : "text-white")}>
                    {entry.label}
                  </h3>
                </div>
                <div className={cn("rounded-2xl p-3", isLightMode ? "bg-[#002060]/[0.06] text-[#002060]" : "bg-white/[0.08] text-white/80")}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <p className={cn("mt-4 text-sm leading-relaxed", isLightMode ? "text-slate-600" : "text-white/75")}>
                {entry.description}
              </p>

              <div className="mt-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                    Records
                  </p>
                  <p className="mt-1 text-2xl font-bold text-[#FFD700]">
                    {entry.count}
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary/80 transition-colors group-hover:text-primary">
                  Open Category
                  <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                </div>
              </div>
            </motion.button>
          );
        })}
      </motion.div>
    </PageShell>
  );
}