import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
export const GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts";
export const DEFAULT_GEMINI_VOICE = "Enceladus";
export const DEFAULT_GEMINI_ACCENT_INSTRUCTION = "Read using a nigerian accent";
const GEMINI_AUDIO_CACHE_LIMIT = 40;
const GEMINI_RATE_LIMIT_COOLDOWN_MS = 60_000;

export const GEMINI_VOICES = [
  { name: "Enceladus", description: "Clear, Middle pitch" },
  { name: "Achird", description: "Friendly, Lower middle pitch" },
  { name: "Vindemiatrix", description: "Gentle, Middle pitch" },
  { name: "Zephyr", description: "Bright, Higher pitch" },
  { name: "Puck", description: "Upbeat, Middle pitch" },
  { name: "Charon", description: "Informative, Lower pitch" },
  { name: "Kore", description: "Firm, Middle pitch" },
  { name: "Fenrir", description: "Excitable, Lower middle pitch" },
  { name: "Pulcherrima", description: "Forward, Middle pitch" },
  { name: "Zubenelgenubi", description: "Casual, Lower middle pitch" },
  { name: "Sadachbia", description: "Lively, Lower pitch" },
  { name: "Aoede", description: "Breezy, Light pitch" },
  { name: "Leda", description: "Youthful, Higher middle pitch" },
  { name: "Orus", description: "Steady, Middle pitch" },
  { name: "Pegasus", description: "Confident, Middle pitch" },
] as const;

export type GeminiVoiceName = (typeof GEMINI_VOICES)[number]["name"];

export interface GeminiSpeechOptions {
  voiceName?: GeminiVoiceName;
  accentInstruction?: string;
}

export interface GeminiSpeechStreamHandle {
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  stop: () => Promise<void>;
}

export interface GeminiSpeechStreamOptions extends GeminiSpeechOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: unknown) => void;
}

interface GeminiNormalizedAudio {
  audioData: Uint8Array;
  mimeType: string;
}

const geminiAudioCache = new Map<string, GeminiNormalizedAudio>();
const geminiPendingAudioRequests = new Map<string, Promise<GeminiNormalizedAudio>>();
let geminiClient: GoogleGenAI | null = null;
let geminiRateLimitUntil = 0;

/** Whether the Gemini TTS API key is configured */
export function isGeminiAvailable(): boolean {
  return Boolean(GEMINI_API_KEY);
}

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
  }

  return geminiClient;
}

export function buildGeminiAccentInstruction(languageCode?: string): string {
  const normalized = (languageCode || "en-NG").trim().replace("_", "-").toLowerCase();

  switch (normalized) {
    case "en-ng":
      return "Read using a nigerian accent";
    case "en-gh":
      return "Read using a ghanaian accent";
    case "en-ke":
      return "Read using a kenyan accent";
    case "en-za":
      return "Read using a south african accent";
    case "en-tz":
      return "Read using a tanzanian accent";
    default:
      return DEFAULT_GEMINI_ACCENT_INSTRUCTION;
  }
}

function buildGeminiPrompt(text: string, accentInstruction: string): string {
  const narrationText = text.trim();
  const instruction = accentInstruction.trim();

  return instruction ? `${instruction}\n${narrationText}` : narrationText;
}

function resolveGeminiSpeechOptions(options: GeminiSpeechOptions = {}) {
  return {
    voiceName: options.voiceName ?? DEFAULT_GEMINI_VOICE,
    accentInstruction:
      options.accentInstruction ?? DEFAULT_GEMINI_ACCENT_INSTRUCTION,
  };
}

function buildGeminiCacheKey(text: string, options: GeminiSpeechOptions = {}): string {
  const narrationText = text.trim();
  const { voiceName, accentInstruction } = resolveGeminiSpeechOptions(options);

  return JSON.stringify({
    model: GEMINI_TTS_MODEL,
    voiceName,
    accentInstruction: accentInstruction.trim().toLowerCase(),
    narrationText,
  });
}

function cloneNormalizedAudio(audio: GeminiNormalizedAudio): GeminiNormalizedAudio {
  return {
    audioData: new Uint8Array(audio.audioData),
    mimeType: audio.mimeType,
  };
}

function getCachedGeminiAudio(cacheKey: string): GeminiNormalizedAudio | null {
  const cached = geminiAudioCache.get(cacheKey);
  if (!cached) {
    return null;
  }

  geminiAudioCache.delete(cacheKey);
  geminiAudioCache.set(cacheKey, cached);

  return cloneNormalizedAudio(cached);
}

function setCachedGeminiAudio(cacheKey: string, audio: GeminiNormalizedAudio) {
  geminiAudioCache.delete(cacheKey);
  geminiAudioCache.set(cacheKey, cloneNormalizedAudio(audio));

  while (geminiAudioCache.size > GEMINI_AUDIO_CACHE_LIMIT) {
    const oldestKey = geminiAudioCache.keys().next().value;
    if (!oldestKey) break;
    geminiAudioCache.delete(oldestKey);
  }
}

function isGeminiRateLimitError(error: unknown): boolean {
  if (typeof error === "string") {
    return /429|too many requests/i.test(error);
  }

  if (!(error instanceof Error) && typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    status?: unknown;
    code?: unknown;
    message?: unknown;
    cause?: unknown;
  };

  if (candidate.status === 429 || candidate.code === 429) {
    return true;
  }

  if (typeof candidate.message === "string" && /429|too many requests/i.test(candidate.message)) {
    return true;
  }

  return candidate.cause ? isGeminiRateLimitError(candidate.cause) : false;
}

function noteGeminiRateLimit() {
  geminiRateLimitUntil = Date.now() + GEMINI_RATE_LIMIT_COOLDOWN_MS;
}

function getGeminiCooldownError(): Error {
  const retryInMs = Math.max(geminiRateLimitUntil - Date.now(), 1_000);
  const retryInSeconds = Math.ceil(retryInMs / 1_000);

  return new Error(
    `Gemini TTS is temporarily rate limited. Retrying in about ${retryInSeconds}s.`,
  );
}

function assertGeminiNotCoolingDown() {
  if (geminiRateLimitUntil > Date.now()) {
    throw getGeminiCooldownError();
  }
}

function normalizeGeminiAudio(
  audioChunks: Uint8Array[],
  mimeType: string,
): GeminiNormalizedAudio {
  const combined = concatUint8Arrays(audioChunks);
  const hasPlayableContainer = isPlayableAudioMimeType(mimeType);

  return {
    audioData: hasPlayableContainer
      ? combined
      : convertToWav(combined, mimeType || "audio/L16;rate=24000"),
    mimeType: hasPlayableContainer ? mimeType || "audio/wav" : "audio/wav",
  };
}

function createObjectUrlFromAudio(audio: GeminiNormalizedAudio): string {
  return URL.createObjectURL(new Blob([audio.audioData], { type: audio.mimeType }));
}

function buildGeminiRequest(text: string, options: GeminiSpeechOptions = {}) {
  const narrationText = text.trim();
  if (!narrationText) {
    throw new Error("Text is required for Gemini TTS");
  }

  const { voiceName, accentInstruction } = resolveGeminiSpeechOptions(options);

  return {
    config: {
      temperature: 1,
      responseModalities: ["audio"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName,
          },
        },
      },
    } as const,
    contents: [
      {
        role: "user" as const,
        parts: [
          {
            text: buildGeminiPrompt(narrationText, accentInstruction),
          },
        ],
      },
    ],
  };
}

/**
 * Synthesize speech using Gemini TTS.
 * Returns a blob URL that can be played via an <audio> element.
 */
export async function synthesizeGeminiSpeech(
  text: string,
  options: GeminiSpeechOptions = {},
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY is not configured");
  }

  const cacheKey = buildGeminiCacheKey(text, options);
  const cachedAudio = getCachedGeminiAudio(cacheKey);
  if (cachedAudio) {
    return createObjectUrlFromAudio(cachedAudio);
  }

  assertGeminiNotCoolingDown();

  let pendingRequest = geminiPendingAudioRequests.get(cacheKey);
  if (!pendingRequest) {
    const { config, contents } = buildGeminiRequest(text, options);

    pendingRequest = (async () => {
      try {
        const response = await getGeminiClient().models.generateContentStream({
          model: GEMINI_TTS_MODEL,
          config,
          contents,
        });

        const audioChunks: Uint8Array[] = [];
        let mimeType = "";

        for await (const chunk of response) {
          const inlineData =
            chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData;
          if (inlineData?.data) {
            mimeType = inlineData.mimeType || mimeType;
            audioChunks.push(base64ToUint8Array(inlineData.data));
          }
        }

        if (audioChunks.length === 0) {
          throw new Error("No audio data received from Gemini TTS");
        }

        const normalizedAudio = normalizeGeminiAudio(audioChunks, mimeType);
        setCachedGeminiAudio(cacheKey, normalizedAudio);
        geminiRateLimitUntil = 0;

        return normalizedAudio;
      } catch (error) {
        if (isGeminiRateLimitError(error)) {
          noteGeminiRateLimit();
        }
        throw error;
      } finally {
        geminiPendingAudioRequests.delete(cacheKey);
      }
    })();

    geminiPendingAudioRequests.set(cacheKey, pendingRequest);
  }

  const normalizedAudio = await pendingRequest;
  return createObjectUrlFromAudio(normalizedAudio);
}

export function playGeminiSpeechStream(
  text: string,
  options: GeminiSpeechStreamOptions = {},
): GeminiSpeechStreamHandle {
  if (!GEMINI_API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY is not configured");
  }

  if (typeof window === "undefined") {
    throw new Error("Gemini streaming playback requires a browser environment");
  }

  const cacheKey = buildGeminiCacheKey(text, options);
  const cachedAudio = getCachedGeminiAudio(cacheKey);
  if (cachedAudio) {
    return playCachedGeminiAudio(cachedAudio, options);
  }

  assertGeminiNotCoolingDown();

  const { config, contents } = buildGeminiRequest(text, options);
  const audioContextCtor = (
    window as Window & { webkitAudioContext?: typeof AudioContext }
  ).AudioContext ?? (
    window as Window & { webkitAudioContext?: typeof AudioContext }
  ).webkitAudioContext;

  const abortController = new AbortController();
  let stopped = false;
  let finished = false;
  let started = false;
  let streamCompleted = false;
  let scheduledSources = 0;
  let nextStartTime = 0;
  let cleanupPromise: Promise<void> | null = null;
  let audioContext: AudioContext | null = audioContextCtor ? new audioContextCtor() : null;
  let gainNode: GainNode | null = audioContext?.createGain() ?? null;
  let htmlAudio: HTMLAudioElement | null = null;
  let objectUrl: string | null = null;

  gainNode?.connect(audioContext!.destination);

  const cleanup = async () => {
    if (cleanupPromise) return cleanupPromise;

    cleanupPromise = (async () => {
      stopped = true;

      if (htmlAudio) {
        htmlAudio.pause();
        htmlAudio.onplay = null;
        htmlAudio.onended = null;
        htmlAudio.onerror = null;
        htmlAudio.removeAttribute("src");
        htmlAudio = null;
      }

      if (objectUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(objectUrl);
      }
      objectUrl = null;

      abortController.abort();

      gainNode?.disconnect();
      gainNode = null;

      if (audioContext && audioContext.state !== "closed") {
        try {
          await audioContext.close();
        } catch {
          // Ignore cleanup errors from already-closed contexts.
        }
      }
      audioContext = null;
    })();

    return cleanupPromise;
  };

  const finish = async () => {
    if (finished || stopped) return;
    finished = true;
    await cleanup();
    options.onEnd?.();
  };

  const fail = async (error: unknown) => {
    if (finished || stopped) return;
    finished = true;
    await cleanup();
    options.onError?.(error);
  };

  const signalStart = () => {
    if (started || stopped || finished) return;
    started = true;
    options.onStart?.();
  };

  const schedulePcmChunk = async (pcmData: Uint8Array, mimeType: string) => {
    if (!audioContext || !gainNode) {
      throw new Error("Web Audio API is not available for Gemini stream playback");
    }

    const buffer = pcmChunkToAudioBuffer(audioContext, pcmData, mimeType);
    if (audioContext.state === "suspended") {
      await audioContext.resume();
    }

    signalStart();
    nextStartTime = Math.max(nextStartTime, audioContext.currentTime + 0.02);

    const source = audioContext.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNode);
    scheduledSources += 1;
    source.onended = () => {
      scheduledSources = Math.max(0, scheduledSources - 1);
      if (streamCompleted && scheduledSources === 0) {
        void finish();
      }
    };
    source.start(nextStartTime);
    nextStartTime += buffer.duration;
  };

  const playContainerFallback = async (chunks: Uint8Array[], mimeType: string) => {
    const combined = concatUint8Arrays(chunks);
    const blob = new Blob([combined], { type: mimeType || "audio/wav" });

    objectUrl = URL.createObjectURL(blob);
    htmlAudio = new Audio(objectUrl);
    htmlAudio.onplay = () => signalStart();
    htmlAudio.onended = () => {
      void finish();
    };
    htmlAudio.onerror = () => {
      void fail(new Error("Gemini audio playback failed."));
    };

    await htmlAudio.play();
  };

  void (async () => {
    try {
      const response = await getGeminiClient().models.generateContentStream({
        model: GEMINI_TTS_MODEL,
        config: {
          ...config,
          abortSignal: abortController.signal,
        },
        contents,
      });

      const allChunks: Uint8Array[] = [];
      const containerChunks: Uint8Array[] = [];
      let mimeType = "";

      for await (const chunk of response) {
        if (stopped) return;

        const inlineData = chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData;
        if (!inlineData?.data) {
          continue;
        }

        mimeType = inlineData.mimeType || mimeType;
        const audioData = base64ToUint8Array(inlineData.data);
        allChunks.push(audioData);

        if (isRawPcmMimeType(mimeType)) {
          await schedulePcmChunk(audioData, mimeType);
        } else {
          containerChunks.push(audioData);
        }
      }

      if (stopped) return;

      streamCompleted = true;
      if (allChunks.length > 0) {
        setCachedGeminiAudio(cacheKey, normalizeGeminiAudio(allChunks, mimeType));
        geminiRateLimitUntil = 0;
      }

      if (!started && containerChunks.length > 0) {
        await playContainerFallback(containerChunks, mimeType);
        return;
      }

      if (!started) {
        throw new Error("No audio data received from Gemini TTS");
      }

      if (scheduledSources === 0) {
        await finish();
      }
    } catch (error) {
      if (!stopped && isGeminiRateLimitError(error)) {
        noteGeminiRateLimit();
      }
      await fail(error);
    }
  })();

  return {
    pause: async () => {
      if (htmlAudio) {
        htmlAudio.pause();
        return;
      }
      if (audioContext && audioContext.state === "running") {
        await audioContext.suspend();
      }
    },
    resume: async () => {
      if (htmlAudio) {
        await htmlAudio.play();
        return;
      }
      if (audioContext && audioContext.state === "suspended") {
        await audioContext.resume();
      }
    },
    stop: async () => {
      await cleanup();
    },
  };
}

function playCachedGeminiAudio(
  audio: GeminiNormalizedAudio,
  options: GeminiSpeechStreamOptions,
): GeminiSpeechStreamHandle {
  let stopped = false;
  let finished = false;
  const objectUrl = createObjectUrlFromAudio(audio);
  const htmlAudio = new Audio(objectUrl);

  const cleanup = async () => {
    if (stopped) return;
    stopped = true;
    htmlAudio.pause();
    htmlAudio.onplay = null;
    htmlAudio.onended = null;
    htmlAudio.onerror = null;
    htmlAudio.removeAttribute("src");
    URL.revokeObjectURL(objectUrl);
  };

  const finish = async () => {
    if (finished || stopped) return;
    finished = true;
    await cleanup();
    options.onEnd?.();
  };

  const fail = async (error: unknown) => {
    if (finished || stopped) return;
    finished = true;
    await cleanup();
    options.onError?.(error);
  };

  htmlAudio.onplay = () => {
    if (!stopped && !finished) {
      options.onStart?.();
    }
  };
  htmlAudio.onended = () => {
    void finish();
  };
  htmlAudio.onerror = () => {
    void fail(new Error("Gemini cached audio playback failed."));
  };

  void htmlAudio.play().catch((error) => {
    void fail(error);
  });

  return {
    pause: async () => {
      htmlAudio.pause();
    },
    resume: async () => {
      if (stopped || finished) return;
      await htmlAudio.play();
    },
    stop: async () => {
      await cleanup();
    },
  };
}

/* ── helpers ────────────────────────────────────────── */

function concatUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return combined;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

function isPlayableAudioMimeType(mimeType: string): boolean {
  return /audio\/(wav|x-wav|mpeg|mp3|ogg|webm)/i.test(mimeType);
}

function isRawPcmMimeType(mimeType: string): boolean {
  return /audio\/L\d+/i.test(mimeType) || /codec=pcm/i.test(mimeType);
}

function pcmChunkToAudioBuffer(
  audioContext: AudioContext,
  pcmData: Uint8Array,
  mimeType: string,
): AudioBuffer {
  const { numChannels, sampleRate, bitsPerSample } = parseMimeType(mimeType);
  const bytesPerSample = bitsPerSample / 8;

  if (bytesPerSample !== 1 && bytesPerSample !== 2) {
    throw new Error(`Unsupported PCM sample size: ${bitsPerSample}`);
  }

  const frameCount = Math.floor(pcmData.length / bytesPerSample / numChannels);
  const audioBuffer = audioContext.createBuffer(numChannels, frameCount, sampleRate);
  const view = new DataView(pcmData.buffer, pcmData.byteOffset, pcmData.byteLength);

  for (let channel = 0; channel < numChannels; channel += 1) {
    const channelData = audioBuffer.getChannelData(channel);

    for (let frame = 0; frame < frameCount; frame += 1) {
      const byteOffset = (frame * numChannels + channel) * bytesPerSample;
      channelData[frame] = bytesPerSample === 2
        ? view.getInt16(byteOffset, true) / 32768
        : view.getInt8(byteOffset) / 128;
    }
  }

  return audioBuffer;
}

function convertToWav(rawData: Uint8Array, mimeType: string): Uint8Array {
  const options = parseMimeType(mimeType);
  const wavHeader = createWavHeader(rawData.length, options);
  const wavData = new Uint8Array(wavHeader.length + rawData.length);

  wavData.set(wavHeader, 0);
  wavData.set(rawData, wavHeader.length);

  return wavData;
}

function parseMimeType(mimeType: string): WavConversionOptions {
  const parts = mimeType.split(";").map((s) => s.trim());
  const format = parts[0].split("/")[1] || "";

  let sampleRate = 24000;
  let bitsPerSample = 16;
  const numChannels = 1;

  if (format.startsWith("L")) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) bitsPerSample = bits;
  }

  for (const p of parts.slice(1)) {
    const [key, val] = p.split("=").map((s) => s.trim());
    if (key === "rate") {
      sampleRate = parseInt(val, 10);
    }
  }

  return {
    numChannels,
    sampleRate,
    bitsPerSample,
  };
}

function createWavHeader(
  dataLength: number,
  options: WavConversionOptions,
): Uint8Array {
  const { numChannels, sampleRate, bitsPerSample } = options;

  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;

  const header = new ArrayBuffer(44);
  const v = new DataView(header);

  writeStr(v, 0, "RIFF");
  v.setUint32(4, 36 + dataLength, true);
  writeStr(v, 8, "WAVE");
  writeStr(v, 12, "fmt ");
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, numChannels, true);
  v.setUint32(24, sampleRate, true);
  v.setUint32(28, byteRate, true);
  v.setUint16(32, blockAlign, true);
  v.setUint16(34, bitsPerSample, true);
  writeStr(v, 36, "data");
  v.setUint32(40, dataLength, true);

  return new Uint8Array(header);
}

function writeStr(dv: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    dv.setUint8(offset + i, str.charCodeAt(i));
  }
}
