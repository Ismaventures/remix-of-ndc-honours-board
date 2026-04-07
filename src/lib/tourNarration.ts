import { supabase } from "@/lib/supabaseClient";

export type NarrationProvider = "google" | "azure";
export type NarrationOutputFormat = "mp3" | "wav";

export interface GenerateTourNarrationInput {
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
}

export interface GenerateTourNarrationResult {
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
}

export async function generateTourNarration(
  input: GenerateTourNarrationInput,
): Promise<GenerateTourNarrationResult> {
  if (!input.stepId && !input.narrationText?.trim()) {
    throw new Error("A stepId or narrationText is required to generate tour narration.");
  }

  const { data, error } = await supabase.functions.invoke(
    "generate-tour-narration",
    {
      body: input,
    },
  );

  if (error) {
    throw new Error(error.message || "Tour narration generation failed.");
  }

  return data as GenerateTourNarrationResult;
}