import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Rotate3D, RotateCcw, Shield } from "lucide-react";
import { useResolvedMediaUrls } from "@/hooks/useResolvedMediaUrl";
import { useDisplayFrameSettings, DEFAULT_FRAME_DISPLAY } from "@/hooks/useDisplayFrameSettings";
import type { FrameDisplayParams } from "@/hooks/useDisplayFrameSettings";
import { cn } from "@/lib/utils";

/* ── Cinematic animation presets ── */
export const ANIMATION_PRESETS = [
  { key: "turntable",       label: "Turntable 360°",    description: "Slow museum-pedestal rotation, retains shape" },
  { key: "float",           label: "Float",              description: "Gentle vertical hover with slight tilt" },
  { key: "breathe",         label: "Breathe",            description: "Subtle scale pulse with soft glow" },
  { key: "tilt-rock",       label: "Tilt & Rock",        description: "Gentle side-to-side rocking" },
  { key: "orbit",           label: "Orbit",              description: "Combined X+Y 3D orbit" },
  { key: "spotlight-sweep", label: "Spotlight Sweep",    description: "Lighting sweep, object stays still" },
  { key: "none",            label: "None (Static)",      description: "No animation" },
] as const;

export type AnimationPreset = (typeof ANIMATION_PRESETS)[number]["key"];

type MuseumObjectViewerProps = {
  title: string;
  mediaSources?: Array<string | null | undefined>;
  isLightMode: boolean;
  className?: string;
  imageClassName?: string;
  topLabel?: string;
  topRightLabel?: string;
  footerLabel?: string;
  emptyLabel?: string;
  compact?: boolean;
  showControls?: boolean;
  showTopRightBadge?: boolean;
  loading?: "eager" | "lazy";
  /** Override the glass-case frame URL (otherwise uses the admin-configured frame) */
  frameOverride?: string;
  /** Override CSS filter string on the artifact image (used by image editor preview) */
  imageFilterOverride?: string;
  /** Override opacity 0-1 on the artifact image */
  imageOpacityOverride?: number;
  /** Override the stage background with a custom gradient or image URL */
  stageBgOverride?: string;
  /** Per-artifact display param overrides (merged over global settings) */
  displayParamsOverride?: Partial<FrameDisplayParams>;
  /** Enable free 3D rotation mode — swipe/drag to rotate the case */
  freeRotation?: boolean;
  /** Cinematic animation preset (default: "turntable") */
  animation?: AnimationPreset;
  /** Animation speed multiplier (0.1 = very slow, 1 = normal, 3 = fast). Default 1 */
  animationSpeed?: number;
  /** Fade out the image's own photo background using a radial mask (0 = off, 1–100 = intensity) */
  bgFade?: number;
};

type ViewerTiltState = {
  rotateX: number;
  rotateY: number;
  glareX: number;
  glareY: number;
  shiftX: number;
  shiftY: number;
};

/** Inferred shape classification for intelligent scaling */
type ObjectShape = "tall" | "wide" | "square" | "small" | "flat";

type ObjectMetrics = {
  shape: ObjectShape;
  naturalWidth: number;
  naturalHeight: number;
  aspectRatio: number;
  /** Whether the image likely has a solid/white/transparent background */
  isFlatGraphic: boolean;
};

const DRAG_STEP_PX = 24;
const AUTO_SPIN_INTERVAL_MS = 160;
const DEFAULT_TILT: ViewerTiltState = {
  rotateX: 2.8,
  rotateY: -4.4,
  glareX: 32,
  glareY: 16,
  shiftX: -4,
  shiftY: -2,
};

/** Classify the object for intelligent scaling and placement */
function classifyObject(w: number, h: number): ObjectMetrics {
  const aspectRatio = w / h;
  const pixelArea = w * h;
  const isSmall = pixelArea < 80000; // < ~283x283
  const isFlatGraphic = aspectRatio > 0.85 && aspectRatio < 1.18 && pixelArea < 500000;

  let shape: ObjectShape;
  if (isSmall) shape = "small";
  else if (isFlatGraphic) shape = "flat";
  else if (aspectRatio < 0.65) shape = "tall";
  else if (aspectRatio > 1.5) shape = "wide";
  else shape = "square";

  return { shape, naturalWidth: w, naturalHeight: h, aspectRatio, isFlatGraphic };
}

/**
 * Compute intelligent CSS for the artifact based on its measured shape.
 * Returns max-height/max-width percentages to keep the object inside the case
 * with clear spacing and natural proportions.
 */
function getObjectScaleStyle(metrics: ObjectMetrics | null, compact: boolean) {
  if (!metrics) {
    return { maxHeight: "72%", maxWidth: "68%" };
  }

  const { shape } = metrics;
  switch (shape) {
    case "tall":
      return compact
        ? { maxHeight: "62%", maxWidth: "44%" }
        : { maxHeight: "65%", maxWidth: "46%" };
    case "wide":
      return compact
        ? { maxHeight: "46%", maxWidth: "62%" }
        : { maxHeight: "48%", maxWidth: "64%" };
    case "small":
      return compact
        ? { maxHeight: "48%", maxWidth: "44%" }
        : { maxHeight: "50%", maxWidth: "46%" };
    case "flat":
      return compact
        ? { maxHeight: "50%", maxWidth: "50%" }
        : { maxHeight: "52%", maxWidth: "52%" };
    case "square":
    default:
      return compact
        ? { maxHeight: "56%", maxWidth: "56%" }
        : { maxHeight: "58%", maxWidth: "58%" };
  }
}

/**
 * Build the CSS filter string for museum-quality lighting correction.
 * Flat graphics (logos, documents) are treated differently from 3D artifacts.
 */
function getObjectFilter(metrics: ObjectMetrics | null) {
  if (!metrics) {
    return "brightness(0.90) contrast(1.08) saturate(0.92)";
  }

  if (metrics.isFlatGraphic || metrics.shape === "flat") {
    // Flat objects: reduce contrast slightly, soften to blend
    return "brightness(0.88) contrast(1.04) saturate(0.90)";
  }

  // 3D artifacts: warm museum lighting
  return "brightness(0.90) contrast(1.08) saturate(0.93)";
}

/**
 * Get drop-shadow filter for contact shadow + ambient light.
 * 3D objects get heavier grounding shadows; flat items get subtle depth.
 */
function getObjectDropShadow(metrics: ObjectMetrics | null) {
  if (!metrics) {
    return "drop-shadow(0 10px 28px rgba(0,0,0,0.55)) drop-shadow(0 3px 8px rgba(0,0,0,0.35))";
  }

  if (metrics.isFlatGraphic || metrics.shape === "flat") {
    return "drop-shadow(0 6px 18px rgba(0,0,0,0.45)) drop-shadow(0 2px 5px rgba(0,0,0,0.28))";
  }

  if (metrics.shape === "tall") {
    return "drop-shadow(0 12px 32px rgba(0,0,0,0.58)) drop-shadow(0 4px 10px rgba(0,0,0,0.38))";
  }

  return "drop-shadow(0 10px 28px rgba(0,0,0,0.55)) drop-shadow(0 3px 8px rgba(0,0,0,0.35))";
}

function positiveMod(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

/* ── Cinematic keyframes (injected once) ── */
const KEYFRAMES_ID = "museum-object-animations";
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
@keyframes mo-turntable {
  0%   { transform: rotateY(-28deg); }
  50%  { transform: rotateY(28deg); }
  100% { transform: rotateY(-28deg); }
}
@keyframes mo-float {
  0%, 100% { transform: translateY(0px) rotateY(0deg); }
  25%      { transform: translateY(-8px) rotateY(4deg); }
  50%      { transform: translateY(-12px) rotateY(0deg); }
  75%      { transform: translateY(-8px) rotateY(-4deg); }
}
@keyframes mo-breathe {
  0%, 100% { transform: scale(1) rotateY(0deg); }
  50%      { transform: scale(1.04) rotateY(2deg); }
}
@keyframes mo-tilt-rock {
  0%, 100% { transform: rotateZ(0deg) rotateY(0deg); }
  25%      { transform: rotateZ(2.5deg) rotateY(6deg); }
  50%      { transform: rotateZ(0deg) rotateY(0deg); }
  75%      { transform: rotateZ(-2.5deg) rotateY(-6deg); }
}
@keyframes mo-orbit {
  0%   { transform: rotateX(0deg) rotateY(-22deg); }
  25%  { transform: rotateX(6deg) rotateY(22deg); }
  50%  { transform: rotateX(0deg) rotateY(-22deg); }
  75%  { transform: rotateX(-6deg) rotateY(22deg); }
  100% { transform: rotateX(0deg) rotateY(-22deg); }
}
@keyframes mo-spotlight-sweep {
  0%, 100% { filter: brightness(1) contrast(1); }
  30%      { filter: brightness(1.15) contrast(1.05); }
  60%      { filter: brightness(0.92) contrast(1.02); }
}
`;
  document.head.appendChild(style);
}

/** Map preset key to CSS animation value. Speed multiplier adjusts duration. */
function getAnimationStyle(preset: AnimationPreset, speed: number): React.CSSProperties {
  if (preset === "none") return {};
  const s = Math.max(0.1, speed);
  switch (preset) {
    case "turntable":
      return { animation: `mo-turntable ${14 / s}s ease-in-out infinite` };
    case "float":
      return { animation: `mo-float ${8 / s}s ease-in-out infinite` };
    case "breathe":
      return { animation: `mo-breathe ${6 / s}s ease-in-out infinite` };
    case "tilt-rock":
      return { animation: `mo-tilt-rock ${10 / s}s ease-in-out infinite` };
    case "orbit":
      return { animation: `mo-orbit ${24 / s}s linear infinite` };
    case "spotlight-sweep":
      return { animation: `mo-spotlight-sweep ${12 / s}s ease-in-out infinite` };
    default:
      return {};
  }
}

export function MuseumObjectViewer({
  title,
  mediaSources,
  isLightMode,
  className,
  imageClassName,
  topLabel,
  topRightLabel,
  footerLabel,
  emptyLabel = "Upload an artefact image",
  compact = false,
  showControls = false,
  showTopRightBadge = true,
  loading = "lazy",
  frameOverride,
  imageFilterOverride,
  imageOpacityOverride,
  stageBgOverride,
  displayParamsOverride,
  freeRotation: freeRotationProp = false,
  animation: animationProp = "turntable",
  animationSpeed: animationSpeedProp = 1,
  bgFade: bgFadeProp = 0,
}: MuseumObjectViewerProps) {
  const { frameUrl: settingsFrameUrl, displayParams: globalParams } = useDisplayFrameSettings();
  const glassCaseFrame = frameOverride ?? settingsFrameUrl;
  // Merge: defaults ← global admin settings ← per-artifact overrides
  const dp: FrameDisplayParams = useMemo(
    () => ({ ...DEFAULT_FRAME_DISPLAY, ...globalParams, ...(displayParamsOverride ?? {}) }),
    [globalParams, displayParamsOverride],
  );
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ active: boolean; pointerId: number | null; startX: number; startIndex: number }>({
    active: false,
    pointerId: null,
    startX: 0,
    startIndex: 0,
  });
  const [tilt, setTilt] = useState<ViewerTiltState>(DEFAULT_TILT);
  const [activeFrameIndex, setActiveFrameIndex] = useState(0);
  const [autoSpin, setAutoSpin] = useState(false);
  const [objectMetrics, setObjectMetrics] = useState<ObjectMetrics | null>(null);

  /* ── Free 3D rotation mode ── */
  const [freeRotationActive, setFreeRotationActive] = useState(freeRotationProp);
  const freeRotRef = useRef({ rotX: 0, rotY: 0, lastClientX: 0, lastClientY: 0, dragging: false });
  useEffect(() => { setFreeRotationActive(freeRotationProp); }, [freeRotationProp]);

  /* ── Cinematic animation ── */
  useEffect(ensureKeyframes, []);
  const animationStyle = useMemo(
    () => (freeRotationActive ? {} : getAnimationStyle(animationProp, animationSpeedProp)),
    [animationProp, animationSpeedProp, freeRotationActive],
  );
  const [animationPaused, setAnimationPaused] = useState(false);

  const resolvedMediaUrls = useResolvedMediaUrls(mediaSources);

  const frames = useMemo(
    () => resolvedMediaUrls.filter((entry): entry is string => Boolean(entry)),
    [resolvedMediaUrls],
  );
  const frameCount = frames.length;
  const activeImage = frameCount > 0 ? frames[positiveMod(activeFrameIndex, frameCount)] : "";
  const interactiveLabel = frameCount > 1 ? "Drag to rotate" : "Move pointer across the glass case";
  const restingTilt = useMemo<ViewerTiltState>(
    () => frameCount > 1
      ? { rotateX: 2, rotateY: -3.2, glareX: 34, glareY: 16, shiftX: -3, shiftY: -1 }
      : { rotateX: 4.8, rotateY: -6.8, glareX: 32, glareY: 14, shiftX: -5, shiftY: -3 },
    [frameCount],
  );
  const resolvedTopRightLabel = frameCount > 1
    ? topRightLabel ?? (compact ? "360" : "360 Ready")
    : topRightLabel ?? (compact ? undefined : "Glass Case");

  /** Measure image dimensions on load for intelligent scaling */
  const handleImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth && img.naturalHeight) {
      setObjectMetrics(classifyObject(img.naturalWidth, img.naturalHeight));
    }
  }, []);

  // Compute scale and filter styles from metrics
  const scaleStyle = useMemo(() => getObjectScaleStyle(objectMetrics, compact), [objectMetrics, compact]);
  const objectFilter = useMemo(() => getObjectFilter(objectMetrics), [objectMetrics]);
  const objectDropShadow = useMemo(() => getObjectDropShadow(objectMetrics), [objectMetrics]);

  // Shadow width adapts to object shape
  const shadowWidth = useMemo(() => {
    if (!objectMetrics) return "50%";
    if (objectMetrics.shape === "wide") return "60%";
    if (objectMetrics.shape === "tall") return "36%";
    if (objectMetrics.shape === "small" || objectMetrics.shape === "flat") return "40%";
    return "48%";
  }, [objectMetrics]);

  useEffect(() => {
    setActiveFrameIndex(0);
    setAutoSpin(false);
    setObjectMetrics(null);
  }, [frameCount, title]);

  useEffect(() => {
    setTilt(restingTilt);
  }, [restingTilt, activeImage]);

  useEffect(() => {
    if (!autoSpin || frameCount <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveFrameIndex((previousIndex) => positiveMod(previousIndex + 1, frameCount));
    }, AUTO_SPIN_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [autoSpin, frameCount]);

  const updateTilt = (clientX: number, clientY: number) => {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    if (freeRotationActive) {
      // In free-rotation mode, accumulate rotation delta from drag movement
      if (freeRotRef.current.dragging) {
        const dx = clientX - freeRotRef.current.lastClientX;
        const dy = clientY - freeRotRef.current.lastClientY;
        freeRotRef.current.rotY += dx * 0.6;
        freeRotRef.current.rotX -= dy * 0.5;
        freeRotRef.current.lastClientX = clientX;
        freeRotRef.current.lastClientY = clientY;

        const rx = freeRotRef.current.rotX;
        const ry = freeRotRef.current.rotY;
        setTilt({
          rotateX: rx,
          rotateY: ry,
          glareX: 50 + (ry % 360) * 0.1,
          glareY: 18 + (rx % 360) * 0.06,
          shiftX: Math.sin((ry * Math.PI) / 180) * 14,
          shiftY: Math.sin((rx * Math.PI) / 180) * 10,
        });
      }
      return;
    }

    const normalizedX = (clientX - rect.left) / rect.width - 0.5;
    const normalizedY = (clientY - rect.top) / rect.height - 0.5;

    const ts = dp.tiltSensitivity;
    setTilt({
      rotateX: Number((-normalizedY * 14 * ts).toFixed(2)),
      rotateY: Number((normalizedX * 16 * ts).toFixed(2)),
      glareX: 50 + normalizedX * 36,
      glareY: 18 + normalizedY * 22,
      shiftX: normalizedX * 14 * ts,
      shiftY: normalizedY * 10 * ts,
    });
  };

  const resetTilt = () => {
    if (freeRotationActive) return; // preserve position in free rotation mode
    setTilt(restingTilt);
  };

  const scrubToOffset = (clientX: number) => {
    if (frameCount <= 1 || !dragRef.current.active) {
      return;
    }

    const dragDistance = clientX - dragRef.current.startX;
    const frameOffset = Math.round(dragDistance / DRAG_STEP_PX);
    const nextIndex = positiveMod(dragRef.current.startIndex + frameOffset, frameCount);
    setActiveFrameIndex(nextIndex);
  };

  const stopDrag = (pointerId?: number) => {
    if (pointerId != null && stageRef.current?.hasPointerCapture(pointerId)) {
      stageRef.current.releasePointerCapture(pointerId);
    }

    dragRef.current = {
      active: false,
      pointerId: null,
      startX: 0,
      startIndex: activeFrameIndex,
    };
  };

  return (
    <div
      ref={stageRef}
      className={cn(
        "museum-stage-shadow relative isolate overflow-hidden rounded-[28px] border touch-none select-none",
        compact ? "aspect-[4/3] min-h-0" : "min-h-[320px] sm:min-h-[420px]",
        "border-white/8 bg-[#1a1510]",
        className,
      )}
      onPointerDown={(event) => {
        setAnimationPaused(true);
        if (freeRotationActive) {
          freeRotRef.current.lastClientX = event.clientX;
          freeRotRef.current.lastClientY = event.clientY;
          freeRotRef.current.dragging = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          return;
        }
        updateTilt(event.clientX, event.clientY);
        dragRef.current = {
          active: frameCount > 1,
          pointerId: event.pointerId,
          startX: event.clientX,
          startIndex: activeFrameIndex,
        };
        if (frameCount > 1) {
          setAutoSpin(false);
        }
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        updateTilt(event.clientX, event.clientY);
        if (!freeRotationActive) scrubToOffset(event.clientX);
      }}
      onPointerUp={(event) => {
        setAnimationPaused(false);
        if (freeRotationActive) { freeRotRef.current.dragging = false; return; }
        stopDrag(event.pointerId);
      }}
      onPointerCancel={(event) => {
        setAnimationPaused(false);
        if (freeRotationActive) { freeRotRef.current.dragging = false; return; }
        stopDrag(event.pointerId);
        resetTilt();
      }}
      onPointerLeave={() => {
        setAnimationPaused(false);
        if (freeRotationActive) { freeRotRef.current.dragging = false; return; }
        stopDrag(dragRef.current.pointerId ?? undefined);
        resetTilt();
      }}
    >
      {/* ── Stage background override (custom bg from image editor) ── */}
      {stageBgOverride && (
        stageBgOverride.startsWith("http") || stageBgOverride.startsWith("blob:") || stageBgOverride.startsWith("data:")
          ? <img src={stageBgOverride} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover z-[0]" aria-hidden="true" />
          : <div className="pointer-events-none absolute inset-0 z-[0]" style={{ background: stageBgOverride }} aria-hidden />
      )}

      {/* ── Glass-case frame background ── */}
      <img
        src={glassCaseFrame}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-cover"
        style={{ opacity: stageBgOverride ? 0.6 : (dp.frameOpacity ?? 100) / 100 }}
        aria-hidden="true"
      />

      {/* Warm ambient vignette */}
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,${dp.vignette / 100}) 100%)` }} />

      {/* Top-down spotlighting to match the frame */}
      <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse 50% 35% at 50% 8%, rgba(255,240,200,${dp.spotlight / 100}), transparent 70%)` }} />

      {/* Badges */}
      {topLabel && (
        <div className={cn(
          "absolute left-3 top-3 z-30 rounded-full border font-semibold uppercase backdrop-blur-sm",
          compact ? "px-2 py-0.5 text-[7px] tracking-[0.16em]" : "px-3 py-1.5 text-[9px] tracking-[0.2em]",
          "border-[#d4af37]/20 bg-black/50 text-[#d8bf76]",
        )}>
          {topLabel}
        </div>
      )}

      {showTopRightBadge && resolvedTopRightLabel && (
        <div className={cn(
          "absolute right-3 top-3 z-30 rounded-full border font-semibold uppercase backdrop-blur-sm",
          compact ? "px-2 py-0.5 text-[7px] tracking-[0.14em]" : "px-2.5 py-1 text-[8px] tracking-[0.16em]",
          "border-white/10 bg-black/45 text-white/60",
        )}>
          {resolvedTopRightLabel}
        </div>
      )}

      {activeImage ? (
        <>
          {/* ── Artifact inside the glass case ── */}
          <div className="absolute inset-0 [perspective:1200px]">
            <div
              className="relative h-full w-full transition-transform duration-200 ease-out will-change-transform"
              style={{
                transform: freeRotationActive
                  ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg)`
                  : `rotateX(${tilt.rotateX * 0.5}deg) rotateY(${tilt.rotateY * 0.5}deg)`,
              }}
            >
              {/* ── Artifact grounded on the pedestal — physical 3D object ── */}
              <div
                className="absolute z-10 flex items-end justify-center"
                style={{
                  perspective: `${dp.perspective}px`,
                  perspectiveOrigin: "center 80%",
                  insetInline: `${compact ? dp.objectInset : dp.objectInset + 1}%`,
                  top: `${compact ? dp.objectInset - 2 : dp.objectInset - 4}%`,
                  bottom: `${compact ? dp.objectInset + 6 : dp.objectInset + 8}%`,
                }}
              >
                {/* 3D rotating wrapper — responds to pointer for real depth */}
                <div
                  className="flex h-full w-full items-end justify-center transition-transform duration-[250ms] ease-out will-change-transform"
                  style={{
                    transform: freeRotationActive
                      ? `rotateX(${tilt.rotateX}deg) rotateY(${tilt.rotateY}deg) translateZ(${dp.depthZ}px)`
                      : `rotateX(${tilt.rotateX * 0.6}deg) rotateY(${tilt.rotateY * 0.8}deg) translateZ(${dp.depthZ}px) translate3d(${tilt.shiftX * 0.25}px, ${tilt.shiftY * 0.15}px, 0)`,
                  }}
                >
                  {/* Cinematic animation wrapper */}
                  <div
                    style={{
                      display: "flex", alignItems: "flex-end", justifyContent: "center",
                      width: "100%", height: "100%",
                      ...(animationProp !== "spotlight-sweep" ? animationStyle : {}),
                      animationPlayState: animationPaused ? "paused" : "running",
                    }}
                  >
                  <img
                    src={activeImage}
                    alt={title}
                    onLoad={handleImageLoad}
                    className={cn(
                      "object-contain",
                      imageClassName,
                    )}
                    loading={loading}
                    style={{
                      maxHeight: scaleStyle.maxHeight,
                      maxWidth: scaleStyle.maxWidth,
                      filter: imageFilterOverride ? `${imageFilterOverride} ${objectDropShadow}` : `${objectFilter} ${objectDropShadow}`,
                      opacity: imageOpacityOverride != null ? imageOpacityOverride : undefined,
                      WebkitMaskImage: bgFadeProp > 0
                        ? `radial-gradient(ellipse ${95 - bgFadeProp * 0.35}% ${97 - bgFadeProp * 0.35}% at 50% 48%, black ${60 - bgFadeProp * 0.45}%, rgba(0,0,0,${0.7 - bgFadeProp * 0.005}) ${78 - bgFadeProp * 0.25}%, rgba(0,0,0,${0.3 - bgFadeProp * 0.0025}) ${90 - bgFadeProp * 0.15}%, transparent 100%)`
                        : "linear-gradient(to bottom, black 88%, rgba(0,0,0,0.6) 96%, transparent 100%)",
                      maskImage: bgFadeProp > 0
                        ? `radial-gradient(ellipse ${95 - bgFadeProp * 0.35}% ${97 - bgFadeProp * 0.35}% at 50% 48%, black ${60 - bgFadeProp * 0.45}%, rgba(0,0,0,${0.7 - bgFadeProp * 0.005}) ${78 - bgFadeProp * 0.25}%, rgba(0,0,0,${0.3 - bgFadeProp * 0.0025}) ${90 - bgFadeProp * 0.15}%, transparent 100%)`
                        : "linear-gradient(to bottom, black 88%, rgba(0,0,0,0.6) 96%, transparent 100%)",
                      ...(animationProp === "spotlight-sweep" ? { ...animationStyle, animationPlayState: animationPaused ? "paused" : "running" } : {}),
                    }}
                  />
                  </div>
                </div>

                {/* Dynamic specular surface highlight — follows viewing angle */}
                <div
                  className="pointer-events-none absolute inset-0 mix-blend-soft-light"
                  style={{
                    background: `radial-gradient(ellipse 40% 35% at ${50 + tilt.shiftX * 3}% ${62 + tilt.shiftY * 2.5}%, rgba(255,248,235,${dp.specularIntensity / 100}), transparent 72%)`,
                  }}
                />

                {/* Subtle surface micro-texture for physical tactile feel */}
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.035] mix-blend-overlay"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='t'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23t)'/%3E%3C/svg%3E")`,
                    backgroundSize: "120px 120px",
                  }}
                />
              </div>

              {/* ── Contact shadow — shifts with viewing angle ── */}
              <div
                className={cn(
                  "pointer-events-none absolute z-[9] left-1/2 transition-transform duration-200 ease-out",
                  compact
                    ? "bottom-[26%] h-[4%]"
                    : "bottom-[28%] h-[5%]",
                )}
                style={{
                  width: shadowWidth,
                  transform: `translateX(calc(-50% + ${-tilt.rotateY * 0.6}px))`,
                }}
              >
                <div
                  className="h-full w-full rounded-[50%] transition-transform duration-200 ease-out"
                  style={{
                    backgroundColor: `rgba(0,0,0,${dp.shadowOpacity / 100})`,
                    filter: `blur(${dp.shadowBlur}px)`,
                    transform: `scaleX(${1 + Math.abs(tilt.rotateY) * 0.015}) scaleY(${1 - Math.abs(tilt.rotateX) * 0.01})`,
                  }}
                />
              </div>

              {/* Tighter ambient occlusion ring right at the base */}
              <div
                className={cn(
                  "pointer-events-none absolute z-[9] left-1/2 transition-transform duration-200 ease-out",
                  compact
                    ? "bottom-[26.5%] h-[2%]"
                    : "bottom-[28.5%] h-[2.5%]",
                )}
                style={{
                  width: `calc(${shadowWidth} * 0.7)`,
                  transform: `translateX(calc(-50% + ${-tilt.rotateY * 0.4}px))`,
                }}
              >
                <div className="h-full w-full rounded-[50%] bg-black/25 blur-md" />
              </div>

              {/* ── Top-down spotlight cone on the artifact ── */}
              <div className="pointer-events-none absolute inset-0 z-[8]">
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-[5%] opacity-50"
                  style={{
                    width: "50%",
                    height: "85%",
                    background: "linear-gradient(180deg, rgba(255,240,200,0.14) 0%, rgba(255,240,200,0.06) 35%, transparent 70%)",
                    clipPath: "polygon(35% 0%, 65% 0%, 85% 100%, 15% 100%)",
                  }}
                />
              </div>

              {/* ── Glass overlay layers (foreground — in front of object) ── */}

              {/* Broad diagonal reflection — top-left highlight streak */}
              <div
                className="pointer-events-none absolute inset-[7%] z-20 rounded-[18px]"
                style={{
                  opacity: dp.glassReflection / 100,
                  background: `linear-gradient(138deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.05) 12%, transparent 35%, transparent 68%, rgba(255,255,255,0.03) 88%, rgba(255,255,255,0.07) 100%)`,
                }}
              />

              {/* Floating highlight — parallax with pointer for realism */}
              <div
                className="pointer-events-none absolute left-[9%] top-[7%] z-20 h-[38%] w-[28%] rounded-[40px] blur-[4px]"
                style={{
                  opacity: (dp.glassReflection / 100) * 0.82,
                  background: `linear-gradient(142deg, rgba(255,255,255,0.15), rgba(255,255,255,0.06) 38%, transparent 70%)`,
                  transform: `translate3d(${tilt.shiftX * 0.65}px, ${tilt.shiftY * 0.55}px, 0) rotate(-8deg)`,
                }}
              />

              {/* Secondary smaller reflection — bottom-right for symmetry */}
              <div
                className="pointer-events-none absolute right-[11%] bottom-[25%] z-20 h-[18%] w-[15%] rounded-[30px] blur-[5px]"
                style={{
                  opacity: (dp.glassReflection / 100) * 0.45,
                  background: `linear-gradient(320deg, rgba(255,255,255,0.10), transparent 60%)`,
                  transform: `translate3d(${tilt.shiftX * -0.3}px, ${tilt.shiftY * -0.25}px, 0) rotate(12deg)`,
                }}
              />

              {/* Point light glare — follows cursor position */}
              <div
                className="pointer-events-none absolute inset-0 z-20 mix-blend-screen"
                style={{
                  opacity: (dp.glassReflection / 100) * 1.18,
                  background: `radial-gradient(circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255,255,255,0.15), rgba(255,255,255,0.04) 14%, transparent 38%)`,
                }}
              />

              {/* Vertical light streak on glass edge */}
              <div
                className="pointer-events-none absolute z-20"
                style={{
                  opacity: (dp.glassReflection / 100) * 0.55,
                  top: "12%",
                  right: "8%",
                  width: "1px",
                  height: "45%",
                  background: "linear-gradient(180deg, transparent, rgba(255,255,255,0.18) 30%, rgba(255,255,255,0.08) 70%, transparent)",
                  transform: `translateY(${tilt.shiftY * 0.3}px)`,
                }}
              />


            </div>
          </div>
        </>
      ) : (
        /* ── Empty state ── */
        <div className={cn("absolute inset-0 z-10 flex items-center justify-center", compact ? "p-3" : "p-6")}>
          <div className={cn(
            "relative flex w-full flex-col items-center justify-center rounded-[24px] border text-center backdrop-blur-sm",
            compact ? "max-w-[220px] px-4 py-5" : "max-w-[380px] px-6 py-10",
            "border-white/10 bg-black/30",
          )}>
            <div className={cn(
              "relative rounded-full border p-4",
              compact ? "p-3" : "p-5",
              "border-[#d4af37]/16 bg-black/30",
            )}>
              <Shield className={cn(compact ? "h-8 w-8" : "h-12 w-12", "text-[#d8bf76]/30")} />
            </div>
            <p className={cn("museum-kicker", compact ? "mt-3 text-[7px]" : "mt-4 text-[9px]", "text-[#d8bf76]/70")}>Museum Object Stage</p>
            <p className={cn(compact ? "mt-1.5 text-xs font-semibold" : "mt-2 text-sm font-semibold", "text-[#f8f3e8]/80")}>{emptyLabel}</p>
            <p className={cn(compact ? "mt-1.5 text-[10px] leading-4" : "mt-2 max-w-[240px] text-xs leading-5", "text-white/45")}>
              {compact
                ? "Add an image or multi-angle set."
                : "Upload an artefact image, document scan, medal, or crest to place it in the display case."}
            </p>
          </div>
        </div>
      )}

      {footerLabel && (
        <div className={cn(
          "absolute bottom-3 left-3 z-30 rounded-full border font-semibold uppercase backdrop-blur-sm",
          compact ? "px-2 py-0.5 text-[7px] tracking-[0.14em]" : "px-3 py-1.5 text-[9px] tracking-[0.2em]",
          "border-white/10 bg-black/45 text-white/60",
        )}>
          {footerLabel}
        </div>
      )}

      {showControls ? (
        <div className={cn(
          "absolute bottom-3 right-3 z-30 flex flex-wrap items-center justify-end gap-2 rounded-full border px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] backdrop-blur-sm",
          "border-white/10 bg-black/50 text-white/60",
        )}>
          {frameCount > 1 ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setAutoSpin(false);
                  setActiveFrameIndex((previousIndex) => positiveMod(previousIndex - 1, frameCount));
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/[0.1] transition-colors"
                aria-label="Previous artefact angle"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="text-[#d8bf76]">{activeFrameIndex + 1}/{frameCount}</span>
              <button
                type="button"
                onClick={() => setAutoSpin((currentState) => !currentState)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 transition-colors",
                  autoSpin
                    ? "border-[#d4af37]/30 bg-[#d4af37]/14 text-[#d4af37]"
                    : "border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/[0.1]",
                )}
              >
                <RotateCcw className="h-3 w-3" />
                {autoSpin ? "Stop" : "Spin"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAutoSpin(false);
                  setActiveFrameIndex((previousIndex) => positiveMod(previousIndex + 1, frameCount));
                }}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 hover:bg-white/[0.1] transition-colors"
                aria-label="Next artefact angle"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </>
          ) : (
            <span>{interactiveLabel}</span>
          )}
          {freeRotationActive && (
            <button
              type="button"
              onClick={() => {
                freeRotRef.current.rotX = 0;
                freeRotRef.current.rotY = 0;
                setTilt(DEFAULT_TILT);
              }}
              className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.06] px-2.5 py-1 text-white/70 hover:bg-white/[0.1] transition-colors"
              aria-label="Reset 3D rotation"
            >
              <Rotate3D className="h-3 w-3" />
              Reset
            </button>
          )}
        </div>
      ) : frameCount > 1 && !compact ? (
        <div className="absolute bottom-3 right-3 z-30 rounded-full border border-[#d4af37]/18 bg-black/50 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-[#d8bf76] backdrop-blur-sm">
          {interactiveLabel}
        </div>
      ) : null}
    </div>
  );
}