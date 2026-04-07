# generate-tour-narration

This Supabase Edge Function generates narration audio for museum tour steps and stores the output in the same audio storage model already used by the application.

It reuses:
- the existing `ndc-audio` storage bucket by default
- the existing `audio_tracks` table
- the existing `museum_tour_steps.narration_audio_track_id` field

## Supported Providers

- `google`
- `azure`

## Required Secrets

Set the standard Supabase function secrets first:

```bash
supabase secrets set SUPABASE_URL=your-project-url
supabase secrets set SUPABASE_ANON_KEY=your-anon-key
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

For Google Cloud Text-to-Speech:

```bash
supabase secrets set GOOGLE_TTS_API_KEY=your-google-tts-api-key
```

For Azure AI Speech:

```bash
supabase secrets set AZURE_SPEECH_KEY=your-azure-speech-key
supabase secrets set AZURE_SPEECH_REGION=your-azure-region
```

Optional:

```bash
supabase secrets set TOUR_NARRATION_AUDIO_BUCKET=ndc-audio
```

## Deploy

```bash
supabase functions deploy generate-tour-narration
```

## Invoke Shape

```json
{
  "provider": "google",
  "stepId": "tour-orientation-step-1",
  "voiceName": "en-GB-Neural2-A",
  "languageCode": "en-NG",
  "outputFormat": "mp3",
  "overwrite": true,
  "updateStep": true
}
```

If `narrationText` is omitted, the function reads `narration_text` from the referenced `museum_tour_steps` row.

## Behavior

The function will:
1. Require an authenticated caller.
2. Generate audio from Google or Azure.
3. Upload the audio file into storage.
4. Upsert the corresponding `audio_tracks` record.
5. Update `museum_tour_steps.narration_audio_track_id` and `audio_url` by default.

## Frontend Helper

The workspace includes a matching helper at `src/lib/tourNarration.ts` so future admin UI code can call the function through `supabase.functions.invoke()` without redefining the payload.