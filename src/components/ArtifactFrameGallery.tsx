import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Frame, ImageIcon, Music, Pause, Play, Power, Settings, SkipForward, Square, Trash2, Upload, Volume2, VolumeX, X, Globe, MapPin, Flag } from "lucide-react";
import { MuseumObjectViewer } from "./MuseumObjectViewer";
import { isPersistentMediaRef, resolveMediaRefToObjectUrl, saveMediaFile } from "@/lib/persistentMedia";
import { loadSharedSetting, saveSharedSetting } from "@/lib/sharedSettingsStorage";
import { loadUiSetting } from "@/lib/uiSettingsStorage";
import { getPreferredVoice, getPreferredLang } from "@/hooks/useVoicePreference";
import {
  REFERENCE_CHAMBER_FRAME,
  useDisplayFrameSettings,
  type FrameDisplayParams,
  DEFAULT_FRAME_DISPLAY,
} from "@/hooks/useDisplayFrameSettings";
import { useMuseumCollectionItems, type CollectionItem } from "@/hooks/useMuseumCollectionItems";
import { cn } from "@/lib/utils";

/* ── Types (mirrors DisplayFrameAdmin) ── */
type StudioLayer = {
  id: string;
  label: string;
  sourceRef: string;
  x: number;
  y: number;
  depth: number;
  scale: number;
  rotation: number;
  opacity: number;
  blur: number;
  shadow: number;
  glow: number;
  brightness: number;
  contrast: number;
  saturate: number;
  hueRotate: number;
  grayscale: number;
  sepia: number;
  bgFade: number;
  mixBlend: string;
  category: string;
  categoryDetail: string;
  audioRef: string;
};

type ChamberStudioScene = {
  stageFrameRef: string;
  selectedLayerId: string | null;
  layers: StudioLayer[];
  artifactTitle: string;
  exhibitionCategory: string;
  tourAssociation: string;
  vipAccess: boolean;
  ambientLight: number;
  beamStrength: number;
  haze: number;
  glassTint: number;
  floorGlow: number;
  bgColor: string;
  bgGradientPreset: string;
  bgOpacity: number;
  frameActive: boolean;
  backgroundAudioRef: string;
};

const STUDIO_STORAGE_KEY = "museum_artifact_chamber_studio";
const STUDIO_SHARED_SETTING_KEY = "artifact_gallery_chamber_studio";
const AUTO_DISPLAY_BG_KEY = "afg_auto_display_bg";
const AUTO_DISPLAY_BG_SETTING_KEY = "artifact_gallery_auto_display_backgrounds";
const DEFAULT_AUTO_DISPLAY_BG = "/images/cosmic-nebulae-bg.png";
const TOUR_AUDIO_KEY = "afg_tour_category_audio";
const TOUR_AUDIO_SETTING_KEY = "artifact_gallery_tour_category_audio";
const NARRATION_KEY = "afg_narration_enabled";

type StoredBackgroundImage = { id: string; name: string; sourceRef: string; active?: boolean };
type StoredAudioTrack = { id: string; name: string; sourceRef: string; active?: boolean };
type TourCategoryAudios = Record<string, StoredAudioTrack[]>;

type LegacyStoredBackgroundImage = Partial<StoredBackgroundImage> & { url?: string | null };
type LegacyStoredAudioTrack = Partial<StoredAudioTrack> & { dataUrl?: string | null };

function revokeBlobUrl(url?: string | null) {
  if (url?.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function getDefaultAutoDisplayBackgroundImage(): StoredBackgroundImage {
  return {
    id: "auto-display-default-bg",
    name: "Default Cosmic Nebula",
    sourceRef: DEFAULT_AUTO_DISPLAY_BG,
    active: true,
  };
}

function normalizeAutoDisplayBackgrounds(images: LegacyStoredBackgroundImage[]) {
  let activeAssigned = false;
  return images
    .map((image, index) => {
      const sourceRef = image?.sourceRef ?? image?.url ?? "";
      if (!sourceRef) return null;

      const isActive = image.active === true && !activeAssigned;
      if (isActive) activeAssigned = true;

      return {
        id: image.id || `auto-display-bg-${index + 1}`,
        name: image.name || `Background ${index + 1}`,
        sourceRef,
        active: isActive,
      } satisfies StoredBackgroundImage;
    })
    .filter(Boolean) as StoredBackgroundImage[];
}

function loadAutoDisplayBackgrounds(): StoredBackgroundImage[] {
  try {
    const raw = localStorage.getItem(AUTO_DISPLAY_BG_KEY);
    if (!raw) return [getDefaultAutoDisplayBackgroundImage()];

    try {
      const parsed = JSON.parse(raw) as LegacyStoredBackgroundImage[] | string;
      if (Array.isArray(parsed)) {
        const normalized = normalizeAutoDisplayBackgrounds(parsed);
        return normalized.length > 0 ? normalized : [getDefaultAutoDisplayBackgroundImage()];
      }
      if (typeof parsed === "string") {
        return parsed
          ? [{
              id: "auto-display-legacy-bg",
              name: parsed === DEFAULT_AUTO_DISPLAY_BG ? "Default Cosmic Nebula" : "Saved Background",
              sourceRef: parsed,
              active: true,
            }]
          : [getDefaultAutoDisplayBackgroundImage()];
      }
    } catch {
      return raw
        ? [{
            id: "auto-display-legacy-bg",
            name: raw === DEFAULT_AUTO_DISPLAY_BG ? "Default Cosmic Nebula" : "Saved Background",
            sourceRef: raw,
            active: true,
          }]
        : [getDefaultAutoDisplayBackgroundImage()];
    }

    return [getDefaultAutoDisplayBackgroundImage()];
  } catch {
    return [getDefaultAutoDisplayBackgroundImage()];
  }
}

function saveAutoDisplayBackgrounds(images: StoredBackgroundImage[]) {
  try { localStorage.setItem(AUTO_DISPLAY_BG_KEY, JSON.stringify(normalizeAutoDisplayBackgrounds(images))); } catch {}
}

function normalizeTourAudios(audios: Record<string, LegacyStoredAudioTrack[]>) {
  return Object.fromEntries(
    Object.entries(audios).map(([categoryId, tracks]) => [
      categoryId,
      (tracks ?? [])
        .map((track, index) => {
          const sourceRef = track?.sourceRef ?? track?.dataUrl ?? "";
          if (!sourceRef) return null;

          return {
            id: track.id || `${categoryId}-track-${index + 1}`,
            name: track.name || `Track ${index + 1}`,
            sourceRef,
            active: track.active === true,
          } satisfies StoredAudioTrack;
        })
        .filter(Boolean) as StoredAudioTrack[],
    ]),
  ) as TourCategoryAudios;
}

function loadTourAudios(): TourCategoryAudios {
  try {
    const raw = localStorage.getItem(TOUR_AUDIO_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LegacyStoredAudioTrack[]>;
    return normalizeTourAudios(parsed);
  } catch { return {}; }
}

function saveTourAudios(audios: TourCategoryAudios) {
  try { localStorage.setItem(TOUR_AUDIO_KEY, JSON.stringify(audios)); } catch {}
}

function hasActiveTourAudio(audios: TourCategoryAudios) {
  return Object.values(audios).some((tracks) => (tracks ?? []).some((track) => track.active === true));
}

function isDisplayableStudioScene(value: ChamberStudioScene | null | undefined): value is ChamberStudioScene {
  return Boolean(value?.frameActive && Array.isArray(value.layers) && value.layers.length > 0);
}

const SAMPLE_ARTIFACT = "/images/ndc-crest.png";
const STAGE_REGION = { left: 15, top: 12, width: 70, height: 60 };

/* ── Tour Categories (3 tours tied to NDC Collection Wings) ── */
type TourCategory = {
  id: string;
  label: string;
  subtitle: string;
  color: string;
  icon: "flag" | "mapPin" | "globe";
  collectionId: string;
  description: string;
};

const TOUR_CATEGORIES: TourCategory[] = [
  {
    id: "state-tour",
    label: "State Collection Tour",
    subtitle: "National identity & heritage",
    color: "#002060",
    icon: "flag",
    collectionId: "state",
    description: "Nigeria's defence heritage artefacts — national colours, presidential memorabilia, defence medals, Armed Forces Day records, and the national security architecture exhibit.",
  },
  {
    id: "regional-tour",
    label: "Regional Collection Tour",
    subtitle: "Continental & West African context",
    color: "#FF0000",
    icon: "mapPin",
    collectionId: "regional",
    description: "ECOWAS partnerships, African Union peacekeeping contributions, West African officer exchanges, regional security dialogue records, and pan-African defence education networks.",
  },
  {
    id: "world-tour",
    label: "World Collection Tour",
    subtitle: "Global partnerships & perspective",
    color: "#00B0F0",
    icon: "globe",
    collectionId: "world",
    description: "International connections — bilateral MoUs with war colleges worldwide, exchange officer programmes, global conference records, diplomatic gift collections, and comparative defence studies.",
  },
];

const TOUR_COLLECTION_ITEMS: Record<string, CollectionItem[]> = {
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
};

const BG_GRADIENT_PRESETS: Record<string, string> = {
  void: "radial-gradient(ellipse at center, #0a0e15, #050709)",
  navy: "linear-gradient(170deg, #0d1b2a 0%, #050a14 100%)",
  sepia: "radial-gradient(ellipse at center, #1a150c, #0a0806)",
  steel: "linear-gradient(165deg, #10161e 0%, #080c12 100%)",
  emerald: "radial-gradient(ellipse at center, #081a12, #040c08)",
  crimson: "radial-gradient(ellipse at center, #180a0a, #0a0506)",
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** Ensure layers are evenly placed regardless of how they were saved. */
function ensureArranged(layers: StudioLayer[]): StudioLayer[] {
  const n = layers.length;
  if (n === 0) return layers;
  const allCentered = layers.every((l) => l.x === 0 && l.y === 0);
  if (!allCentered) return layers;
  if (n === 1) return [{ ...layers[0], x: 0, y: 0, scale: 38, rotation: 0, depth: 20 }];
  if (n === 2) return [
    { ...layers[0], x: -18, y: 0, scale: 30, rotation: -2, depth: 14 },
    { ...layers[1], x: 18, y: 0, scale: 30, rotation: 2, depth: 16 },
  ];
  if (n === 3) return [
    { ...layers[0], x: 0, y: -8, scale: 32, rotation: 0, depth: 22 },
    { ...layers[1], x: -22, y: 8, scale: 24, rotation: -3, depth: 12 },
    { ...layers[2], x: 22, y: 8, scale: 24, rotation: 3, depth: 14 },
  ];
  const cols = n <= 4 ? 2 : n <= 9 ? 3 : n <= 16 ? 4 : Math.ceil(Math.sqrt(n * 1.2));
  const rows = Math.ceil(n / cols);
  const maxScale = Math.max(10, Math.min(22, 55 / Math.max(cols, rows)));
  const spanX = 68, spanY = 48;
  const cellW = spanX / cols, cellH = spanY / rows;
  return layers.map((layer, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const colsInRow = row === rows - 1 ? n - row * cols : cols;
    const rowOffsetX = (cols - colsInRow) * cellW / 2;
    const x = -(spanX / 2) + rowOffsetX + cellW * col + cellW / 2;
    const y = -(spanY / 2) + cellH * row + cellH / 2;
    return { ...layer, x: clampNumber(x, -42, 42), y: clampNumber(y, -28, 28), scale: maxScale, rotation: ((i % 3) - 1) * 1.5, depth: 10 + i * 2 };
  });
}

/* ── CSS keyframes injected once ── */
const GALLERY_STYLE_ID = "artifact-gallery-keyframes";
function ensureGalleryStyles() {
  if (document.getElementById(GALLERY_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = GALLERY_STYLE_ID;
  style.textContent = `
    @keyframes afg-float {
      0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
      50% { transform: translate(-50%, -50%) translateY(-6px); }
    }
    @keyframes afg-glow-pulse {
      0%, 100% { filter: drop-shadow(0 0 8px rgba(255,214,140,0.15)); }
      50% { filter: drop-shadow(0 0 18px rgba(255,214,140,0.35)); }
    }
    @keyframes afg-dust {
      0% { transform: translateY(0) translateX(0) scale(0); opacity: 0; }
      20% { opacity: 0.6; transform: translateY(-30px) translateX(8px) scale(1); }
      80% { opacity: 0.25; }
      100% { transform: translateY(-120px) translateX(-12px) scale(0.4); opacity: 0; }
    }
    @keyframes afg-fade-in-up {
      from { opacity: 0; transform: translateY(24px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes afg-scale-in {
      from { opacity: 0; transform: scale(0.92); }
      to { opacity: 1; transform: scale(1); }
    }
    @keyframes afg-typewriter-cursor {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    @keyframes afg-shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    @keyframes afg-star-twinkle {
      0%, 100% { opacity: 0.15; transform: scale(0.8); }
      50% { opacity: 1; transform: scale(1.2); }
    }
    @keyframes afg-star-drift {
      0% { transform: translate(0, 0); }
      25% { transform: translate(12px, -8px); }
      50% { transform: translate(-6px, 14px); }
      75% { transform: translate(8px, 6px); }
      100% { transform: translate(0, 0); }
    }
    @keyframes afg-nebula-drift {
      0% { transform: translate(0, 0) scale(1) rotate(0deg); }
      33% { transform: translate(3%, -2%) scale(1.05) rotate(1deg); }
      66% { transform: translate(-2%, 3%) scale(0.98) rotate(-1deg); }
      100% { transform: translate(0, 0) scale(1) rotate(0deg); }
    }
    @keyframes afg-warp-line {
      0% { transform: translateX(-100%) scaleX(0); opacity: 0; }
      30% { opacity: 0.6; }
      100% { transform: translateX(200%) scaleX(3); opacity: 0; }
    }
    @keyframes afg-orbit-glow {
      0% { transform: rotate(0deg) translateX(40vw); opacity: 0.15; }
      25% { opacity: 0.3; }
      50% { transform: rotate(180deg) translateX(40vw); opacity: 0.15; }
      75% { opacity: 0.25; }
      100% { transform: rotate(360deg) translateX(40vw); opacity: 0.15; }
    }
    @keyframes afg-pulse-ring {
      0% { transform: translate(-50%, -50%) scale(0.3); opacity: 0.4; }
      100% { transform: translate(-50%, -50%) scale(2.5); opacity: 0; }
    }
    @keyframes afg-gentle-float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }
    @keyframes afg-bg-spin {
      0% { transform: scale(1.25) rotate(0deg); }
      100% { transform: scale(1.25) rotate(360deg); }
    }
    @keyframes afg-bg-breathe {
      0%, 100% { transform: scale(1.15); opacity: 0.45; }
      50% { transform: scale(1.3); opacity: 0.6; }
    }
    @keyframes afg-shooting-star {
      0% { transform: translateX(0) translateY(0) scaleX(0); opacity: 0; }
      5% { opacity: 1; transform: translateX(8vw) translateY(4vh) scaleX(1); }
      30% { opacity: 0.6; }
      100% { transform: translateX(60vw) translateY(30vh) scaleX(2); opacity: 0; }
    }
    @keyframes afg-ring-expand {
      0% { transform: scale(0.5); opacity: 0.3; border-width: 1px; }
      70% { opacity: 0.08; }
      100% { transform: scale(2.5); opacity: 0; border-width: 0.5px; }
    }
    .afg-stagger-in > * {
      animation: afg-fade-in-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both;
    }
  `;
  document.head.appendChild(style);
}

/* ── Dust particle layer ── */
function DustParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 8,
        duration: 5 + Math.random() * 6,
        size: 1 + Math.random() * 2.5,
        startY: 40 + Math.random() * 50,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[300]">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-[#ffd68c]"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.left}%`,
            top: `${p.startY}%`,
            opacity: 0,
            animation: `afg-dust ${p.duration}s ${p.delay}s infinite ease-out`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Space Star Field — plenty of drifting dots ── */
function StarField() {
  const stars = useMemo(
    () =>
      Array.from({ length: 220 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size: 0.8 + Math.random() * 2,
        delay: Math.random() * 8,
        twinkleDuration: 2 + Math.random() * 4,
        driftDuration: 18 + Math.random() * 30,
        driftDelay: Math.random() * 12,
        brightness: 0.3 + Math.random() * 0.7,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full"
          style={{
            width: s.size,
            height: s.size,
            left: `${s.left}%`,
            top: `${s.top}%`,
            background: s.brightness > 0.7
              ? `radial-gradient(circle, rgba(255,255,255,${s.brightness}), rgba(212,175,55,${s.brightness * 0.3}))`
              : `rgba(255,255,255,${s.brightness})`,
            boxShadow: s.size > 1.5 ? `0 0 ${s.size * 2}px rgba(255,255,255,${s.brightness * 0.25})` : "none",
            animation: `afg-star-twinkle ${s.twinkleDuration}s ease-in-out ${s.delay}s infinite, afg-star-drift ${s.driftDuration}s ease-in-out ${s.driftDelay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Transition sound via Web Audio API ── */
function playTransitionSound(type: "whoosh" | "reveal" | "chime") {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;

    if (type === "whoosh") {
      // Filtered noise sweep
      const bufferSize = ctx.sampleRate * 0.5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(400, now);
      filter.frequency.exponentialRampToValueAtTime(2000, now + 0.15);
      filter.frequency.exponentialRampToValueAtTime(200, now + 0.45);
      filter.Q.value = 1.5;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.12, now + 0.08);
      gain.gain.linearRampToValueAtTime(0, now + 0.45);
      src.connect(filter).connect(gain).connect(ctx.destination);
      src.start(now);
      src.stop(now + 0.5);
      setTimeout(() => ctx.close(), 600);
    } else if (type === "reveal") {
      // Rising tone
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.35);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.linearRampToValueAtTime(0, now + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);
      setTimeout(() => ctx.close(), 700);
    } else if (type === "chime") {
      // Celestial chime
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.value = freq;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now + i * 0.08);
        gain.gain.linearRampToValueAtTime(0.06, now + i * 0.08 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.6);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now + i * 0.08);
        osc.stop(now + i * 0.08 + 0.7);
      });
      setTimeout(() => ctx.close(), 1000);
    }
  } catch {
    // Web Audio not available — silent fallback
  }
}

/* ── Cinematic Focused Artifact Overlay ── */
function CinematicOverlay({
  layer,
  imageUrl,
  scene,
  onClose,
}: {
  layer: StudioLayer;
  imageUrl: string;
  scene: ChamberStudioScene;
  onClose: () => void;
}) {
  const [revealedText, setRevealedText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const revealTimerRef = useRef<number>(0);
  const mountedRef = useRef(true);

  const storyText = useMemo(() => {
    if (layer.categoryDetail) return layer.categoryDetail;
    return `This is ${layer.label}, part of the ${scene.exhibitionCategory} collection. ${
      layer.category && layer.category !== "Uncategorised"
        ? `It belongs to the ${layer.category} category. `
        : ""
    }On display as part of the ${scene.tourAssociation} exhibition at the National Defence College Museum.`;
  }, [layer, scene]);

  // Resolve layer audio
  useEffect(() => {
    if (!layer.audioRef) return;
    let cancelled = false;
    void resolveMediaRefToObjectUrl(layer.audioRef).then((url) => {
      if (!cancelled && url) setAudioUrl(url);
    });
    return () => { cancelled = true; };
  }, [layer.audioRef]);

  // Play background audio for this artifact
  useEffect(() => {
    if (!audioUrl) return;
    const audio = new Audio(audioUrl);
    audio.loop = true;
    audio.volume = 0.25;
    audioRef.current = audio;
    audio.play().then(() => setAudioPlaying(true)).catch(() => {});
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl]);

  // Start TTS narration + typewriter text
  useEffect(() => {
    mountedRef.current = true;
    const words = storyText.split(/\s+/);
    let wordIndex = 0;

    function startNarration() {
      if (!mountedRef.current) return;
      speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(storyText);
      const voice = getPreferredVoice();
      if (voice) utterance.voice = voice;
      utterance.lang = getPreferredLang();
      utterance.rate = 0.88;
      utterance.pitch = 0.95;
      utterance.volume = 0.9;
      utteranceRef.current = utterance;

      // Reveal words in sync with speech using boundary events
      utterance.onboundary = (event) => {
        if (!mountedRef.current) return;
        if (event.name === "word") {
          const spoken = storyText.slice(0, event.charIndex + event.charLength);
          setRevealedText(spoken);
        }
      };

      utterance.onstart = () => { if (mountedRef.current) setIsSpeaking(true); };
      utterance.onend = () => {
        if (mountedRef.current) {
          setIsSpeaking(false);
          setRevealedText(storyText);
        }
      };
      utterance.onerror = () => {
        if (mountedRef.current) setIsSpeaking(false);
      };

      speechSynthesis.speak(utterance);

      // Fallback typewriter in case onboundary isn't supported
      wordIndex = 0;
      function fallbackReveal() {
        if (!mountedRef.current) return;
        wordIndex++;
        if (wordIndex <= words.length) {
          setRevealedText(words.slice(0, wordIndex).join(" "));
          revealTimerRef.current = window.setTimeout(fallbackReveal, 220);
        }
      }
      // Only use fallback if no boundary event fires after 600ms
      const boundaryCheck = setTimeout(() => {
        if (mountedRef.current && !revealedText) {
          fallbackReveal();
        }
      }, 600);
      return () => clearTimeout(boundaryCheck);
    }

    // Wait for voices to load
    if (speechSynthesis.getVoices().length > 0) {
      startNarration();
    } else {
      speechSynthesis.onvoiceschanged = () => startNarration();
    }

    return () => {
      mountedRef.current = false;
      speechSynthesis.cancel();
      clearTimeout(revealTimerRef.current);
    };
  }, [storyText]);

  const toggleSpeech = useCallback(() => {
    if (speechSynthesis.speaking && !speechSynthesis.paused) {
      speechSynthesis.pause();
      setIsSpeaking(false);
    } else if (speechSynthesis.paused) {
      speechSynthesis.resume();
      setIsSpeaking(true);
    }
  }, []);

  const toggleAudio = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
      setAudioPlaying(true);
    } else {
      audio.pause();
      setAudioPlaying(false);
    }
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const appearanceFilter = [
    `brightness(${layer.brightness / 100})`,
    `contrast(${layer.contrast / 100})`,
    `saturate(${layer.saturate / 100})`,
    layer.hueRotate !== 0 ? `hue-rotate(${layer.hueRotate}deg)` : "",
    layer.grayscale > 0 ? `grayscale(${layer.grayscale / 100})` : "",
    layer.sepia > 0 ? `sepia(${layer.sepia / 100})` : "",
  ].filter(Boolean).join(" ");

  const bgFadeMask = layer.bgFade > 0
    ? `radial-gradient(ellipse at center, black ${Math.max(0, 100 - layer.bgFade * 1.2)}%, transparent 100%)`
    : undefined;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{ animation: "afg-scale-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both" }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/92 backdrop-blur-md" onClick={onClose} />

      {/* Ambient glow behind the image */}
      <div
        className="pointer-events-none absolute"
        style={{
          width: "50vw",
          height: "50vh",
          left: "25%",
          top: "10%",
          background: "radial-gradient(ellipse at center, rgba(212,175,55,0.08), transparent 70%)",
        }}
      />

      {/* Content */}
      <div className="relative z-10 mx-4 flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:items-start lg:gap-8">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-12 right-0 lg:-right-2 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 transition hover:bg-white/[0.12] z-20"
        >
          <X className="h-3.5 w-3.5" />
          Close
        </button>

        {/* Image side */}
        <div
          className="flex-shrink-0 lg:w-[45%]"
          style={{ animation: "afg-fade-in-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both" }}
        >
          <div className="relative overflow-hidden rounded-[20px] border border-white/10 bg-black/50 shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-center p-6 sm:p-8" style={{ minHeight: 300 }}>
              <img
                src={imageUrl}
                alt={layer.label}
                className="max-h-[420px] max-w-full object-contain"
                draggable={false}
                style={{
                  filter: appearanceFilter,
                  animation: "afg-float 6s ease-in-out infinite",
                  ...(bgFadeMask ? { WebkitMaskImage: bgFadeMask, maskImage: bgFadeMask } : {}),
                }}
              />
            </div>
            {/* Shimmer edge */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
              style={{
                background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.5), transparent)",
                backgroundSize: "200% 100%",
                animation: "afg-shimmer 3s linear infinite",
              }}
            />
          </div>
        </div>

        {/* Text / narration side */}
        <div
          className="flex-1 min-w-0"
          style={{ animation: "afg-fade-in-up 0.7s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both" }}
        >
          {/* Kicker */}
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#d4af37]/70">
            {layer.category && layer.category !== "Uncategorised" ? layer.category : "Artefact In Focus"}
          </p>

          {/* Title */}
          <h2 className="mt-3 font-serif text-3xl font-semibold text-white sm:text-4xl leading-tight">
            {layer.label}
          </h2>

          {/* Category badge */}
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {layer.category && layer.category !== "Uncategorised" && (
              <span className="rounded-full border border-[#f4c866]/18 bg-[#f4c866]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f4c866]">
                {layer.category}
              </span>
            )}
            <span className="text-[10px] uppercase tracking-[0.14em] text-white/30">
              {scene.exhibitionCategory} &middot; {scene.tourAssociation}
            </span>
          </div>

          {/* Divider */}
          <div className="mt-5 h-[1px] bg-gradient-to-r from-[#d4af37]/30 via-[#d4af37]/10 to-transparent" />

          {/* Typewriter narration text */}
          <div className="mt-5 min-h-[120px] relative">
            <p className="text-base leading-8 text-white/80 sm:text-lg sm:leading-9 font-light">
              {revealedText}
              {revealedText.length < storyText.length && (
                <span
                  className="inline-block w-[2px] h-[1.1em] bg-[#d4af37] ml-1 align-middle"
                  style={{ animation: "afg-typewriter-cursor 0.8s steps(1) infinite" }}
                />
              )}
            </p>
          </div>

          {/* Controls */}
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={toggleSpeech}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all",
                isSpeaking
                  ? "border-[#d4af37]/30 bg-[#d4af37]/15 text-[#f4c866]"
                  : "border-white/12 bg-white/[0.05] text-white/60 hover:bg-white/[0.08]",
              )}
            >
              {isSpeaking ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isSpeaking ? "Pause Narration" : "Resume Narration"}
            </button>

            {audioUrl && (
              <button
                type="button"
                onClick={toggleAudio}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] transition-all",
                  audioPlaying
                    ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                    : "border-white/12 bg-white/[0.05] text-white/60 hover:bg-white/[0.08]",
                )}
              >
                {audioPlaying ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
                {audioPlaying ? "Audio On" : "Audio Off"}
              </button>
            )}
          </div>

          {/* Narrating indicator */}
          {isSpeaking && (
            <div className="mt-4 flex items-center gap-2">
              <div className="flex gap-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="w-[3px] rounded-full bg-[#d4af37]"
                    style={{
                      height: 8 + Math.random() * 10,
                      animation: `afg-float ${0.4 + i * 0.1}s ease-in-out infinite alternate`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] uppercase tracking-[0.16em] text-[#d4af37]/60">Narrating</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Gallery ── */
interface ArtifactFrameGalleryProps {
  onBack: () => void;
}

export function ArtifactFrameGallery({ onBack }: ArtifactFrameGalleryProps) {
  const [scene, setScene] = useState<ChamberStudioScene | null>(null);
  const [loading, setLoading] = useState(true);
  const [layerPreviewMap, setLayerPreviewMap] = useState<Record<string, string>>({});
  const [frameUrl, setFrameUrl] = useState(REFERENCE_CHAMBER_FRAME);
  const [focusedLayer, setFocusedLayer] = useState<StudioLayer | null>(null);
  const [pointer, setPointer] = useState({ x: 50, y: 18 });
  const [bgAudioUrl, setBgAudioUrl] = useState<string | null>(null);
  const bgAudioRef = useRef<HTMLAudioElement | null>(null);
  const [bgMuted, setBgMuted] = useState(false);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [entered, setEntered] = useState(false);

  const { displayParams, frameOptions, frameUrl: globalFrameUrl, frameRef: globalFrameRef } = useDisplayFrameSettings();

  // Framed Exhibition – per-frame selector state
  const [exhibitionFrameRef, setExhibitionFrameRef] = useState(globalFrameRef);
  const activeExhibitionFrame = frameOptions.find((f) => f.ref === exhibitionFrameRef) ?? frameOptions[0];
  const exhibitionFrameUrl = activeExhibitionFrame?.url ?? globalFrameUrl;

  // Auto Display – cinematic cycling mode
  const [autoDisplayActive, setAutoDisplayActive] = useState(false);
  const [autoDisplayIndex, setAutoDisplayIndex] = useState(0);
  const [autoDisplayPhase, setAutoDisplayPhase] = useState<"enter" | "narrate" | "exit">("enter");
  const autoDisplayTimerRef = useRef<number>(0);
  const autoNarrationRef = useRef<SpeechSynthesisUtterance | null>(null);
  const autoDisplayMountedRef = useRef(false);

  // Auto Display background image library (admin-configurable)
  const [autoDisplayBgImages, setAutoDisplayBgImages] = useState<StoredBackgroundImage[]>(loadAutoDisplayBackgrounds);
  const [resolvedAutoDisplayBgUrls, setResolvedAutoDisplayBgUrls] = useState<Record<string, string>>({});
  const resolvedAutoDisplayBgUrlsRef = useRef<Record<string, string>>({});
  const activeAutoDisplayBg = useMemo(
    () => autoDisplayBgImages.find((image) => image.active === true) ?? null,
    [autoDisplayBgImages],
  );
  const autoDisplayBgUrl = activeAutoDisplayBg
    ? (resolvedAutoDisplayBgUrls[activeAutoDisplayBg.id]
      ?? (isPersistentMediaRef(activeAutoDisplayBg.sourceRef) ? "" : activeAutoDisplayBg.sourceRef))
    : "";
  const getResolvedBackgroundPreviewUrl = useCallback((image: StoredBackgroundImage) => {
    return resolvedAutoDisplayBgUrls[image.id]
      ?? (isPersistentMediaRef(image.sourceRef) ? undefined : image.sourceRef);
  }, [resolvedAutoDisplayBgUrls]);
  const [showAutoDisplaySettings, setShowAutoDisplaySettings] = useState(false);
  const [bgUrlInput, setBgUrlInput] = useState("");

  // Narration toggle (persisted)
  const [narrationEnabled, setNarrationEnabled] = useState<boolean>(() => {
    try { const v = localStorage.getItem(NARRATION_KEY); return v === null ? true : v === "true"; } catch { return true; }
  });
  const narrationEnabledRef = useRef(narrationEnabled);
  narrationEnabledRef.current = narrationEnabled;
  const toggleNarration = useCallback(() => {
    setNarrationEnabled((prev) => {
      const next = !prev;
      try { localStorage.setItem(NARRATION_KEY, String(next)); } catch {}
      return next;
    });
  }, []);
  const bgFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    resolvedAutoDisplayBgUrlsRef.current = resolvedAutoDisplayBgUrls;
  }, [resolvedAutoDisplayBgUrls]);

  useEffect(() => () => {
    Object.values(resolvedAutoDisplayBgUrlsRef.current).forEach((url) => revokeBlobUrl(url));
  }, []);

  useEffect(() => {
    const legacyImages = loadAutoDisplayBackgrounds();
    let cancelled = false;

    void loadSharedSetting<LegacyStoredBackgroundImage[]>(AUTO_DISPLAY_BG_SETTING_KEY).then((storedImages) => {
      if (cancelled) return;

      if (storedImages != null) {
        const normalized = normalizeAutoDisplayBackgrounds(storedImages);
        if (normalized.length > 0) {
          setAutoDisplayBgImages(normalized);
          saveAutoDisplayBackgrounds(normalized);
        }
        return;
      }

      void saveSharedSetting(AUTO_DISPLAY_BG_SETTING_KEY, legacyImages);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    void Promise.all(
      autoDisplayBgImages.map(async (image) => {
        const resolvedUrl = await resolveMediaRefToObjectUrl(image.sourceRef);
        return [image.id, resolvedUrl] as const;
      }),
    ).then((entries) => {
      const nextUrls = Object.fromEntries(
        entries.filter((entry): entry is [string, string] => Boolean(entry[1])),
      );

      if (cancelled) {
        Object.values(nextUrls).forEach((url) => revokeBlobUrl(url));
        return;
      }

      setResolvedAutoDisplayBgUrls((prev) => {
        const nextUrlSet = new Set(Object.values(nextUrls));
        Object.values(prev).forEach((url) => {
          if (!nextUrlSet.has(url)) {
            revokeBlobUrl(url);
          }
        });
        return nextUrls;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [autoDisplayBgImages]);

  const persistAutoDisplayBackgrounds = useCallback((images: StoredBackgroundImage[]) => {
    saveAutoDisplayBackgrounds(images);
    void saveSharedSetting(AUTO_DISPLAY_BG_SETTING_KEY, images);
  }, []);

  const updateAutoDisplayBackgrounds = useCallback((
    updater: StoredBackgroundImage[] | ((prev: StoredBackgroundImage[]) => StoredBackgroundImage[]),
  ) => {
    setAutoDisplayBgImages((prev) => {
      const nextImages = typeof updater === "function"
        ? (updater as (prev: StoredBackgroundImage[]) => StoredBackgroundImage[])(prev)
        : updater;
      const next = normalizeAutoDisplayBackgrounds(nextImages);
      persistAutoDisplayBackgrounds(next);
      return next;
    });
  }, [persistAutoDisplayBackgrounds]);

  const addAutoDisplayBackground = useCallback((image: StoredBackgroundImage) => {
    updateAutoDisplayBackgrounds((prev) => [...prev, image]);
  }, [updateAutoDisplayBackgrounds]);

  const activateAutoDisplayBg = useCallback((imageId: string) => {
    updateAutoDisplayBackgrounds((prev) => prev.map((image) => ({
      ...image,
      active: image.id === imageId,
    })));
  }, [updateAutoDisplayBackgrounds]);

  const activateAutoDisplayBgByUrl = useCallback((url: string, name: string) => {
    if (!url) return;

    updateAutoDisplayBackgrounds((prev) => {
      const existingImage = prev.find((image) => image.sourceRef === url);
      if (existingImage) {
        return prev.map((image) => ({
          ...image,
          name: image.sourceRef === url ? name : image.name,
          active: image.sourceRef === url,
        }));
      }

      return [
        {
          id: `auto-display-bg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name,
          sourceRef: url,
          active: true,
        },
        ...prev.map((image) => ({ ...image, active: false })),
      ];
    });
  }, [updateAutoDisplayBackgrounds]);

  const removeAutoDisplayBg = useCallback((imageId: string) => {
    updateAutoDisplayBackgrounds((prev) => prev.filter((image) => image.id !== imageId));
  }, [updateAutoDisplayBackgrounds]);

  const clearActiveAutoDisplayBg = useCallback(() => {
    updateAutoDisplayBackgrounds((prev) => prev.map((image) => ({ ...image, active: false })));
  }, [updateAutoDisplayBackgrounds]);

  const handleBgFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";

    files.forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      void (async () => {
        const sourceRef = await saveMediaFile(file);
        addAutoDisplayBackground({
          id: `auto-display-bg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          name: file.name,
          sourceRef,
          active: false,
        });
      })();
    });
  }, [addAutoDisplayBackground]);

  const addAutoDisplayBgFromUrl = useCallback(() => {
    const trimmedUrl = bgUrlInput.trim();
    if (!trimmedUrl) return;

    const label = trimmedUrl.split("/").pop()?.split("?")[0] || "Remote Background";
    addAutoDisplayBackground({
      id: `auto-display-bg-url-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: label,
      sourceRef: trimmedUrl,
      active: false,
    });
    setBgUrlInput("");
  }, [addAutoDisplayBackground, bgUrlInput]);

  const resetAutoDisplayBg = useCallback(() => {
    updateAutoDisplayBackgrounds((prev) => {
      const defaultBg = getDefaultAutoDisplayBackgroundImage();
      const existingDefault = prev.find((image) => image.sourceRef === DEFAULT_AUTO_DISPLAY_BG);
      if (existingDefault) {
        return prev.map((image) => ({
          ...image,
          name: image.sourceRef === DEFAULT_AUTO_DISPLAY_BG ? defaultBg.name : image.name,
          active: image.sourceRef === DEFAULT_AUTO_DISPLAY_BG,
        }));
      }
      return [
        defaultBg,
        ...prev.map((image) => ({ ...image, active: false })),
      ];
    });
  }, [updateAutoDisplayBackgrounds]);

  const useCurrentFrameAsAutoDisplayBg = useCallback(() => {
    if (!exhibitionFrameUrl) return;

    const frameBgName = activeExhibitionFrame?.label
      ? `${activeExhibitionFrame.label} Frame Background`
      : "Selected Frame Background";

    activateAutoDisplayBgByUrl(exhibitionFrameUrl, frameBgName);
  }, [activateAutoDisplayBgByUrl, activeExhibitionFrame, exhibitionFrameUrl]);

  // ── Tour Category Tabs ──
  const [activeTourTab, setActiveTourTab] = useState<string | null>(null);
  const { collectionItemsById } = useMuseumCollectionItems(TOUR_COLLECTION_ITEMS);

  // Tour auto-display state (separate from studio layers auto-display)
  const [tourAutoActive, setTourAutoActive] = useState(false);
  const [tourAutoIndex, setTourAutoIndex] = useState(0);
  const [tourAutoPhase, setTourAutoPhase] = useState<"enter" | "narrate" | "exit">("enter");
  const tourAutoTimerRef = useRef<number>(0);
  const tourAutoMountedRef = useRef(false);

  const activeTourCategory = TOUR_CATEGORIES.find((t) => t.id === activeTourTab);
  const activeTourItems: CollectionItem[] = activeTourCategory
    ? (collectionItemsById[activeTourCategory.collectionId] ?? [])
    : [];

  const tourIconMap = { flag: Flag, mapPin: MapPin, globe: Globe };

  // Combined list of ALL tour items across ALL categories for the full auto-display
  type TourDisplayItem = CollectionItem & { tourCategory: TourCategory };
  const allTourDisplayItems: TourDisplayItem[] = useMemo(() => {
    const combined: TourDisplayItem[] = [];
    for (const tour of TOUR_CATEGORIES) {
      const items = collectionItemsById[tour.collectionId] ?? [];
      for (const item of items) {
        combined.push({ ...item, tourCategory: tour });
      }
    }
    return combined;
  }, [collectionItemsById]);

  // Tour category audio state (declared early so startTourAutoDisplay can reference it)
  const [tourCategoryAudios, setTourCategoryAudios] = useState<TourCategoryAudios>(loadTourAudios);
  const persistTourCategoryAudios = useCallback((audios: TourCategoryAudios) => {
    saveTourAudios(audios);
    void saveSharedSetting(TOUR_AUDIO_SETTING_KEY, audios);
  }, []);

  useEffect(() => {
    const legacyAudios = loadTourAudios();
    let cancelled = false;

    void loadSharedSetting<Record<string, LegacyStoredAudioTrack[]>>(TOUR_AUDIO_SETTING_KEY).then((storedAudios) => {
      if (cancelled) return;

      if (storedAudios != null) {
        const normalized = normalizeTourAudios(storedAudios);
        setTourCategoryAudios(normalized);
        saveTourAudios(normalized);
        return;
      }

      if (Object.keys(legacyAudios).length > 0) {
        void saveSharedSetting(TOUR_AUDIO_SETTING_KEY, legacyAudios);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const hasActiveTourTracks = useMemo(() => hasActiveTourAudio(tourCategoryAudios), [tourCategoryAudios]);

  const startTourAutoDisplay = useCallback(() => {
    if (allTourDisplayItems.length === 0) return;
    setTourAutoActive(true);
    setTourAutoIndex(0);
    setTourAutoPhase("enter");
    tourAutoMountedRef.current = true;
    // Check if any tour category has active tracks — if so, mute main bg entirely
    const audio = bgAudioRef.current;
    if (audio) {
      if (hasActiveTourTracks) {
        audio.volume = 0;
      } else {
        audio.volume = 0.18;
        setBgMuted(false);
        audio.play().catch(() => {});
      }
    }
  }, [allTourDisplayItems.length, hasActiveTourTracks]);

  const stopTourAutoDisplay = useCallback(() => {
    tourAutoMountedRef.current = false;
    setTourAutoActive(false);
    setTourAutoIndex(0);
    setTourAutoPhase("enter");
    speechSynthesis.cancel();
    clearTimeout(tourAutoTimerRef.current);
  }, []);

  const skipTourAutoForward = useCallback(() => {
    speechSynthesis.cancel();
    clearTimeout(tourAutoTimerRef.current);
    setTourAutoPhase("exit");
    tourAutoTimerRef.current = window.setTimeout(() => {
      if (!tourAutoMountedRef.current) return;
      setTourAutoIndex((prev) => {
        const next = prev + 1;
        if (next >= allTourDisplayItems.length) { stopTourAutoDisplay(); return 0; }
        return next;
      });
      setTourAutoPhase("enter");
    }, 600);
  }, [allTourDisplayItems.length, stopTourAutoDisplay]);

  // Tour auto-display cycling effect — cycles through ALL tour categories
  useEffect(() => {
    if (!tourAutoActive || allTourDisplayItems.length === 0) return;
    tourAutoMountedRef.current = true;
    const displayItem = allTourDisplayItems[tourAutoIndex];
    if (!displayItem) { stopTourAutoDisplay(); return; }

    setTourAutoPhase("enter");
    playTransitionSound("reveal");

    const enterTimer = window.setTimeout(() => {
      if (!tourAutoMountedRef.current) return;
      setTourAutoPhase("narrate");
      playTransitionSound("chime");

      const tourName = displayItem.tourCategory.label;
      const text = `${displayItem.name}. ${displayItem.description} ${displayItem.era ? `Era: ${displayItem.era}.` : ""} ${displayItem.location ? `Located at ${displayItem.location}.` : ""} Part of the ${tourName} at the National Defence College Museum.`;

      speechSynthesis.cancel();

      const advanceToNext = () => {
        if (!tourAutoMountedRef.current) return;
        tourAutoTimerRef.current = window.setTimeout(() => {
          if (!tourAutoMountedRef.current) return;
          setTourAutoPhase("exit");
          playTransitionSound("whoosh");
          tourAutoTimerRef.current = window.setTimeout(() => {
            if (!tourAutoMountedRef.current) return;
            setTourAutoIndex((prev) => {
              const next = prev + 1;
              if (next >= allTourDisplayItems.length) { stopTourAutoDisplay(); return 0; }
              return next;
            });
            setTourAutoPhase("enter");
          }, 800);
        }, 1500);
      };

      if (!narrationEnabledRef.current) {
        // No narration — just hold for a few seconds then advance
        tourAutoTimerRef.current = window.setTimeout(advanceToNext, 4000);
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = getPreferredVoice();
        if (voice) utterance.voice = voice;
        utterance.lang = getPreferredLang();
        utterance.rate = 0.85;
        utterance.pitch = 0.95;
        utterance.volume = 0.9;

        utterance.onend = () => advanceToNext();

        utterance.onerror = () => {
          if (!tourAutoMountedRef.current) return;
          tourAutoTimerRef.current = window.setTimeout(() => {
            if (!tourAutoMountedRef.current) return;
            setTourAutoPhase("exit");
            playTransitionSound("whoosh");
            tourAutoTimerRef.current = window.setTimeout(() => {
              if (!tourAutoMountedRef.current) return;
              setTourAutoIndex((prev) => {
                const next = prev + 1;
                if (next >= allTourDisplayItems.length) { stopTourAutoDisplay(); return 0; }
                return next;
              });
              setTourAutoPhase("enter");
            }, 800);
          }, 5000);
        };

        speechSynthesis.speak(utterance);
      }
    }, 1200);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(tourAutoTimerRef.current);
      speechSynthesis.cancel();
    };
  }, [tourAutoActive, tourAutoIndex, allTourDisplayItems, stopTourAutoDisplay]);

  // ── Tour Category Audio Management ──
  const tourAudioRef = useRef<HTMLAudioElement | null>(null);
  const tourAudioTrackIndexRef = useRef(0);
  const tourAudioFileRef = useRef<HTMLInputElement>(null);
  const [audioUploadTarget, setAudioUploadTarget] = useState<string | null>(null);

  // Preview playback in admin
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const previewAudioUrlRef = useRef<string | null>(null);
  const previewRequestRef = useRef(0);
  const [previewingTrackId, setPreviewingTrackId] = useState<string | null>(null);

  const stopPreview = useCallback(() => {
    previewRequestRef.current += 1;
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current.src = "";
      previewAudioRef.current = null;
    }
    revokeBlobUrl(previewAudioUrlRef.current);
    previewAudioUrlRef.current = null;
    setPreviewingTrackId(null);
  }, []);

  const previewTrack = useCallback(async (track: StoredAudioTrack) => {
    stopPreview();
    if (previewingTrackId === track.id) {
      return;
    }

    const requestId = previewRequestRef.current;
    const resolvedUrl = await resolveMediaRefToObjectUrl(track.sourceRef);
    if (!resolvedUrl) return;

    if (previewRequestRef.current !== requestId) {
      revokeBlobUrl(resolvedUrl);
      return;
    }

    const audio = new Audio(resolvedUrl);
    audio.volume = 0.35;
    previewAudioRef.current = audio;
    previewAudioUrlRef.current = resolvedUrl;
    setPreviewingTrackId(track.id);

    const cleanup = () => {
      if (previewAudioRef.current === audio) {
        previewAudioRef.current = null;
      }
      if (previewAudioUrlRef.current === resolvedUrl) {
        previewAudioUrlRef.current = null;
      }
      revokeBlobUrl(resolvedUrl);
      setPreviewingTrackId(null);
    };

    audio.onended = cleanup;
    audio.onerror = cleanup;
    audio.play().catch(cleanup);
  }, [previewingTrackId, stopPreview]);

  const addTourAudio = useCallback((categoryId: string, file: File) => {
    void (async () => {
      const sourceRef = await saveMediaFile(file);
      const track: StoredAudioTrack = {
        id: `${categoryId}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        sourceRef,
        active: false,
      };
      setTourCategoryAudios((prev) => {
        const next = { ...prev, [categoryId]: [...(prev[categoryId] ?? []), track] };
        persistTourCategoryAudios(next);
        return next;
      });
    })();
  }, [persistTourCategoryAudios]);

  const removeTourAudio = useCallback((categoryId: string, trackId: string) => {
    // Stop preview if it's playing the track being removed
    if (previewingTrackId === trackId) stopPreview();
    setTourCategoryAudios((prev) => {
      const next = { ...prev, [categoryId]: (prev[categoryId] ?? []).filter((t) => t.id !== trackId) };
      persistTourCategoryAudios(next);
      return next;
    });
  }, [persistTourCategoryAudios, previewingTrackId, stopPreview]);

  const toggleTourAudioActive = useCallback((categoryId: string, trackId: string) => {
    setTourCategoryAudios((prev) => {
      const currentTracks = prev[categoryId] ?? [];
      const targetTrack = currentTracks.find((track) => track.id === trackId);
      const shouldActivate = targetTrack?.active !== true;
      const next = {
        ...prev,
        [categoryId]: currentTracks.map((track) =>
          track.id === trackId
            ? { ...track, active: shouldActivate }
            : { ...track, active: false }
        ),
      };
      persistTourCategoryAudios(next);
      return next;
    });
  }, [persistTourCategoryAudios]);

  const handleTourAudioUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !audioUploadTarget) return;
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("audio/")) addTourAudio(audioUploadTarget, file);
    });
    e.target.value = "";
  }, [audioUploadTarget, addTourAudio]);

  const tourAudioUrlRef = useRef<string | null>(null);
  const tourAudioSessionRef = useRef(0);

  const stopTourCategoryAudio = useCallback(() => {
    tourAudioSessionRef.current += 1;
    if (tourAudioRef.current) {
      tourAudioRef.current.pause();
      tourAudioRef.current.src = "";
      tourAudioRef.current = null;
    }
    revokeBlobUrl(tourAudioUrlRef.current);
    tourAudioUrlRef.current = null;
  }, []);

  const playTourCategoryAudio = useCallback((categoryId: string) => {
    stopTourCategoryAudio();
    const tracks = tourCategoryAudios[categoryId];
    const activeTracks = (tracks ?? []).filter((t) => t.active === true);
    if (activeTracks.length === 0) return;
    const sessionId = tourAudioSessionRef.current;
    tourAudioTrackIndexRef.current = 0;

    const playTrack = async (index: number) => {
      if (!tourAutoMountedRef.current || tourAudioSessionRef.current !== sessionId) return;
      const track = activeTracks[index % activeTracks.length];
      if (!track) return;
      const resolvedUrl = await resolveMediaRefToObjectUrl(track.sourceRef);
      if (!resolvedUrl) return;
      if (!tourAutoMountedRef.current || tourAudioSessionRef.current !== sessionId) {
        revokeBlobUrl(resolvedUrl);
        return;
      }

      const audio = new Audio(resolvedUrl);
      audio.volume = 0.25;
      tourAudioRef.current = audio;
      tourAudioUrlRef.current = resolvedUrl;

      const cleanup = () => {
        if (tourAudioRef.current === audio) {
          tourAudioRef.current = null;
        }
        if (tourAudioUrlRef.current === resolvedUrl) {
          tourAudioUrlRef.current = null;
        }
        revokeBlobUrl(resolvedUrl);
      };

      audio.onended = () => {
        cleanup();
        if (!tourAutoMountedRef.current) return;
        tourAudioTrackIndexRef.current = (index + 1) % activeTracks.length;
        void playTrack(tourAudioTrackIndexRef.current);
      };
      audio.onerror = cleanup;
      audio.play().catch(cleanup);
    };
    void playTrack(0);
  }, [stopTourCategoryAudio, tourCategoryAudios]);

  // Track which category audio is playing to avoid restarting same category
  const currentTourAudioCatRef = useRef<string | null>(null);

  // Start / switch category audio when the current tour item's category changes
  useEffect(() => {
    if (!tourAutoActive || allTourDisplayItems.length === 0) return;
    const displayItem = allTourDisplayItems[tourAutoIndex];
    if (!displayItem) return;
    const catId = displayItem.tourCategory.collectionId;
    if (currentTourAudioCatRef.current === catId) return;
    currentTourAudioCatRef.current = catId;
    playTourCategoryAudio(catId);
  }, [tourAutoActive, tourAutoIndex, allTourDisplayItems, playTourCategoryAudio]);

  // Duck category audio during narration, restore during enter/exit
  useEffect(() => {
    const audio = tourAudioRef.current;
    if (!audio || !tourAutoActive) return;
    audio.volume = narrationEnabled && tourAutoPhase === "narrate" ? 0.08 : 0.25;
  }, [tourAutoActive, tourAutoPhase, narrationEnabled]);

  // Stop category audio when tour ends, restore main bg audio
  useEffect(() => {
    if (!tourAutoActive) {
      stopTourCategoryAudio();
      currentTourAudioCatRef.current = null;
      // Restore main bg audio volume
      const audio = bgAudioRef.current;
      if (audio && !bgMuted) {
        audio.volume = 0.22;
      }
    }
  }, [tourAutoActive, stopTourCategoryAudio, bgMuted]);

  // Duck bg audio during tour auto-display
  // If activated tour tracks exist, main bg stays silent — tour audio is the sole background
  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    if (tourAutoActive) {
      if (hasActiveTourTracks) {
        audio.volume = 0;
      } else {
        audio.volume = narrationEnabled && tourAutoPhase === "narrate" ? 0.06 : 0.18;
      }
    }
  }, [tourAutoActive, tourAutoPhase, hasActiveTourTracks, narrationEnabled]);

  useEffect(() => () => {
    stopPreview();
    stopTourCategoryAudio();
  }, [stopPreview, stopTourCategoryAudio]);

  // Inject keyframe styles
  useEffect(() => { ensureGalleryStyles(); }, []);

  // Entrance animation trigger
  useEffect(() => {
    const t = setTimeout(() => setEntered(true), 100);
    return () => clearTimeout(t);
  }, []);

  // Load the studio scene
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [sharedScene, localScene] = await Promise.all([
        loadSharedSetting<ChamberStudioScene>(STUDIO_SHARED_SETTING_KEY),
        loadUiSetting<ChamberStudioScene>(STUDIO_STORAGE_KEY),
      ]);

      if (cancelled) return;

      const nextScene = isDisplayableStudioScene(sharedScene)
        ? sharedScene
        : isDisplayableStudioScene(localScene)
          ? localScene
          : null;

      if (nextScene) {
        setScene({ ...nextScene, layers: ensureArranged(nextScene.layers) });
      }

      if (!isDisplayableStudioScene(sharedScene) && isDisplayableStudioScene(localScene)) {
        void saveSharedSetting(STUDIO_SHARED_SETTING_KEY, localScene);
      }

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, []);

  // Resolve frame URL
  useEffect(() => {
    if (!scene) return;
    let cancelled = false;
    void resolveMediaRefToObjectUrl(scene.stageFrameRef).then((url) => {
      if (!cancelled && url) setFrameUrl(url);
    });
    return () => { cancelled = true; };
  }, [scene?.stageFrameRef]);

  // Resolve layer preview URLs
  useEffect(() => {
    if (!scene) return;
    let cancelled = false;
    const entries = scene.layers.map((layer) =>
      resolveMediaRefToObjectUrl(layer.sourceRef).then((url) => [layer.id, url || SAMPLE_ARTIFACT] as const),
    );
    void Promise.all(entries).then((pairs) => {
      if (cancelled) return;
      setLayerPreviewMap(Object.fromEntries(pairs));
    });
    return () => { cancelled = true; };
  }, [scene?.layers]);

  // Resolve background audio
  useEffect(() => {
    if (!scene?.backgroundAudioRef) return;
    let cancelled = false;
    void resolveMediaRefToObjectUrl(scene.backgroundAudioRef).then((url) => {
      if (!cancelled && url) setBgAudioUrl(url);
    });
    return () => { cancelled = true; };
  }, [scene?.backgroundAudioRef]);

  // Play background audio
  useEffect(() => {
    if (!bgAudioUrl) return;
    const audio = new Audio(bgAudioUrl);
    audio.loop = true;
    audio.volume = 0.22;
    bgAudioRef.current = audio;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [bgAudioUrl]);

  // Lower background audio when focused overlay is open
  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    audio.volume = focusedLayer ? 0.08 : 0.22;
  }, [focusedLayer]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = galleryRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPointer({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  }, []);

  const bgStyle = useMemo(() => {
    if (!scene) return {};
    const preset = scene.bgGradientPreset;
    if (preset === "custom") return { background: scene.bgColor };
    return { background: BG_GRADIENT_PRESETS[preset] ?? BG_GRADIENT_PRESETS.void };
  }, [scene?.bgColor, scene?.bgGradientPreset]);

  const toggleBgMute = useCallback(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    if (bgMuted) { audio.volume = 0.22; setBgMuted(false); }
    else { audio.volume = 0; setBgMuted(true); }
  }, [bgMuted]);

  const handleClose = useCallback(() => {
    speechSynthesis.cancel();
    setFocusedLayer(null);
  }, []);

  // ── Auto Display Controls ──
  const startAutoDisplay = useCallback(() => {
    if (!scene || scene.layers.length === 0) return;
    setAutoDisplayActive(true);
    setAutoDisplayIndex(0);
    setAutoDisplayPhase("enter");
    autoDisplayMountedRef.current = true;
    // Unmute & start background audio
    const audio = bgAudioRef.current;
    if (audio) {
      audio.volume = 0.18;
      setBgMuted(false);
      audio.play().catch(() => {});
    }
  }, [scene]);

  const stopAutoDisplay = useCallback(() => {
    autoDisplayMountedRef.current = false;
    setAutoDisplayActive(false);
    setAutoDisplayIndex(0);
    setAutoDisplayPhase("enter");
    speechSynthesis.cancel();
    clearTimeout(autoDisplayTimerRef.current);
  }, []);

  const skipAutoDisplayForward = useCallback(() => {
    if (!scene) return;
    speechSynthesis.cancel();
    clearTimeout(autoDisplayTimerRef.current);
    setAutoDisplayPhase("exit");
    autoDisplayTimerRef.current = window.setTimeout(() => {
      if (!autoDisplayMountedRef.current) return;
      setAutoDisplayIndex((prev) => {
        const next = prev + 1;
        if (next >= scene.layers.length) {
          stopAutoDisplay();
          return 0;
        }
        return next;
      });
      setAutoDisplayPhase("enter");
    }, 600);
  }, [scene, stopAutoDisplay]);

  // Auto Display cycling — trigger narration per artifact
  useEffect(() => {
    if (!autoDisplayActive || !scene) return;
    autoDisplayMountedRef.current = true;
    const layer = scene.layers[autoDisplayIndex];
    if (!layer) { stopAutoDisplay(); return; }

    // Enter phase — play reveal sound
    setAutoDisplayPhase("enter");
    playTransitionSound("reveal");

    const enterTimer = window.setTimeout(() => {
      if (!autoDisplayMountedRef.current) return;
      setAutoDisplayPhase("narrate");
      playTransitionSound("chime");

      // Build narration text
      const text = layer.categoryDetail
        ? layer.categoryDetail
        : `This is ${layer.label}, part of the ${scene.exhibitionCategory} collection. ${
            layer.category && layer.category !== "Uncategorised" ? `It belongs to the ${layer.category} category. ` : ""
          }On display at the National Defence College Museum.`;

      speechSynthesis.cancel();

      const advanceToNextLayer = () => {
        if (!autoDisplayMountedRef.current) return;
        autoDisplayTimerRef.current = window.setTimeout(() => {
          if (!autoDisplayMountedRef.current) return;
          setAutoDisplayPhase("exit");
          playTransitionSound("whoosh");
          autoDisplayTimerRef.current = window.setTimeout(() => {
            if (!autoDisplayMountedRef.current) return;
            setAutoDisplayIndex((prev) => {
              const next = prev + 1;
              if (next >= scene.layers.length) {
                stopAutoDisplay();
                return 0;
              }
              return next;
            });
            setAutoDisplayPhase("enter");
          }, 800);
        }, 1500);
      };

      if (!narrationEnabledRef.current) {
        autoDisplayTimerRef.current = window.setTimeout(advanceToNextLayer, 4000);
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        const voice = getPreferredVoice();
        if (voice) utterance.voice = voice;
        utterance.lang = getPreferredLang();
        utterance.rate = 0.85;
        utterance.pitch = 0.95;
        utterance.volume = 0.9;
        autoNarrationRef.current = utterance;

        utterance.onend = () => advanceToNextLayer();

        utterance.onerror = () => {
          if (!autoDisplayMountedRef.current) return;
          autoDisplayTimerRef.current = window.setTimeout(() => {
            if (!autoDisplayMountedRef.current) return;
            setAutoDisplayPhase("exit");
            playTransitionSound("whoosh");
            autoDisplayTimerRef.current = window.setTimeout(() => {
              if (!autoDisplayMountedRef.current) return;
              setAutoDisplayIndex((prev) => {
                const next = prev + 1;
                if (next >= scene.layers.length) { stopAutoDisplay(); return 0; }
                return next;
              });
              setAutoDisplayPhase("enter");
            }, 800);
          }, 5000);
        };

        speechSynthesis.speak(utterance);
      }
    }, 1200);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(autoDisplayTimerRef.current);
      speechSynthesis.cancel();
    };
  }, [autoDisplayActive, autoDisplayIndex, scene, stopAutoDisplay]);

  // Duck background audio during auto-display narration
  useEffect(() => {
    const audio = bgAudioRef.current;
    if (!audio) return;
    if (autoDisplayActive) {
      audio.volume = narrationEnabled && autoDisplayPhase === "narrate" ? 0.06 : 0.18;
    } else if (!focusedLayer) {
      audio.volume = bgMuted ? 0 : 0.22;
    }
  }, [autoDisplayActive, autoDisplayPhase, focusedLayer, bgMuted, narrationEnabled]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-[#060910]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 rounded-full border-2 border-[#d4af37]/30 border-t-[#d4af37] animate-spin" />
          <p className="text-sm text-white/50 animate-pulse">Preparing the exhibit...</p>
        </div>
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 bg-[#060910]">
        <p className="text-sm text-white/40">No active artifact frame to display.</p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-[#d4af37]/20 bg-[#d4af37]/10 px-4 py-2 text-sm font-medium text-[#f4c866] transition hover:bg-[#d4af37]/15"
        >
          <ArrowLeft className="h-4 w-4" />
          Go Back
        </button>
      </div>
    );
  }

  const categories = Array.from(new Set(scene.layers.map((l) => l.category).filter((c) => c && c !== "Uncategorised")));

  return (
    <div className="min-h-screen bg-[#060910] text-white">
      {/* Header */}
      <div
        className="border-b border-white/8 bg-[#090d13]/90 backdrop-blur-sm"
        style={{ animation: entered ? "afg-fade-in-up 0.5s cubic-bezier(0.22,1,0.36,1) both" : "none" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 transition hover:bg-white/[0.08]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
            <div>
              <h1 className="font-serif text-2xl text-white sm:text-3xl">{scene.artifactTitle || "Artefact Gallery"}</h1>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">
                {scene.exhibitionCategory} &middot; {scene.tourAssociation}
                {categories.length > 0 && ` · ${categories.join(", ")}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Auto Display toggle */}
            <button
              type="button"
              onClick={autoDisplayActive ? stopAutoDisplay : startAutoDisplay}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition",
                autoDisplayActive
                  ? "border-[#d4af37]/30 bg-[#d4af37]/15 text-[#f4c866] animate-pulse"
                  : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]",
              )}
            >
              {autoDisplayActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
              {autoDisplayActive ? "Stop Tour" : "Auto Display"}
            </button>
            {bgAudioUrl && (
              <button
                type="button"
                onClick={toggleBgMute}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition",
                  bgMuted
                    ? "border-white/10 bg-white/[0.04] text-white/30"
                    : "border-white/10 bg-white/[0.04] text-white/50",
                )}
              >
                {bgMuted ? <VolumeX className="h-3 w-3" /> : <Volume2 className="h-3 w-3" />}
                Ambient
              </button>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
              <Power className="h-3 w-3" /> Live Gallery
            </span>
          </div>
        </div>
      </div>

      {/* Frame selector strip — always visible at top */}
      <div
        className="border-b border-white/6 bg-[#0a0e14]/80 backdrop-blur-sm"
        style={{ animation: entered ? "afg-fade-in-up 0.4s cubic-bezier(0.22,1,0.36,1) 0.15s both" : "none" }}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6">
          <Frame className="h-4 w-4 shrink-0 text-[#d4af37]/60" />
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Individual Frame:</span>
          <div className="flex gap-1.5 overflow-x-auto pb-0.5">
            {frameOptions.map((option) => (
              <button
                key={option.ref}
                onClick={() => setExhibitionFrameRef(option.ref)}
                title={option.label}
                className={cn(
                  "shrink-0 rounded-lg border p-0.5 transition-all",
                  option.ref === exhibitionFrameRef
                    ? "border-[#d4af37] bg-[#d4af37]/12 ring-1 ring-[#d4af37]/30"
                    : "border-white/8 bg-white/[0.03] hover:border-white/18",
                )}
              >
                <img src={option.url} alt={option.label} className="h-7 w-7 sm:h-9 sm:w-9 object-contain rounded" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Full-screen content */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">

        {/* ── Auto Display Settings (Admin) ── */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowAutoDisplaySettings((p) => !p)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition",
              showAutoDisplaySettings
                ? "border-[#d4af37]/30 bg-[#d4af37]/10 text-[#f4c866]"
                : "border-white/10 bg-white/[0.04] text-white/40 hover:bg-white/[0.07]",
            )}
          >
            <Settings className="h-3.5 w-3.5" />
            Auto Display Settings
          </button>

          {showAutoDisplaySettings && (
            <div
              className="mt-3 rounded-[16px] border border-white/10 bg-[#0c1018] p-5 space-y-4"
              style={{ animation: "afg-fade-in-up 0.3s cubic-bezier(0.22,1,0.36,1) both" }}
            >
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Background Images</p>
                  <span className="rounded-full border border-white/8 bg-white/[0.03] px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.12em] text-white/35">
                    {autoDisplayBgImages.length} saved
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div
                    className="relative h-16 w-28 overflow-hidden rounded-xl border border-white/10 flex items-center justify-center"
                    style={{ background: "#080a10" }}
                  >
                    {autoDisplayBgUrl ? (
                      <img src={autoDisplayBgUrl} alt="Active auto display background" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-white/25 uppercase tracking-wider">No Active Image</span>
                    )}
                    {activeAutoDisplayBg && (
                      <span className="absolute left-1.5 top-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-emerald-300/90">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="min-w-[180px] flex-1">
                    <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/55">
                      {activeAutoDisplayBg?.name ?? "No active auto-display background"}
                    </p>
                    <p className="mt-1 text-[9px] leading-relaxed text-white/25">
                      Choose one saved image below to control what appears behind the auto-display presentation.
                    </p>
                  </div>

                  <input ref={bgFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleBgFileUpload} />
                  <button
                    type="button"
                    onClick={() => bgFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50 transition hover:bg-white/[0.08]"
                  >
                    <ImageIcon className="h-3.5 w-3.5" /> Upload Images
                  </button>
                  <button
                    type="button"
                    onClick={useCurrentFrameAsAutoDisplayBg}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f4c866] transition hover:bg-[#d4af37]/20"
                  >
                    <Frame className="h-3.5 w-3.5" /> Use Current Frame
                  </button>
                  <button
                    type="button"
                    onClick={resetAutoDisplayBg}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#d4af37]/15 bg-[#d4af37]/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f4c866]/70 transition hover:bg-[#d4af37]/15"
                  >
                    Use Default
                  </button>
                  <button
                    type="button"
                    onClick={clearActiveAutoDisplayBg}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/15 bg-red-400/8 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-red-300/70 transition hover:bg-red-400/15"
                  >
                    <Power className="h-3 w-3" /> Deactivate
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Add Image URL</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={bgUrlInput}
                    onChange={(e) => setBgUrlInput(e.target.value)}
                    placeholder="https://example.com/background.webp"
                    className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/70 placeholder-white/20 outline-none focus:border-[#d4af37]/30 focus:ring-1 focus:ring-[#d4af37]/20"
                  />
                  <button
                    type="button"
                    onClick={addAutoDisplayBgFromUrl}
                    className="rounded-lg border border-[#d4af37]/20 bg-[#d4af37]/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#f4c866] transition hover:bg-[#d4af37]/20"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Frame Image Options</p>
                <p className="mb-3 text-[9px] leading-relaxed text-white/25">
                  Every Individual Frame image is available here. Select any one of them to use it as the auto-display background.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {frameOptions.map((option) => {
                    const isActiveBackground = activeAutoDisplayBg?.sourceRef === option.url;
                    const isSelectedFrame = option.ref === exhibitionFrameRef;
                    return (
                      <div
                        key={option.ref}
                        className={cn(
                          "rounded-[14px] border p-3 transition-all",
                          isActiveBackground
                            ? "border-[#d4af37]/25 bg-[#d4af37]/8 shadow-[0_0_0_1px_rgba(212,175,55,0.08)]"
                            : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]",
                        )}
                      >
                        <div className="relative mb-3 h-24 overflow-hidden rounded-xl border border-white/10 bg-[#080a10]">
                          <img src={option.url} alt={option.label} className="h-full w-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                          {isActiveBackground && (
                            <span className="absolute left-2 top-2 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-emerald-300/90">
                              Active Background
                            </span>
                          )}
                          {isSelectedFrame && (
                            <span className="absolute right-2 top-2 rounded-full border border-white/15 bg-black/35 px-2 py-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-white/70">
                              Current Frame
                            </span>
                          )}
                        </div>

                        <div className="mb-3 min-w-0">
                          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">{option.label}</p>
                          <p className="mt-1 text-[9px] leading-relaxed text-white/25">
                            {isActiveBackground
                              ? "This frame image is currently being used in the auto-display background."
                              : "Use this frame image as the auto-display background."}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => activateAutoDisplayBgByUrl(option.url, `${option.label} Frame Background`)}
                          className={cn(
                            "inline-flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] transition",
                            isActiveBackground
                              ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300/80"
                              : "border-white/10 bg-white/[0.04] text-white/45 hover:bg-white/[0.08]",
                          )}
                        >
                          <Frame className="h-3 w-3" /> {isActiveBackground ? "In Use" : "Select As Background"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Saved Backgrounds</p>
                {autoDisplayBgImages.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {autoDisplayBgImages.map((image) => {
                      const isActive = image.active === true;
                      const previewUrl = getResolvedBackgroundPreviewUrl(image);
                      return (
                        <div
                          key={image.id}
                          className={cn(
                            "rounded-[14px] border p-3 transition-all",
                            isActive
                              ? "border-[#d4af37]/25 bg-[#d4af37]/8 shadow-[0_0_0_1px_rgba(212,175,55,0.08)]"
                              : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]",
                          )}
                        >
                          <div className="relative mb-3 h-24 overflow-hidden rounded-xl border border-white/10 bg-[#080a10]">
                            {previewUrl ? (
                              <img src={previewUrl} alt={image.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">
                                Preview loading
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                            {isActive && (
                              <span className="absolute left-2 top-2 rounded-full border border-emerald-400/30 bg-emerald-400/15 px-2 py-0.5 text-[7px] font-bold uppercase tracking-[0.12em] text-emerald-300/90">
                                Active
                              </span>
                            )}
                          </div>

                          <div className="mb-3 min-w-0">
                            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-white/60">{image.name}</p>
                            <p className="mt-1 text-[9px] leading-relaxed text-white/25">
                              {isActive
                                ? "Currently displayed behind the auto-display scenes."
                                : "Available to be used as the auto-display background."}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => activateAutoDisplayBg(image.id)}
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] transition",
                                isActive
                                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300/80"
                                  : "border-white/10 bg-white/[0.04] text-white/45 hover:bg-white/[0.08]",
                              )}
                            >
                              <Power className="h-3 w-3" /> {isActive ? "In Use" : "Activate"}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeAutoDisplayBg(image.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/15 bg-red-400/8 px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-red-300/70 transition hover:bg-red-400/15"
                            >
                              <Trash2 className="h-3 w-3" /> Remove
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[12px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 text-[10px] uppercase tracking-[0.12em] text-white/30">
                    No saved backgrounds yet. Upload JPG, PNG, WEBP, GIF or add a remote image URL.
                  </div>
                )}
              </div>

              <p className="text-[9px] text-white/25 leading-relaxed">
                Upload multiple image types, use the current Individual Frame image, and activate the exact one you want. Only the saved image marked Active will display behind artifacts during auto-display.
              </p>

              {/* ── Narration Toggle ── */}
              <div className="border-t border-white/8 pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {narrationEnabled ? <Volume2 className="h-3.5 w-3.5 text-[#d4af37]/50" /> : <VolumeX className="h-3.5 w-3.5 text-white/25" />}
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50">Narration</p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleNarration}
                    className={cn(
                      "rounded-full px-3 py-1 text-[9px] font-bold uppercase tracking-[0.12em] border transition-all",
                      narrationEnabled
                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400/80 hover:bg-emerald-400/20"
                        : "border-red-400/20 bg-red-400/8 text-red-300/60 hover:bg-red-400/15",
                    )}
                  >
                    {narrationEnabled ? "Enabled" : "Disabled"}
                  </button>
                </div>
                <p className="text-[9px] text-white/25 leading-relaxed mt-2">
                  When disabled, artifacts will display silently during auto-display — no text-to-speech narration. Background music will still play.
                </p>
              </div>

              {/* ── Tour Category Audio Management ── */}
              <div className="border-t border-white/8 pt-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/50 mb-3 flex items-center gap-2">
                  <Music className="h-3.5 w-3.5 text-[#d4af37]/50" /> Tour Category Sounds
                </p>
                <p className="text-[9px] text-white/25 leading-relaxed mb-4">
                  Upload background sounds for each tour category. Uploaded tracks stay off until activated, and only the track marked Active will play during that category's auto-display.
                </p>

                <input ref={tourAudioFileRef} type="file" accept="audio/*" multiple className="hidden" onChange={handleTourAudioUpload} />

                <div className="space-y-3">
                  {TOUR_CATEGORIES.map((tour) => {
                    const tracks = tourCategoryAudios[tour.collectionId] ?? [];
                    const activeCount = tracks.filter((t) => t.active === true).length;
                    const TourIcon = tourIconMap[tour.icon];
                    return (
                      <div key={tour.id} className="rounded-[12px] border border-white/8 bg-white/[0.02] p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full" style={{ background: `${tour.color}20`, border: `1px solid ${tour.color}30` }}>
                              <TourIcon className="h-3 w-3" style={{ color: tour.color }} />
                            </div>
                            <span className="text-[10px] font-semibold text-white/60">{tour.label}</span>
                            <span className="text-[9px] text-white/25">{tracks.length} track{tracks.length !== 1 ? "s" : ""}</span>
                            {activeCount > 0 && activeCount < tracks.length && (
                              <span className="text-[8px] text-emerald-400/50">{activeCount} active</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAudioUploadTarget(tour.collectionId);
                              setTimeout(() => tourAudioFileRef.current?.click(), 50);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/50 transition hover:bg-white/[0.08]"
                          >
                            <Upload className="h-3 w-3" /> Add Sound
                          </button>
                        </div>

                        {tracks.length > 0 && (
                          <div className="space-y-1.5">
                            {tracks.map((track, tIdx) => {
                              const isPreviewing = previewingTrackId === track.id;
                              const isActive = track.active === true;
                              return (
                                <div key={track.id} className={cn(
                                  "flex items-center gap-2 rounded-lg px-2.5 py-2 group transition-all",
                                  isPreviewing ? "bg-white/[0.06] ring-1" : isActive ? "bg-white/[0.03] hover:bg-white/[0.05]" : "bg-white/[0.015] opacity-50",
                                )} style={isPreviewing ? { ringColor: `${tour.color}40` } as React.CSSProperties : undefined}>
                                  {/* Play / Stop preview button */}
                                  <button
                                    type="button"
                                    onClick={() => previewTrack(track)}
                                    className={cn(
                                      "flex h-6 w-6 items-center justify-center rounded-full shrink-0 transition-all",
                                      isPreviewing
                                        ? "scale-110"
                                        : "hover:scale-105",
                                    )}
                                    style={{
                                      background: isPreviewing ? `${tour.color}30` : `${tour.color}15`,
                                      border: `1px solid ${isPreviewing ? tour.color : `${tour.color}40`}`,
                                    }}
                                    title={isPreviewing ? "Stop preview" : "Play preview"}
                                  >
                                    {isPreviewing
                                      ? <Square className="h-2.5 w-2.5" style={{ color: tour.color }} />
                                      : <Play className="h-2.5 w-2.5" style={{ color: `${tour.color}90` }} />
                                    }
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <span className={cn("block truncate text-[10px]", isActive ? "text-white/50" : "text-white/30 line-through")}>{track.name}</span>
                                    {isPreviewing && (
                                      <span className="text-[8px] uppercase tracking-[0.12em] animate-pulse" style={{ color: tour.color }}>Playing...</span>
                                    )}
                                  </div>
                                  {/* Activate / Deactivate toggle */}
                                  <button
                                    type="button"
                                    onClick={() => toggleTourAudioActive(tour.collectionId, track.id)}
                                    className={cn(
                                      "shrink-0 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] border transition-all",
                                      isActive
                                        ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400/80 hover:bg-emerald-400/20"
                                        : "border-white/10 bg-white/[0.03] text-white/25 hover:bg-white/[0.06] hover:text-white/40",
                                    )}
                                      title={isActive ? "Deactivate this category's selected background track" : "Activate this track as the category background sound"}
                                  >
                                    {isActive ? "Active" : "Off"}
                                  </button>
                                  <span className="text-[8px] text-white/20 shrink-0">#{tIdx + 1}</span>
                                  <button
                                    type="button"
                                    onClick={() => removeTourAudio(tour.collectionId, track.id)}
                                    className="shrink-0 rounded p-1 text-red-400/40 transition hover:bg-red-400/10 hover:text-red-400/70"
                                    title="Remove track"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Tour Category Tabs ── */}
        <div
          className="mb-6 rounded-[20px] border border-white/8 bg-[#080a10]/80 p-4 backdrop-blur-sm"
          style={{ animation: entered ? "afg-fade-in-up 0.5s cubic-bezier(0.22,1,0.36,1) 0.18s both" : "none" }}
        >
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">✦ NDC Collection Tours</p>
              <p className="mt-1 text-xs text-white/30">Select a tour category to explore its collection with the cosmic auto-display experience.</p>
            </div>
            {activeTourTab && (
              <button
                type="button"
                onClick={() => { stopTourAutoDisplay(); setActiveTourTab(null); }}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40 transition hover:bg-white/[0.08]"
              >
                <X className="h-3 w-3" /> Close Tour
              </button>
            )}
          </div>

          {/* Tour tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {TOUR_CATEGORIES.map((tour) => {
              const TourIcon = tourIconMap[tour.icon];
              const isActive = activeTourTab === tour.id;
              const items = collectionItemsById[tour.collectionId] ?? [];
              return (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => {
                    if (isActive) { stopTourAutoDisplay(); setActiveTourTab(null); }
                    else { stopTourAutoDisplay(); setActiveTourTab(tour.id); }
                  }}
                  className={cn(
                    "group relative overflow-hidden rounded-[14px] border text-left transition-all duration-300 p-4",
                    isActive
                      ? "ring-1"
                      : "border-white/[0.08] hover:border-white/15",
                  )}
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${tour.color}18, ${tour.color}08, rgba(8,8,14,0.9))`
                      : "rgba(8,8,14,0.6)",
                    borderColor: isActive ? `${tour.color}50` : undefined,
                    ...(isActive ? { boxShadow: `0 0 30px ${tour.color}15, inset 0 1px 0 ${tour.color}20` } : {}),
                    ...(isActive ? { ["--tw-ring-color" as string]: `${tour.color}30` } : {}),
                  }}
                >
                  {/* Mini cosmic bg */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[14px]">
                    {autoDisplayBgUrl && (
                      <img src={autoDisplayBgUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.06 }} draggable={false} />
                    )}
                    {[...Array(8)].map((_, si) => (
                      <div
                        key={si}
                        className="absolute rounded-full bg-white"
                        style={{
                          width: 1 + Math.random() * 1.2,
                          height: 1 + Math.random() * 1.2,
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          opacity: 0.1 + Math.random() * 0.3,
                          animation: `afg-star-twinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 4}s infinite`,
                        }}
                      />
                    ))}
                  </div>

                  {/* Top color line */}
                  <div className="absolute inset-x-0 top-0 h-[2px] transition-opacity" style={{ background: tour.color, opacity: isActive ? 0.8 : 0.2 }} />

                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="flex h-7 w-7 items-center justify-center rounded-full"
                        style={{ background: `${tour.color}20`, border: `1px solid ${tour.color}30` }}
                      >
                        <TourIcon className="h-3.5 w-3.5" style={{ color: tour.color }} />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white/80">{tour.label}</p>
                        <p className="text-[9px] text-white/30">{tour.subtitle}</p>
                      </div>
                    </div>
                    <p className="text-[10px] leading-relaxed text-white/40 line-clamp-2">{tour.description}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/25">{items.length} artefacts</span>
                      {isActive && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[8px] font-bold uppercase tracking-[0.14em]" style={{ background: `${tour.color}20`, color: tour.color }}>
                          <div className="h-1 w-1 rounded-full animate-pulse" style={{ background: tour.color }} />
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* ── Active Tour Collection Grid + Auto Display ── */}
          {activeTourTab && activeTourCategory && activeTourItems.length > 0 && (
            <div
              className="mt-4"
              style={{ animation: "afg-fade-in-up 0.4s cubic-bezier(0.22,1,0.36,1) both" }}
            >
              {/* Tour header bar */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-6 w-[3px] rounded-full" style={{ background: activeTourCategory.color }} />
                  <div>
                    <p className="text-sm font-semibold text-white/80">{activeTourCategory.label}</p>
                    <p className="text-[10px] text-white/30">{activeTourItems.length} artefacts · {activeTourCategory.subtitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={tourAutoActive ? stopTourAutoDisplay : startTourAutoDisplay}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition",
                    tourAutoActive
                      ? "animate-pulse"
                      : "border-white/10 bg-white/[0.04] text-white/50 hover:bg-white/[0.08]",
                  )}
                  style={tourAutoActive ? {
                    borderColor: `${activeTourCategory.color}40`,
                    background: `${activeTourCategory.color}18`,
                    color: activeTourCategory.color,
                  } : undefined}
                >
                  {tourAutoActive ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
                  {tourAutoActive ? "Stop Tour" : "Auto Display"}
                </button>
              </div>

              {/* Cosmic collection grid — same design as studio layers grid */}
              <div
                className="relative overflow-hidden rounded-[16px] border border-white/8 p-3"
                style={{ background: "#050508" }}
              >
                {/* Cosmic animated background */}
                <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[16px]">
                  {autoDisplayBgUrl && (
                    <div className="absolute" style={{ inset: "-20%", animation: "afg-bg-spin 180s linear infinite" }}>
                      <img src={autoDisplayBgUrl} alt="" className="h-full w-full object-cover" style={{ opacity: 0.15 }} draggable={false} />
                    </div>
                  )}
                  <StarField />
                  <div className="absolute" style={{ width: "80%", height: "60%", left: "10%", top: "15%", background: "radial-gradient(ellipse at center, rgba(100,60,180,0.03), transparent 60%)", animation: "afg-nebula-drift 20s ease-in-out infinite" }} />
                  {[0, 1].map((i) => (
                    <div key={`ts-${i}`} className="absolute" style={{ width: `${40 + i * 30}px`, height: 1, left: `${10 + i * 40}%`, top: `${20 + i * 35}%`, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), rgba(212,175,55,0.2), transparent)", borderRadius: 2, animation: `afg-shooting-star ${4 + i * 3}s ease-in ${i * 6}s infinite`, transform: `rotate(${20 + i * 10}deg)` }} />
                  ))}
                  <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(5,5,8,0.4), rgba(5,5,8,0.7) 80%)" }} />
                </div>

                {/* Tour items grid */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {activeTourItems.map((item, i) => (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-[14px] border border-white/[0.08] text-left transition-all duration-300 hover:border-white/15 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
                      style={{
                        background: "rgba(8,8,14,0.7)",
                        backdropFilter: "blur(8px)",
                        animation: entered ? `afg-fade-in-up 0.5s cubic-bezier(0.22,1,0.36,1) ${0.1 + i * 0.06}s both` : "none",
                      }}
                    >
                      {/* Mini cosmic bg inside each card */}
                      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[14px]">
                        {autoDisplayBgUrl && (
                          <img src={autoDisplayBgUrl} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.08 }} draggable={false} />
                        )}
                        {[...Array(12)].map((_, si) => (
                          <div key={si} className="absolute rounded-full bg-white" style={{ width: 1 + Math.random() * 1.5, height: 1 + Math.random() * 1.5, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, opacity: 0.15 + Math.random() * 0.4, animation: `afg-star-twinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 4}s infinite` }} />
                        ))}
                        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(100,60,180,0.04), transparent 60%)" }} />
                      </div>

                      {/* Top shimmer */}
                      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity z-10" />
                      {/* Tour color accent line */}
                      <div className="absolute inset-x-0 top-0 h-[2px] z-10" style={{ background: `linear-gradient(90deg, transparent, ${activeTourCategory.color}60, transparent)`, opacity: 0.4 }} />

                      <div className="relative z-10 p-3">
                        <MuseumObjectViewer
                          title={item.name}
                          mediaSources={item.imageUrl ? [item.imageUrl] : (item.mediaUrls ?? [])}
                          isLightMode={false}
                          compact
                          frameOverride={exhibitionFrameUrl}
                          topLabel={activeTourCategory.label}
                          footerLabel={item.tag}
                          loading="lazy"
                          emptyLabel="Image pending"
                        />
                      </div>

                      <div className="relative z-10 px-4 pb-3">
                        <h4 className="text-sm font-semibold leading-tight truncate text-[#f8f3e8]">{item.name}</h4>
                        <p className="mt-1 text-[10px] leading-relaxed text-white/40 line-clamp-2">{item.description}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {item.tag && (
                            <span className="rounded-full border border-[#d4af37]/15 bg-[#d4af37]/[0.06] px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#d8bf76]">
                              {item.tag}
                            </span>
                          )}
                          {item.era && (
                            <span className="text-[9px] text-white/30">{item.era}</span>
                          )}
                          {item.location && (
                            <span className="inline-flex items-center gap-1 text-[9px] text-white/25">
                              <MapPin className="h-2.5 w-2.5" /> {item.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Artefact collection — cosmic exhibition with animated background */}
        <div
          className="relative overflow-hidden rounded-[20px] border border-white/10 p-4"
          style={{
            background: "#050508",
            animation: entered ? "afg-fade-in-up 0.6s cubic-bezier(0.22,1,0.36,1) 0.2s both" : "none",
          }}
        >
          {/* ── Cosmic animated background for the collection ── */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[20px]">
            {/* Spinning bg image */}
            {autoDisplayBgUrl && (
              <div
                className="absolute"
                style={{
                  inset: "-20%",
                  animation: "afg-bg-spin 180s linear infinite",
                }}
              >
                <img src={autoDisplayBgUrl} alt="" className="h-full w-full object-cover" style={{ opacity: 0.18 }} draggable={false} />
              </div>
            )}
            {/* Star field overlay */}
            <StarField />
            {/* Subtle nebula haze */}
            <div
              className="absolute"
              style={{
                width: "80%", height: "60%", left: "10%", top: "15%",
                background: "radial-gradient(ellipse at center, rgba(100,60,180,0.03), transparent 60%)",
                animation: "afg-nebula-drift 20s ease-in-out infinite",
              }}
            />
            {/* Shooting star accents */}
            {[0, 1].map((i) => (
              <div
                key={`gs-${i}`}
                className="absolute"
                style={{
                  width: `${40 + i * 30}px`,
                  height: 1,
                  left: `${10 + i * 40}%`,
                  top: `${20 + i * 35}%`,
                  background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), rgba(212,175,55,0.2), transparent)",
                  borderRadius: 2,
                  animation: `afg-shooting-star ${4 + i * 3}s ease-in ${i * 6}s infinite`,
                  transform: `rotate(${20 + i * 10}deg)`,
                }}
              />
            ))}
            {/* Dark overlay so text stays readable */}
            <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, rgba(5,5,8,0.4), rgba(5,5,8,0.7) 80%)" }} />
          </div>

          {/* Header — on top of cosmic bg */}
          <div className="relative z-10 flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">✦ Cosmic Collection</p>
              <p className="mt-1 text-xs text-white/30">{scene.layers.length} artefacts in this exhibit. Click any to hear its story.</p>
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/50"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Grid of artifacts — each box has mini cosmic interior */}
          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {scene.layers.map((layer, i) => {
              const previewUrl = layerPreviewMap[layer.id] ?? SAMPLE_ARTIFACT;
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setFocusedLayer(layer)}
                  className={cn(
                    "group relative overflow-hidden rounded-[16px] border text-left transition-all duration-300 cursor-pointer",
                    focusedLayer?.id === layer.id
                      ? "border-[#d4af37]/30 ring-1 ring-[#d4af37]/20"
                      : "border-white/[0.08] hover:border-[#d4af37]/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.5)]",
                  )}
                  style={{
                    background: "rgba(8,8,14,0.7)",
                    backdropFilter: "blur(8px)",
                    animation: entered ? `afg-fade-in-up 0.5s cubic-bezier(0.22,1,0.36,1) ${0.3 + i * 0.06}s both` : "none",
                  }}
                >
                  {/* Mini cosmic background inside each artifact box */}
                  <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[16px]">
                    {autoDisplayBgUrl && (
                      <img
                        src={autoDisplayBgUrl}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                        style={{ opacity: 0.08 }}
                        draggable={false}
                      />
                    )}
                    {/* Mini twinkling dots */}
                    {[...Array(12)].map((_, si) => (
                      <div
                        key={si}
                        className="absolute rounded-full bg-white"
                        style={{
                          width: 1 + Math.random() * 1.5,
                          height: 1 + Math.random() * 1.5,
                          left: `${Math.random() * 100}%`,
                          top: `${Math.random() * 100}%`,
                          opacity: 0.15 + Math.random() * 0.4,
                          animation: `afg-star-twinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 4}s infinite`,
                        }}
                      />
                    ))}
                    {/* Subtle inner glow */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: "radial-gradient(ellipse at 50% 30%, rgba(100,60,180,0.04), transparent 60%)",
                      }}
                    />
                  </div>

                  {/* Top shimmer line */}
                  <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/40 to-transparent opacity-50 group-hover:opacity-100 transition-opacity z-10" />

                  <div className="relative z-10 p-3">
                    <MuseumObjectViewer
                      title={layer.label}
                      mediaSources={[previewUrl]}
                      isLightMode={false}
                      compact
                      frameOverride={exhibitionFrameUrl}
                      topLabel={scene.tourAssociation || layer.category || "Exhibition Frame"}
                      footerLabel={layer.category !== "Uncategorised" ? layer.category : undefined}
                      loading="lazy"
                      emptyLabel="Image pending"
                    />
                  </div>

                  <div className="relative z-10 px-4 pb-3">
                    <h4 className="text-sm font-semibold leading-tight truncate text-[#f8f3e8]">{layer.label}</h4>
                    <div className="mt-2 flex items-center gap-2">
                      {layer.category && layer.category !== "Uncategorised" && (
                        <span className="rounded-full border border-[#d4af37]/15 bg-[#d4af37]/[0.06] px-2.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#d8bf76]">
                          {layer.category}
                        </span>
                      )}
                      {layer.audioRef && (
                        <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400/60">
                          <Volume2 className="h-2.5 w-2.5" /> Audio
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Full-screen Glass Case Display */}
        <div
          ref={galleryRef}
          className="mt-6 relative aspect-[16/10] w-full overflow-hidden rounded-[24px] border border-white/10 shadow-[0_32px_120px_rgba(0,0,0,0.6)]"
          style={{
            ...bgStyle,
            opacity: entered ? scene.bgOpacity / 100 : 0,
            transition: "opacity 1.2s cubic-bezier(0.22,1,0.36,1)",
          }}
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setPointer({ x: 50, y: 18 })}
        >
          {/* Frame image */}
          <img src={frameUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-55" />

          {/* Lighting */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle at ${pointer.x}% ${pointer.y}%, rgba(255,255,255,${displayParams.specularIntensity / 380}), transparent 18%), linear-gradient(180deg, rgba(255,245,214,${scene.beamStrength / 240}) 0%, transparent 30%), linear-gradient(90deg, rgba(140,172,194,${scene.glassTint / 860}) 0%, transparent 18%, transparent 82%, rgba(140,172,194,${scene.glassTint / 860}) 100%)`,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 12%, rgba(255,246,220,${scene.ambientLight / 205}) 0%, transparent 36%), radial-gradient(circle at 50% 88%, rgba(255,210,120,${scene.floorGlow / 260}) 0%, transparent 26%)`,
            }}
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background: `linear-gradient(180deg, rgba(0,0,0,0.08) 0%, rgba(0,0,0,${scene.haze / 240}) 58%, rgba(0,0,0,${displayParams.vignette / 120}) 100%)`,
              boxShadow: `inset 0 0 ${30 + scene.haze}px rgba(7,11,17,${0.22 + scene.haze / 180})`,
            }}
          />

          {/* Dust particles */}
          <DustParticles />

          {/* Artifacts */}
          <div
            className="absolute"
            style={{
              left: `${STAGE_REGION.left}%`,
              top: `${STAGE_REGION.top}%`,
              width: `${STAGE_REGION.width}%`,
              height: `${STAGE_REGION.height}%`,
              perspective: `${displayParams.perspective}px`,
              transformStyle: "preserve-3d",
            }}
          >
            {scene.layers.map((layer, index) => {
              const previewUrl = layerPreviewMap[layer.id] ?? SAMPLE_ARTIFACT;
              const scaledWidth = layer.scale * (1 - displayParams.objectInset / 175);
              const shadowAlpha = Math.min(0.88, (displayParams.shadowOpacity + layer.shadow) / 180);
              const appearanceFilter = [
                `brightness(${layer.brightness / 100})`,
                `contrast(${layer.contrast / 100})`,
                `saturate(${layer.saturate / 100})`,
                layer.hueRotate !== 0 ? `hue-rotate(${layer.hueRotate}deg)` : "",
                layer.grayscale > 0 ? `grayscale(${layer.grayscale / 100})` : "",
                layer.sepia > 0 ? `sepia(${layer.sepia / 100})` : "",
              ].filter(Boolean).join(" ");
              const bgFadeMask = layer.bgFade > 0
                ? `radial-gradient(ellipse at center, black ${Math.max(0, 100 - layer.bgFade * 1.2)}%, transparent 100%)`
                : undefined;

              // Each artifact gets a slightly different float delay for organic feel
              const floatDuration = 5 + (index % 4) * 0.8;
              const floatDelay = (index * 0.6) % 4;
              const entranceDelay = 0.3 + index * 0.12;

              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setFocusedLayer(layer)}
                  className="absolute cursor-pointer group"
                  style={{
                    left: `${50 + layer.x}%`,
                    top: `${50 + layer.y}%`,
                    width: `${scaledWidth}%`,
                    opacity: entered ? layer.opacity / 100 : 0,
                    zIndex: 200 + index * 10 + Math.round(layer.depth),
                    transform: `translate(-50%, -50%) translateZ(${displayParams.depthZ + layer.depth}px) rotate(${layer.rotation}deg)`,
                    filter: `blur(${layer.blur}px) drop-shadow(0 ${6 + displayParams.shadowBlur * 0.6}px ${18 + displayParams.shadowBlur * 2}px rgba(0,0,0,${shadowAlpha})) drop-shadow(0 0 ${layer.glow * 0.36}px rgba(255,214,140,${layer.glow / 320}))`,
                    mixBlendMode: (layer.mixBlend || "normal") as React.CSSProperties["mixBlendMode"],
                    animation: entered
                      ? `afg-fade-in-up 0.8s cubic-bezier(0.22,1,0.36,1) ${entranceDelay}s both, afg-float ${floatDuration}s ease-in-out ${floatDelay}s infinite`
                      : "none",
                    transition: "filter 0.4s, opacity 0.4s",
                  }}
                >
                  <img
                    src={previewUrl}
                    alt={layer.label}
                    className="pointer-events-none h-auto w-full object-contain transition-transform duration-500 group-hover:scale-105"
                    draggable={false}
                    style={{
                      filter: appearanceFilter,
                      ...(bgFadeMask ? { WebkitMaskImage: bgFadeMask, maskImage: bgFadeMask } : {}),
                    }}
                  />
                  {/* Hover glow ring */}
                  <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-[#d4af37]/0 group-hover:border-[#d4af37]/30 transition-all duration-500 group-hover:shadow-[0_0_24px_rgba(212,175,55,0.15)]" />
                  <p className="pointer-events-none mt-1 truncate text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-white/40 group-hover:text-white/80 transition-colors duration-300">
                    {layer.label}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Corner labels */}
          <div className="absolute bottom-4 left-5 text-[9px] uppercase tracking-[0.18em] text-white/25">
            {scene.artifactTitle}
          </div>
          <div className="absolute bottom-4 right-5 flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-white/25">
            <span>{scene.layers.length} artefact{scene.layers.length !== 1 ? "s" : ""}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Cinematic focused artifact overlay */}
      {focusedLayer && !autoDisplayActive && (
        <CinematicOverlay
          layer={focusedLayer}
          imageUrl={layerPreviewMap[focusedLayer.id] ?? SAMPLE_ARTIFACT}
          scene={scene}
          onClose={handleClose}
        />
      )}

      {/* ── Auto Display Cinematic Overlay ── */}
      {autoDisplayActive && scene.layers[autoDisplayIndex] && (() => {
        const layer = scene.layers[autoDisplayIndex];
        const previewUrl = layerPreviewMap[layer.id] ?? SAMPLE_ARTIFACT;
        const storyText = layer.categoryDetail
          ? layer.categoryDetail
          : [
              `This is ${layer.label}`,
              scene.tourAssociation ? `, featured in the ${scene.tourAssociation}` : "",
              scene.exhibitionCategory ? ` under the ${scene.exhibitionCategory} exhibition` : "",
              layer.category && layer.category !== "Uncategorised" ? `. Classified as ${layer.category}` : "",
              ". On display at the National Defence College Museum.",
            ].join("");

        const phaseOpacity = autoDisplayPhase === "exit" ? 0 : 1;
        const phaseScale = autoDisplayPhase === "enter" ? 0.96 : autoDisplayPhase === "exit" ? 1.02 : 1;
        const phaseBlur = autoDisplayPhase === "enter" ? 8 : autoDisplayPhase === "exit" ? 6 : 0;

        return (
          <div
            className="fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden"
            style={{
              background: "#000",
            }}
          >
            {/* ── Background Image Layer — slow spinning cosmic bg ── */}
            {autoDisplayBgUrl && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div
                  className="absolute"
                  style={{
                    inset: "-15%",
                    animation: "afg-bg-spin 120s linear infinite",
                  }}
                >
                  <img
                    src={autoDisplayBgUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ opacity: 0.5 }}
                    draggable={false}
                  />
                </div>
                {/* Breathing overlay for cosmic pulse */}
                <div
                  className="absolute"
                  style={{
                    inset: "-20%",
                    background: `radial-gradient(ellipse at center, transparent 15%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.9))`,
                    animation: "afg-bg-breathe 8s ease-in-out infinite",
                  }}
                />
                {/* Dark vignette on top */}
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 10%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.8))" }} />
              </div>
            )}

            {/* ── Space / Heaven Ambient Layer ── */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              {/* Star field */}
              <StarField />

              {/* Very subtle warm nebula hints */}
              <div
                className="absolute"
                style={{
                  width: "70vw", height: "60vh", left: "-5%", top: "0%",
                  background: "radial-gradient(ellipse at 40% 30%, rgba(212,175,55,0.02), transparent 60%)",
                  animation: "afg-nebula-drift 24s ease-in-out infinite",
                }}
              />
              <div
                className="absolute"
                style={{
                  width: "50vw", height: "40vh", right: "-5%", bottom: "5%",
                  background: "radial-gradient(ellipse at 60% 70%, rgba(255,220,150,0.015), transparent 55%)",
                  animation: "afg-nebula-drift 20s ease-in-out 4s infinite reverse",
                }}
              />

              {/* Warp lines */}
              {[...Array(6)].map((_, i) => (
                <div
                  key={`warp-${i}`}
                  className="absolute"
                  style={{
                    width: 1,
                    height: `${30 + i * 12}vh`,
                    left: `${10 + i * 15}%`,
                    top: `${5 + (i % 3) * 10}%`,
                    background: `linear-gradient(180deg, transparent, rgba(212,175,55,${0.03 + i * 0.005}), transparent)`,
                    animation: `afg-warp-line ${5 + i * 1.5}s ease-in-out ${i * 0.8}s infinite`,
                    transform: `rotate(${-8 + i * 3}deg)`,
                  }}
                />
              ))}

              {/* Subtle orbit ring */}
              <div
                className="absolute rounded-full border"
                style={{
                  width: "40vw", height: "40vw", left: "-8vw", top: "-8vw",
                  borderColor: "rgba(255,255,255,0.02)",
                  animation: "afg-orbit-glow 16s ease-in-out infinite",
                }}
              />

              {/* Shooting stars */}
              {[...Array(3)].map((_, i) => (
                <div
                  key={`shoot-${i}`}
                  className="absolute"
                  style={{
                    width: `${50 + i * 20}px`,
                    height: 1,
                    left: `${5 + i * 25}%`,
                    top: `${10 + i * 18}%`,
                    background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.6), rgba(212,175,55,0.3), transparent)`,
                    borderRadius: 2,
                    animation: `afg-shooting-star ${3 + i * 2}s ease-in ${i * 5}s infinite`,
                    transform: `rotate(${25 + i * 5}deg)`,
                  }}
                />
              ))}

              {/* Expanding pulse rings */}
              {[0, 1].map((i) => (
                <div
                  key={`ring-${i}`}
                  className="absolute rounded-full border border-white/10"
                  style={{
                    width: 120,
                    height: 120,
                    left: i === 0 ? "25%" : "70%",
                    top: i === 0 ? "60%" : "20%",
                    animation: `afg-ring-expand ${6 + i * 2}s ease-out ${i * 3}s infinite`,
                  }}
                />
              ))}
            </div>

            {/* Progress bar — cosmic trail */}
            <div className="absolute top-0 left-0 right-0 h-[2px] z-20">
              <div
                className="h-full transition-all duration-700 ease-out"
                style={{
                  width: `${((autoDisplayIndex + 1) / scene.layers.length) * 100}%`,
                  background: "linear-gradient(90deg, rgba(100,60,180,0.6), #d4af37, rgba(140,180,255,0.8))",
                  boxShadow: "0 0 12px rgba(212,175,55,0.4), 0 0 30px rgba(100,60,180,0.2)",
                }}
              />
            </div>

            {/* Top controls */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]"
                  style={{
                    border: "1px solid rgba(100,60,180,0.3)",
                    background: "linear-gradient(135deg, rgba(100,60,180,0.15), rgba(212,175,55,0.1))",
                    color: "#e0d0a0",
                    boxShadow: "0 0 12px rgba(100,60,180,0.1)",
                  }}
                >
                  ✦ Cosmic Tour &middot; {autoDisplayIndex + 1} / {scene.layers.length}
                </span>
                {narrationEnabled && autoDisplayPhase === "narrate" && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-[2px] rounded-full"
                          style={{
                            height: 6 + Math.random() * 8,
                            background: `linear-gradient(180deg, rgba(100,60,180,0.8), rgba(212,175,55,0.6))`,
                            animation: `afg-float ${0.4 + i * 0.1}s ease-in-out infinite alternate`,
                            animationDelay: `${i * 0.08}s`,
                          }}
                        />
                      ))}
                    </div>
                    <span className="text-[9px] uppercase tracking-[0.14em] text-[#c0a0ff]/50">Narrating</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={skipAutoDisplayForward}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition"
                  style={{
                    border: "1px solid rgba(140,180,255,0.15)",
                    background: "rgba(140,180,255,0.06)",
                    color: "rgba(200,210,255,0.6)",
                  }}
                >
                  <SkipForward className="h-3 w-3" /> Skip
                </button>
                <button
                  type="button"
                  onClick={stopAutoDisplay}
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition"
                  style={{
                    border: "1px solid rgba(140,180,255,0.15)",
                    background: "rgba(140,180,255,0.06)",
                    color: "rgba(200,210,255,0.6)",
                  }}
                >
                  <X className="h-3 w-3" /> End Tour
                </button>
              </div>
            </div>

            {/* Main content — artifact + narration */}
            <div
              className="relative z-10 mx-4 flex w-full max-w-5xl flex-col gap-6 px-2 pt-14 pb-8 lg:flex-row lg:items-center lg:gap-10 lg:pt-0 lg:pb-0"
              style={{
                opacity: phaseOpacity,
                transform: `scale(${phaseScale})`,
                filter: `blur(${phaseBlur}px)`,
                transition: "opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1), filter 0.8s cubic-bezier(0.22,1,0.36,1)",
              }}
            >
              {/* Image — inside exhibition frame, compact size */}
              <div className="flex-shrink-0 lg:w-[40%] flex items-center justify-center">
                <div
                  className="relative overflow-hidden rounded-[20px] w-full max-w-[360px]"
                  style={{
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "radial-gradient(ellipse at center, rgba(15,15,20,0.9), rgba(5,5,8,0.97))",
                    boxShadow: "0 0 60px rgba(0,0,0,0.7), 0 30px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)",
                  }}
                >
                  <div className="relative z-10 p-3">
                    <MuseumObjectViewer
                      title={layer.label}
                      mediaSources={[previewUrl]}
                      isLightMode={false}
                      compact
                      frameOverride={exhibitionFrameUrl}
                      topLabel={scene.tourAssociation || "In Focus"}
                      footerLabel={layer.category !== "Uncategorised" ? layer.category : undefined}
                      emptyLabel="Image pending"
                    />
                  </div>
                  {/* Cosmic shimmer edges */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-[2px]"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(100,60,180,0.5), rgba(212,175,55,0.4), transparent)",
                      backgroundSize: "200% 100%",
                      animation: "afg-shimmer 3s linear infinite",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px]"
                    style={{
                      background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.3), rgba(100,60,180,0.4), transparent)",
                      backgroundSize: "200% 100%",
                      animation: "afg-shimmer 4s linear infinite reverse",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-y-0 left-0 w-[2px]"
                    style={{
                      background: "linear-gradient(180deg, transparent, rgba(212,175,55,0.2), transparent)",
                      backgroundSize: "100% 200%",
                      animation: "afg-shimmer 3.5s linear infinite",
                    }}
                  />
                  <div
                    className="pointer-events-none absolute inset-y-0 right-0 w-[2px]"
                    style={{
                      background: "linear-gradient(180deg, transparent, rgba(100,60,180,0.3), transparent)",
                      backgroundSize: "100% 200%",
                      animation: "afg-shimmer 4s linear infinite",
                    }}
                  />
                </div>
              </div>

              {/* Narration */}
              <div className="flex-1 min-w-0">
                {/* Tour association badge */}
                {scene.tourAssociation && (
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300/70">{scene.tourAssociation}</span>
                  </div>
                )}
                <p
                  className="text-[10px] font-bold uppercase tracking-[0.24em]"
                  style={{ color: "rgba(160,140,255,0.7)" }}
                >
                  {layer.category && layer.category !== "Uncategorised" ? layer.category : "Artefact In Focus"}
                </p>
                <h2
                  className="mt-3 font-serif text-3xl font-semibold sm:text-4xl leading-tight"
                  style={{
                    background: "linear-gradient(135deg, #ffffff, #e0d0a0, #c0a0ff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {layer.label}
                </h2>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  {layer.category && layer.category !== "Uncategorised" && (
                    <span
                      className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                      style={{
                        border: "1px solid rgba(100,60,180,0.2)",
                        background: "rgba(100,60,180,0.1)",
                        color: "#c0a0ff",
                      }}
                    >
                      {layer.category}
                    </span>
                  )}
                  <span className="text-[10px] uppercase tracking-[0.14em] text-white/30">
                    {scene.exhibitionCategory} &middot; {scene.tourAssociation}
                  </span>
                </div>

                <div
                  className="mt-5 h-[1px]"
                  style={{
                    background: "linear-gradient(90deg, rgba(100,60,180,0.3), rgba(212,175,55,0.15), transparent)",
                  }}
                />

                <div className="mt-5 min-h-[80px]">
                  <p className="text-base leading-8 text-white/75 sm:text-lg sm:leading-9 font-light">
                    {storyText}
                  </p>
                </div>

                {/* Artifact counter — constellation dots */}
                <div className="mt-6 flex items-center gap-1.5">
                  {scene.layers.map((_, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        "rounded-full transition-all duration-500",
                        idx === autoDisplayIndex
                          ? "h-2 w-7"
                          : "h-1.5 w-1.5",
                      )}
                      style={
                        idx === autoDisplayIndex
                          ? {
                              background: "linear-gradient(90deg, #8c5cf5, #d4af37)",
                              boxShadow: "0 0 8px rgba(140,92,245,0.4)",
                            }
                          : idx < autoDisplayIndex
                            ? { background: "rgba(140,92,245,0.3)" }
                            : { background: "rgba(255,255,255,0.12)" }
                      }
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom gradient — deep dark fade */}
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-40"
              style={{
                background: "linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0.5) 40%, transparent)",
              }}
            />
            {/* Top vignette */}
            <div
              className="pointer-events-none absolute top-0 left-0 right-0 h-32"
              style={{
                background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)",
              }}
            />
          </div>
        );
      })()}

      {/* ── Tour Auto Display Cinematic Overlay ── */}
      {tourAutoActive && allTourDisplayItems[tourAutoIndex] && (() => {
        const displayItem = allTourDisplayItems[tourAutoIndex];
        const item = displayItem;
        const currentTour = displayItem.tourCategory;
        const mediaSrc = item.imageUrl ? [item.imageUrl] : (item.mediaUrls ?? []);
        const storyText = [
          item.name,
          ". ",
          item.description,
          item.era ? ` Era: ${item.era}.` : "",
          item.location ? ` Located at ${item.location}.` : "",
          ` Part of the ${currentTour.label} at the National Defence College Museum.`,
        ].join("");
        const tourColor = currentTour.color;

        const phaseOpacity = tourAutoPhase === "exit" ? 0 : 1;
        const phaseScale = tourAutoPhase === "enter" ? 0.96 : tourAutoPhase === "exit" ? 1.02 : 1;
        const phaseBlur = tourAutoPhase === "enter" ? 8 : tourAutoPhase === "exit" ? 6 : 0;

        return (
          <div className="fixed inset-0 z-[9998] flex items-center justify-center overflow-hidden" style={{ background: "#000" }}>
            {/* Spinning cosmic bg */}
            {autoDisplayBgUrl && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute" style={{ inset: "-15%", animation: "afg-bg-spin 120s linear infinite" }}>
                  <img src={autoDisplayBgUrl} alt="" className="h-full w-full object-cover" style={{ opacity: 0.5 }} draggable={false} />
                </div>
                <div className="absolute" style={{ inset: "-20%", background: "radial-gradient(ellipse at center, transparent 15%, rgba(0,0,0,0.55) 55%, rgba(0,0,0,0.9))", animation: "afg-bg-breathe 8s ease-in-out infinite" }} />
                <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 10%, rgba(0,0,0,0.5) 60%, rgba(0,0,0,0.8))" }} />
              </div>
            )}

            {/* Space ambient layer */}
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <StarField />
              <div className="absolute" style={{ width: "70vw", height: "60vh", left: "-5%", top: "0%", background: "radial-gradient(ellipse at 40% 30%, rgba(212,175,55,0.02), transparent 60%)", animation: "afg-nebula-drift 24s ease-in-out infinite" }} />
              <div className="absolute" style={{ width: "50vw", height: "40vh", right: "-5%", bottom: "5%", background: "radial-gradient(ellipse at 60% 70%, rgba(255,220,150,0.015), transparent 55%)", animation: "afg-nebula-drift 20s ease-in-out 4s infinite reverse" }} />
              {[...Array(6)].map((_, i) => (
                <div key={`tw-${i}`} className="absolute" style={{ width: 1, height: `${30 + i * 12}vh`, left: `${10 + i * 15}%`, top: `${5 + (i % 3) * 10}%`, background: `linear-gradient(180deg, transparent, rgba(212,175,55,${0.03 + i * 0.005}), transparent)`, animation: `afg-warp-line ${5 + i * 1.5}s ease-in-out ${i * 0.8}s infinite`, transform: `rotate(${-8 + i * 3}deg)` }} />
              ))}
              <div className="absolute rounded-full border" style={{ width: "40vw", height: "40vw", left: "-8vw", top: "-8vw", borderColor: "rgba(255,255,255,0.02)", animation: "afg-orbit-glow 16s ease-in-out infinite" }} />
              {[...Array(3)].map((_, i) => (
                <div key={`tshoot-${i}`} className="absolute" style={{ width: `${50 + i * 20}px`, height: 1, left: `${5 + i * 25}%`, top: `${10 + i * 18}%`, background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.6), rgba(212,175,55,0.3), transparent)", borderRadius: 2, animation: `afg-shooting-star ${3 + i * 2}s ease-in ${i * 5}s infinite`, transform: `rotate(${25 + i * 5}deg)` }} />
              ))}
              {[0, 1].map((i) => (
                <div key={`tring-${i}`} className="absolute rounded-full border border-white/10" style={{ width: 120, height: 120, left: i === 0 ? "25%" : "70%", top: i === 0 ? "60%" : "20%", animation: `afg-ring-expand ${6 + i * 2}s ease-out ${i * 3}s infinite` }} />
              ))}
            </div>

            {/* Progress bar */}
            <div className="absolute top-0 left-0 right-0 h-[2px] z-20">
              <div className="h-full transition-all duration-700 ease-out" style={{ width: `${((tourAutoIndex + 1) / allTourDisplayItems.length) * 100}%`, background: `linear-gradient(90deg, ${tourColor}99, #d4af37, ${tourColor}cc)`, boxShadow: `0 0 12px ${tourColor}66, 0 0 30px rgba(212,175,55,0.2)` }} />
            </div>

            {/* Top controls */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ border: `1px solid ${tourColor}40`, background: `linear-gradient(135deg, ${tourColor}20, rgba(212,175,55,0.1))`, color: "#e0d0a0", boxShadow: `0 0 12px ${tourColor}15` }}>
                  ✦ {currentTour.label} &middot; {tourAutoIndex + 1} / {allTourDisplayItems.length}
                </span>
                {narrationEnabled && tourAutoPhase === "narrate" && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex gap-0.5">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <div key={i} className="w-[2px] rounded-full" style={{ height: 6 + Math.random() * 8, background: `linear-gradient(180deg, ${tourColor}cc, rgba(212,175,55,0.6))`, animation: `afg-float ${0.4 + i * 0.1}s ease-in-out infinite alternate`, animationDelay: `${i * 0.08}s` }} />
                      ))}
                    </div>
                    <span className="text-[9px] uppercase tracking-[0.14em]" style={{ color: `${tourColor}80` }}>Narrating</span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={skipTourAutoForward} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition" style={{ border: "1px solid rgba(140,180,255,0.15)", background: "rgba(140,180,255,0.06)", color: "rgba(200,210,255,0.6)" }}>
                  <SkipForward className="h-3 w-3" /> Skip
                </button>
                <button type="button" onClick={stopTourAutoDisplay} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition" style={{ border: "1px solid rgba(140,180,255,0.15)", background: "rgba(140,180,255,0.06)", color: "rgba(200,210,255,0.6)" }}>
                  <X className="h-3 w-3" /> End Tour
                </button>
              </div>
            </div>

            {/* Main content */}
            <div className="relative z-10 mx-4 flex w-full max-w-5xl flex-col gap-6 px-2 pt-14 pb-8 lg:flex-row lg:items-center lg:gap-10 lg:pt-0 lg:pb-0" style={{ opacity: phaseOpacity, transform: `scale(${phaseScale})`, filter: `blur(${phaseBlur}px)`, transition: "opacity 0.8s cubic-bezier(0.22,1,0.36,1), transform 0.8s cubic-bezier(0.22,1,0.36,1), filter 0.8s cubic-bezier(0.22,1,0.36,1)" }}>
              {/* Image */}
              <div className="flex-shrink-0 lg:w-[40%] flex items-center justify-center">
                <div className="relative overflow-hidden rounded-[20px] w-full max-w-[360px]" style={{ border: "1px solid rgba(255,255,255,0.12)", background: "radial-gradient(ellipse at center, rgba(15,15,20,0.9), rgba(5,5,8,0.97))", boxShadow: "0 0 60px rgba(0,0,0,0.7), 0 30px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)" }}>
                  <div className="relative z-10 p-3">
                    <MuseumObjectViewer
                      title={item.name}
                      mediaSources={mediaSrc}
                      isLightMode={false}
                      compact
                      frameOverride={exhibitionFrameUrl}
                      topLabel={currentTour.label}
                      footerLabel={item.tag}
                      emptyLabel="Image pending"
                    />
                  </div>
                  {/* Cosmic shimmer edges */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, ${tourColor}80, rgba(212,175,55,0.4), transparent)`, backgroundSize: "200% 100%", animation: "afg-shimmer 3s linear infinite" }} />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px]" style={{ background: `linear-gradient(90deg, transparent, rgba(212,175,55,0.3), ${tourColor}60, transparent)`, backgroundSize: "200% 100%", animation: "afg-shimmer 4s linear infinite reverse" }} />
                  <div className="pointer-events-none absolute inset-y-0 left-0 w-[2px]" style={{ background: `linear-gradient(180deg, transparent, ${tourColor}40, transparent)`, backgroundSize: "100% 200%", animation: "afg-shimmer 3.5s linear infinite" }} />
                  <div className="pointer-events-none absolute inset-y-0 right-0 w-[2px]" style={{ background: `linear-gradient(180deg, transparent, rgba(212,175,55,0.3), transparent)`, backgroundSize: "100% 200%", animation: "afg-shimmer 4s linear infinite" }} />
                </div>
              </div>

              {/* Narration */}
              <div className="flex-1 min-w-0">
                {/* Tour badge */}
                <div className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1" style={{ borderColor: `${tourColor}30`, background: `${tourColor}10` }}>
                  <div className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: tourColor }} />
                  <span className="text-[9px] font-semibold uppercase tracking-[0.16em]" style={{ color: tourColor }}>{currentTour.label}</span>
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.24em]" style={{ color: `${tourColor}b0` }}>
                  {item.tag || "Artefact In Focus"}
                </p>
                <h2 className="mt-3 font-serif text-3xl font-semibold sm:text-4xl leading-tight" style={{ background: `linear-gradient(135deg, #ffffff, #e0d0a0, ${tourColor})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  {item.name}
                </h2>
                <div className="mt-3 flex items-center gap-3 flex-wrap">
                  {item.tag && (
                    <span className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ border: `1px solid ${tourColor}30`, background: `${tourColor}15`, color: tourColor }}>
                      {item.tag}
                    </span>
                  )}
                  {item.era && <span className="text-[10px] uppercase tracking-[0.14em] text-white/30">{item.era}</span>}
                  {item.location && (
                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.14em] text-white/30">
                      <MapPin className="h-3 w-3" /> {item.location}
                    </span>
                  )}
                </div>

                <div className="mt-5 h-[1px]" style={{ background: `linear-gradient(90deg, ${tourColor}50, rgba(212,175,55,0.15), transparent)` }} />

                <div className="mt-5 min-h-[80px]">
                  <p className="text-base leading-8 text-white/75 sm:text-lg sm:leading-9 font-light">{storyText}</p>
                </div>

                {/* Artifact counter dots */}
                <div className="mt-6 flex items-center gap-1.5 flex-wrap">
                  {allTourDisplayItems.map((di, idx) => {
                    const dotColor = di.tourCategory.color;
                    return (
                      <div
                        key={idx}
                        className={cn("rounded-full transition-all duration-500", idx === tourAutoIndex ? "h-2 w-7" : "h-1.5 w-1.5")}
                        style={
                          idx === tourAutoIndex
                            ? { background: `linear-gradient(90deg, ${dotColor}, #d4af37)`, boxShadow: `0 0 8px ${dotColor}66` }
                            : idx < tourAutoIndex
                              ? { background: `${dotColor}50` }
                              : { background: "rgba(255,255,255,0.12)" }
                        }
                      />
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom/Top gradients */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-40" style={{ background: "linear-gradient(to top, rgba(0,0,0,1), rgba(0,0,0,0.5) 40%, transparent)" }} />
            <div className="pointer-events-none absolute top-0 left-0 right-0 h-32" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)" }} />
          </div>
        );
      })()}
    </div>
  );
}
