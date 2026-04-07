# Auto Tour Guide Integration Notes

## What Was Implemented

The public Guided Tours experience now includes an Auto Tour Guide player that is tied to the current museum layer and existing archive features.

It supports:
- Auto mode for hands-free sequential playback
- Manual mode for guided exploration
- Uploaded narration audio when a tour step has an audio URL or linked audio track
- Browser TTS fallback when uploaded audio is not available
- Step progress tracking
- Transcript download
- Lightweight map briefing panel for coordinate-ready steps
- Related-view handoff into existing views such as Hall of Fame, Commandants, FWC, FDC, Directing Staff, Allied Officers, and Distinguished Visits

## How It Relates To Existing Features

This feature does not replace the current homepage hero or the existing archive category cards.

Instead, it sits inside the museum layer and reuses:
- Current commandant data
- Past commandant archive view
- Hall of Fame grouping
- Distinguished visits as collaboration stops
- Museum collection storytelling already added in the museum layer

Until the new museum tour tables are populated in Supabase, the player uses fast fallback tours derived from the current commandants, personnel, visits, and museum-layer content.

## Supabase Schema

The schema now includes:
- `museum_artifacts`
- `museum_tours`
- `museum_tour_steps`

These tables support:
- Curated artifacts or collection anchors
- Ordered guided tours
- Narration text
- Uploaded narration via `narration_audio_track_id`
- Direct audio URLs via `audio_url`
- Optional coordinate data for map focus
- Links back into existing app views such as `commandants`, `fwc`, `fdc`, `directing`, `allied`, `visits`, `hall-of-fame`, `about-ndc`, and `museum-collections`

## Recommended Voice Options

### 1. Browser TTS
Best for:
- Zero-cost launch
- Fast kiosk deployment
- Offline-friendly fallback on managed devices

Current implementation:
- Already supported in the new tour player
- Uses `window.speechSynthesis`
- No API key required

Tradeoff:
- Voice quality depends on the browser and installed system voices
- Narration caching is limited compared with pre-generated audio

### 2. Google Cloud Text-to-Speech
Best free-tier professional option for hosted narration.

Recommended voice families:
- `en-US-Neural2-*`
- `en-GB-Neural2-*`
- `en-US-Wavenet-*`

Why:
- Consistent quality
- Strong English voices
- Suitable for formal museum narration
- Good fit for pre-generating and caching tour narration

How to get the API:
1. Create a Google Cloud project.
2. Enable Text-to-Speech API.
3. Create a service account.
4. Do not call Google directly from the browser.
5. Create a Supabase Edge Function or secure backend endpoint that receives narration text and voice choice.
6. Generate audio on the server side.
7. Store the MP3 in Supabase Storage or your existing audio bucket.
8. Save the returned file URL into `museum_tour_steps.audio_url` or map it into `narration_audio_track_id`.

Why this is the best fit here:
- It matches your existing Supabase architecture.
- It allows audio caching and re-use.
- It keeps API credentials off the client.

### 3. Azure AI Speech
Best for:
- Strong multilingual support
- High-quality neural voices
- Delegation or international-guest mode

Recommended voices:
- `en-US-AvaMultilingualNeural`
- `en-GB-SoniaNeural`
- `en-US-AndrewNeural`

How to get the API:
1. Create an Azure account.
2. Create an Azure AI Speech resource.
3. Copy the Speech key and region.
4. Call Azure only from a secure backend or Edge Function.
5. Save generated narration audio into storage and link the result to tour steps.

### 4. Piper or Coqui TTS
Best for:
- Offline kiosk deployments
- No recurring API cost
- Private local narration generation

Suggested use:
- Run a small local service on the kiosk network or internal server
- Pre-generate narration files for museum tour steps
- Upload generated files into Supabase Storage or attach them locally

Why this matters:
- Strong option when internet reliability is limited
- Better long-term control for kiosk installations

## Best Practical Recommendation

For this application, the best staged rollout is:
1. Use browser TTS immediately for zero-cost narration fallback.
2. Add Google Cloud TTS through a Supabase Edge Function for professional pre-generated narration.
3. Cache the generated narration as uploaded audio and attach it to `museum_tour_steps`.
4. Keep browser TTS as a fallback if uploaded audio is missing.

## Better Ideas To Improve The Feature

### 1. Curator Mode
Add a `tour_style` or `narration_style` column to `museum_tours`.
Examples:
- `formal`
- `ceremonial`
- `scholarly`
- `delegate-brief`

This allows the same content to feel different depending on audience.

### 2. Visitor Type Presets
Add preset tours for:
- First-time visitors
- Senior military delegates
- Academic guests
- International delegations
- VIP short tour

This makes the museum feel intentional instead of generic.

### 3. Ambient Sound Layer
Use the existing audio system to add a low-volume ambient bed for:
- Intro hall
- Leadership trail
- Hall of Fame
- Museum collections

Keep it subtle and authoritative.

### 4. Preload Next Step
For kiosk smoothness:
- Preload the next step image
- Resolve the next narration file before the current one ends
- Precompute transcript and related-view links

### 5. Tour Handoff To Archive View
At the end of some tours, automatically offer:
- Open Commandants
- Open Hall of Fame
- Open FWC
- Open Visits

This keeps the guided route connected to your current data-rich views.

### 6. Delegate Language Packs
Use `language_code` on tours and steps so one route can exist in:
- English
- French
- Arabic
- Localized delegate-specific narration sets

### 7. Route Identity
Give each tour a visual identity:
- Orientation Tour: steel blue
- Leadership Trail: deep navy and gold
- Collection Highlights: museum brass and stone
- Hall of Fame Tour: dark ceremonial navy with restrained red accents

That makes the tours feel curated rather than just paginated.

## Recommended Next Backend Step

Add admin management for:
- Museum artifacts
- Museum tours
- Museum tour steps
- Narration audio attachment
- Language variants
- Step linked view selection

This will turn the feature from structured fallback content into a fully managed museum system.

## Backend Scaffold Added

The repository now also includes a secure narration-generation scaffold:
- Edge function: `supabase/functions/generate-tour-narration/index.ts`
- Deployment notes: `supabase/functions/generate-tour-narration/README.md`
- Frontend invoke helper: `src/lib/tourNarration.ts`

This backend path is designed to write generated narration into the same Supabase audio bucket and `audio_tracks` table already used elsewhere in the app, then attach the result back to `museum_tour_steps`.
