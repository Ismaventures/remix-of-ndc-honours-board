import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Eye,
  ImagePlus,
  Layers3,
  Lightbulb,
  Move,
  Music,
  Paintbrush,
  Palette,
  Power,
  RefreshCcw,
  RotateCcw,
  Save,
  Shield,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  Volume2,
  ZoomIn,
} from "lucide-react";
import {
  DEFAULT_FRAME,
  DEFAULT_FRAME_DISPLAY,
  REFERENCE_CHAMBER_FRAME,
  useDisplayFrameSettings,
  type FrameDisplayParams,
} from "@/hooks/useDisplayFrameSettings";
import { resolveMediaRefToObjectUrl, saveMediaFile } from "@/lib/persistentMedia";
import { loadUiSetting, saveUiSetting } from "@/lib/uiSettingsStorage";
import { cn } from "@/lib/utils";
import { MuseumObjectViewer } from "./MuseumObjectViewer";

const SAMPLE_ARTIFACT = "/images/ndc-crest.png";
const STUDIO_STORAGE_KEY = "museum_artifact_chamber_studio";
const MAX_MEDIA_SIZE_MB = 8;
const MAX_MEDIA_BYTES = MAX_MEDIA_SIZE_MB * 1024 * 1024;
const STAGE_REGION = { left: 15, top: 12, width: 70, height: 60 };

type StudioPanel = "layers" | "lighting" | "atmosphere" | "security" | "appearance" | "background";

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

type ResizeLayerState = {
  layerId: string;
  startClientX: number;
  startClientY: number;
  startScale: number;
  startX: number;
  startY: number;
  corner: 'nw' | 'ne' | 'sw' | 'se';
};

type LayoutPreset = {
  id: string;
  label: string;
  description: string;
  arrange: (layers: StudioLayer[], stageW: number, stageH: number) => StudioLayer[];
};

type DragLayerState = {
  layerId: string;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
};

type SliderFieldProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  onChange: (value: number) => void;
  onReset?: () => void;
};

type ParamSliderDef = {
  key: keyof FrameDisplayParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
};

const PARAM_SLIDERS: ParamSliderDef[] = [
  { key: "perspective", label: "Perspective", min: 300, max: 2000, step: 10, unit: "px" },
  { key: "depthZ", label: "Depth (Z)", min: 0, max: 60, step: 1, unit: "px" },
  { key: "tiltSensitivity", label: "Tilt Sensitivity", min: 0, max: 200, step: 1, unit: "%" },
  { key: "objectInset", label: "Object Inset", min: 5, max: 40, step: 1, unit: "%" },
  { key: "vignette", label: "Vignette", min: 0, max: 100, step: 1, unit: "%" },
  { key: "spotlight", label: "Spotlight", min: 0, max: 100, step: 1, unit: "%" },
  { key: "glassReflection", label: "Glass Reflection", min: 0, max: 100, step: 1, unit: "%" },
  { key: "specularIntensity", label: "Specular Intensity", min: 0, max: 100, step: 1, unit: "%" },
  { key: "shadowOpacity", label: "Shadow Opacity", min: 0, max: 100, step: 1, unit: "%" },
  { key: "shadowBlur", label: "Shadow Blur", min: 0, max: 30, step: 1, unit: "px" },
  { key: "frameOpacity", label: "Frame Opacity", min: 0, max: 100, step: 1, unit: "%" },
];

const PANEL_ITEMS: Array<{
  id: StudioPanel;
  label: string;
  description: string;
  icon: typeof Layers3;
}> = [
  {
    id: "layers",
    label: "Layers",
    description: "Add, move, and stack your images inside the display.",
    icon: Layers3,
  },
  {
    id: "lighting",
    label: "Lighting",
    description: "Control how bright the spotlights and shadows look.",
    icon: Lightbulb,
  },
  {
    id: "atmosphere",
    label: "Mood",
    description: "Add haze, tint, and warm glow to the display.",
    icon: Sparkles,
  },
  {
    id: "security",
    label: "Glass & 3D",
    description: "Adjust the glass case depth and how it reacts to your mouse.",
    icon: Shield,
  },
  {
    id: "appearance",
    label: "Colours",
    description: "Change brightness, contrast, and colour of each image.",
    icon: Paintbrush,
  },
  {
    id: "background",
    label: "Background",
    description: "Pick a backdrop colour or gradient for the canvas.",
    icon: Palette,
  },
];

const LAYER_CATEGORIES = [
  "World Tour",
  "Regional Tour",
  "Midnight Tour",
  "National Collections",
  "Defence Memory",
  "Classical Echoes",
  "Strategic Relics",
  "VIP Collection",
  "Uncategorised",
];

const DEFAULT_LAYER_VALUES = {
  x: 0,
  y: 0,
  depth: 12,
  scale: 26,
  rotation: 0,
  opacity: 100,
  blur: 0,
  shadow: 56,
  glow: 22,
  brightness: 100,
  contrast: 100,
  saturate: 100,
  hueRotate: 0,
  grayscale: 0,
  sepia: 0,
  bgFade: 0,
  mixBlend: "normal",
  category: "Uncategorised",
  categoryDetail: "",
  audioRef: "",
};

const DEFAULT_SCENE: ChamberStudioScene = {
  stageFrameRef: REFERENCE_CHAMBER_FRAME,
  selectedLayerId: "sample-crest",
  layers: [
    {
      id: "sample-crest",
      label: "NDC Crest",
      sourceRef: SAMPLE_ARTIFACT,
      ...DEFAULT_LAYER_VALUES,
    },
  ],
  artifactTitle: "The Gilded Remnant",
  exhibitionCategory: "Classical Echoes",
  tourAssociation: "Midnight Tour",
  vipAccess: true,
  ambientLight: 62,
  beamStrength: 58,
  haze: 22,
  glassTint: 18,
  floorGlow: 36,
  bgColor: "#050709",
  bgGradientPreset: "void",
  bgOpacity: 100,
  frameActive: false,
  backgroundAudioRef: "",
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function createLayerId() {
  return `layer-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function stripExtension(filename: string) {
  return filename.replace(/\.[^.]+$/, "").trim() || "Untitled Artefact";
}

function toParamSliderValue(key: keyof FrameDisplayParams, value: number) {
  return key === "tiltSensitivity" ? Math.round(value * 100) : value;
}

function fromParamSliderValue(key: keyof FrameDisplayParams, value: number) {
  return key === "tiltSensitivity" ? value / 100 : value;
}

function getLayerBounds(scale: number) {
  return {
    xLimit: clampNumber(47 - scale * 0.34, 10, 43),
    yLimit: clampNumber(34 - scale * 0.24, 8, 30),
  };
}

function getLayerZoneLabel(depth: number) {
  if (depth >= 20) return "Front Layer";
  if (depth <= 0) return "Backdrop";
  return "Middle Ground";
}

function createLayer(sourceRef: string, label: string, _index: number): StudioLayer {
  return {
    id: createLayerId(),
    label,
    sourceRef,
    ...DEFAULT_LAYER_VALUES,
    x: 0,
    y: 0,
    depth: DEFAULT_LAYER_VALUES.depth,
  };
}

/**
 * Automatically arrange layers in a beautiful, balanced layout.
 * Adapts strategy based on the number of items:
 * - 1 item: centered hero
 * - 2 items: side-by-side with slight tilt
 * - 3 items: hero center + two flanks (triangle)
 * - 4 items: 2×2 balanced grid
 * - 5-6 items: top row + bottom row (pyramid)
 * - 7+ items: responsive grid that fills the frame evenly
 */
function autoArrangeLayers(layers: StudioLayer[]): StudioLayer[] {
  const n = layers.length;
  if (n === 0) return layers;

  if (n === 1) {
    return [{ ...layers[0], x: 0, y: 0, scale: 38, rotation: 0, depth: 20 }];
  }

  if (n === 2) {
    return [
      { ...layers[0], x: -18, y: 0, scale: 30, rotation: -2, depth: 14 },
      { ...layers[1], x: 18, y: 0, scale: 30, rotation: 2, depth: 16 },
    ];
  }

  if (n === 3) {
    return [
      { ...layers[0], x: 0, y: -8, scale: 32, rotation: 0, depth: 22 },
      { ...layers[1], x: -22, y: 8, scale: 24, rotation: -3, depth: 12 },
      { ...layers[2], x: 22, y: 8, scale: 24, rotation: 3, depth: 14 },
    ];
  }

  if (n === 4) {
    return [
      { ...layers[0], x: -17, y: -10, scale: 26, rotation: -1, depth: 14 },
      { ...layers[1], x: 17, y: -10, scale: 26, rotation: 1, depth: 16 },
      { ...layers[2], x: -17, y: 10, scale: 26, rotation: 1, depth: 12 },
      { ...layers[3], x: 17, y: 10, scale: 26, rotation: -1, depth: 18 },
    ];
  }

  if (n === 5) {
    return [
      { ...layers[0], x: -22, y: -10, scale: 24, rotation: -1, depth: 14 },
      { ...layers[1], x: 0, y: -10, scale: 24, rotation: 0, depth: 16 },
      { ...layers[2], x: 22, y: -10, scale: 24, rotation: 1, depth: 15 },
      { ...layers[3], x: -12, y: 10, scale: 24, rotation: 1, depth: 12 },
      { ...layers[4], x: 12, y: 10, scale: 24, rotation: -1, depth: 18 },
    ];
  }

  if (n === 6) {
    return [
      { ...layers[0], x: -22, y: -10, scale: 22, rotation: -1, depth: 14 },
      { ...layers[1], x: 0, y: -10, scale: 22, rotation: 0, depth: 16 },
      { ...layers[2], x: 22, y: -10, scale: 22, rotation: 1, depth: 15 },
      { ...layers[3], x: -22, y: 10, scale: 22, rotation: 1, depth: 12 },
      { ...layers[4], x: 0, y: 10, scale: 22, rotation: 0, depth: 18 },
      { ...layers[5], x: 22, y: 10, scale: 22, rotation: -1, depth: 17 },
    ];
  }

  // 7+ items: responsive grid
  const cols = n <= 9 ? 3 : n <= 16 ? 4 : Math.ceil(Math.sqrt(n * 1.2));
  const rows = Math.ceil(n / cols);
  const maxScale = Math.max(10, Math.min(22, 55 / Math.max(cols, rows)));
  const spanX = 68;
  const spanY = 48;
  const cellW = spanX / cols;
  const cellH = spanY / rows;

  return layers.map((layer, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const colsInRow = row === rows - 1 ? n - row * cols : cols;
    const rowOffsetX = (cols - colsInRow) * cellW / 2;
    const x = -(spanX / 2) + rowOffsetX + cellW * col + cellW / 2;
    const y = -(spanY / 2) + cellH * row + cellH / 2;
    const tinyRotation = ((i % 3) - 1) * 1.5;
    return {
      ...layer,
      x: clampNumber(x, -42, 42),
      y: clampNumber(y, -28, 28),
      scale: maxScale,
      rotation: tinyRotation,
      depth: 10 + i * 2,
    };
  });
}

const BG_GRADIENT_PRESETS = [
  { id: "void", label: "Dark Void", css: "radial-gradient(ellipse at center, #0a0e15, #050709)" },
  { id: "navy", label: "Deep Navy", css: "radial-gradient(ellipse at center, #0c1629, #040810)" },
  { id: "sepia", label: "Warm Sepia", css: "radial-gradient(ellipse at center, #1a150e, #0a0805)" },
  { id: "steel", label: "Cool Steel", css: "radial-gradient(ellipse at center, #121518, #080a0c)" },
  { id: "emerald", label: "Emerald Depths", css: "radial-gradient(ellipse at center, #0a1611, #040a07)" },
  { id: "crimson", label: "Crimson Shadow", css: "radial-gradient(ellipse at center, #180a0a, #0a0405)" },
  { id: "custom", label: "Custom Color", css: "" },
] as const;

const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'grid',
    label: 'Gallery Grid',
    description: 'Evenly spaced rows and columns like a professional museum wall.',
    arrange: (layers) => {
      const count = layers.length;
      if (count === 0) return layers;
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const cellW = 70 / cols;
      const cellH = 54 / rows;
      const baseScale = Math.max(12, Math.min(38, 60 / Math.max(cols, rows)));
      return layers.map((layer, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = -35 + cellW * col + cellW / 2;
        const y = -27 + cellH * row + cellH / 2;
        return { ...layer, x: clampNumber(x, -42, 42), y: clampNumber(y, -30, 30), scale: baseScale, rotation: 0, depth: 12 + i * 2 };
      });
    },
  },
  {
    id: 'cascade',
    label: 'Cascade Stack',
    description: 'Overlapping diagonal arrangement like scattered documents on a desk.',
    arrange: (layers) => {
      const count = layers.length;
      if (count === 0) return layers;
      const step = Math.min(14, 60 / count);
      const baseScale = Math.max(16, Math.min(32, 50 / Math.sqrt(count)));
      return layers.map((layer, i) => ({
        ...layer,
        x: clampNumber(-28 + i * step, -42, 42),
        y: clampNumber(-18 + i * step * 0.6, -30, 30),
        scale: baseScale,
        rotation: clampNumber(-8 + i * 3, -20, 20),
        depth: 8 + i * 5,
      }));
    },
  },
  {
    id: 'arc',
    label: 'Museum Arc',
    description: 'Evenly distributed along a gentle arc like items in a display vitrine.',
    arrange: (layers) => {
      const count = layers.length;
      if (count === 0) return layers;
      const baseScale = Math.max(14, Math.min(34, 55 / Math.sqrt(count)));
      return layers.map((layer, i) => {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angle = -0.7 + t * 1.4;
        const x = Math.sin(angle) * 34;
        const y = -Math.cos(angle) * 16 + 4;
        return { ...layer, x: clampNumber(x, -42, 42), y: clampNumber(y, -30, 30), scale: baseScale, rotation: clampNumber(angle * 8, -15, 15), depth: 10 + i * 3 };
      });
    },
  },
  {
    id: 'spotlight',
    label: 'Center Spotlight',
    description: 'One large hero piece in center with smaller pieces flanking symmetrically.',
    arrange: (layers) => {
      const count = layers.length;
      if (count === 0) return layers;
      if (count === 1) return [{ ...layers[0], x: 0, y: 0, scale: 40, rotation: 0, depth: 20 }];
      const hero = { ...layers[0], x: 0, y: -2, scale: Math.min(42, 55 / Math.sqrt(count)), rotation: 0, depth: 30 };
      const rest = layers.slice(1);
      const flanks = rest.map((layer, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const tier = Math.floor(i / 2);
        const x = side * (22 + tier * 10);
        const y = 6 + tier * 5;
        const sc = Math.max(14, hero.scale * 0.55 - tier * 3);
        return { ...layer, x: clampNumber(x, -42, 42), y: clampNumber(y, -30, 30), scale: sc, rotation: side * 4, depth: 8 + i * 2 };
      });
      return [hero, ...flanks];
    },
  },
  {
    id: 'mosaic',
    label: 'Tight Mosaic',
    description: 'Close-packed tiles for a dense, editorial photo wall look.',
    arrange: (layers) => {
      const count = layers.length;
      if (count === 0) return layers;
      const cols = Math.ceil(Math.sqrt(count * 1.4));
      const rows = Math.ceil(count / cols);
      const cellW = 80 / cols;
      const cellH = 58 / rows;
      const baseScale = Math.max(12, Math.min(28, 55 / Math.max(cols, rows)));
      return layers.map((layer, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const jitterX = ((i * 7) % 5 - 2) * 0.8;
        const jitterY = ((i * 3) % 5 - 2) * 0.5;
        const x = -40 + cellW * col + cellW / 2 + jitterX;
        const y = -29 + cellH * row + cellH / 2 + jitterY;
        return { ...layer, x: clampNumber(x, -42, 42), y: clampNumber(y, -30, 30), scale: baseScale, rotation: 0, depth: 12 + i };
      });
    },
  },
];

function normalizeScene(value?: Partial<ChamberStudioScene> | null): ChamberStudioScene {
  const layers = Array.isArray(value?.layers)
    ? value.layers.map((layer) => ({
        ...DEFAULT_LAYER_VALUES,
        ...layer,
      }))
    : DEFAULT_SCENE.layers;

  const selectedLayerId = value?.selectedLayerId && layers.some((layer) => layer.id === value.selectedLayerId)
    ? value.selectedLayerId
    : layers[0]?.id ?? null;

  return {
    ...DEFAULT_SCENE,
    ...value,
    stageFrameRef: value?.stageFrameRef ?? REFERENCE_CHAMBER_FRAME,
    layers,
    selectedLayerId,
  };
}

function SliderField({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  hint,
  onChange,
  onReset,
}: SliderFieldProps) {
  return (
    <div
      className="space-y-1.5 rounded-2xl border border-white/8 bg-white/[0.02] p-3"
      style={{
        borderColor: "rgba(255,255,255,0.08)",
        backgroundColor: "rgba(255,255,255,0.03)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/78">{label}</p>
          {hint && <p className="mt-1 text-[11px] text-white/40">{hint}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-[#f4c866]/15 bg-[#f4c866]/10 px-2.5 py-1 text-[10px] font-semibold text-[#f4c866]">
            {value}{unit}
          </span>
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-full border border-white/10 p-1.5 text-white/40 transition-colors hover:border-white/20 hover:text-white/80"
              title="Reset"
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1 w-full cursor-pointer accent-[#f4c866]"
      />
    </div>
  );
}

export function DisplayFrameAdmin() {
  const {
    frameUrl,
    frameRef,
    frameOptions,
    displayParams,
    loading,
    setActiveFrame,
    addFrame,
    removeFrame,
    setDisplayParams,
    resetDisplayParams,
  } = useDisplayFrameSettings();

  const frameInputRef = useRef<HTMLInputElement>(null);
  const layerInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();
  const autosaveTimer = useRef<ReturnType<typeof setTimeout>>();
  const dragLayerRef = useRef<DragLayerState | null>(null);
  const resizeLayerRef = useRef<ResizeLayerState | null>(null);
  const layerBlobUrlsRef = useRef<string[]>([]);

  const [activePanel, setActivePanel] = useState<StudioPanel>("layers");
  const [centerTab, setCenterTab] = useState<"transform" | "appearance" | "fade" | "details">("transform");
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [dragOverFrame, setDragOverFrame] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const bgAudioInputRef = useRef<HTMLInputElement>(null);
  const [scene, setScene] = useState<ChamberStudioScene>(DEFAULT_SCENE);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const [uploadingFrame, setUploadingFrame] = useState(false);
  const [uploadingLayer, setUploadingLayer] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pointer, setPointer] = useState({ x: 50, y: 18 });
  const [layerPreviewMap, setLayerPreviewMap] = useState<Record<string, string>>({
    [DEFAULT_SCENE.layers[0].id]: SAMPLE_ARTIFACT,
  });

  const sliderByKey = useMemo(
    () => Object.fromEntries(PARAM_SLIDERS.map((slider) => [slider.key, slider])) as Record<keyof FrameDisplayParams, ParamSliderDef>,
    [],
  );

  const flashSaved = useCallback((message?: string) => {
    setSavedFlash(true);
    if (message) {
      setStatus(message);
    }
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedFlash(false), 1800);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadUiSetting<ChamberStudioScene>(STUDIO_STORAGE_KEY).then((stored) => {
      if (cancelled) return;
      if (stored) {
        setScene(normalizeScene(stored));
      }
      setSceneLoaded(true);
    });

    return () => {
      cancelled = true;
      clearTimeout(savedTimer.current);
      clearTimeout(autosaveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!sceneLoaded) return;

    clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => {
      void saveUiSetting(STUDIO_STORAGE_KEY, scene);
    }, 650);

    return () => clearTimeout(autosaveTimer.current);
  }, [scene, sceneLoaded]);

  useEffect(() => {
    let cancelled = false;

    const resolveLayerPreviews = async () => {
      const nextBlobUrls: string[] = [];
      const entries = await Promise.all(scene.layers.map(async (layer) => {
        if (layer.sourceRef.startsWith("/") || layer.sourceRef.startsWith("http") || layer.sourceRef.startsWith("blob:")) {
          return [layer.id, layer.sourceRef] as const;
        }

        const resolved = await resolveMediaRefToObjectUrl(layer.sourceRef);
        if (resolved?.startsWith("blob:")) {
          nextBlobUrls.push(resolved);
        }

        return [layer.id, resolved ?? SAMPLE_ARTIFACT] as const;
      }));

      if (cancelled) {
        nextBlobUrls.forEach((url) => URL.revokeObjectURL(url));
        return;
      }

      layerBlobUrlsRef.current
        .filter((url) => !nextBlobUrls.includes(url))
        .forEach((url) => URL.revokeObjectURL(url));

      layerBlobUrlsRef.current = nextBlobUrls;
      setLayerPreviewMap(Object.fromEntries(entries));
    };

    void resolveLayerPreviews();

    return () => {
      cancelled = true;
    };
  }, [scene.layers]);

  useEffect(() => () => {
    layerBlobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const selectedLayer = useMemo(
    () => scene.layers.find((layer) => layer.id === scene.selectedLayerId) ?? null,
    [scene.layers, scene.selectedLayerId],
  );

  const selectedLayerIndex = selectedLayer
    ? scene.layers.findIndex((layer) => layer.id === selectedLayer.id)
    : -1;
  const selectedLayerBounds = selectedLayer ? getLayerBounds(selectedLayer.scale) : { xLimit: 42, yLimit: 30 };
  const selectedLayerZone = selectedLayer ? getLayerZoneLabel(selectedLayer.depth) : "No Selection";

  const stageFrameOption = frameOptions.find((option) => option.ref === scene.stageFrameRef) ?? null;
  const stageFrameUrl = stageFrameOption?.url ?? frameUrl ?? DEFAULT_FRAME;
  const liveFrameLabel = frameOptions.find((option) => option.ref === frameRef)?.label ?? "Classic Glass Case";

  const updateScene = useCallback((updater: (current: ChamberStudioScene) => ChamberStudioScene) => {
    setScene((current) => normalizeScene(updater(current)));
  }, []);

  const updateLayer = useCallback((layerId: string, patch: Partial<StudioLayer>) => {
    updateScene((current) => ({
      ...current,
      layers: current.layers.map((layer) => (layer.id === layerId ? { ...layer, ...patch } : layer)),
    }));
  }, [updateScene]);

  const moveLayerInStack = useCallback((layerId: string, direction: -1 | 1) => {
    updateScene((current) => {
      const index = current.layers.findIndex((layer) => layer.id === layerId);
      const targetIndex = index + direction;

      if (index < 0 || targetIndex < 0 || targetIndex >= current.layers.length) {
        return current;
      }

      const nextLayers = [...current.layers];
      const [layer] = nextLayers.splice(index, 1);
      nextLayers.splice(targetIndex, 0, layer);

      return { ...current, layers: nextLayers };
    });
  }, [updateScene]);

  const deleteLayer = useCallback((layerId: string) => {
    updateScene((current) => {
      const nextLayers = autoArrangeLayers(current.layers.filter((layer) => layer.id !== layerId));
      return {
        ...current,
        layers: nextLayers,
        selectedLayerId: current.selectedLayerId === layerId ? nextLayers[0]?.id ?? null : current.selectedLayerId,
      };
    });
    flashSaved("Layer removed and scene re-arranged.");
  }, [flashSaved, updateScene]);

  const nudgeSelectedLayer = useCallback((deltaX: number, deltaY: number) => {
    if (!selectedLayer) return;
    const bounds = getLayerBounds(selectedLayer.scale);
    updateLayer(selectedLayer.id, {
      x: clampNumber(selectedLayer.x + deltaX, -bounds.xLimit, bounds.xLimit),
      y: clampNumber(selectedLayer.y + deltaY, -bounds.yLimit, bounds.yLimit),
    });
  }, [selectedLayer, updateLayer]);

  // ESC key closes fullscreen preview
  useEffect(() => {
    if (!showFullPreview) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowFullPreview(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showFullPreview]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const preview = previewRef.current;
      if (!preview) return;

      // Handle resize (allows simultaneous move)
      const resizeState = resizeLayerRef.current;
      if (resizeState) {
        const dx = event.clientX - resizeState.startClientX;
        const dy = event.clientY - resizeState.startClientY;
        const rect = preview.getBoundingClientRect();
        const scaleDelta = (dx + dy) / rect.width * 120;
        const nextScale = clampNumber(resizeState.startScale + scaleDelta, 12, 70);
        const editableWidth = rect.width * (STAGE_REGION.width / 100);
        const editableHeight = rect.height * (STAGE_REGION.height / 100);
        const nextX = resizeState.startX + ((event.clientX - resizeState.startClientX) / editableWidth) * 30;
        const nextY = resizeState.startY + ((event.clientY - resizeState.startClientY) / editableHeight) * 30;
        const bounds = getLayerBounds(nextScale);
        updateLayer(resizeState.layerId, {
          scale: nextScale,
          x: clampNumber(nextX, -bounds.xLimit, bounds.xLimit),
          y: clampNumber(nextY, -bounds.yLimit, bounds.yLimit),
        });
        return;
      }

      // Handle drag
      const dragState = dragLayerRef.current;
      if (!dragState) return;

      const rect = preview.getBoundingClientRect();
      const editableWidth = rect.width * (STAGE_REGION.width / 100);
      const editableHeight = rect.height * (STAGE_REGION.height / 100);
      const nextX = dragState.startX + ((event.clientX - dragState.startClientX) / editableWidth) * 100;
      const nextY = dragState.startY + ((event.clientY - dragState.startClientY) / editableHeight) * 100;
      const layer = scene.layers.find((entry) => entry.id === dragState.layerId);
      const bounds = getLayerBounds(layer?.scale ?? DEFAULT_LAYER_VALUES.scale);

      updateLayer(dragState.layerId, {
        x: clampNumber(nextX, -bounds.xLimit, bounds.xLimit),
        y: clampNumber(nextY, -bounds.yLimit, bounds.yLimit),
      });
    };

    const handlePointerUp = () => {
      dragLayerRef.current = null;
      resizeLayerRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [scene.layers, updateLayer]);

  const handleStagePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPointer({
      x: clampNumber(((event.clientX - rect.left) / rect.width) * 100, 0, 100),
      y: clampNumber(((event.clientY - rect.top) / rect.height) * 100, 0, 100),
    });
  }, []);

  const handleFrameUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_MEDIA_BYTES) {
      setError(`${file.name} exceeds ${MAX_MEDIA_SIZE_MB}MB. Resize it before uploading.`);
      return;
    }

    setUploadingFrame(true);
    setError(null);

    try {
      const ref = await saveMediaFile(file);
      await addFrame(ref);
      updateScene((current) => ({ ...current, stageFrameRef: ref }));
      flashSaved(`${file.name} is now available as a chamber frame.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload frame.");
    } finally {
      setUploadingFrame(false);
      if (frameInputRef.current) {
        frameInputRef.current.value = "";
      }
    }
  }, [addFrame, flashSaved, updateScene]);

  const handleLayerUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const oversized = files.find((file) => file.size > MAX_MEDIA_BYTES);
    if (oversized) {
      setError(`${oversized.name} exceeds ${MAX_MEDIA_SIZE_MB}MB. Resize it before uploading.`);
      return;
    }

    setUploadingLayer(true);
    setError(null);

    try {
      const uploadedRefs = await Promise.all(files.map((file) => saveMediaFile(file)));
      updateScene((current) => {
        const offset = current.layers.length;
        const newLayers = uploadedRefs.map((ref, index) => createLayer(ref, stripExtension(files[index].name), offset + index));
        const allLayers = autoArrangeLayers([...current.layers, ...newLayers]);
        return {
          ...current,
          layers: allLayers,
          selectedLayerId: newLayers[newLayers.length - 1]?.id ?? current.selectedLayerId,
        };
      });
      flashSaved(`${files.length} artefact layer${files.length === 1 ? "" : "s"} added to the chamber.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload artefact layers.");
    } finally {
      setUploadingLayer(false);
      if (layerInputRef.current) {
        layerInputRef.current.value = "";
      }
    }
  }, [flashSaved, updateScene]);

  const handleLayerAudioUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedLayer) return;
    if (file.size > MAX_MEDIA_BYTES) {
      setError(`${file.name} exceeds ${MAX_MEDIA_SIZE_MB}MB.`);
      return;
    }
    setUploadingAudio(true);
    try {
      const ref = await saveMediaFile(file);
      updateLayer(selectedLayer.id, { audioRef: ref });
      flashSaved(`Audio "${file.name}" attached to ${selectedLayer.label}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Audio upload failed.");
    } finally {
      setUploadingAudio(false);
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  }, [flashSaved, selectedLayer, updateLayer]);

  const handleBgAudioUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_MEDIA_BYTES) {
      setError(`${file.name} exceeds ${MAX_MEDIA_SIZE_MB}MB.`);
      return;
    }
    setUploadingAudio(true);
    try {
      const ref = await saveMediaFile(file);
      updateScene((current) => ({ ...current, backgroundAudioRef: ref }));
      flashSaved(`Background audio "${file.name}" set.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Background audio upload failed.");
    } finally {
      setUploadingAudio(false);
      if (bgAudioInputRef.current) bgAudioInputRef.current.value = "";
    }
  }, [flashSaved, updateScene]);

  const handleFrameDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverFrame(false);
    const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length === 0) return;
    const oversized = files.find(f => f.size > MAX_MEDIA_BYTES);
    if (oversized) {
      setError(`${oversized.name} exceeds ${MAX_MEDIA_SIZE_MB}MB.`);
      return;
    }
    setUploadingLayer(true);
    setError(null);
    try {
      const refs = await Promise.all(files.map(f => saveMediaFile(f)));
      updateScene((current) => {
        const offset = current.layers.length;
        const newLayers = refs.map((ref, i) => createLayer(ref, stripExtension(files[i].name), offset + i));
        const allLayers = autoArrangeLayers([...current.layers, ...newLayers]);
        return {
          ...current,
          layers: allLayers,
          selectedLayerId: newLayers[newLayers.length - 1]?.id ?? current.selectedLayerId,
        };
      });
      flashSaved(`${files.length} artefact(s) dropped into the chamber.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drop upload failed.");
    } finally {
      setUploadingLayer(false);
    }
  }, [flashSaved, updateScene]);

  const handleApplyPreset = useCallback((preset: LayoutPreset) => {
    updateScene((current) => {
      const arranged = preset.arrange([...current.layers], 100, 100);
      return { ...current, layers: arranged };
    });
    setShowPresetPicker(false);
    flashSaved(`Applied "${preset.label}" layout to ${scene.layers.length} artefacts.`);
  }, [flashSaved, scene.layers.length, updateScene]);

  const handleAutoArrange = useCallback(() => {
    updateScene((current) => ({
      ...current,
      layers: autoArrangeLayers([...current.layers]),
    }));
    flashSaved(`Auto-arranged ${scene.layers.length} artefacts.`);
  }, [flashSaved, scene.layers.length, updateScene]);

  const handleDisplayParamChange = useCallback((key: keyof FrameDisplayParams, value: number) => {
    setDisplayParams({ [key]: fromParamSliderValue(key, value) } as Partial<FrameDisplayParams>);
    flashSaved();
  }, [flashSaved, setDisplayParams]);

  const handleDisplayParamReset = useCallback((key: keyof FrameDisplayParams) => {
    setDisplayParams({ [key]: DEFAULT_FRAME_DISPLAY[key] } as Partial<FrameDisplayParams>);
    flashSaved();
  }, [flashSaved, setDisplayParams]);

  const handleAutoProcessLayer = useCallback(() => {
    if (!selectedLayer) {
      setStatus("Select an artefact layer to auto-process its chamber settings.");
      return;
    }

    const bounds = getLayerBounds(selectedLayer.scale + 4);
    updateLayer(selectedLayer.id, {
      shadow: 68,
      glow: 32,
      blur: 0,
      scale: clampNumber(selectedLayer.scale + 3, 12, 70),
      depth: clampNumber(selectedLayer.depth + 4, -20, 60),
      x: clampNumber(selectedLayer.x, -bounds.xLimit, bounds.xLimit),
      y: clampNumber(selectedLayer.y, -bounds.yLimit, bounds.yLimit),
    });
    flashSaved(`${selectedLayer.label} was auto-processed for a cleaner chamber fit.`);
  }, [flashSaved, selectedLayer, updateLayer]);

  const handlePublishCuration = useCallback(async () => {
    await saveUiSetting(STUDIO_STORAGE_KEY, scene);
    await setActiveFrame(scene.stageFrameRef);
    flashSaved("Curation published. The chamber frame is now ready for live museum preview.");
  }, [flashSaved, scene, setActiveFrame]);

  const saveSceneNow = useCallback(async () => {
    await saveUiSetting(STUDIO_STORAGE_KEY, scene);
    flashSaved("Artifact chamber scene saved.");
  }, [flashSaved, scene]);

  const applyStageAsLiveFrame = useCallback(async () => {
    await setActiveFrame(scene.stageFrameRef);
    flashSaved("Selected chamber frame is now live across museum viewers.");
  }, [flashSaved, scene.stageFrameRef, setActiveFrame]);

  const handleResetStudio = useCallback(() => {
    setScene(DEFAULT_SCENE);
    resetDisplayParams();
    flashSaved("Studio reset to the soft-light chamber baseline.");
  }, [flashSaved, resetDisplayParams]);

  const renderDisplayParamSlider = useCallback((key: keyof FrameDisplayParams, hint?: string) => {
    const definition = sliderByKey[key];
    const value = toParamSliderValue(key, displayParams[key]);
    const defaultValue = toParamSliderValue(key, DEFAULT_FRAME_DISPLAY[key]);

    return (
      <SliderField
        key={key}
        label={definition.label}
        value={value}
        min={definition.min}
        max={definition.max}
        step={definition.step}
        unit={definition.unit}
        hint={hint}
        onChange={(nextValue) => handleDisplayParamChange(key, nextValue)}
        onReset={value !== defaultValue ? () => handleDisplayParamReset(key) : undefined}
      />
    );
  }, [displayParams, handleDisplayParamChange, handleDisplayParamReset, sliderByKey]);

  const activePanelContent = useMemo(() => {
    if (activePanel === "layers") {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#f4c866]/16 bg-[#f4c866]/8 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f4c866]">Image Layers</p>
            <p className="mt-1 text-sm text-white/62">Drag images around the canvas, or use the settings below to move them exactly.</p>
            <div className="mt-3 flex items-center gap-2 text-[11px] text-white/42">
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{scene.layers.length} loaded</span>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1">{selectedLayerZone}</span>
            </div>
          </div>

          {selectedLayer ? (
            <>
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Selected Image</p>
                <p className="mt-2 text-sm font-semibold text-white">{selectedLayer.label}</p>
                <p className="mt-1 text-xs text-white/40">Position: {selectedLayerZone}. Drag it anywhere in the frame.</p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => moveLayerInStack(selectedLayer.id, -1)}
                  disabled={selectedLayerIndex <= 0}
                  className="inline-flex items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => moveLayerInStack(selectedLayer.id, 1)}
                  disabled={selectedLayerIndex < 0 || selectedLayerIndex === scene.layers.length - 1}
                  className="inline-flex items-center justify-center gap-1 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  Front
                </button>
                <button
                  type="button"
                  onClick={handleAutoProcessLayer}
                  className="inline-flex items-center justify-center gap-1 rounded-2xl border border-[#f4c866]/15 bg-[#f4c866]/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#f4c866] transition-colors hover:bg-[#f4c866]/16"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto
                </button>
              </div>

              <button
                type="button"
                onClick={() => deleteLayer(selectedLayer.id)}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/15 bg-red-400/10 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-red-300 transition-colors hover:bg-red-400/16"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove From Scene
              </button>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-white/45">
              Upload at least one artefact layer to start composing the chamber scene.
            </div>
          )}
        </div>
      );
    }

    if (activePanel === "lighting") {
      return (
        <div className="space-y-4">
          <SliderField label="Ambient Light" value={scene.ambientLight} min={0} max={100} unit="%" hint="Soft overall brightness of the whole display." onChange={(value) => updateScene((current) => ({ ...current, ambientLight: value }))} />
          <SliderField label="Spotlight" value={scene.beamStrength} min={0} max={100} unit="%" hint="How strong the top light shines down." onChange={(value) => updateScene((current) => ({ ...current, beamStrength: value }))} />
          <SliderField label="Floor Glow" value={scene.floorGlow} min={0} max={100} unit="%" hint="Warm light coming from below." onChange={(value) => updateScene((current) => ({ ...current, floorGlow: value }))} />
          {renderDisplayParamSlider("spotlight", "Main spotlight seen by visitors.")}
          {renderDisplayParamSlider("specularIntensity", "Bright shine on the glass surface.")}
          {renderDisplayParamSlider("shadowOpacity", "How dark the shadow under each image is.")}
          {renderDisplayParamSlider("shadowBlur", "How soft or sharp the shadow edges are.")}
        </div>
      );
    }

    if (activePanel === "atmosphere") {
      return (
        <div className="space-y-4">
          <SliderField label="Haze" value={scene.haze} min={0} max={100} unit="%" hint="Adds a soft misty look inside the glass." onChange={(value) => updateScene((current) => ({ ...current, haze: value }))} />
          <SliderField label="Glass Tint" value={scene.glassTint} min={0} max={100} unit="%" hint="Makes the glass look cooler or warmer." onChange={(value) => updateScene((current) => ({ ...current, glassTint: value }))} />
          {renderDisplayParamSlider("vignette", "Darkens the edges for a more focused look.")}
          {renderDisplayParamSlider("frameOpacity", "How visible the frame image is.")}
        </div>
      );
    }

    if (activePanel === "appearance") {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#f4c866]/16 bg-[#f4c866]/8 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f4c866]">Image Appearance</p>
            <p className="mt-1 text-sm text-white/62">Change how the selected image looks — brightness, colour, and effects.</p>
          </div>

          {selectedLayer ? (
            <>
              <SliderField label="Brightness" value={Math.round(selectedLayer.brightness)} min={0} max={200} unit="%" hint="Make lighter or darker." onChange={(value) => updateLayer(selectedLayer.id, { brightness: value })} onReset={selectedLayer.brightness !== 100 ? () => updateLayer(selectedLayer.id, { brightness: 100 }) : undefined} />
              <SliderField label="Contrast" value={Math.round(selectedLayer.contrast)} min={0} max={200} unit="%" hint="Sharpen the difference between dark and light." onChange={(value) => updateLayer(selectedLayer.id, { contrast: value })} onReset={selectedLayer.contrast !== 100 ? () => updateLayer(selectedLayer.id, { contrast: 100 }) : undefined} />
              <SliderField label="Colour Boost" value={Math.round(selectedLayer.saturate)} min={0} max={200} unit="%" hint="Make colours stronger or weaker." onChange={(value) => updateLayer(selectedLayer.id, { saturate: value })} onReset={selectedLayer.saturate !== 100 ? () => updateLayer(selectedLayer.id, { saturate: 100 }) : undefined} />
              <SliderField label="Colour Shift" value={Math.round(selectedLayer.hueRotate)} min={-180} max={180} step={1} unit="°" hint="Change the overall colour tone." onChange={(value) => updateLayer(selectedLayer.id, { hueRotate: value })} onReset={selectedLayer.hueRotate !== 0 ? () => updateLayer(selectedLayer.id, { hueRotate: 0 }) : undefined} />
              <SliderField label="Black & White" value={Math.round(selectedLayer.grayscale)} min={0} max={100} unit="%" hint="Remove colour for a classic look." onChange={(value) => updateLayer(selectedLayer.id, { grayscale: value })} onReset={selectedLayer.grayscale !== 0 ? () => updateLayer(selectedLayer.id, { grayscale: 0 }) : undefined} />
              <SliderField label="Vintage Tone" value={Math.round(selectedLayer.sepia)} min={0} max={100} unit="%" hint="Add warm old-photo feel." onChange={(value) => updateLayer(selectedLayer.id, { sepia: value })} onReset={selectedLayer.sepia !== 0 ? () => updateLayer(selectedLayer.id, { sepia: 0 }) : undefined} />

              <button
                type="button"
                onClick={() => updateLayer(selectedLayer.id, { brightness: 100, contrast: 100, saturate: 100, hueRotate: 0, grayscale: 0, sepia: 0 })}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:bg-white/[0.07]"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset All Appearance
              </button>
            </>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/12 bg-white/[0.02] p-4 text-sm text-white/45">
              Select a layer to adjust its appearance.
            </div>
          )}
        </div>
      );
    }

    if (activePanel === "background") {
      const activeBg = BG_GRADIENT_PRESETS.find((p) => p.id === scene.bgGradientPreset) ?? BG_GRADIENT_PRESETS[0];
      return (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#f4c866]/16 bg-[#f4c866]/8 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f4c866]">Stage Background</p>
            <p className="mt-1 text-sm text-white/62">Pick a colour or gradient for behind the images.</p>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Gradient Preset</p>
            <div className="grid grid-cols-2 gap-2">
              {BG_GRADIENT_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => updateScene((current) => ({ ...current, bgGradientPreset: preset.id }))}
                  className={cn(
                    "flex items-center gap-2 rounded-[14px] border px-3 py-2.5 text-left transition-all",
                    scene.bgGradientPreset === preset.id
                      ? "border-[#f4c866]/22 bg-[#f4c866]/10"
                      : "border-white/8 bg-white/[0.02] hover:border-white/16",
                  )}
                >
                  <div
                    className="h-5 w-5 rounded-full border border-white/15 flex-shrink-0"
                    style={{ background: preset.css || scene.bgColor }}
                  />
                  <span className={cn("text-[10px] font-semibold uppercase tracking-[0.12em]", scene.bgGradientPreset === preset.id ? "text-[#f4c866]" : "text-white/55")}>
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {scene.bgGradientPreset === "custom" && (
            <div className="space-y-1.5 rounded-2xl border border-white/8 bg-white/[0.02] p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Custom Colour</p>
              <div className="flex items-center gap-3 mt-2">
                <input
                  type="color"
                  value={scene.bgColor}
                  onChange={(e) => updateScene((current) => ({ ...current, bgColor: e.target.value }))}
                  className="h-9 w-12 cursor-pointer rounded-lg border border-white/15 bg-transparent"
                />
                <input
                  type="text"
                  value={scene.bgColor}
                  onChange={(e) => updateScene((current) => ({ ...current, bgColor: e.target.value }))}
                  className="flex-1 rounded-lg border border-white/12 bg-transparent px-3 py-2 text-xs text-white font-mono outline-none focus:border-[#f4c866]/35"
                  placeholder="#050709"
                />
              </div>
            </div>
          )}

          <SliderField label="Background Opacity" value={scene.bgOpacity} min={0} max={100} unit="%" hint="How visible the background colour is." onChange={(value) => updateScene((current) => ({ ...current, bgOpacity: value }))} onReset={scene.bgOpacity !== 100 ? () => updateScene((current) => ({ ...current, bgOpacity: 100 })) : undefined} />
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {renderDisplayParamSlider("perspective", "How deep the 3D effect looks.")}
        {renderDisplayParamSlider("depthZ", "Pushes images deeper into the display.")}
        {renderDisplayParamSlider("objectInset", "Keeps images away from the frame edges.")}
        {renderDisplayParamSlider("tiltSensitivity", "How much the display moves when you hover.")}
        {renderDisplayParamSlider("glassReflection", "How much shine and reflection the glass has.")}
      </div>
    );
  }, [
    activePanel,
    deleteLayer,
    handleLayerUpload,
    moveLayerInStack,
    nudgeSelectedLayer,
    renderDisplayParamSlider,
    scene.ambientLight,
    scene.beamStrength,
    scene.floorGlow,
    scene.glassTint,
    scene.haze,
    scene.bgColor,
    scene.bgGradientPreset,
    scene.bgOpacity,
    scene.layers.length,
    selectedLayer,
    selectedLayerIndex,
    selectedLayerZone,
    scene.layers.length,
    updateLayer,
    updateScene,
    uploadingLayer,
    handleAutoProcessLayer,
  ]);

  if (loading) {
    return (
      <div
        className="rounded-[28px] border border-[#1c2231] bg-[#0c1016] p-6 text-sm text-white/55 animate-pulse"
        style={{ backgroundColor: "#0c1016", borderColor: "#1c2231", color: "rgba(255,255,255,0.72)" }}
      >
        Loading chamber studio...
      </div>
    );
  }

  return (
    <div className="space-y-5" style={{ color: "#ffffff" }}>
      {error && (
        <div
          className="rounded-2xl border border-red-400/18 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          style={{ backgroundColor: "rgba(239,68,68,0.12)", borderColor: "rgba(239,68,68,0.22)", color: "#fecaca" }}
        >
          {error}
        </div>
      )}
      {status && (
        <div
          className="rounded-2xl border border-[#f4c866]/18 bg-[#f4c866]/8 px-4 py-3 text-sm text-[#f9e1a2]"
          style={{ backgroundColor: "rgba(244,200,102,0.1)", borderColor: "rgba(244,200,102,0.2)", color: "#f9e1a2" }}
        >
          {status}
        </div>
      )}

      <div
        className="overflow-hidden rounded-[32px] border border-[#1b2230] bg-[#090d13] text-white shadow-[0_28px_120px_rgba(0,0,0,0.45)]"
        style={{ backgroundColor: "#090d13", borderColor: "#1b2230", color: "#ffffff" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/6 px-5 py-4 sm:px-6">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f4c866]">Artifact Chamber Studio</p>
            <h3 className="mt-1 text-xl font-semibold text-white">Admin-side digital exhibit composer</h3>
            <p className="mt-1 text-sm text-white/48">Side-panel controls, center-stage chamber preview, and a live museum renderer for final verification.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={saveSceneNow}
              className="inline-flex items-center gap-2 rounded-full border border-[#f4c866]/24 bg-[#f4c866]/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f4c866] transition-colors hover:bg-[#f4c866]/16"
            >
              <Save className="h-3.5 w-3.5" />
              Save Studio
            </button>
            <button
              type="button"
              onClick={handleResetStudio}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70 transition-colors hover:bg-white/[0.08]"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => updateScene((current) => ({ ...current, frameActive: !current.frameActive }))}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] transition-colors",
                scene.frameActive
                  ? "border-emerald-400/24 bg-emerald-400/14 text-emerald-300 hover:bg-emerald-400/20"
                  : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]",
              )}
            >
              <Power className="h-3.5 w-3.5" />
              {scene.frameActive ? "Frame Active" : "Activate for Museum"}
            </button>
            {savedFlash && (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/18 bg-emerald-400/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-300">
                <Check className="h-3 w-3" />
                Saved
              </span>
            )}
          </div>
        </div>

        <input
          ref={layerInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleLayerUpload}
        />
        <input ref={audioInputRef} type="file" accept="audio/*" className="sr-only" onChange={handleLayerAudioUpload} />

        <div className="grid gap-0 xl:grid-cols-[150px_minmax(0,1fr)_280px]">
          <aside
            className="flex flex-col justify-between border-b border-white/6 bg-[linear-gradient(180deg,#0f1218_0%,#0a0d13_100%)] p-4 xl:border-b-0 xl:border-r"
            style={{
              background: "linear-gradient(180deg, #0f1218 0%, #0a0d13 100%)",
              borderBottomColor: "rgba(255,255,255,0.06)",
              borderRightColor: "rgba(255,255,255,0.06)",
            }}
          >
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f4c866]">Curator Console</p>
              <p className="mt-1 text-[10px] text-white/38">Admin access</p>

              <div className="mt-6 space-y-2">
                {PANEL_ITEMS.map((panel) => {
                  const Icon = panel.icon;
                  const isActive = activePanel === panel.id;

                  return (
                    <button
                      key={panel.id}
                      type="button"
                      onClick={() => setActivePanel(panel.id)}
                      className={cn(
                        "w-full rounded-[18px] border px-3 py-3 text-left transition-all",
                        isActive
                          ? "border-[#f4c866]/20 bg-[#f4c866]/10"
                          : "border-transparent bg-white/[0.02] text-white/40 hover:border-white/8 hover:bg-white/[0.04]",
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className={cn("h-4 w-4", isActive ? "text-[#f4c866]" : "text-white/35")} />
                        <div>
                          <p className={cn("text-xs font-medium", isActive ? "text-[#f4c866]" : "text-white/55")}>{panel.label}</p>
                          <p className="mt-1 text-[9px] text-white/28">{panel.id === "layers" ? "Add and stack images" : panel.id === "lighting" ? "Spotlights and shadows" : panel.id === "atmosphere" ? "Haze and warmth" : panel.id === "appearance" ? "Colours and tone" : panel.id === "background" ? "Canvas backdrop" : "Glass and 3D depth"}</p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => void handlePublishCuration()}
              className="mt-6 inline-flex items-center justify-center rounded-[16px] border border-[#f4c866]/24 bg-[#f4c866] px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#1d1704] transition hover:brightness-105"
            >
              Publish Curation
            </button>
          </aside>

          <section
            className="min-w-0 border-b border-white/6 bg-[linear-gradient(180deg,#0b0e14_0%,#0d1016_100%)] p-4 sm:p-5 xl:border-b-0 xl:border-r xl:border-white/6"
            style={{
              background: "linear-gradient(180deg, #0b0e14 0%, #0d1016 100%)",
              borderBottomColor: "rgba(255,255,255,0.06)",
              borderRightColor: "rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div className="flex flex-wrap items-center gap-6 overflow-x-auto text-[11px] uppercase tracking-[0.18em] text-white/42">
                <span className="font-serif text-xl normal-case tracking-normal text-[#f4c866]">The Obsidian Gallery</span>
                <span>Exhibitions</span>
                <span className="text-[#f4c866]">Tours</span>
                <span>Archive</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoArrange}
                  disabled={scene.layers.length === 0}
                  className="inline-flex items-center gap-2 rounded-full border border-[#f4c866]/18 bg-[#f4c866]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f4c866] transition hover:bg-[#f4c866]/16 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto-Arrange
                </button>
                <button
                  type="button"
                  onClick={() => layerInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:bg-white/[0.08]"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingLayer ? "Adding..." : "Import Assets"}
                </button>
              </div>
            </div>

            <div
              ref={previewRef}
              className="relative aspect-[16/10] overflow-hidden rounded-[20px] border border-white/8"
              style={{
                backgroundColor: scene.bgGradientPreset === "custom" ? scene.bgColor : "#05070b",
                background: scene.bgGradientPreset !== "custom"
                  ? (BG_GRADIENT_PRESETS.find((p) => p.id === scene.bgGradientPreset)?.css ?? "radial-gradient(ellipse at center, #0a0e15, #050709)")
                  : scene.bgColor,
                borderColor: "rgba(255,255,255,0.08)",
                opacity: scene.bgOpacity / 100,
              }}
              onPointerMove={handleStagePointerMove}
              onPointerLeave={() => setPointer({ x: 50, y: 18 })}
            >
              {dragOverFrame && (
                <div className="absolute inset-0 z-[500] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-full border-2 border-dashed border-[#f4c866]/50 p-6">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#f4c866]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <p className="text-sm font-semibold text-[#f4c866] tracking-wide">Drop artefacts into the chamber</p>
                    <p className="text-[10px] text-white/40">Images will be auto-placed on the canvas</p>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_55%)]" />
              <div className="absolute inset-[8%] opacity-50" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,0.08) 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
              <div className="pointer-events-none absolute inset-[12%_18%_17%_18%] border border-white/8" />
              <div className="pointer-events-none absolute left-[24%] top-[10%] h-[72%] w-[58%] rotate-[11deg] border border-white/7" />
              <div className="pointer-events-none absolute left-[12%] top-[5%] h-[82%] w-[67%] -rotate-[9deg] border border-white/6" />

              <img src={stageFrameUrl} alt="Artifact chamber" className="absolute inset-0 h-full w-full object-cover opacity-55" />

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
                {scene.layers.length > 0 ? (
                  scene.layers.map((layer, index) => {
                    const previewUrl = layerPreviewMap[layer.id] ?? SAMPLE_ARTIFACT;
                    const isSelected = layer.id === scene.selectedLayerId;
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
                      <div
                        key={layer.id}
                        className="absolute"
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
                        <button
                          type="button"
                          onClick={() => updateScene((current) => ({ ...current, selectedLayerId: layer.id }))}
                          onPointerDown={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            dragLayerRef.current = {
                              layerId: layer.id,
                              startClientX: event.clientX,
                              startClientY: event.clientY,
                              startX: layer.x,
                              startY: layer.y,
                            };
                            updateScene((current) => ({ ...current, selectedLayerId: layer.id }));
                          }}
                          className={cn(
                            "w-full cursor-grab touch-none select-none rounded-[16px] p-2 transition-all duration-300 active:cursor-grabbing",
                            isSelected ? "ring-2 ring-[#f4c866]/60" : "hover:ring-1 hover:ring-white/20",
                          )}
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
                        </button>
                        {/* Artifact name label */}
                        <p className="pointer-events-none mt-1 truncate text-center text-[8px] font-semibold uppercase tracking-[0.12em] text-white/50">{layer.label}</p>
                        {/* Resize corner handles */}
                        {isSelected && (
                          <>
                            {(["nw", "ne", "sw", "se"] as const).map((corner) => (
                              <div
                                key={corner}
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  resizeLayerRef.current = {
                                    layerId: layer.id,
                                    startClientX: e.clientX,
                                    startClientY: e.clientY,
                                    startScale: layer.scale,
                                    startX: layer.x,
                                    startY: layer.y,
                                    corner,
                                  };
                                }}
                                className={cn(
                                  "absolute h-3 w-3 rounded-full border-2 border-[#f4c866] bg-[#1a1406] cursor-nwse-resize z-[9999] touch-none",
                                  corner === "nw" && "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
                                  corner === "ne" && "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
                                  corner === "sw" && "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
                                  corner === "se" && "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
                                )}
                              />
                            ))}
                          </>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center rounded-[18px] border border-dashed border-white/10 bg-black/20 p-6 text-center text-sm text-white/42">
                    Upload artefact images to start arranging this chamber scene.
                  </div>
                )}
              </div>

              <div className="pointer-events-none absolute bottom-3 left-4 text-[9px] uppercase tracking-[0.18em] text-white/35">
                Viewport: Perspective_01
              </div>
              <div className="pointer-events-none absolute bottom-3 right-5 h-2 w-2 rounded-full bg-red-500" />
            </div>

            {/* Full Preview Toggle */}
            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowFullPreview(!showFullPreview)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
                  showFullPreview
                    ? "border-[#f4c866]/22 bg-[#f4c866]/10 text-[#f4c866]"
                    : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]",
                )}
              >
                <ZoomIn className="h-3.5 w-3.5" />
                {showFullPreview ? "Hide Full Preview" : "Full Preview"}
              </button>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-[0.14em] text-white/35">{scene.layers.length} image{scene.layers.length !== 1 ? "s" : ""}</span>
                {scene.frameActive && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/18 bg-emerald-400/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                    <Power className="h-2.5 w-2.5" /> Live
                  </span>
                )}
              </div>
            </div>

            {/* Full Preview Panel — click images to select and edit them */}
            {showFullPreview && (
              <div className="mt-3 text-center">
                <p className="text-[10px] text-white/35">Full preview is open as a fullscreen overlay.</p>
              </div>
            )}

            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_180px]">
              <div className="rounded-[18px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="font-serif text-2xl text-white">Image Settings</h4>
                    <p className="mt-1 text-xs uppercase tracking-[0.18em] text-white/35">{selectedLayer?.label ?? "No Layer"} &middot; {selectedLayerZone}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {([
                      { id: "transform" as const, label: "Position", icon: Move },
                      { id: "appearance" as const, label: "Look", icon: Paintbrush },
                      { id: "fade" as const, label: "Fade", icon: Palette },
                      { id: "details" as const, label: "Details", icon: Tag },
                    ]).map((tab) => {
                      const TabIcon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setCenterTab(tab.id)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] transition-all",
                            centerTab === tab.id
                              ? "border-[#f4c866]/22 bg-[#f4c866]/10 text-[#f4c866]"
                              : "border-white/8 bg-white/[0.02] text-white/40 hover:text-white/60",
                          )}
                        >
                          <TabIcon className="h-3 w-3" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {selectedLayer ? (
                  <div className="mt-4">
                    {centerTab === "transform" && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <SliderField label="Position X" value={Math.round(selectedLayer.x)} min={Math.ceil(-selectedLayerBounds.xLimit)} max={Math.floor(selectedLayerBounds.xLimit)} unit="%" hint="Move left or right." onChange={(value) => updateLayer(selectedLayer.id, { x: value })} />
                        <SliderField label="Position Y" value={Math.round(selectedLayer.y)} min={Math.ceil(-selectedLayerBounds.yLimit)} max={Math.floor(selectedLayerBounds.yLimit)} unit="%" hint="Move up or down." onChange={(value) => updateLayer(selectedLayer.id, { y: value })} />
                        <SliderField label="Rotation" value={Math.round(selectedLayer.rotation)} min={-30} max={30} unit="deg" hint="Tilt the image." onChange={(value) => updateLayer(selectedLayer.id, { rotation: value })} />
                        <SliderField label="Size" value={Math.round(selectedLayer.scale)} min={12} max={70} unit="%" hint="Make bigger or smaller." onChange={(value) => updateLayer(selectedLayer.id, { scale: value })} />
                        <SliderField label="Layer Depth" value={Math.round(selectedLayer.depth)} min={-20} max={60} unit="px" hint="Push forward or back in 3D space." onChange={(value) => updateLayer(selectedLayer.id, { depth: value })} />
                        <SliderField label="See-through" value={Math.round(selectedLayer.opacity)} min={10} max={100} unit="%" hint="How visible the image is." onChange={(value) => updateLayer(selectedLayer.id, { opacity: value })} />
                      </div>
                    )}

                    {centerTab === "appearance" && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <SliderField label="Brightness" value={Math.round(selectedLayer.brightness)} min={0} max={200} unit="%" hint="Make lighter or darker." onChange={(value) => updateLayer(selectedLayer.id, { brightness: value })} onReset={selectedLayer.brightness !== 100 ? () => updateLayer(selectedLayer.id, { brightness: 100 }) : undefined} />
                        <SliderField label="Contrast" value={Math.round(selectedLayer.contrast)} min={0} max={200} unit="%" hint="Sharpen the difference between dark and light." onChange={(value) => updateLayer(selectedLayer.id, { contrast: value })} onReset={selectedLayer.contrast !== 100 ? () => updateLayer(selectedLayer.id, { contrast: 100 }) : undefined} />
                        <SliderField label="Colour Boost" value={Math.round(selectedLayer.saturate)} min={0} max={200} unit="%" hint="Make colours stronger or weaker." onChange={(value) => updateLayer(selectedLayer.id, { saturate: value })} onReset={selectedLayer.saturate !== 100 ? () => updateLayer(selectedLayer.id, { saturate: 100 }) : undefined} />
                        <SliderField label="Colour Shift" value={Math.round(selectedLayer.hueRotate)} min={-180} max={180} step={1} unit="°" hint="Change the overall colour tone." onChange={(value) => updateLayer(selectedLayer.id, { hueRotate: value })} onReset={selectedLayer.hueRotate !== 0 ? () => updateLayer(selectedLayer.id, { hueRotate: 0 }) : undefined} />
                        <SliderField label="Black & White" value={Math.round(selectedLayer.grayscale)} min={0} max={100} unit="%" hint="Remove colour for a classic look." onChange={(value) => updateLayer(selectedLayer.id, { grayscale: value })} onReset={selectedLayer.grayscale !== 0 ? () => updateLayer(selectedLayer.id, { grayscale: 0 }) : undefined} />
                        <SliderField label="Vintage Tone" value={Math.round(selectedLayer.sepia)} min={0} max={100} unit="%" hint="Add warm old-photo feel." onChange={(value) => updateLayer(selectedLayer.id, { sepia: value })} onReset={selectedLayer.sepia !== 0 ? () => updateLayer(selectedLayer.id, { sepia: 0 }) : undefined} />
                        <div className="md:col-span-2">
                          <button
                            type="button"
                            onClick={() => updateLayer(selectedLayer.id, { brightness: 100, contrast: 100, saturate: 100, hueRotate: 0, grayscale: 0, sepia: 0 })}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:bg-white/[0.07]"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset Look to Default
                          </button>
                        </div>
                      </div>
                    )}

                    {centerTab === "fade" && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <SliderField label="Edge Fade" value={Math.round(selectedLayer.bgFade)} min={0} max={100} unit="%" hint="Softly hide the edges and background of the image." onChange={(value) => updateLayer(selectedLayer.id, { bgFade: value })} onReset={selectedLayer.bgFade !== 0 ? () => updateLayer(selectedLayer.id, { bgFade: 0 }) : undefined} />
                        <SliderField label="Blur" value={Math.round(selectedLayer.blur)} min={0} max={20} unit="px" hint="Soften the image like frosted glass." onChange={(value) => updateLayer(selectedLayer.id, { blur: value })} onReset={selectedLayer.blur !== 0 ? () => updateLayer(selectedLayer.id, { blur: 0 }) : undefined} />
                        <SliderField label="Shadow Weight" value={Math.round(selectedLayer.shadow)} min={0} max={100} unit="%" hint="How dark the shadow under the image is." onChange={(value) => updateLayer(selectedLayer.id, { shadow: value })} />
                        <SliderField label="Glow" value={Math.round(selectedLayer.glow)} min={0} max={100} unit="%" hint="Warm light halo around the image." onChange={(value) => updateLayer(selectedLayer.id, { glow: value })} />
                        <div className="md:col-span-2 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Blend Mode</p>
                          <div className="flex flex-wrap gap-2">
                            {["normal", "multiply", "screen", "overlay", "soft-light", "luminosity"].map((mode) => (
                              <button
                                key={mode}
                                type="button"
                                onClick={() => updateLayer(selectedLayer.id, { mixBlend: mode })}
                                className={cn(
                                  "rounded-[10px] border px-2.5 py-1.5 text-[10px] font-semibold capitalize transition",
                                  selectedLayer.mixBlend === mode
                                    ? "border-[#f4c866]/22 bg-[#f4c866]/10 text-[#f4c866]"
                                    : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]",
                                )}
                              >
                                {mode.replace("-", " ")}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-white/35">Changes how the image colours mix with the background.</p>
                        </div>
                        <div className="md:col-span-2">
                          <button
                            type="button"
                            onClick={() => updateLayer(selectedLayer.id, { bgFade: 0, blur: 0, shadow: 56, glow: 22, mixBlend: "normal" })}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/70 transition-colors hover:bg-white/[0.07]"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Reset Fade to Default
                          </button>
                        </div>
                      </div>
                    )}

                    {centerTab === "details" && (
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="md:col-span-2 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Category</p>
                          <div className="flex flex-wrap gap-2">
                            {LAYER_CATEGORIES.map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => updateLayer(selectedLayer.id, { category: cat })}
                                className={cn(
                                  "rounded-[10px] border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition",
                                  selectedLayer.category === cat
                                    ? "border-[#f4c866]/22 bg-[#f4c866]/10 text-[#f4c866]"
                                    : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]",
                                )}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                          <p className="text-[10px] text-white/35">Assign a tour or collection category to this image.</p>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Description / Details</p>
                          <textarea
                            value={selectedLayer.categoryDetail}
                            onChange={(e) => updateLayer(selectedLayer.id, { categoryDetail: e.target.value })}
                            rows={3}
                            className="w-full rounded-lg border border-white/12 bg-transparent px-3 py-2 text-sm text-white outline-none transition focus:border-[#f4c866]/35 resize-none"
                            placeholder="Write a caption, historical note, or detail about this artefact..."
                          />
                          <p className="text-[10px] text-white/35">Show this description to visitors when they explore this item.</p>
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Image Audio</p>
                          <div className="flex items-center gap-3">
                            <label className={cn(
                              "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
                              "border-white/12 bg-white/[0.05] text-white/70 hover:bg-white/[0.08]",
                              uploadingAudio && "pointer-events-none opacity-60",
                            )}>
                              <Music className="h-3.5 w-3.5" />
                              {uploadingAudio ? "Uploading..." : selectedLayer.audioRef ? "Replace Audio" : "Upload Audio"}
                              <input
                                ref={audioInputRef}
                                type="file"
                                accept="audio/*"
                                className="sr-only"
                                onChange={handleLayerAudioUpload}
                              />
                            </label>
                            {selectedLayer.audioRef && (
                              <button
                                type="button"
                                onClick={() => updateLayer(selectedLayer.id, { audioRef: "" })}
                                className="inline-flex items-center gap-1 rounded-full border border-red-400/15 bg-red-400/10 px-2.5 py-1.5 text-[10px] font-semibold text-red-300 transition hover:bg-red-400/16"
                              >
                                <Trash2 className="h-3 w-3" />
                                Remove
                              </button>
                            )}
                          </div>
                          {selectedLayer.audioRef && (
                            <p className="text-[10px] text-emerald-400 flex items-center gap-1"><Volume2 className="h-3 w-3" /> Audio attached</p>
                          )}
                          <p className="text-[10px] text-white/35">Plays when this image is in focus on the museum display.</p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[16px] border border-dashed border-white/10 bg-black/20 p-4 text-sm text-white/42">
                    Pick an image from the tray below to change its settings.
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleAutoProcessLayer}
                  className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-[#f4c866]/20 bg-[#2a2722] px-3 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f4c866] transition hover:bg-[#343028]"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto-Fix Image
                </button>
                <button
                  type="button"
                  onClick={saveSceneNow}
                  className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-black/55 px-3 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:bg-black/72"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save Scene Template
                </button>
                <button
                  type="button"
                  onClick={() => void applyStageAsLiveFrame()}
                  className="flex w-full items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-black/40 px-3 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/68 transition hover:bg-black/55"
                >
                  <Check className="h-3.5 w-3.5" />
                  Apply Live
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[18px] border border-white/8 bg-black/28 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/38">Artifact Asset Tray</p>
                  <p className="mt-1 text-xs text-white/32">Import assets, select a layer, then drag it anywhere inside the glass opening.</p>
                </div>
                <button
                  type="button"
                  onClick={() => layerInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-full border border-[#f4c866]/18 bg-[#f4c866]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f4c866] transition hover:bg-[#f4c866]/16"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Import Assets
                </button>
              </div>

              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {scene.layers.map((layer, index) => {
                  const previewUrl = layerPreviewMap[layer.id] ?? SAMPLE_ARTIFACT;
                  const isSelected = layer.id === scene.selectedLayerId;

                  return (
                    <button
                      key={layer.id}
                      type="button"
                      onClick={() => updateScene((current) => ({ ...current, selectedLayerId: layer.id }))}
                      className={cn(
                        "min-w-[120px] rounded-[16px] border p-2 text-left transition-all",
                        isSelected
                          ? "border-[#f4c866]/26 bg-[#f4c866]/10"
                          : "border-white/8 bg-white/[0.02] hover:bg-white/[0.04]",
                      )}
                    >
                      <div className="flex h-16 items-center justify-center rounded-[12px] bg-black/35">
                        <img src={previewUrl} alt={layer.label} className="max-h-full max-w-full object-contain p-1.5" />
                      </div>
                      <p className="mt-2 truncate text-xs font-semibold text-white/82">{layer.label}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[0.12em] text-white/34">{getLayerZoneLabel(layer.depth)}</p>
                      {layer.category !== "Uncategorised" && (
                        <p className="mt-1 truncate text-[9px] uppercase tracking-[0.1em] text-[#f4c866]/60">{layer.category}</p>
                      )}
                      <div className="mt-1 flex items-center gap-1">
                        {layer.audioRef && <Volume2 className="h-2.5 w-2.5 text-emerald-400/60" />}
                        {layer.categoryDetail && <Tag className="h-2.5 w-2.5 text-white/25" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          <aside
            className="bg-[linear-gradient(180deg,#0d1016_0%,#0a0d13_100%)] p-4 sm:p-5"
            style={{ background: "linear-gradient(180deg, #0d1016 0%, #0a0d13 100%)" }}
          >
            <div className="space-y-4">
              <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                <h4 className="font-serif text-2xl text-[#f4c866]">Scene Metadata</h4>

                <div className="mt-4 space-y-4">
                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/34">Artifact Title</span>
                    <input
                      value={scene.artifactTitle}
                      onChange={(event) => updateScene((current) => ({ ...current, artifactTitle: event.target.value }))}
                      className="mt-2 w-full rounded-none border border-white/12 bg-transparent px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#f4c866]/35"
                    />
                  </label>

                  <label className="block">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/34">Exhibition Category</span>
                    <select
                      value={scene.exhibitionCategory}
                      onChange={(event) => updateScene((current) => ({ ...current, exhibitionCategory: event.target.value }))}
                      className="mt-2 w-full rounded-none border border-white/12 bg-transparent px-3 py-2.5 text-sm text-white outline-none transition focus:border-[#f4c866]/35"
                    >
                      <option className="bg-[#0f1218]" value="Classical Echoes">Classical Echoes</option>
                      <option className="bg-[#0f1218]" value="Defence Memory">Defence Memory</option>
                      <option className="bg-[#0f1218]" value="National Collections">National Collections</option>
                      <option className="bg-[#0f1218]" value="Strategic Relics">Strategic Relics</option>
                    </select>
                  </label>

                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/34">Tour Association</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {["Midnight Tour", "Regional Tour", "World Tour"].map((tour) => (
                        <button
                          key={tour}
                          type="button"
                          onClick={() => updateScene((current) => ({ ...current, tourAssociation: tour }))}
                          className={cn(
                            "rounded-[10px] border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition",
                            scene.tourAssociation === tour
                              ? "border-[#f4c866]/22 bg-[#f4c866]/10 text-[#f4c866]"
                              : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]",
                          )}
                        >
                          {tour}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => updateScene((current) => ({ ...current, vipAccess: !current.vipAccess }))}
                        className={cn(
                          "rounded-[10px] border px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] transition",
                          scene.vipAccess
                            ? "border-white/10 bg-white/[0.08] text-white/85"
                            : "border-white/10 bg-white/[0.03] text-white/50",
                        )}
                      >
                        VIP Access
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStatus(`Linked ${scene.artifactTitle} to ${scene.tourAssociation}.`)}
                      className="mt-3 inline-flex items-center gap-2 rounded-[10px] border border-[#f4c866]/18 bg-black/25 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f4c866] transition hover:bg-black/40"
                    >
                      <Check className="h-3.5 w-3.5" />
                      Link Tour
                    </button>
                  </div>

                  {/* Background Sound */}
                  <div className="mt-4 pt-4 border-t border-white/8">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/34">Background Sound</span>
                    <p className="mt-1 text-[10px] text-white/32">Ambient audio that plays when this frame is active on the museum.</p>
                    <div className="mt-3 flex items-center gap-3">
                      <label className={cn(
                        "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
                        "border-white/12 bg-white/[0.05] text-white/70 hover:bg-white/[0.08]",
                        uploadingAudio && "pointer-events-none opacity-60",
                      )}>
                        <Volume2 className="h-3.5 w-3.5" />
                        {uploadingAudio ? "Uploading..." : scene.backgroundAudioRef ? "Replace" : "Upload Audio"}
                        <input
                          ref={bgAudioInputRef}
                          type="file"
                          accept="audio/*"
                          className="sr-only"
                          onChange={handleBgAudioUpload}
                        />
                      </label>
                      {scene.backgroundAudioRef && (
                        <button
                          type="button"
                          onClick={() => updateScene((current) => ({ ...current, backgroundAudioRef: "" }))}
                          className="inline-flex items-center gap-1 rounded-full border border-red-400/15 bg-red-400/10 px-2.5 py-1.5 text-[10px] font-semibold text-red-300 transition hover:bg-red-400/16"
                        >
                          <Trash2 className="h-3 w-3" />
                          Remove
                        </button>
                      )}
                    </div>
                    {scene.backgroundAudioRef && (
                      <p className="mt-2 text-[10px] text-emerald-400 flex items-center gap-1"><Volume2 className="h-3 w-3" /> Background audio set</p>
                    )}
                  </div>

                  {/* Frame Activation Status */}
                  <div className="mt-4 pt-4 border-t border-white/8">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/34">Museum Status</span>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateScene((current) => ({ ...current, frameActive: !current.frameActive }))}
                        className={cn(
                          "inline-flex items-center gap-2 rounded-[10px] border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition",
                          scene.frameActive
                            ? "border-emerald-400/22 bg-emerald-400/12 text-emerald-300"
                            : "border-white/10 bg-white/[0.03] text-white/50 hover:bg-white/[0.06]",
                        )}
                      >
                        <Power className="h-3 w-3" />
                        {scene.frameActive ? "Active on Museum" : "Activate"}
                      </button>
                    </div>
                    <p className="mt-2 text-[10px] text-white/32">
                      {scene.frameActive
                        ? "This frame is live and visible to visitors on the museum display."
                        : "Frame is not visible to visitors. Toggle to make it live."}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/34">{PANEL_ITEMS.find((panel) => panel.id === activePanel)?.label}</p>
                  <span className="rounded-full border border-[#f4c866]/18 bg-[#f4c866]/10 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#f4c866]">
                    Active
                  </span>
                </div>
                <div className="mt-4 space-y-3">{activePanelContent}</div>
              </div>

              <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/34">Composer Status</p>
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </div>
                <div className="mt-4 space-y-2 text-xs text-white/48">
                  <div className="flex items-center justify-between rounded-[14px] border border-white/6 bg-black/18 px-3 py-2.5">
                    <span>Rendering Engine</span>
                    <span className="text-emerald-400">Active</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[14px] border border-white/6 bg-black/18 px-3 py-2.5">
                    <span>Selected Layer</span>
                    <span className="text-white/72">{selectedLayer?.label ?? "None"}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[14px] border border-white/6 bg-black/18 px-3 py-2.5">
                    <span>Cloud Sync</span>
                    <span className="text-white/58">12m ago</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/34">Frame Preview</p>
                    <p className="mt-1 text-xs text-white/32">Live museum renderer with the selected chamber frame.</p>
                  </div>
                  <Eye className="h-4 w-4 text-[#f4c866]" />
                </div>
                <div className="mt-4">
                  <MuseumObjectViewer
                    title="Museum Display Preview"
                    mediaSources={[selectedLayer?.sourceRef ?? SAMPLE_ARTIFACT]}
                    isLightMode={false}
                    compact
                    topLabel="Live Render"
                    footerLabel={stageFrameOption?.label ?? "Soft Light Chamber"}
                    showControls={false}
                    frameOverride={stageFrameUrl}
                    displayParamsOverride={displayParams}
                    loading="eager"
                  />
                </div>
              </div>

              <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/34">Reference Frames</p>
                    <p className="mt-1 text-xs text-white/32">Upload or switch the backdrop the chamber editor uses.</p>
                  </div>
                  <label className={cn(
                    "inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors",
                    "border-white/12 bg-white/[0.05] text-white/70 hover:bg-white/[0.08]",
                    uploadingFrame && "pointer-events-none opacity-60",
                  )}>
                    <ImagePlus className="h-3.5 w-3.5" />
                    {uploadingFrame ? "Adding..." : "Upload"}
                    <input
                      ref={frameInputRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleFrameUpload}
                    />
                  </label>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  {frameOptions.map((option) => {
                    const isSelected = scene.stageFrameRef === option.ref;
                    const isLive = frameRef === option.ref;

                    return (
                      <div
                        key={option.ref}
                        className={cn(
                          "relative group overflow-hidden rounded-[14px] border transition-all",
                          isSelected
                            ? "border-[#f4c866]/26 bg-[#f4c866]/10"
                            : "border-white/8 bg-white/[0.02] hover:border-white/16",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => updateScene((current) => ({ ...current, stageFrameRef: option.ref }))}
                          className="block w-full text-left"
                        >
                          <div className="aspect-[4/3] overflow-hidden bg-black/40">
                            <img src={option.url} alt={option.label} className="h-full w-full object-cover" />
                          </div>
                          <div className="px-2 py-2">
                            <p className="truncate text-[10px] font-semibold text-white/78">{option.label}</p>
                            {isLive && <p className="mt-1 text-[9px] uppercase tracking-[0.12em] text-emerald-400">Live</p>}
                          </div>
                        </button>
                        {!option.isBuiltIn && (
                          <button
                            type="button"
                            onClick={() => {
                              void removeFrame(option.ref);
                              updateScene((current) => ({
                                ...current,
                                stageFrameRef: current.stageFrameRef === option.ref ? REFERENCE_CHAMBER_FRAME : current.stageFrameRef,
                              }));
                            }}
                            className="absolute right-2 top-2 rounded-full border border-red-400/12 bg-red-400/16 p-1 text-red-200 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Fullscreen Preview Overlay */}
      {showFullPreview && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col bg-black/95 backdrop-blur-sm"
          style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between gap-4 border-b border-white/8 bg-[#090d13] px-6 py-3">
            <div className="flex items-center gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f4c866]">Full Frame Preview</p>
              <span className="text-[10px] uppercase tracking-[0.14em] text-white/35">{scene.layers.length} image{scene.layers.length !== 1 ? "s" : ""}</span>
              {selectedLayer && (
                <span className="rounded-full border border-[#f4c866]/18 bg-[#f4c866]/10 px-3 py-1 text-[10px] font-semibold text-[#f4c866]">
                  Selected: {selectedLayer.label}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowFullPreview(false)}
              className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/80 transition hover:bg-white/[0.12]"
            >
              Close Preview
            </button>
          </div>

          {/* Full frame area */}
          <div className="flex-1 flex items-center justify-center p-6">
            <div
              className="relative w-full h-full max-w-[1600px] overflow-hidden rounded-[20px] border border-white/10"
              style={{
                backgroundColor: scene.bgGradientPreset === "custom" ? scene.bgColor : "#05070b",
                background: scene.bgGradientPreset !== "custom"
                  ? (BG_GRADIENT_PRESETS.find((p) => p.id === scene.bgGradientPreset)?.css ?? "radial-gradient(ellipse at center, #0a0e15, #050709)")
                  : scene.bgColor,
              }}
            >
              <img src={stageFrameUrl} alt="Frame" className="absolute inset-0 h-full w-full object-cover opacity-55" />

              {/* Lighting overlays */}
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(circle at 50% 12%, rgba(255,246,220,${scene.ambientLight / 205}) 0%, transparent 36%), radial-gradient(circle at 50% 88%, rgba(255,210,120,${scene.floorGlow / 260}) 0%, transparent 26%)`,
                }}
              />

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
                  const isSelected = layer.id === scene.selectedLayerId;
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
                      onClick={() => {
                        updateScene((current) => ({ ...current, selectedLayerId: layer.id }));
                      }}
                      className={cn(
                        "absolute cursor-pointer transition-all duration-200",
                        isSelected ? "ring-2 ring-[#f4c866]/60 rounded-[12px]" : "hover:ring-1 hover:ring-white/25 rounded-[12px]",
                      )}
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
                      <p className="pointer-events-none mt-1 truncate text-center text-[9px] font-semibold uppercase tracking-[0.12em] text-white/55">{layer.label}</p>
                      {layer.category !== "Uncategorised" && (
                        <p className="pointer-events-none truncate text-center text-[7px] uppercase tracking-[0.1em] text-[#f4c866]/60">{layer.category}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom bar — selected image info */}
          <div className="border-t border-white/8 bg-[#090d13] px-6 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                {selectedLayer ? (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-white">{selectedLayer.label}</p>
                      <p className="text-[10px] text-white/40">
                        {selectedLayer.category} &middot; {getLayerZoneLabel(selectedLayer.depth)}
                        {selectedLayer.categoryDetail && ` &middot; ${selectedLayer.categoryDetail.slice(0, 60)}${selectedLayer.categoryDetail.length > 60 ? "..." : ""}`}
                      </p>
                    </div>
                    {selectedLayer.audioRef && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400"><Volume2 className="h-3 w-3" /> Audio</span>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-white/40">Click any image in the frame to select it</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                {scene.frameActive && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/18 bg-emerald-400/10 px-3 py-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-emerald-300">
                    <Power className="h-2.5 w-2.5" /> Live on Museum
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setShowFullPreview(false)}
                  className="text-[10px] uppercase tracking-[0.14em] text-white/40 hover:text-white/60 transition"
                >
                  ESC to close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}