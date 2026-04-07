import { createClient } from "npm:@supabase/supabase-js@2";

type NarrationProvider = "google" | "azure";
type NarrationOutputFormat = "mp3" | "wav";

type NarrationRequest = {
  provider: NarrationProvider;
  stepId?: string;
  narrationText?: string;
  voiceName?: string;
  languageCode?: string;
  outputFormat?: NarrationOutputFormat;
  speakingRate?: number;
  pitch?: number;
  volumeGainDb?: number;
  overwrite?: boolean;
  updateStep?: boolean;
  trackId?: string;
  trackName?: string;
  bucketPath?: string;
};

type MuseumTourStepRow = {
  id: string;
  title: string;
  narration_text: string | null;
  language_code: string | null;
};

type NarrationResponse = {
  provider: NarrationProvider;
  stepId?: string;
  trackId: string;
  bucketPath: string;
  publicUrl: string;
  contentType: string;
  bytes: number;
  voiceName: string;
  languageCode: string;
  updatedStep: boolean;
  narrationTextLength: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new HttpError(500, `Missing required environment variable: ${name}`);
  }
  return value;
}

function sanitizeTrackSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function decodeBase64(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function normalizeLanguageCode(
  provider: NarrationProvider,
  requestedLanguageCode: string | undefined,
): string {
  const languageCode = (requestedLanguageCode || "en-NG").trim();

  if (languageCode === "en-NG") {
    return provider === "google" ? "en-GB" : "en-GB";
  }

  return languageCode;
}

function defaultVoiceName(
  provider: NarrationProvider,
  languageCode: string,
): string {
  if (provider === "google") {
    if (languageCode.startsWith("en-GB")) return "en-GB-Neural2-A";
    return "en-US-Neural2-F";
  }

  if (languageCode.startsWith("en-GB")) return "en-GB-SoniaNeural";
  return "en-US-AvaMultilingualNeural";
}

function resolveTrackId(request: NarrationRequest): string {
  if (request.trackId?.trim()) {
    return sanitizeTrackSegment(request.trackId) || `tour-narration-${crypto.randomUUID()}`;
  }

  if (request.stepId?.trim()) {
    const stepSegment = sanitizeTrackSegment(request.stepId);
    return stepSegment
      ? `tour-step-${stepSegment}`
      : `tour-narration-${crypto.randomUUID()}`;
  }

  return `tour-narration-${crypto.randomUUID()}`;
}

function resolveBucketPath(
  request: NarrationRequest,
  trackId: string,
  outputFormat: NarrationOutputFormat,
): string {
  if (request.bucketPath?.trim()) {
    return request.bucketPath.trim();
  }

  return `tracks/tours/${trackId}.${outputFormat}`;
}

function toContentType(outputFormat: NarrationOutputFormat): string {
  return outputFormat === "wav" ? "audio/wav" : "audio/mpeg";
}

function toGoogleAudioEncoding(outputFormat: NarrationOutputFormat): string {
  return outputFormat === "wav" ? "LINEAR16" : "MP3";
}

function toAzureOutputFormat(outputFormat: NarrationOutputFormat): string {
  return outputFormat === "wav"
    ? "riff-24khz-16bit-mono-pcm"
    : "audio-24khz-96kbitrate-mono-mp3";
}

function buildAzureSsml(
  narrationText: string,
  voiceName: string,
  languageCode: string,
): string {
  return [
    `<speak version="1.0" xml:lang="${languageCode}">`,
    `<voice name="${voiceName}">`,
    escapeXml(narrationText),
    "</voice>",
    "</speak>",
  ].join("");
}

async function requireAuthenticatedUser(request: Request): Promise<string> {
  const supabaseUrl = getEnv("SUPABASE_URL");
  const anonKey = getEnv("SUPABASE_ANON_KEY");
  const authorization = request.headers.get("Authorization");

  if (!authorization) {
    throw new HttpError(401, "Missing Authorization header.");
  }

  const authClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: {
        Authorization: authorization,
      },
    },
  });

  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) {
    throw new HttpError(401, "Authenticated user required.");
  }

  return data.user.id;
}

function createServiceClient() {
  return createClient(getEnv("SUPABASE_URL"), getEnv("SUPABASE_SERVICE_ROLE_KEY"));
}

async function fetchMuseumTourStep(
  serviceClient: ReturnType<typeof createServiceClient>,
  stepId: string,
): Promise<MuseumTourStepRow> {
  const { data, error } = await serviceClient
    .from("museum_tour_steps")
    .select("id,title,narration_text,language_code")
    .eq("id", stepId)
    .maybeSingle();

  if (error) {
    throw new HttpError(500, error.message);
  }

  if (!data) {
    throw new HttpError(404, `Museum tour step not found: ${stepId}`);
  }

  return data as MuseumTourStepRow;
}

async function synthesizeWithGoogle(
  narrationText: string,
  voiceName: string,
  languageCode: string,
  outputFormat: NarrationOutputFormat,
  speakingRate: number,
  pitch: number,
  volumeGainDb: number,
): Promise<Uint8Array> {
  const apiKey = getEnv("GOOGLE_TTS_API_KEY");
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: {
          text: narrationText,
        },
        voice: {
          languageCode,
          name: voiceName,
        },
        audioConfig: {
          audioEncoding: toGoogleAudioEncoding(outputFormat),
          speakingRate,
          pitch,
          volumeGainDb,
        },
      }),
    },
  );

  if (!response.ok) {
    throw new HttpError(502, `Google TTS failed: ${await response.text()}`);
  }

  const payload = await response.json();
  const audioContent = payload?.audioContent;

  if (!audioContent || typeof audioContent !== "string") {
    throw new HttpError(502, "Google TTS returned no audio content.");
  }

  return decodeBase64(audioContent);
}

async function synthesizeWithAzure(
  narrationText: string,
  voiceName: string,
  languageCode: string,
  outputFormat: NarrationOutputFormat,
): Promise<Uint8Array> {
  const speechKey = getEnv("AZURE_SPEECH_KEY");
  const speechRegion = getEnv("AZURE_SPEECH_REGION");
  const response = await fetch(
    `https://${speechRegion}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/ssml+xml",
        "Ocp-Apim-Subscription-Key": speechKey,
        "X-Microsoft-OutputFormat": toAzureOutputFormat(outputFormat),
      },
      body: buildAzureSsml(narrationText, voiceName, languageCode),
    },
  );

  if (!response.ok) {
    throw new HttpError(502, `Azure Speech failed: ${await response.text()}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return new Uint8Array(arrayBuffer);
}

async function generateNarrationAudio(
  request: NarrationRequest,
  narrationText: string,
  voiceName: string,
  languageCode: string,
): Promise<Uint8Array> {
  const outputFormat = request.outputFormat ?? "mp3";
  const speakingRate = request.speakingRate ?? 0.94;
  const pitch = request.pitch ?? 0;
  const volumeGainDb = request.volumeGainDb ?? 0;

  if (request.provider === "google") {
    return synthesizeWithGoogle(
      narrationText,
      voiceName,
      languageCode,
      outputFormat,
      speakingRate,
      pitch,
      volumeGainDb,
    );
  }

  return synthesizeWithAzure(
    narrationText,
    voiceName,
    languageCode,
    outputFormat,
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    await requireAuthenticatedUser(request);

    const payload = (await request.json()) as NarrationRequest;
    if (!payload?.provider) {
      throw new HttpError(400, "provider is required.");
    }

    if (payload.provider !== "google" && payload.provider !== "azure") {
      throw new HttpError(400, "provider must be either 'google' or 'azure'.");
    }

    if (!payload.stepId?.trim() && !payload.narrationText?.trim()) {
      throw new HttpError(400, "stepId or narrationText is required.");
    }

    const serviceClient = createServiceClient();
    const audioBucket =
      Deno.env.get("TOUR_NARRATION_AUDIO_BUCKET") ||
      Deno.env.get("SUPABASE_AUDIO_BUCKET") ||
      "ndc-audio";
    const outputFormat = payload.outputFormat ?? "mp3";
    const contentType = toContentType(outputFormat);

    const step = payload.stepId?.trim()
      ? await fetchMuseumTourStep(serviceClient, payload.stepId.trim())
      : null;
    const narrationText = (payload.narrationText ?? step?.narration_text ?? "").trim();
    if (!narrationText) {
      throw new HttpError(400, "No narration text available for generation.");
    }

    const normalizedLanguageCode = normalizeLanguageCode(
      payload.provider,
      payload.languageCode ?? step?.language_code ?? undefined,
    );
    const voiceName =
      payload.voiceName?.trim() ||
      defaultVoiceName(payload.provider, normalizedLanguageCode);
    const audioBytes = await generateNarrationAudio(
      payload,
      narrationText,
      voiceName,
      normalizedLanguageCode,
    );

    const trackId = resolveTrackId(payload);
    const bucketPath = resolveBucketPath(payload, trackId, outputFormat);
    const filename = bucketPath.split("/").pop() || `${trackId}.${outputFormat}`;
    const trackName =
      payload.trackName?.trim() ||
      (step ? `Tour narration: ${step.title}` : `Tour narration ${trackId}`);

    const { error: uploadError } = await serviceClient.storage
      .from(audioBucket)
      .upload(bucketPath, audioBytes, {
        upsert: payload.overwrite ?? true,
        contentType,
        cacheControl: "3600",
      });

    if (uploadError) {
      throw new HttpError(500, uploadError.message);
    }

    const { error: audioTrackError } = await serviceClient
      .from("audio_tracks")
      .upsert(
        {
          id: trackId,
          name: trackName,
          filename,
          bucket_path: bucketPath,
        },
        {
          onConflict: "id",
        },
      );

    if (audioTrackError) {
      throw new HttpError(500, audioTrackError.message);
    }

    const publicUrl = serviceClient.storage
      .from(audioBucket)
      .getPublicUrl(bucketPath).data.publicUrl;

    let updatedStep = false;
    if (step && (payload.updateStep ?? true)) {
      const { error: updateStepError } = await serviceClient
        .from("museum_tour_steps")
        .update({
          narration_audio_track_id: trackId,
          audio_url: publicUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("id", step.id);

      if (updateStepError) {
        throw new HttpError(500, updateStepError.message);
      }

      updatedStep = true;
    }

    const response: NarrationResponse = {
      provider: payload.provider,
      stepId: step?.id,
      trackId,
      bucketPath,
      publicUrl,
      contentType,
      bytes: audioBytes.byteLength,
      voiceName,
      languageCode: normalizedLanguageCode,
      updatedStep,
      narrationTextLength: narrationText.length,
    };

    return jsonResponse(response, 200);
  } catch (error) {
    console.error("generate-tour-narration failed", error);

    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, error.status);
    }

    const message = error instanceof Error ? error.message : "Unknown error.";
    return jsonResponse({ error: message }, 500);
  }
});