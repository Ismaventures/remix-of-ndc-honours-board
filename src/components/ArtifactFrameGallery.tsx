import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Eye, Power, Volume2, X } from "lucide-react";
import { resolveMediaRefToObjectUrl } from "@/lib/persistentMedia";
import { loadUiSetting } from "@/lib/uiSettingsStorage";
import {
  REFERENCE_CHAMBER_FRAME,
  useDisplayFrameSettings,
  type FrameDisplayParams,
  DEFAULT_FRAME_DISPLAY,
} from "@/hooks/useDisplayFrameSettings";
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
const SAMPLE_ARTIFACT = "/images/ndc-crest.png";
const STAGE_REGION = { left: 15, top: 12, width: 70, height: 60 };

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

  // Check if layers already look well-arranged (admin preset already applied)
  const allCentered = layers.every((l) => l.x === 0 && l.y === 0);
  if (!allCentered) return layers; // Already positioned — trust the admin layout

  // Fallback auto-arrange for layers that were never positioned
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [focusedAudioUrl, setFocusedAudioUrl] = useState<string | null>(null);
  const focusedAudioRef = useRef<HTMLAudioElement | null>(null);
  const galleryRef = useRef<HTMLDivElement>(null);

  const { displayParams } = useDisplayFrameSettings();

  // Load the studio scene
  useEffect(() => {
    let cancelled = false;
    void loadUiSetting<ChamberStudioScene>(STUDIO_STORAGE_KEY).then((stored) => {
      if (cancelled) return;
      if (stored && stored.frameActive && Array.isArray(stored.layers) && stored.layers.length > 0) {
        setScene({ ...stored, layers: ensureArranged(stored.layers) });
      }
      setLoading(false);
    });
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
    audio.volume = 0.3;
    audioRef.current = audio;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [bgAudioUrl]);

  // Resolve & play focused layer audio
  useEffect(() => {
    if (!focusedLayer?.audioRef) {
      setFocusedAudioUrl(null);
      return;
    }
    let cancelled = false;
    void resolveMediaRefToObjectUrl(focusedLayer.audioRef).then((url) => {
      if (!cancelled && url) setFocusedAudioUrl(url);
    });
    return () => { cancelled = true; };
  }, [focusedLayer?.audioRef]);

  useEffect(() => {
    if (!focusedAudioUrl) return;
    const audio = new Audio(focusedAudioUrl);
    audio.loop = false;
    audio.volume = 0.6;
    focusedAudioRef.current = audio;
    audio.play().catch(() => {});
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, [focusedAudioUrl]);

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

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse text-sm text-muted-foreground">Loading artifact gallery...</div>
      </div>
    );
  }

  if (!scene) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">No active artifact frame to display.</p>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/10 px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/15"
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
      <div className="border-b border-white/8 bg-[#090d13]/90 backdrop-blur-sm">
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
              <h1 className="font-serif text-2xl text-white sm:text-3xl">{scene.artifactTitle}</h1>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/40">
                {scene.exhibitionCategory} &middot; {scene.tourAssociation}
                {categories.length > 0 && ` · ${categories.join(", ")}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {bgAudioUrl && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
                <Volume2 className="h-3 w-3" /> Ambient
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
              <Power className="h-3 w-3" /> Live Gallery
            </span>
          </div>
        </div>
      </div>

      {/* Full-screen Frame Display */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <div
          ref={galleryRef}
          className="relative aspect-[16/10] w-full overflow-hidden rounded-[24px] border border-white/10 shadow-[0_32px_120px_rgba(0,0,0,0.6)]"
          style={{ ...bgStyle, opacity: scene.bgOpacity / 100 }}
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

              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setFocusedLayer(layer)}
                  className="absolute cursor-pointer transition-all duration-300 hover:brightness-110 group"
                  style={{
                    left: `${50 + layer.x}%`,
                    top: `${50 + layer.y}%`,
                    width: `${scaledWidth}%`,
                    opacity: layer.opacity / 100,
                    zIndex: 200 + index * 10 + Math.round(layer.depth),
                    transform: `translate(-50%, -50%) translateZ(${displayParams.depthZ + layer.depth}px) rotate(${layer.rotation}deg)`,
                    filter: `blur(${layer.blur}px) drop-shadow(0 ${6 + displayParams.shadowBlur * 0.6}px ${18 + displayParams.shadowBlur * 2}px rgba(0,0,0,${shadowAlpha})) drop-shadow(0 0 ${layer.glow * 0.36}px rgba(255,214,140,${layer.glow / 320}))`,
                    mixBlendMode: (layer.mixBlend || "normal") as React.CSSProperties["mixBlendMode"],
                  }}
                >
                  <img
                    src={previewUrl}
                    alt={layer.label}
                    className="pointer-events-none h-auto w-full object-contain"
                    draggable={false}
                    style={{
                      filter: appearanceFilter,
                      ...(bgFadeMask ? { WebkitMaskImage: bgFadeMask, maskImage: bgFadeMask } : {}),
                    }}
                  />
                  <p className="pointer-events-none mt-1 truncate text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-white/50 group-hover:text-white/70 transition-colors">
                    {layer.label}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Corner label */}
          <div className="absolute bottom-4 left-5 text-[9px] uppercase tracking-[0.18em] text-white/25">
            {scene.artifactTitle}
          </div>
          <div className="absolute bottom-4 right-5 flex items-center gap-2 text-[9px] uppercase tracking-[0.14em] text-white/25">
            <span>{scene.layers.length} artefact{scene.layers.length !== 1 ? "s" : ""}</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>
        </div>

        {/* Artifact strip below */}
        <div className="mt-6 rounded-[20px] border border-white/8 bg-[#0c1016] p-4">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">Collection</p>
              <p className="mt-1 text-xs text-white/28">{scene.layers.length} artefacts in this exhibit. Click any to view details.</p>
            </div>
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <span
                    key={cat}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/50"
                  >
                    {cat}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {scene.layers.map((layer) => {
              const previewUrl = layerPreviewMap[layer.id] ?? SAMPLE_ARTIFACT;
              return (
                <button
                  key={layer.id}
                  type="button"
                  onClick={() => setFocusedLayer(layer)}
                  className={cn(
                    "min-w-[130px] rounded-[16px] border p-2.5 text-left transition-all",
                    focusedLayer?.id === layer.id
                      ? "border-[#f4c866]/26 bg-[#f4c866]/10"
                      : "border-white/8 bg-white/[0.02] hover:border-white/16 hover:bg-white/[0.04]",
                  )}
                >
                  <div className="flex h-20 items-center justify-center rounded-[12px] bg-black/40">
                    <img src={previewUrl} alt={layer.label} className="max-h-full max-w-full object-contain p-2" />
                  </div>
                  <p className="mt-2 truncate text-xs font-semibold text-white/80">{layer.label}</p>
                  {layer.category && layer.category !== "Uncategorised" && (
                    <p className="mt-1 truncate text-[9px] uppercase tracking-[0.1em] text-[#f4c866]/60">{layer.category}</p>
                  )}
                  {layer.audioRef && (
                    <span className="mt-1 inline-flex items-center gap-1 text-[9px] text-emerald-400/60">
                      <Volume2 className="h-2.5 w-2.5" /> Audio
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Focused artifact overlay */}
      {focusedLayer && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl mx-4">
            <button
              type="button"
              onClick={() => setFocusedLayer(null)}
              className="absolute -top-12 right-0 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70 transition hover:bg-white/[0.12]"
            >
              <X className="h-3.5 w-3.5" />
              Close
            </button>
            <div className="rounded-[24px] border border-white/10 bg-[#0c1016] overflow-hidden">
              <div className="flex items-center justify-center bg-black/40 p-8" style={{ minHeight: 320 }}>
                <img
                  src={layerPreviewMap[focusedLayer.id] ?? SAMPLE_ARTIFACT}
                  alt={focusedLayer.label}
                  className="max-h-[400px] max-w-full object-contain"
                  style={{
                    filter: [
                      `brightness(${focusedLayer.brightness / 100})`,
                      `contrast(${focusedLayer.contrast / 100})`,
                      `saturate(${focusedLayer.saturate / 100})`,
                      focusedLayer.hueRotate !== 0 ? `hue-rotate(${focusedLayer.hueRotate}deg)` : "",
                      focusedLayer.grayscale > 0 ? `grayscale(${focusedLayer.grayscale / 100})` : "",
                      focusedLayer.sepia > 0 ? `sepia(${focusedLayer.sepia / 100})` : "",
                    ].filter(Boolean).join(" "),
                  }}
                />
              </div>
              <div className="border-t border-white/8 p-5">
                <h3 className="font-serif text-xl text-white">{focusedLayer.label}</h3>
                <div className="mt-2 flex items-center gap-3">
                  {focusedLayer.category && focusedLayer.category !== "Uncategorised" && (
                    <span className="rounded-full border border-[#f4c866]/18 bg-[#f4c866]/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#f4c866]">
                      {focusedLayer.category}
                    </span>
                  )}
                  {focusedLayer.audioRef && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400">
                      <Volume2 className="h-3 w-3" /> Playing audio
                    </span>
                  )}
                </div>
                {focusedLayer.categoryDetail && (
                  <p className="mt-3 text-sm leading-relaxed text-white/60">{focusedLayer.categoryDetail}</p>
                )}
                {!focusedLayer.categoryDetail && (
                  <p className="mt-3 text-sm text-white/30 italic">
                    Part of the {scene.exhibitionCategory} collection &middot; {scene.tourAssociation}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
