import type { TransitionCueType } from "@/hooks/useAutoDisplaySettings";

let cueAudioContext: AudioContext | null = null;

const getContext = (): AudioContext | null => {
  try {
    if (typeof window === "undefined") return null;
    const Ctx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    cueAudioContext = cueAudioContext ?? new Ctx();
    return cueAudioContext;
  } catch {
    return null;
  }
};

const playOscillator = (
  ctx: AudioContext,
  type: OscillatorType,
  startFrequency: number,
  endFrequency: number,
  durationSec: number,
  gainPeak: number,
) => {
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(startFrequency, now);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + durationSec);

  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainPeak), now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + durationSec);
};

export function playTransitionCue(cue: TransitionCueType, enabled: boolean) {
  if (!enabled || cue === "none") return;

  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state === "suspended") {
    void ctx.resume();
  }

  switch (cue) {
    case "whoosh":
      playOscillator(ctx, "triangle", 500, 110, 0.22, 0.03);
      break;
    case "clank":
      playOscillator(ctx, "square", 210, 140, 0.09, 0.04);
      setTimeout(() => playOscillator(ctx, "square", 130, 90, 0.1, 0.03), 45);
      break;
    case "flash":
      playOscillator(ctx, "sine", 1100, 1700, 0.1, 0.03);
      break;
    case "drum":
      playOscillator(ctx, "triangle", 180, 62, 0.2, 0.05);
      break;
    case "scan":
      playOscillator(ctx, "sawtooth", 960, 380, 0.24, 0.022);
      break;
    case "sweep":
      playOscillator(ctx, "sine", 260, 980, 0.28, 0.02);
      break;
    default:
      break;
  }
}
