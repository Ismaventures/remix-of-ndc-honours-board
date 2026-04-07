import { useEffect, useRef, useState } from "react";
import { Check, ImagePlus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useDisplayFrameSettings, DEFAULT_FRAME_DISPLAY, type FrameDisplayParams } from "@/hooks/useDisplayFrameSettings";
import { saveMediaFile, resolveMediaRefToObjectUrl } from "@/lib/persistentMedia";
import { MuseumObjectViewer } from "./MuseumObjectViewer";
import { cn } from "@/lib/utils";

const SAMPLE_ARTIFACT = "/images/ndc-crest.png";

/** Slider definition for a FrameDisplayParams field */
type ParamSliderDef = {
  key: keyof FrameDisplayParams;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
};

const PARAM_SLIDERS: ParamSliderDef[] = [
  { key: "perspective",       label: "Perspective",         min: 300,  max: 2000, step: 10,  unit: "px" },
  { key: "depthZ",            label: "Depth (Z)",           min: 0,    max: 60,   step: 1,   unit: "px" },
  { key: "tiltSensitivity",   label: "Tilt Sensitivity",    min: 0,    max: 200,  step: 1,   unit: "%" },
  { key: "objectInset",       label: "Object Inset",        min: 5,    max: 40,   step: 1,   unit: "%" },
  { key: "vignette",          label: "Vignette",            min: 0,    max: 100,  step: 1,   unit: "%" },
  { key: "spotlight",         label: "Spotlight",           min: 0,    max: 100,  step: 1,   unit: "%" },
  { key: "glassReflection",   label: "Glass Reflection",    min: 0,    max: 100,  step: 1,   unit: "%" },
  { key: "specularIntensity", label: "Specular Intensity",  min: 0,    max: 100,  step: 1,   unit: "%" },
  { key: "shadowOpacity",     label: "Shadow Opacity",      min: 0,    max: 100,  step: 1,   unit: "%" },
  { key: "shadowBlur",        label: "Shadow Blur",         min: 0,    max: 30,   step: 1,   unit: "px" },
  { key: "frameOpacity",      label: "Frame Opacity",       min: 0,    max: 100,  step: 1,   unit: "%" },
];

export function DisplayFrameAdmin() {
  const {
    frameUrl, savedFrames, displayParams, loading,
    setActiveFrame, addFrame, removeFrame,
    setDisplayParams, resetDisplayParams,
  } = useDisplayFrameSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout>>();

  // Brief "Saved" flash on any settings change
  const flashSaved = () => {
    setSavedFlash(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSavedFlash(false), 1800);
  };
  useEffect(() => () => clearTimeout(savedTimer.current), []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const ref = await saveMediaFile(file);
      const url = await resolveMediaRefToObjectUrl(ref);
      if (url) await addFrame(url);
    } catch (err) {
      console.error("Failed to upload display frame:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading display frame settings…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Museum Display Frame</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose the glass-case background used for all artefact displays. Upload new frames or select from saved ones.
        </p>
      </div>

      {/* Live Preview */}
      <div className="max-w-md mx-auto">
        <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">Live Preview</p>
        <MuseumObjectViewer
          title="Preview Artefact"
          mediaSources={[SAMPLE_ARTIFACT]}
          isLightMode={false}
          compact={false}
          topLabel="Preview"
          footerLabel="Sample"
          showControls={false}
          loading="eager"
        />
      </div>

      {/* Frame Selector Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Saved Frames</p>
          <label className={cn(
            "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium cursor-pointer transition-colors",
            "border-primary/20 bg-primary/5 text-primary hover:bg-primary/10",
            uploading && "opacity-50 pointer-events-none",
          )}>
            <ImagePlus className="h-4 w-4" />
            {uploading ? "Uploading…" : "Upload Frame"}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {savedFrames.map((url) => {
            const isActive = url === frameUrl;
            const isBuiltIn = url === "/images/glass-case-frame.png";

            return (
              <div
                key={url}
                className={cn(
                  "relative group rounded-xl overflow-hidden border-2 cursor-pointer transition-all",
                  isActive
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/40",
                )}
                onClick={() => { setActiveFrame(url); flashSaved(); }}
              >
                <div className="aspect-[4/3] bg-muted">
                  <img
                    src={url}
                    alt="Display frame"
                    className="h-full w-full object-cover"
                  />
                </div>

                {isActive && (
                  <div className="absolute top-2 left-2 rounded-full bg-primary p-1">
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </div>
                )}

                {isBuiltIn && (
                  <div className="absolute bottom-1 left-1 rounded-full bg-gray-100 px-2 py-0.5 text-[9px] text-gray-800 font-medium">
                    Default
                  </div>
                )}

                {!isBuiltIn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeFrame(url); }}
                    className="absolute top-2 right-2 rounded-full bg-destructive/80 p-1.5 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    title="Remove frame"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Display Parameter Sliders */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Display Settings</p>
              {savedFlash && (
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium animate-in fade-in duration-200">
                  <Save className="h-3 w-3" /> Saved
                </span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">Controls applied to all glass-case viewers — changes save automatically</p>
          </div>
          {Object.keys(displayParams).some(
            (k) => displayParams[k as keyof FrameDisplayParams] !== DEFAULT_FRAME_DISPLAY[k as keyof FrameDisplayParams],
          ) && (
            <button
              onClick={() => { resetDisplayParams(); flashSaved(); }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset All
            </button>
          )}
        </div>

        <div className="space-y-2 rounded-xl border border-border/50 bg-muted/30 p-4">
          {PARAM_SLIDERS.map((s) => {
            const val = s.key === "tiltSensitivity"
              ? Math.round(displayParams[s.key] * 100)
              : displayParams[s.key];
            const defVal = s.key === "tiltSensitivity"
              ? Math.round(DEFAULT_FRAME_DISPLAY[s.key] * 100)
              : DEFAULT_FRAME_DISPLAY[s.key];
            const isChanged = val !== defVal;

            return (
              <div key={s.key} className="flex items-center gap-3">
                <span className="w-20 sm:w-28 shrink-0 text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {s.label}
                </span>
                <input
                  type="range"
                  min={s.min}
                  max={s.max}
                  step={s.step}
                  value={val}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setDisplayParams({ [s.key]: s.key === "tiltSensitivity" ? v / 100 : v });
                    flashSaved();
                  }}
                  className="flex-1 h-1 accent-primary cursor-pointer"
                />
                <span className="w-14 text-right text-[10px] text-muted-foreground tabular-nums">
                  {val}{s.unit}
                </span>
                {isChanged && (
                  <button
                    onClick={() => {
                      setDisplayParams({ [s.key]: DEFAULT_FRAME_DISPLAY[s.key] });
                      flashSaved();
                    }}
                    className="text-muted-foreground/30 hover:text-muted-foreground/60 transition-colors"
                    title="Reset to default"
                  >
                    <RotateCcw className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
