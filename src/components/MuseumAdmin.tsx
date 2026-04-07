import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  ImagePlus,
  Loader2,
  Music,
  Plus,
  RefreshCcw,
  RotateCcw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MuseumObjectViewer, ANIMATION_PRESETS } from "@/components/MuseumObjectViewer";
import type { AnimationPreset } from "@/components/MuseumObjectViewer";
import { MuseumContentAdmin } from "@/components/MuseumContentAdmin";
import { DisplayFrameAdmin } from "@/components/DisplayFrameAdmin";
import { useAudioStore, getAudioUrl } from "@/hooks/useAudioStore";
import { useCategoryAnimationSettings, DEFAULT_CATEGORY_ANIMATION } from "@/hooks/useCategoryAnimationSettings";
import type { CategoryAnimationConfig } from "@/hooks/useCategoryAnimationSettings";
import { useCategoryImageDefaults } from "@/hooks/useCategoryImageDefaults";
import { saveMediaFile } from "@/lib/persistentMedia";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Gallery category constants                                        */
/* ------------------------------------------------------------------ */
const GALLERY_CATEGORIES = [
  { id: "history", label: "History Collection", color: "#002060" },
  { id: "state", label: "State Collection", color: "#FFD700" },
  { id: "regional", label: "Regional Collection", color: "#FF0000" },
  { id: "world", label: "World Collection", color: "#00B0F0" },
  { id: "archives", label: "Archives", color: "#8B7355" },
] as const;

type GalleryCategoryId = (typeof GALLERY_CATEGORIES)[number]["id"];

/* ------------------------------------------------------------------ */
/*  Shared types                                                      */
/* ------------------------------------------------------------------ */
/** Per-image filter/background settings stored as JSONB */
type ImageSettings = {
  brightness?: number;   // 0–200  default 100
  contrast?: number;     // 0–200  default 100
  saturation?: number;   // 0–200  default 100
  opacity?: number;      // 0–100  default 100
  hueRotate?: number;    // 0–360  default 0
  sepia?: number;        // 0–100  default 0
  blur?: number;         // 0–10   default 0
  warmth?: number;       // -50–50 default 0  (mapped to sepia+hue trick)
  bgPreset?: string;     // preset key like "navy-gold", "museum-dark", etc.
  bgCustomUrl?: string;  // user-uploaded custom background URL
  // Per-artifact depth / frame overrides (optional — fall back to global)
  depthZ?: number;       // 0–60   (default: use global)
  perspective?: number;  // 300–2000 (default: use global)
  objectInset?: number;  // 5–40   (default: use global)
  freeRotation?: boolean; // enable 3D swipe-to-rotate on the glass case
  animation?: string;     // cinematic animation preset key (default: use category config)
  animationSpeed?: number; // speed multiplier 0.1–3 (default: use category config)
  bgFade?: number;           // background fade intensity 0–100 (0 = off)
};

const DEFAULT_IMAGE_SETTINGS: ImageSettings = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  opacity: 100,
  hueRotate: 0,
  sepia: 0,
  blur: 0,
  warmth: 0,
  bgPreset: "",
  bgCustomUrl: "",
  bgFade: 55,
};

type ArtifactRecord = {
  id: string;
  name: string;
  description: string | null;
  era: string | null;
  origin_label: string | null;
  strategic_significance: string | null;
  gallery_category: string | null;
  period_label: string | null;
  collection_id: string | null;
  tag: string | null;
  location: string | null;
  display_order: number;
  media_urls: string[];
  tags: string[];
  image_settings: ImageSettings;
  is_published: boolean;
};

type MuseumSubTab = "artefacts" | "categories" | "audio" | "content" | "frames";

const MAX_MEDIA_SIZE_MB = 8;
const MAX_MEDIA_BYTES = MAX_MEDIA_SIZE_MB * 1024 * 1024;

/* ------------------------------------------------------------------ */
/*  Section header (reusable)                                         */
/* ------------------------------------------------------------------ */
function PanelHeader({
  title,
  subtitle,
  count,
  open,
  onToggle,
  color = "#FFD700",
}: {
  title: string;
  subtitle?: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition hover:bg-gray-100"
      style={{ borderColor: `${color}33`, backgroundColor: `${color}0a` }}
    >
      <div>
        <span className="text-sm font-semibold" style={{ color }}>
          {title}
          {count != null && <span className="text-gray-400 font-normal ml-1">({count})</span>}
        </span>
        {subtitle && <p className="text-[10px] text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Artefact Quick Preview — upload images and preview in glass case  */
/* ------------------------------------------------------------------ */
function ArtefactQuickPreview() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const fileArr = Array.from(files);
    const oversized = fileArr.find((f) => f.size > MAX_MEDIA_BYTES);
    if (oversized) {
      alert(`${oversized.name} exceeds ${MAX_MEDIA_SIZE_MB}MB limit.`);
      return;
    }
    setUploading(true);
    try {
      const urls = fileArr.map((f) => URL.createObjectURL(f));
      setPreviewUrls((prev) => [...prev, ...urls]);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      void handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-base font-semibold text-[#002060]">Artefact Image Preview</h4>
        <p className="text-xs text-gray-400 mt-0.5">
          Upload images to preview how they look inside the glass display case before assigning to an artefact.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#FFD700]/25 bg-[#002060]/10 p-8 text-center transition hover:border-[#FFD700]/40 hover:bg-[#002060]/15 cursor-pointer"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="h-8 w-8 text-[#002060]/40 mb-3" />
        <p className="text-sm text-gray-600">
          {uploading ? "Processing..." : "Drag & drop images here or click to upload"}
        </p>
        <p className="text-[10px] text-gray-400 mt-1">PNG, JPG up to {MAX_MEDIA_SIZE_MB}MB</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void handleFiles(e.target.files)}
        />
      </div>

      {/* Preview grid */}
      {previewUrls.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs uppercase tracking-wider text-gray-500">
              {previewUrls.length} image{previewUrls.length !== 1 ? "s" : ""} loaded
            </p>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                previewUrls.forEach((u) => URL.revokeObjectURL(u));
                setPreviewUrls([]);
              }}
              className="text-gray-400 hover:text-gray-800"
            >
              <Trash2 className="h-3 w-3 mr-1" /> Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {previewUrls.map((url, idx) => (
              <div key={url} className="relative">
                <MuseumObjectViewer
                  title={`Preview ${idx + 1}`}
                  mediaSources={[url]}
                  isLightMode={false}
                  compact
                  topLabel={`Preview ${idx + 1}`}
                  emptyLabel="Preview"
                  loading="eager"
                />
                <button
                  onClick={() => {
                    URL.revokeObjectURL(url);
                    setPreviewUrls((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  className="absolute top-2 right-2 z-40 p-1.5 rounded-full bg-gray-100 border border-gray-200 text-gray-600 hover:text-white hover:bg-red-500/40 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Background presets per collection type                             */
/* ------------------------------------------------------------------ */
const BG_PRESETS: { key: string; label: string; value: string; recommended?: GalleryCategoryId[] }[] = [
  { key: "", label: "Default Glass Case", value: "" },
  { key: "navy-gold", label: "Navy & Gold", value: "linear-gradient(135deg, #001a33 0%, #002060 40%, #1a1200 100%)", recommended: ["history", "state"] },
  { key: "museum-dark", label: "Museum Dark", value: "linear-gradient(160deg, #0a0a0a 0%, #1a1a2e 50%, #0d0d1a 100%)", recommended: ["history", "archives"] },
  { key: "velvet-drape", label: "Velvet Drape", value: "linear-gradient(180deg, #1a0000 0%, #330000 35%, #1a0a00 100%)", recommended: ["state", "regional"] },
  { key: "continental", label: "Continental Warm", value: "linear-gradient(135deg, #1a1200 0%, #332200 40%, #0d0d00 100%)", recommended: ["regional"] },
  { key: "global-blue", label: "Global Blue", value: "linear-gradient(135deg, #001030 0%, #002050 40%, #001a40 100%)", recommended: ["world"] },
  { key: "archive-parchment", label: "Archive Parchment", value: "linear-gradient(180deg, #1a1710 0%, #262015 50%, #131008 100%)", recommended: ["archives"] },
  { key: "midnight", label: "Midnight", value: "linear-gradient(180deg, #000005 0%, #0a0a1e 50%, #000010 100%)" },
  { key: "warm-amber", label: "Warm Amber", value: "linear-gradient(135deg, #1a1000 0%, #332200 50%, #1a0d00 100%)" },
  { key: "forest-green", label: "Forest Green", value: "linear-gradient(135deg, #001a0a 0%, #003318 50%, #001a10 100%)" },
];

/* ------------------------------------------------------------------ */
/*  Image Settings Editor — inline in artefact form                    */
/* ------------------------------------------------------------------ */
function ArtifactImageEditor({
  settings,
  onChange,
  mediaUrls,
  artifactName,
  galleryCategory,
  categoryLabel,
  onSaveAsDefault,
  onLoadDefault,
  hasCategoryDefault,
}: {
  settings: ImageSettings;
  onChange: (s: ImageSettings) => void;
  mediaUrls: string[];
  artifactName: string;
  galleryCategory: string | null;
  categoryLabel?: string;
  onSaveAsDefault?: () => void;
  onLoadDefault?: () => void;
  hasCategoryDefault?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const bgUploadRef = useRef<HTMLInputElement>(null);
  const [bgUploading, setBgUploading] = useState(false);

  // Build the CSS filter string from settings
  const buildFilter = useCallback((s: ImageSettings) => {
    const parts: string[] = [];
    if ((s.brightness ?? 100) !== 100) parts.push(`brightness(${(s.brightness ?? 100) / 100})`);
    if ((s.contrast ?? 100) !== 100) parts.push(`contrast(${(s.contrast ?? 100) / 100})`);
    if ((s.saturation ?? 100) !== 100) parts.push(`saturate(${(s.saturation ?? 100) / 100})`);
    if ((s.hueRotate ?? 0) !== 0) parts.push(`hue-rotate(${s.hueRotate}deg)`);
    if ((s.sepia ?? 0) !== 0) parts.push(`sepia(${(s.sepia ?? 0) / 100})`);
    if ((s.blur ?? 0) !== 0) parts.push(`blur(${s.blur}px)`);
    // Warmth: apply light sepia + hue rotation to simulate warm/cool
    const warmth = s.warmth ?? 0;
    if (warmth > 0) {
      parts.push(`sepia(${Math.min((s.sepia ?? 0) + warmth * 0.6, 100) / 100})`);
      parts.push(`hue-rotate(-${warmth * 0.3}deg)`);
    } else if (warmth < 0) {
      parts.push(`hue-rotate(${Math.abs(warmth) * 0.8}deg)`);
    }
    return parts.join(" ") || "none";
  }, []);

  const filterString = useMemo(() => buildFilter(settings), [buildFilter, settings]);
  const opacityValue = (settings.opacity ?? 100) / 100;

  // Resolve background for preview
  const stageBg = useMemo(() => {
    if (settings.bgCustomUrl) return settings.bgCustomUrl;
    if (settings.bgPreset) {
      const p = BG_PRESETS.find((b) => b.key === settings.bgPreset);
      return p?.value ?? "";
    }
    return "";
  }, [settings.bgPreset, settings.bgCustomUrl]);

  // Get recommended presets for this category
  const recommendedPresets = useMemo(() => {
    if (!galleryCategory) return BG_PRESETS;
    return BG_PRESETS.map((p) => ({
      ...p,
      isRecommended: p.recommended?.includes(galleryCategory as GalleryCategoryId),
    }));
  }, [galleryCategory]);

  const handleBgUpload = useCallback(async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setBgUploading(true);
    try {
      const ref = await saveMediaFile(file);
      onChange({ ...settings, bgCustomUrl: ref, bgPreset: "" });
    } finally {
      setBgUploading(false);
    }
  }, [settings, onChange]);

  const sliderRow = (
    label: string,
    key: keyof ImageSettings,
    min: number,
    max: number,
    defaultVal: number,
    unit = "",
  ) => {
    const val = (settings[key] as number | undefined) ?? defaultVal;
    return (
      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0 text-[10px] uppercase tracking-wider text-gray-400">{label}</span>
        <input
          type="range"
          min={min}
          max={max}
          value={val}
          onChange={(e) => onChange({ ...settings, [key]: Number(e.target.value) })}
          className="flex-1 h-1 accent-[#002060] cursor-pointer"
        />
        <span className="w-12 text-right text-[10px] text-gray-500 tabular-nums">{val}{unit}</span>
        {val !== defaultVal && (
          <button
            onClick={() => onChange({ ...settings, [key]: defaultVal })}
            className="text-gray-300 hover:text-gray-700 transition-colors"
            title="Reset"
          >
            <RotateCcw className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  };

  const hasChanges = useMemo(() => {
    return Object.entries(settings).some(([k, v]) => {
      const d = DEFAULT_IMAGE_SETTINGS[k as keyof ImageSettings];
      return v !== d && v !== "" && v != null;
    });
  }, [settings]);

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 overflow-hidden">
      <button
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Eye className="h-3.5 w-3.5 text-[#002060]/60" />
          <span className="text-xs font-medium text-gray-700">Image Appearance & Background</span>
          {hasChanges && <span className="h-1.5 w-1.5 rounded-full bg-[#002060]" />}
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-3">
          {/* ── Side-by-side: sticky preview + scrollable controls ── */}
          <div className="flex flex-col lg:flex-row gap-3">
            {/* Sticky live preview column */}
            {mediaUrls.length > 0 && (
              <div className="lg:sticky lg:top-0 lg:self-start shrink-0">
                <div className="w-full lg:w-72 xl:w-80 aspect-square mx-auto">
                  <MuseumObjectViewer
                    title={artifactName || "Preview"}
                    mediaSources={mediaUrls}
                    isLightMode={false}
                    compact
                    topLabel={artifactName || "Preview"}
                    emptyLabel="No image"
                    loading="eager"
                    imageFilterOverride={filterString !== "none" ? filterString : undefined}
                    imageOpacityOverride={opacityValue < 1 ? opacityValue : undefined}
                    stageBgOverride={stageBg || undefined}
                    freeRotation={!!settings.freeRotation}
                    bgFade={settings.bgFade ?? 0}
                    animation={(settings.animation as AnimationPreset) || "turntable"}
                    animationSpeed={settings.animationSpeed ?? 1}
                    displayParamsOverride={(() => {
                      const o: Record<string, number> = {};
                      if (settings.depthZ != null) o.depthZ = settings.depthZ;
                      if (settings.perspective != null) o.perspective = settings.perspective;
                      if (settings.objectInset != null) o.objectInset = settings.objectInset;
                      return Object.keys(o).length ? o : undefined;
                    })()}
                  />
                </div>
                <p className="text-[8px] text-gray-400 text-center mt-1">Live Preview</p>
              </div>
            )}

            {/* Scrollable controls column */}
            <div className="flex-1 min-w-0 space-y-4 lg:max-h-[70vh] lg:overflow-y-auto lg:pr-1 scrollbar-thin scrollbar-thumb-gray-300">
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-[#002060]/50 font-semibold">Image Adjustments</p>
            {sliderRow("Brightness", "brightness", 0, 200, 100, "%")}
            {sliderRow("Contrast", "contrast", 0, 200, 100, "%")}
            {sliderRow("Saturation", "saturation", 0, 200, 100, "%")}
            {sliderRow("Opacity", "opacity", 0, 100, 100, "%")}
            {sliderRow("Hue Rotate", "hueRotate", 0, 360, 0, "°")}
            {sliderRow("Sepia", "sepia", 0, 100, 0, "%")}
            {sliderRow("Blur", "blur", 0, 10, 0, "px")}
            {sliderRow("Warmth", "warmth", -50, 50, 0)}
          </div>

          {/* ── Depth / Frame overrides (per-artefact) ── */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-[#002060]/50 font-semibold">
              Depth & Frame (per-artefact)
            </p>
            <p className="text-[9px] text-gray-400">Leave at 0 to use globally configured defaults</p>
            {sliderRow("Depth (Z)", "depthZ", 0, 60, 0, "px")}
            {sliderRow("Perspective", "perspective", 300, 2000, 0, "px")}
            {sliderRow("Object Inset", "objectInset", 5, 40, 0, "%")}
            <label className="flex items-center gap-2 pt-1 cursor-pointer">
              <input
                type="checkbox"
                checked={!!settings.freeRotation}
                onChange={(e) => onChange({ ...settings, freeRotation: e.target.checked })}
                className="accent-[#002060] h-3.5 w-3.5"
              />
              <span className="text-[10px] text-gray-600">Enable 3D Free Rotation (swipe to rotate case)</span>
            </label>
            {sliderRow("BG Fade", "bgFade", 0, 100, 0, "%")}
          </div>

          {/* ── Cinematic Animation (per-artefact override) ── */}
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-wider text-[#002060]/50 font-semibold">
              Cinematic Animation
            </p>
            <p className="text-[9px] text-gray-400">Leave as "Use Category Default" to inherit from the collection</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
              <button
                onClick={() => onChange({ ...settings, animation: undefined, animationSpeed: undefined })}
                className={cn(
                  "rounded-lg border p-2 text-left text-[10px] transition-all",
                  !settings.animation
                    ? "border-[#FFD700]/40 bg-[#002060]/10 text-[#002060]"
                    : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300",
                )}
              >
                <span className="font-medium">Category Default</span>
              </button>
              {ANIMATION_PRESETS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => onChange({ ...settings, animation: p.key })}
                  className={cn(
                    "rounded-lg border p-2 text-left text-[10px] transition-all",
                    settings.animation === p.key
                      ? "border-[#FFD700]/40 bg-[#002060]/10 text-[#002060]"
                      : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300",
                  )}
                >
                  <span className="font-medium">{p.label}</span>
                  <br />
                  <span className="text-[8px] text-gray-400">{p.description}</span>
                </button>
              ))}
            </div>
            {settings.animation && settings.animation !== "none" && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-gray-400 w-16">Speed</span>
                <input
                  type="range"
                  min={0.1}
                  max={3}
                  step={0.1}
                  value={settings.animationSpeed ?? 1}
                  onChange={(e) => onChange({ ...settings, animationSpeed: parseFloat(e.target.value) })}
                  className="flex-1 accent-[#002060]"
                />
                <span className="text-[10px] text-gray-500 w-10 text-right">{(settings.animationSpeed ?? 1).toFixed(1)}×</span>
              </div>
            )}
          </div>

          {/* ── Background presets ── */}
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-[#002060]/50 font-semibold">Stage Background</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5">
              {recommendedPresets.map((preset) => {
                const isActive = !settings.bgCustomUrl && (settings.bgPreset ?? "") === preset.key;
                return (
                  <button
                    key={preset.key}
                    onClick={() => onChange({ ...settings, bgPreset: preset.key, bgCustomUrl: "" })}
                    className={cn(
                      "relative rounded-lg border p-2 text-left transition-all text-[10px]",
                      isActive
                        ? "border-[#FFD700]/40 bg-[#002060]/10 text-[#002060]"
                        : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:text-gray-700",
                    )}
                  >
                    {/* Swatch */}
                    <div
                      className="h-6 w-full rounded mb-1.5"
                      style={{ background: preset.value || "linear-gradient(135deg, #0d1117, #1a1f2e)" }}
                    />
                    <span className="font-medium">{preset.label}</span>
                    {"isRecommended" in preset && (preset as { isRecommended?: boolean }).isRecommended && (
                      <span className="ml-1 text-[8px] text-[#002060]/60">★</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom background upload */}
            <div className="flex items-center gap-2 mt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => bgUploadRef.current?.click()}
                disabled={bgUploading}
                className="text-xs"
              >
                {bgUploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                {bgUploading ? "Uploading…" : "Custom Background"}
              </Button>
              <input
                ref={bgUploadRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => void handleBgUpload(e.target.files)}
              />
              {settings.bgCustomUrl && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 text-xs"
                  onClick={() => onChange({ ...settings, bgCustomUrl: "", bgPreset: "" })}
                >
                  <Trash2 className="h-3 w-3 mr-1" /> Remove
                </Button>
              )}
            </div>
          </div>

          {/* ── Reset / Category defaults ── */}
          <div className="flex flex-wrap items-center gap-2">
            {hasChanges && (
              <Button
                size="sm"
                variant="ghost"
                className="text-gray-400 text-xs"
                onClick={() => onChange({ ...DEFAULT_IMAGE_SETTINGS })}
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Reset All to Defaults
              </Button>
            )}
            {galleryCategory && onSaveAsDefault && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-[#002060]/25 text-[#002060]/70 hover:text-[#002060]"
                onClick={onSaveAsDefault}
              >
                <Save className="h-3 w-3 mr-1" /> Save as {categoryLabel || "Category"} Default
              </Button>
            )}
            {galleryCategory && hasCategoryDefault && onLoadDefault && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs border-gray-300 text-gray-500 hover:text-gray-800"
                onClick={onLoadDefault}
              >
                <RotateCcw className="h-3 w-3 mr-1" /> Load {categoryLabel || "Category"} Default
              </Button>
            )}
          </div>
            </div>{/* end scrollable controls column */}
          </div>{/* end flex row */}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Artefacts Manager — full CRUD with preview                         */
/* ------------------------------------------------------------------ */
function ArtefactsManager() {
  const uploadRef = useRef<HTMLInputElement>(null);
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ArtifactRecord | null>(null);
  const [editing, setEditing] = useState<ArtifactRecord | null>(null);
  const [adding, setAdding] = useState(false);
  const [workingMedia, setWorkingMedia] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { getDefaults: getCategoryImageDefaults, setDefaults: setCategoryImageDefaults, defaultsMap: categoryImageDefaultsMap } = useCategoryImageDefaults();

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: e } = await supabase
        .from("museum_artifacts")
        .select("id, name, description, era, origin_label, strategic_significance, gallery_category, period_label, collection_id, tag, location, display_order, media_urls, tags, image_settings, is_published")
        .order("gallery_category")
        .order("display_order")
        .order("name");
      if (e) throw e;
      setArtifacts(
        (data ?? []).map((r: Record<string, unknown>) => ({
          id: r.id as string,
          name: r.name as string,
          description: r.description as string | null,
          era: r.era as string | null,
          origin_label: r.origin_label as string | null,
          strategic_significance: r.strategic_significance as string | null,
          gallery_category: r.gallery_category as string | null,
          period_label: r.period_label as string | null,
          collection_id: r.collection_id as string | null,
          tag: r.tag as string | null,
          location: r.location as string | null,
          display_order: (r.display_order as number) ?? 0,
          media_urls: (r.media_urls as string[] | null) ?? [],
          tags: (r.tags as string[] | null) ?? [],
          image_settings: { ...DEFAULT_IMAGE_SETTINGS, ...((r.image_settings as ImageSettings | null) ?? {}) },
          is_published: r.is_published as boolean,
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load artifacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  useEffect(() => {
    if (selected) {
      setWorkingMedia(selected.media_urls);
    }
  }, [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return artifacts.filter((a) => {
      if (catFilter !== "all" && a.gallery_category !== catFilter) return false;
      if (!q) return true;
      return [a.name, a.gallery_category, a.era, a.description].filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [artifacts, search, catFilter]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files);
    const big = arr.find((f) => f.size > MAX_MEDIA_BYTES);
    if (big) { setError(`${big.name} exceeds ${MAX_MEDIA_SIZE_MB}MB`); return; }
    setUploading(true);
    setError(null);
    try {
      const results = await Promise.allSettled(arr.map((f) => saveMediaFile(f)));
      const uploaded = results.filter((r): r is PromiseFulfilledResult<string> => r.status === "fulfilled").map((r) => r.value).filter(Boolean);
      if (uploaded.length > 0) setWorkingMedia((prev) => [...prev, ...uploaded]);
      setStatus(`${uploaded.length} image(s) uploaded`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  };

  const saveArtifact = async () => {
    const target = editing ?? selected;
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: target.name,
        description: target.description,
        era: target.era,
        origin_label: target.origin_label,
        strategic_significance: target.strategic_significance,
        gallery_category: target.gallery_category,
        period_label: target.period_label,
        collection_id: target.collection_id || target.gallery_category,
        tag: target.tag,
        location: target.location,
        display_order: target.display_order,
        media_urls: workingMedia,
        tags: target.tags,
        image_settings: target.image_settings,
        is_published: target.is_published,
        updated_at: new Date().toISOString(),
      };

      if (adding) {
        const id = target.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `artifact-${Date.now()}`;
        const { error: e } = await supabase.from("museum_artifacts").insert({ ...payload, id });
        if (e) throw e;
        setStatus(`Created "${target.name}"`);
      } else {
        const { error: e } = await supabase.from("museum_artifacts").update(payload).eq("id", target.id);
        if (e) throw e;
        setStatus(`Saved "${target.name}"`);
      }
      setEditing(null);
      setAdding(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const deleteArtifact = async (id: string) => {
    if (!confirm("Delete this artifact permanently?")) return;
    const { error: e } = await supabase.from("museum_artifacts").delete().eq("id", id);
    if (!e) {
      if (selected?.id === id) { setSelected(null); setEditing(null); }
      await load();
      setStatus("Artifact deleted");
    }
  };

  const blank: ArtifactRecord = {
    id: "", name: "", description: "", era: "", origin_label: "", strategic_significance: "",
    gallery_category: "history", period_label: "", collection_id: null, tag: null, location: null,
    display_order: 0, media_urls: [], tags: [], image_settings: { ...DEFAULT_IMAGE_SETTINGS }, is_published: true,
  };

  const editTarget = editing ?? selected;

  const getCatColor = (cat: string | null) =>
    GALLERY_CATEGORIES.find((c) => c.id === cat)?.color ?? "#888";

  const getCatLabel = (cat: string | null) =>
    GALLERY_CATEGORIES.find((c) => c.id === cat)?.label ?? (cat || "Uncategorized");

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search artefacts..." className="max-w-xs bg-gray-50 border-gray-200 text-gray-900" />
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-900"
        >
          <option value="all">All Categories</option>
          {GALLERY_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
          Refresh
        </Button>
        <Button
          size="sm"
          onClick={() => {
            setAdding(true);
            const catDefaults = getCategoryImageDefaults(blank.gallery_category ?? "");
            setEditing({
              ...blank,
              image_settings: catDefaults
                ? { ...DEFAULT_IMAGE_SETTINGS, ...catDefaults } as ImageSettings
                : { ...DEFAULT_IMAGE_SETTINGS },
            });
            setSelected(null);
            setWorkingMedia([]);
          }}
          className="bg-[#002060] text-white hover:bg-[#002060]/90"
        >
          <Plus className="h-3 w-3 mr-1" /> New Artefact
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
        {/* Left: Artifact list */}
        <div className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 max-h-[500px] overflow-y-auto space-y-2">
            {loading ? (
              <div className="flex items-center gap-2 text-xs text-gray-400 py-4"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>
            ) : filtered.length > 0 ? (
              filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => { setSelected(a); setEditing(null); setAdding(false); }}
                  className={cn(
                    "w-full rounded-lg border px-3 py-3 text-left transition-colors",
                    selected?.id === a.id ? "border-[#002060]/30 bg-[#002060]/10" : "border-gray-200 bg-gray-50 hover:bg-gray-100",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="inline-block h-2 w-2 rounded-full"
                          style={{ backgroundColor: getCatColor(a.gallery_category) }}
                        />
                        <span className="text-[10px] uppercase tracking-wider text-gray-400">
                          {getCatLabel(a.gallery_category)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-gray-400">
                        {a.media_urls.length} img{a.media_urls.length !== 1 ? "s" : ""}
                      </span>
                      {!a.is_published && (
                        <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-0.5 text-[9px] text-yellow-400">Draft</span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-gray-400 py-4 text-center">No artifacts found</p>
            )}
          </div>
        </div>

        {/* Right: Detail / Edit / Preview */}
        <div className="space-y-4">
          {/* Glass case preview */}
          <MuseumObjectViewer
            title={editTarget?.name ?? "Museum Artefact"}
            mediaSources={workingMedia}
            isLightMode={false}
            topLabel={editTarget ? getCatLabel(editTarget.gallery_category) : "Artefact"}
            footerLabel={editTarget?.era ?? "Museum"}
            showControls
            compact={false}
            loading="eager"
            emptyLabel="Select or create an artefact"
          />

          {/* Edit form */}
          {(editing || adding) && editTarget ? (
            <div className="rounded-xl border border-[#002060]/20 bg-gray-50 p-4 space-y-3">
              <p className="text-xs uppercase tracking-wider text-[#002060]/60">{adding ? "New Artefact" : "Edit Artefact"}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400">Name</label>
                  <Input value={editTarget.name} onChange={(e) => setEditing({ ...editTarget, name: e.target.value })} className="mt-1 bg-gray-50 border-gray-200 text-gray-900 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400">Category</label>
                  <select
                    value={editTarget.gallery_category ?? ""}
                    onChange={(e) => {
                      const newCat = e.target.value || null;
                      const catDefaults = newCat ? getCategoryImageDefaults(newCat) : undefined;
                      setEditing({
                        ...editTarget,
                        gallery_category: newCat,
                        ...(catDefaults ? { image_settings: { ...DEFAULT_IMAGE_SETTINGS, ...catDefaults } as ImageSettings } : {}),
                      });
                    }}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="">Uncategorized</option>
                    {GALLERY_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400">Collection</label>
                  <select
                    value={editTarget.collection_id ?? editTarget.gallery_category ?? ""}
                    onChange={(e) => setEditing({ ...editTarget, collection_id: e.target.value || null })}
                    className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900"
                  >
                    <option value="">Same as Category</option>
                    {GALLERY_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400">Era / Period</label>
                  <Input value={editTarget.era ?? ""} onChange={(e) => setEditing({ ...editTarget, era: e.target.value })} className="mt-1 bg-gray-50 border-gray-200 text-gray-900 text-sm" placeholder="e.g. 1992-Present" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400">Period Label</label>
                  <Input value={editTarget.period_label ?? ""} onChange={(e) => setEditing({ ...editTarget, period_label: e.target.value })} className="mt-1 bg-gray-50 border-gray-200 text-gray-900 text-sm" placeholder="e.g. Founding Era" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400">Origin</label>
                  <Input value={editTarget.origin_label ?? ""} onChange={(e) => setEditing({ ...editTarget, origin_label: e.target.value })} className="mt-1 bg-gray-50 border-gray-200 text-gray-900 text-sm" placeholder="e.g. Nigeria" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400">Tag / Type</label>
                  <Input value={editTarget.tag ?? ""} onChange={(e) => setEditing({ ...editTarget, tag: e.target.value })} className="mt-1 bg-gray-50 border-gray-200 text-gray-900 text-sm" placeholder="e.g. Founding Document" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400">Location</label>
                  <Input value={editTarget.location ?? ""} onChange={(e) => setEditing({ ...editTarget, location: e.target.value })} className="mt-1 bg-gray-50 border-gray-200 text-gray-900 text-sm" placeholder="e.g. Abuja, FCT" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400">Display Order</label>
                  <Input type="number" value={editTarget.display_order} onChange={(e) => setEditing({ ...editTarget, display_order: Number(e.target.value) })} className="mt-1 bg-gray-50 border-gray-200 text-gray-900 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400">Tags (comma-separated)</label>
                  <Input
                    value={(editTarget.tags ?? []).join(", ")}
                    onChange={(e) => setEditing({ ...editTarget, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                    className="mt-1 bg-gray-50 border-gray-200 text-gray-900 text-sm"
                    placeholder="e.g. Founding Document, Heritage, Archive"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400">Description</label>
                <textarea
                  value={editTarget.description ?? ""}
                  onChange={(e) => setEditing({ ...editTarget, description: e.target.value })}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 resize-y"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-gray-400">Strategic Significance</label>
                <textarea
                  value={editTarget.strategic_significance ?? ""}
                  onChange={(e) => setEditing({ ...editTarget, strategic_significance: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-900 resize-y"
                />
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editTarget.is_published}
                    onChange={(e) => setEditing({ ...editTarget, is_published: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-xs text-gray-600">Published</span>
                </label>
              </div>

              {/* Image upload section */}
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => uploadRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ImagePlus className="h-3 w-3" />}
                    {uploading ? "Uploading..." : "Upload Images"}
                  </Button>
                  <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handleUpload(e.target.files)} />
                  {workingMedia.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setWorkingMedia([])} className="text-gray-400">
                      <Trash2 className="h-3 w-3 mr-1" /> Clear
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-gray-400">{workingMedia.length} image(s) attached</p>
              </div>

              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => void saveArtifact()} disabled={saving || !editTarget.name.trim()}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                  {saving ? "Saving..." : adding ? "Create" : "Save"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setAdding(false); }}>
                  <X className="h-3 w-3" /> Cancel
                </Button>
              </div>
            </div>
          ) : selected ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base font-semibold text-gray-900">{selected.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: getCatColor(selected.gallery_category) }} />
                    <span className="text-[10px] uppercase tracking-wider text-gray-400">{getCatLabel(selected.gallery_category)}</span>
                    {selected.era && <span className="text-[10px] text-gray-400">· {selected.era}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => setEditing({ ...selected })}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => void deleteArtifact(selected.id)} className="text-red-400/60 hover:text-red-400">
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              {selected.description && <p className="text-sm text-gray-600 leading-relaxed">{selected.description}</p>}
              {selected.strategic_significance && (
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Strategic Significance</p>
                  <p className="text-xs text-gray-500">{selected.strategic_significance}</p>
                </div>
              )}
            </div>
          ) : null}

          {status && <p className="text-xs text-[#002060]">{status}</p>}
          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>
      </div>

      {/* Full-width image editor below the grid */}
      {(editing || adding) && editTarget && (
        <ArtifactImageEditor
          settings={editTarget.image_settings}
          onChange={(s) => setEditing({ ...editTarget, image_settings: s })}
          mediaUrls={workingMedia}
          artifactName={editTarget.name}
          galleryCategory={editTarget.gallery_category}
          categoryLabel={editTarget.gallery_category ? getCatLabel(editTarget.gallery_category) : undefined}
          hasCategoryDefault={!!(editTarget.gallery_category && getCategoryImageDefaults(editTarget.gallery_category))}
          onSaveAsDefault={editTarget.gallery_category ? () => {
            void setCategoryImageDefaults(editTarget.gallery_category!, { ...editTarget.image_settings });
            setStatus(`Saved as default for ${getCatLabel(editTarget.gallery_category)}`);
          } : undefined}
          onLoadDefault={editTarget.gallery_category ? () => {
            const defaults = getCategoryImageDefaults(editTarget.gallery_category!);
            if (defaults) {
              setEditing({ ...editTarget, image_settings: { ...DEFAULT_IMAGE_SETTINGS, ...defaults } as ImageSettings });
              setStatus(`Loaded ${getCatLabel(editTarget.gallery_category)} defaults`);
            }
          } : undefined}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category Panels — show artefacts grouped by gallery_category       */
/* ------------------------------------------------------------------ */
function CategoryPanels() {
  const [artifacts, setArtifacts] = useState<ArtifactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [openCats, setOpenCats] = useState<Record<string, boolean>>({});
  const [previewArtifact, setPreviewArtifact] = useState<ArtifactRecord | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("museum_artifacts")
          .select("id, name, description, era, origin_label, strategic_significance, gallery_category, period_label, collection_id, tag, location, display_order, media_urls, tags, image_settings, is_published")
          .order("gallery_category")
          .order("display_order")
          .order("name");
        setArtifacts(
          (data ?? []).map((r: Record<string, unknown>) => ({
            id: r.id as string,
            name: r.name as string,
            description: r.description as string | null,
            era: r.era as string | null,
            origin_label: r.origin_label as string | null,
            strategic_significance: r.strategic_significance as string | null,
            gallery_category: r.gallery_category as string | null,
            period_label: r.period_label as string | null,
            collection_id: r.collection_id as string | null,
            tag: r.tag as string | null,
            location: r.location as string | null,
            display_order: (r.display_order as number) ?? 0,
            media_urls: (r.media_urls as string[] | null) ?? [],
            tags: (r.tags as string[] | null) ?? [],
            image_settings: { ...DEFAULT_IMAGE_SETTINGS, ...((r.image_settings as ImageSettings | null) ?? {}) },
            is_published: r.is_published as boolean,
          })),
        );
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const grouped = useMemo(() => {
    const groups: Record<string, ArtifactRecord[]> = {};
    for (const cat of GALLERY_CATEGORIES) {
      groups[cat.id] = [];
    }
    groups["uncategorized"] = [];
    for (const a of artifacts) {
      const key = a.gallery_category && groups[a.gallery_category] ? a.gallery_category : "uncategorized";
      groups[key].push(a);
    }
    return groups;
  }, [artifacts]);

  const toggle = (key: string) => setOpenCats((prev) => ({ ...prev, [key]: !prev[key] }));

  if (loading) {
    return <div className="flex items-center gap-2 text-xs text-gray-400 py-4"><Loader2 className="h-3 w-3 animate-spin" /> Loading categories…</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-base font-semibold text-[#002060]">Collection Categories</h4>
        <p className="text-xs text-gray-400 mt-0.5">View artefacts grouped by collection type. Click any artefact to preview it in the glass case.</p>
      </div>

      <div className="space-y-3">
        {GALLERY_CATEGORIES.map((cat) => {
          const items = grouped[cat.id];
          return (
            <div key={cat.id}>
              <PanelHeader
                title={cat.label}
                count={items.length}
                open={!!openCats[cat.id]}
                onToggle={() => toggle(cat.id)}
                color={cat.color}
              />
              {openCats[cat.id] && (
                <div className="mt-2 space-y-2 pl-2">
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-400 py-3 text-center">No artefacts in this collection yet.</p>
                  ) : (
                    items.map((a) => (
                      <div
                        key={a.id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors cursor-pointer",
                          previewArtifact?.id === a.id
                            ? "border-[#002060]/25 bg-[#002060]/10"
                            : "border-gray-200 bg-gray-50 hover:bg-gray-100",
                        )}
                        onClick={() => setPreviewArtifact(previewArtifact?.id === a.id ? null : a)}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {a.era ?? "No era"} · {a.media_urls.length} image{a.media_urls.length !== 1 ? "s" : ""}
                            {!a.is_published && " · Draft"}
                          </p>
                        </div>
                        <Eye className="h-4 w-4 text-gray-300 shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Uncategorized */}
        {grouped["uncategorized"].length > 0 && (
          <div>
            <PanelHeader
              title="Uncategorized"
              count={grouped["uncategorized"].length}
              open={!!openCats["uncategorized"]}
              onToggle={() => toggle("uncategorized")}
              color="#888"
            />
            {openCats["uncategorized"] && (
              <div className="mt-2 space-y-2 pl-2">
                {grouped["uncategorized"].map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "flex items-center justify-between rounded-lg border px-3 py-2.5 transition-colors cursor-pointer",
                      previewArtifact?.id === a.id ? "border-[#002060]/25 bg-[#002060]/10" : "border-gray-200 bg-gray-50 hover:bg-gray-100",
                    )}
                    onClick={() => setPreviewArtifact(previewArtifact?.id === a.id ? null : a)}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{a.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{a.era ?? "No era"} · {a.media_urls.length} image{a.media_urls.length !== 1 ? "s" : ""}</p>
                    </div>
                    <Eye className="h-4 w-4 text-gray-300 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview panel */}
      {previewArtifact && (
        <div className="rounded-xl border border-[#FFD700]/15 bg-gray-50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">{previewArtifact.name}</p>
            <button onClick={() => setPreviewArtifact(null)} className="p-1 rounded hover:bg-gray-100"><X className="h-4 w-4 text-gray-400" /></button>
          </div>
          <MuseumObjectViewer
            title={previewArtifact.name}
            mediaSources={previewArtifact.media_urls}
            isLightMode={false}
            topLabel={GALLERY_CATEGORIES.find((c) => c.id === previewArtifact.gallery_category)?.label ?? "Artefact"}
            footerLabel={previewArtifact.era ?? "Museum"}
            showControls
            loading="eager"
            emptyLabel="No images uploaded"
          />
          {previewArtifact.description && <p className="text-xs text-gray-500 leading-relaxed">{previewArtifact.description}</p>}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category Animation Admin — per-collection cinematic animation      */
/* ------------------------------------------------------------------ */

function CategoryAnimationAdmin() {
  const { configMap, getConfig, setConfig, applyToCategories } = useCategoryAnimationSettings();
  const [applyAllPreset, setApplyAllPreset] = useState<string>("");
  const [applyAllSpeed, setApplyAllSpeed] = useState(1);
  const [applyAllBgFade, setApplyAllBgFade] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);

  const handleApplyAll = async () => {
    if (!applyAllPreset) return;
    const allIds = GALLERY_CATEGORIES.map((c) => c.id);
    await applyToCategories(allIds, { animation: applyAllPreset as AnimationPreset, speed: applyAllSpeed, bgFade: applyAllBgFade });
    setSaved("all");
    setTimeout(() => setSaved(null), 1500);
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-base font-semibold text-[#002060]">Collection Animation Defaults</h4>
        <p className="text-xs text-gray-400 mt-0.5">
          Set the default cinematic animation for each collection. Individual artefacts can override.
        </p>
      </div>

      {/* Apply to all categories at once */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
        <p className="text-[10px] uppercase tracking-wider text-[#002060]/50 font-semibold">Quick Apply to All Collections</p>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[9px] text-gray-400 block mb-1">Animation</label>
            <select
              value={applyAllPreset}
              onChange={(e) => setApplyAllPreset(e.target.value)}
              className="w-full rounded border border-gray-200 bg-gray-100 px-2 py-1.5 text-xs text-gray-700"
            >
              <option value="">— Select —</option>
              {ANIMATION_PRESETS.map((p) => (
                <option key={p.key} value={p.key}>{p.label}</option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="text-[9px] text-gray-400 block mb-1">Speed</label>
            <input
              type="range" min={0.1} max={3} step={0.1} value={applyAllSpeed}
              onChange={(e) => setApplyAllSpeed(parseFloat(e.target.value))}
              className="w-full accent-[#002060]"
            />
            <span className="text-[9px] text-gray-400 block text-center">{applyAllSpeed.toFixed(1)}×</span>
          </div>
          <div className="w-28">
            <label className="text-[9px] text-gray-400 block mb-1">BG Fade</label>
            <input
              type="range" min={0} max={100} step={5} value={applyAllBgFade}
              onChange={(e) => setApplyAllBgFade(parseInt(e.target.value))}
              className="w-full accent-[#002060]"
            />
            <span className="text-[9px] text-gray-400 block text-center">{applyAllBgFade}%</span>
          </div>
          <Button
            size="sm" variant="outline"
            onClick={handleApplyAll}
            disabled={!applyAllPreset}
            className="text-xs"
          >
            Apply to All
          </Button>
          {saved === "all" && <span className="text-[10px] text-green-400">Saved ✓</span>}
        </div>
      </div>

      {/* Per-category config */}
      <div className="space-y-2">
        {GALLERY_CATEGORIES.map((cat) => {
          const cfg = getConfig(cat.id);
          return (
            <div key={cat.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: cat.color }} />
                <span className="text-sm font-semibold text-gray-800">{cat.label}</span>
                {saved === cat.id && <span className="text-[10px] text-green-400 ml-auto">Saved ✓</span>}
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={cfg.animation}
                  onChange={async (e) => {
                    await setConfig(cat.id, { ...cfg, animation: e.target.value as AnimationPreset });
                    setSaved(cat.id);
                    setTimeout(() => setSaved(null), 1500);
                  }}
                  className="rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs text-gray-700 flex-1 min-w-[120px]"
                >
                  {ANIMATION_PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>{p.label}</option>
                  ))}
                </select>
                <div className="flex items-center gap-1 w-36">
                  <span className="text-[9px] text-gray-400">Speed</span>
                  <input
                    type="range" min={0.1} max={3} step={0.1} value={cfg.speed}
                    onChange={async (e) => {
                      await setConfig(cat.id, { ...cfg, speed: parseFloat(e.target.value) });
                      setSaved(cat.id);
                      setTimeout(() => setSaved(null), 1500);
                    }}
                    className="flex-1 accent-[#002060]"
                  />
                  <span className="text-[9px] text-gray-400 w-8 text-right">{cfg.speed.toFixed(1)}×</span>
                </div>
                <div className="flex items-center gap-1 w-32">
                  <span className="text-[9px] text-gray-400">BG Fade</span>
                  <input
                    type="range" min={0} max={100} step={5} value={cfg.bgFade ?? 0}
                    onChange={async (e) => {
                      await setConfig(cat.id, { ...cfg, bgFade: parseInt(e.target.value) });
                      setSaved(cat.id);
                      setTimeout(() => setSaved(null), 1500);
                    }}
                    className="flex-1 accent-[#002060]"
                  />
                  <span className="text-[9px] text-gray-400 w-8 text-right">{cfg.bgFade ?? 0}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Collection Audio Admin — per-collection background audio config    */
/* ------------------------------------------------------------------ */

const COLLECTION_AUDIO_CONTEXTS = [
  { key: "collection_history", label: "History Collection", color: "#002060" },
  { key: "collection_state", label: "State Collection", color: "#FFD700" },
  { key: "collection_regional", label: "Regional Collection", color: "#FF0000" },
  { key: "collection_world", label: "World Collection", color: "#00B0F0" },
  { key: "collection_archives", label: "Archives", color: "#8B7355" },
] as const;

function CollectionAudioAdmin() {
  const { tracks, assignments, setAssignment, loadTracks } = useAudioStore();
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const [playingCtx, setPlayingCtx] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => { loadTracks(); }, [loadTracks]);

  // Pre-resolve audio URLs for preview
  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      const entries = await Promise.all(
        tracks.map(async (t) => {
          const url = await getAudioUrl(t.id);
          return [t.id, url] as const;
        }),
      );
      if (cancelled) return;
      const urls: Record<string, string> = {};
      for (const [id, url] of entries) { if (url) urls[id] = url; }
      setAudioUrls(urls);
    };
    void resolve();
    return () => { cancelled = true; };
  }, [tracks]);

  const handlePreview = async (contextKey: string) => {
    const trackId = assignments[contextKey as keyof typeof assignments];
    if (!trackId || !audioUrls[trackId]) return;
    if (playingCtx === contextKey) {
      audioRef.current?.pause();
      setPlayingCtx(null);
      return;
    }
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.src = audioUrls[trackId];
    audio.currentTime = 0;
    try { await audio.play(); setPlayingCtx(contextKey); } catch { /* ignore */ }
  };

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-base font-semibold text-[#002060]">Collection Background Audio</h4>
        <p className="text-xs text-gray-400 mt-0.5">
          Assign background music for each collection. Audio plays automatically when artefacts are displayed.
        </p>
      </div>

      {tracks.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
          <Music className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No audio tracks uploaded yet.</p>
          <p className="text-[10px] text-gray-400 mt-1">Upload tracks in the Audio Settings tab first, then assign them here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {COLLECTION_AUDIO_CONTEXTS.map((ctx) => {
            const currentTrackId = assignments[ctx.key as keyof typeof assignments];
            const isActive = playingCtx === ctx.key;
            return (
              <div
                key={ctx.key}
                className="flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors"
                style={{ borderColor: `${ctx.color}25`, backgroundColor: `${ctx.color}08` }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: ctx.color }} />
                  <span className="text-sm font-medium text-gray-900 truncate">{ctx.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={currentTrackId ?? ""}
                    onChange={(e) => setAssignment(ctx.key, e.target.value || null)}
                    className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700 w-44"
                  >
                    <option value="">No audio</option>
                    {tracks.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  {currentTrackId && audioUrls[currentTrackId] && (
                    <button
                      onClick={() => void handlePreview(ctx.key)}
                      className={cn(
                        "rounded-full p-1.5 border transition-colors",
                        isActive
                          ? "border-[#FFD700]/40 bg-[#002060]/10 text-[#002060]"
                          : "border-gray-200 bg-gray-50 text-gray-400 hover:text-gray-700",
                      )}
                    >
                      {isActive ? "⏸" : "▶"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <audio ref={audioRef} onEnded={() => setPlayingCtx(null)} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Museum Admin Tab                                             */
/* ------------------------------------------------------------------ */
export function MuseumAdmin() {
  const [subTab, setSubTab] = useState<MuseumSubTab>("artefacts");

  const subTabBtn = (key: MuseumSubTab, label: string) => (
    <button
      onClick={() => setSubTab(key)}
      className={cn(
        "px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all",
        subTab === key
          ? "bg-[#002060]/10 text-[#002060] border border-[#002060]/30 font-bold"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800 border border-gray-200",
      )}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold font-serif text-[#002060]">Museum Management</h3>
        <p className="text-sm text-gray-500 mt-0.5">Manage artefacts, collections, audio, display settings, and museum content.</p>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-200 bg-gray-50 p-2">
        {subTabBtn("artefacts", "Artefacts & Upload")}
        {subTabBtn("categories", "Collection Categories")}
        {subTabBtn("audio", "Collection Audio")}
        {subTabBtn("content", "Museum Content")}
        {subTabBtn("frames", "Display Frames")}
      </div>

      {/* Quick preview only on artefacts tab */}
      {subTab === "artefacts" && <ArtefactQuickPreview />}

      {/* Sub-tab content — lazy rendered for performance */}
      {subTab === "artefacts" && <ArtefactsManager />}
      {subTab === "categories" && <><CategoryPanels /><CategoryAnimationAdmin /></>}
      {subTab === "audio" && <CollectionAudioAdmin />}
      {subTab === "content" && <MuseumContentAdmin />}
      {subTab === "frames" && <DisplayFrameAdmin />}
    </div>
  );
}
