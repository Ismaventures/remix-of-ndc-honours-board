import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMuseumTours } from '@/hooks/useMuseumTours';
import { buildFallbackMuseumTours } from '@/lib/tourGuide';
import {
  generateTourNarration,
  type GenerateTourNarrationResult,
  type NarrationProvider,
} from '@/lib/tourNarration';
import type { Commandant, DistinguishedVisit, Personnel } from '@/types/domain';

const DEFAULT_PROVIDER_VOICE: Record<NarrationProvider, string> = {
  google: 'en-GB-Neural2-A',
  azure: 'en-GB-SoniaNeural',
};

export function TourNarrationAdmin({
  commandants,
  personnel,
  visits,
}: {
  commandants: Commandant[];
  personnel: Personnel[];
  visits: DistinguishedVisit[];
}) {
  const fallbackTours = useMemo(
    () => buildFallbackMuseumTours({ commandants, personnel, visits }),
    [commandants, personnel, visits],
  );
  const { tours, isLoading } = useMuseumTours(fallbackTours);

  const [provider, setProvider] = useState<NarrationProvider>('google');
  const [selectedTourId, setSelectedTourId] = useState('');
  const [selectedStepId, setSelectedStepId] = useState('');
  const [voiceName, setVoiceName] = useState(DEFAULT_PROVIDER_VOICE.google);
  const [languageCode, setLanguageCode] = useState('en-NG');
  const [overwrite, setOverwrite] = useState(true);
  const [updateStep, setUpdateStep] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateTourNarrationResult | null>(null);

  useEffect(() => {
    if (!selectedTourId && tours.length > 0) {
      setSelectedTourId(tours[0].id);
    }
  }, [selectedTourId, tours]);

  useEffect(() => {
    setVoiceName(DEFAULT_PROVIDER_VOICE[provider]);
  }, [provider]);

  const selectedTour = useMemo(
    () => tours.find((tour) => tour.id === selectedTourId) ?? tours[0] ?? null,
    [selectedTourId, tours],
  );

  useEffect(() => {
    const firstStepId = selectedTour?.steps[0]?.id ?? '';
    const hasCurrentStep = selectedTour?.steps.some((step) => step.id === selectedStepId);

    if (!hasCurrentStep && firstStepId) {
      setSelectedStepId(firstStepId);
    }
  }, [selectedStepId, selectedTour]);

  const selectedStep = useMemo(
    () => selectedTour?.steps.find((step) => step.id === selectedStepId) ?? selectedTour?.steps[0] ?? null,
    [selectedStepId, selectedTour],
  );

  const handleGenerate = async () => {
    if (!selectedStep) {
      setError('Select a tour step before generating narration.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setStatus('Generating narration audio and attaching it to the selected tour step...');

    try {
      const response = await generateTourNarration({
        provider,
        stepId: selectedStep.id,
        narrationText: selectedStep.narrationText,
        voiceName,
        languageCode,
        overwrite,
        updateStep,
      });

      setResult(response);
      setStatus(`Narration generated and stored as ${response.trackId}.`);
    } catch (generationError) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : 'Narration generation failed.';
      setError(message);
      setStatus(null);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-card/50 gold-border rounded-xl p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-serif gold-text mb-2">Tour Narration Generator</h3>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Generate professional narration for museum tour steps through the secure Supabase Edge Function and attach the output to the existing audio system.
          </p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-background/60 px-4 py-3 text-xs uppercase tracking-wider text-primary/80">
          Requires authenticated admin session and deployed function secrets
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Provider</span>
              <select
                value={provider}
                onChange={event => setProvider(event.target.value as NarrationProvider)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="google">Google Cloud TTS</option>
                <option value="azure">Azure AI Speech</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Language Code</span>
              <Input value={languageCode} onChange={event => setLanguageCode(event.target.value)} placeholder="en-NG" />
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Tour</span>
              <select
                value={selectedTour?.id ?? ''}
                onChange={event => setSelectedTourId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {tours.map(tour => (
                  <option key={tour.id} value={tour.id}>
                    {tour.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Tour Step</span>
              <select
                value={selectedStep?.id ?? ''}
                onChange={event => setSelectedStepId(event.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                {(selectedTour?.steps ?? []).map(step => (
                  <option key={step.id} value={step.id}>
                    {step.stepOrder}. {step.title}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="space-y-2 block">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Voice Name</span>
            <Input value={voiceName} onChange={event => setVoiceName(event.target.value)} placeholder={DEFAULT_PROVIDER_VOICE[provider]} />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <label className="flex items-center gap-3 rounded-lg border border-primary/15 bg-background/60 px-4 py-3">
              <input
                type="checkbox"
                checked={overwrite}
                onChange={event => setOverwrite(event.target.checked)}
              />
              <span>Overwrite existing narration file</span>
            </label>

            <label className="flex items-center gap-3 rounded-lg border border-primary/15 bg-background/60 px-4 py-3">
              <input
                type="checkbox"
                checked={updateStep}
                onChange={event => setUpdateStep(event.target.checked)}
              />
              <span>Attach output back to the step</span>
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button onClick={() => void handleGenerate()} disabled={isGenerating || isLoading || !selectedStep}>
              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {isGenerating ? 'Generating...' : 'Generate Narration'}
            </Button>

            {result?.publicUrl && (
              <a
                href={result.publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-primary/25 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
              >
                <Volume2 className="h-4 w-4" />
                Preview Generated Audio
              </a>
            )}
          </div>

          {status && <p className="text-sm text-primary">{status}</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-primary/15 bg-background/60 p-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Narration Preview</p>
            <p className="mt-3 text-sm leading-6 text-foreground/90 whitespace-pre-wrap min-h-[180px]">
              {selectedStep?.narrationText || 'Select a tour step to preview its narration text.'}
            </p>
          </div>

          <div className="rounded-lg border border-primary/15 bg-background/60 p-4 space-y-2 text-sm">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Current Step Linkage</p>
            <p>
              <span className="text-muted-foreground">Audio Track:</span>{' '}
              {result?.trackId || selectedStep?.audioTrackId || 'Not attached yet'}
            </p>
            <p>
              <span className="text-muted-foreground">Audio URL:</span>{' '}
              {result?.publicUrl || selectedStep?.audioUrl || 'Not attached yet'}
            </p>
            {selectedStep?.artifact?.name && (
              <p>
                <span className="text-muted-foreground">Linked Artifact:</span>{' '}
                {selectedStep.artifact.name}
              </p>
            )}
          </div>

          <div className="rounded-lg border border-primary/15 bg-background/60 p-4 space-y-2 text-sm text-muted-foreground">
            <p className="text-[11px] uppercase tracking-wider">Notes</p>
            <p>- The generator uses the secure Edge Function and keeps TTS provider keys off the client.</p>
            <p>- `en-NG` is accepted here; the backend normalizes it to a provider-supported English voice locale.</p>
            <p>- This tool generates audio and attaches it. It does not edit the tour step narration text itself.</p>
          </div>
        </div>
      </div>
    </div>
  );
}