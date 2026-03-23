import { useAudioStore } from "@/hooks/useAudioStore";

type AmbientNodes = {
  drone: OscillatorNode;
  undertone: OscillatorNode;
  gain: GainNode;
};

class CinematicAudioManager {
  private ctx: AudioContext | null = null;
  private ambient: AmbientNodes | null = null;
  private lastWhooshAt = 0;
  private whooshCooldownMs = 400;
  private ambientLevel = 0.16;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return null;
      this.ctx = new Ctx();
    }
    if (this.ctx.state === "suspended") {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  private getEffectiveVolume(multiplier = 1): number {
    const { isMuted, masterVolume } = useAudioStore.getState();
    if (isMuted) return 0;
    return Math.max(0, Math.min(1, masterVolume * multiplier));
  }

  private createGain(value: number): GainNode | null {
    const ctx = this.ensureContext();
    if (!ctx) return null;
    const gain = ctx.createGain();
    gain.gain.value = value;
    gain.connect(ctx.destination);
    return gain;
  }

  setWhooshCooldown(ms: number) {
    this.whooshCooldownMs = Math.max(300, Math.min(500, ms));
  }

  setAmbientLevel(level: number) {
    this.ambientLevel = Math.max(0.1, Math.min(0.25, level));
  }

  playWhoosh() {
    const now = performance.now();
    if (now - this.lastWhooshAt < this.whooshCooldownMs) return;
    this.lastWhooshAt = now;

    const ctx = this.ensureContext();
    if (!ctx) return;

    const variations = [
      { from: 220, to: 90, duration: 0.44, type: "sawtooth" as OscillatorType },
      { from: 260, to: 110, duration: 0.5, type: "triangle" as OscillatorType },
      { from: 190, to: 70, duration: 0.46, type: "sine" as OscillatorType },
      { from: 280, to: 120, duration: 0.54, type: "sawtooth" as OscillatorType },
      { from: 240, to: 100, duration: 0.48, type: "triangle" as OscillatorType },
    ];

    const config = variations[Math.floor(Math.random() * variations.length)];
    const gain = this.createGain(this.getEffectiveVolume(0.33));
    if (!gain) return;

    const osc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    osc.type = config.type;
    osc.frequency.setValueAtTime(config.from, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(config.to, ctx.currentTime + config.duration);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(550, ctx.currentTime + config.duration);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, this.getEffectiveVolume(0.33)), ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + config.duration);

    osc.connect(filter);
    filter.connect(gain);
    osc.start();
    osc.stop(ctx.currentTime + config.duration + 0.03);
  }

  playChime() {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const gain = this.createGain(this.getEffectiveVolume(0.22));
    if (!gain) return;

    const primary = ctx.createOscillator();
    const accent = ctx.createOscillator();

    primary.type = "sine";
    accent.type = "triangle";

    primary.frequency.setValueAtTime(880, ctx.currentTime);
    accent.frequency.setValueAtTime(1320, ctx.currentTime);

    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, this.getEffectiveVolume(0.22)), ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);

    primary.connect(gain);
    accent.connect(gain);

    primary.start();
    accent.start();
    primary.stop(ctx.currentTime + 0.5);
    accent.stop(ctx.currentTime + 0.35);
  }

  playAmbient(fadeInMs = 2400) {
    const ctx = this.ensureContext();
    if (!ctx || this.ambient) return;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);

    const target = this.getEffectiveVolume(1) > 0 ? this.ambientLevel : 0;
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, target), ctx.currentTime + fadeInMs / 1000);

    const drone = ctx.createOscillator();
    drone.type = "sine";
    drone.frequency.setValueAtTime(55, ctx.currentTime);

    const undertone = ctx.createOscillator();
    undertone.type = "triangle";
    undertone.frequency.setValueAtTime(82.4, ctx.currentTime);

    drone.connect(gain);
    undertone.connect(gain);
    gain.connect(ctx.destination);

    drone.start();
    undertone.start();

    this.ambient = { drone, undertone, gain };
  }

  stopAmbient(fadeOutMs = 1800) {
    if (!this.ambient || !this.ctx) return;
    const { gain, drone, undertone } = this.ambient;
    const endAt = this.ctx.currentTime + fadeOutMs / 1000;

    gain.gain.cancelScheduledValues(this.ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, endAt);

    drone.stop(endAt + 0.05);
    undertone.stop(endAt + 0.05);

    this.ambient = null;
  }
}

export const cinematicAudioManager = new CinematicAudioManager();
