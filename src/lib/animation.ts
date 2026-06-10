/* ── Timing constants (kept for reference, now used in JS for stagger indices) ── */
export const MOTION_TIMINGS = {
  commandant: 1.2,
  image: 0.84,
  textStagger: 0.12,
  textDelay: 0.3,
  microTapScale: 0.97,
  microHoverScale: 1.03,
  microHoverY: -5,
} as const;

export const MUSEUM_MOTION_TIMINGS = {
  panel: 0.9,
  image: 1.1,
  textStagger: 0.14,
  textDelay: 0.18,
  microTapScale: 0.985,
  microHoverScale: 1.012,
  microHoverY: -2,
} as const;

/* ── CSS class name constants ── */
export const CSS_CLASSES = {
  /* Entry animations */
  fadeIn: "animate-fade-in",
  fadeUp: "animate-fade-up",
  fadeUpSm: "animate-fade-up-sm",
  fadeUpBlur: "animate-fade-up-blur",
  fadeDownSm: "animate-fade-down-sm",
  fadeLeft: "animate-fade-left",
  fadeRight: "animate-fade-right",
  fadeLeftSm: "animate-fade-left-sm",
  scaleIn: "animate-scale-in",
  scaleInSimple: "animate-scale-in-simple",

  /* Exit animations */
  fadeOut: "animate-fade-out",
  fadeOutUp: "animate-fade-out-up",
  fadeOutDown: "animate-fade-out-down",
  fadeOutUpSm: "animate-fade-out-up-sm",
  scaleOutModal: "animate-scale-out-modal",
  scaleOut: "animate-scale-out",

  /* Directional slides */
  slideIn: "animate-slide-in",
  slideOut: "animate-slide-out",
  museumSlideIn: "animate-museum-slide-in",
  museumSlideOut: "animate-museum-slide-out",

  /* Height expand/collapse */
  expandableGrid: "expandable-grid",
  expandableInner: "expandable-inner",

  /* Interactive */
  hoverLiftSm: "hover-lift-sm",
  hoverLiftMd: "hover-lift-md",
  hoverLiftLg: "hover-lift-lg",
  hoverScaleSm: "hover-scale-sm",
  hoverPrimary: "hover-primary",
  hoverClose: "hover-close",
  hoverAction: "hover-action",
  hoverGallery: "hover-gallery",

  /* Card states */
  cardActive: "card-active",
  cardInactive: "card-inactive",

  /* Chevron rotate */
  chevronRotate: "animate-chevron-rotate",

  /* Stagger */
  staggerContainer: "stagger-container",
  staggerItem: "stagger-item",
  staggerItemMuseum: "stagger-item-museum",
  staggerGridItem: "stagger-grid-item",

  /* Infinite loops */
  spinLinear: "animate-spin-linear",
  spinCounter: "animate-spin-counter",
  breatheOpacity: "animate-breathe-opacity",
  glowPulse: "animate-glow-pulse",
  scanBeam: "animate-scan-beam",
  scanBeamSlow: "animate-scan-beam-slow",
  parallaxBg: "animate-parallax-bg",
  parallaxBgMuseum: "animate-parallax-bg-museum",
  softBreathe: "animate-soft-breathe",
  branchFloatLeft: "animate-branch-float-left",
  branchFloatRight: "animate-branch-float-right",
  rotateWatermark: "animate-rotate-watermark",
  radarExpand: "animate-radar-expand",
  radarRotate: "animate-radar-rotate",
  flagWave: "animate-flag-wave",
  flagWaveSubtle: "animate-flag-wave-subtle",
  holographicScan: "animate-holographic-scan",
  imageBreathe: "animate-image-breathe",
  unlockPulse: "animate-unlock-pulse",

  /* Transitions */
  flashOverlay: "animate-flash-overlay",
  saluteSilhouette: "animate-salute-silhouette",
  sweepLeftToRight: "animate-sweep-left-to-right",
  sweepShimmer: "animate-sweep-shimmer",
  runwaySweep: "animate-runway-sweep",
  missionScanlines: "animate-mission-scanlines",
  classifiedText: "animate-classified-text",
  barracksDoor: "animate-barracks-door",
  sparks: "animate-sparks",
  cardFocus: "animate-card-focus",
  burstOut: "animate-burst-out",
} as const;

/* ── Helper to build style with stagger index ── */
export function staggerStyle(
  index: number,
  staggerDelay = 0.12,
  staggerOffset = 0.3,
): React.CSSProperties {
  return {
    "--stagger-index": index,
    "--stagger-delay": `${staggerDelay}s`,
    "--stagger-offset": `${staggerOffset}s`,
  } as React.CSSProperties;
}

/* ── Helper to build style with slide direction ── */
export function slideDirectionStyle(direction: number): React.CSSProperties {
  return { "--slide-direction": direction } as React.CSSProperties;
}
