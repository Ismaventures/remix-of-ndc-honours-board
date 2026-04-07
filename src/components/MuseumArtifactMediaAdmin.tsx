import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Link2,
  Loader2,
  RefreshCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MuseumObjectViewer } from '@/components/MuseumObjectViewer';
import { saveMediaFile } from '@/lib/persistentMedia';
import { supabase } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils';

type MuseumArtifactAdminRecord = {
  id: string;
  name: string;
  description: string | null;
  era: string | null;
  galleryCategory: string | null;
  mediaUrls: string[];
  isPublished: boolean;
};

const MAX_MEDIA_SIZE_MB = 8;
const MAX_MEDIA_BYTES = MAX_MEDIA_SIZE_MB * 1024 * 1024;

function describeMediaRef(value: string) {
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const parsed = new URL(value);
      return `${parsed.hostname}${parsed.pathname}`;
    } catch {
      return value;
    }
  }

  if (value.length <= 72) {
    return value;
  }

  return `${value.slice(0, 48)}...${value.slice(-16)}`;
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function MuseumArtifactMediaAdmin() {
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const [artifacts, setArtifacts] = useState<MuseumArtifactAdminRecord[]>([]);
  const [selectedArtifactId, setSelectedArtifactId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [manualUrl, setManualUrl] = useState('');
  const [workingMediaUrls, setWorkingMediaUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadArtifacts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: loadError } = await supabase
        .from('museum_artifacts')
        .select('id, name, description, era, gallery_category, media_urls, is_published')
        .order('name', { ascending: true });

      if (loadError) {
        throw loadError;
      }

      const nextArtifacts = ((data as Array<{
        id: string;
        name: string;
        description: string | null;
        era: string | null;
        gallery_category: string | null;
        media_urls: string[] | null;
        is_published: boolean;
      }> | null) ?? [])
        .map((artifact) => ({
          id: artifact.id,
          name: artifact.name,
          description: artifact.description,
          era: artifact.era,
          galleryCategory: artifact.gallery_category,
          mediaUrls: artifact.media_urls ?? [],
          isPublished: artifact.is_published,
        }))
        .sort((left, right) => {
          const categoryCompare = (left.galleryCategory ?? '').localeCompare(right.galleryCategory ?? '');
          if (categoryCompare !== 0) return categoryCompare;
          return left.name.localeCompare(right.name);
        });

      setArtifacts(nextArtifacts);
      setStatus(nextArtifacts.length > 0 ? null : 'No museum artifacts found in Supabase yet.');
    } catch (loadFailure) {
      const message = loadFailure instanceof Error ? loadFailure.message : 'Unable to load museum artifacts.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadArtifacts();
  }, []);

  const filteredArtifacts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return artifacts;
    }

    return artifacts.filter((artifact) => {
      const haystack = [artifact.name, artifact.galleryCategory, artifact.era, artifact.description]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [artifacts, searchQuery]);

  useEffect(() => {
    if (filteredArtifacts.length === 0) {
      if (selectedArtifactId) {
        setSelectedArtifactId('');
      }
      return;
    }

    if (!filteredArtifacts.some((artifact) => artifact.id === selectedArtifactId)) {
      setSelectedArtifactId(filteredArtifacts[0].id);
    }
  }, [filteredArtifacts, selectedArtifactId]);

  const selectedArtifact = useMemo(
    () => filteredArtifacts.find((artifact) => artifact.id === selectedArtifactId)
      ?? artifacts.find((artifact) => artifact.id === selectedArtifactId)
      ?? null,
    [artifacts, filteredArtifacts, selectedArtifactId],
  );

  useEffect(() => {
    setWorkingMediaUrls(selectedArtifact?.mediaUrls ?? []);
    setManualUrl('');
  }, [selectedArtifact]);

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const nextFiles = Array.from(files);
    const oversized = nextFiles.find((file) => file.size > MAX_MEDIA_BYTES);
    if (oversized) {
      setError(`${oversized.name} exceeds ${MAX_MEDIA_SIZE_MB}MB. Resize it before uploading.`);
      return;
    }

    setIsUploading(true);
    setError(null);
    setStatus('Uploading artifact media...');

    try {
      const results = await Promise.allSettled(nextFiles.map((file) => saveMediaFile(file)));
      const uploadedRefs = results
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter(Boolean);

      const failures = results.length - uploadedRefs.length;

      if (uploadedRefs.length > 0) {
        setWorkingMediaUrls((currentUrls) => [...currentUrls, ...uploadedRefs]);
        setStatus(
          failures > 0
            ? `${uploadedRefs.length} image(s) uploaded. ${failures} failed.`
            : `${uploadedRefs.length} image(s) uploaded. Drag order is controlled with the move buttons below.`,
        );
      } else {
        setError('No files were uploaded.');
      }
    } catch (uploadFailure) {
      const message = uploadFailure instanceof Error ? uploadFailure.message : 'Artifact upload failed.';
      setError(message);
    } finally {
      setIsUploading(false);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = '';
      }
    }
  };

  const handleAddUrl = () => {
    const nextUrl = manualUrl.trim();
    if (!nextUrl) {
      return;
    }

    setWorkingMediaUrls((currentUrls) => [...currentUrls, nextUrl]);
    setManualUrl('');
    setStatus('External image URL added. Save to persist it on the artifact.');
    setError(null);
  };

  const handleSave = async () => {
    if (!selectedArtifact) {
      setError('Select an artifact before saving media.');
      return;
    }

    setIsSaving(true);
    setError(null);
    setStatus('Saving museum artifact media...');

    try {
      const { error: saveError } = await supabase
        .from('museum_artifacts')
        .update({
          media_urls: workingMediaUrls,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedArtifact.id);

      if (saveError) {
        throw saveError;
      }

      setArtifacts((currentArtifacts) =>
        currentArtifacts.map((artifact) =>
          artifact.id === selectedArtifact.id
            ? { ...artifact, mediaUrls: [...workingMediaUrls] }
            : artifact,
        ),
      );
      setStatus(`Saved ${workingMediaUrls.length} image(s) to ${selectedArtifact.name}.`);
    } catch (saveFailure) {
      const message = saveFailure instanceof Error ? saveFailure.message : 'Unable to save museum artifact media.';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-card/50 gold-border rounded-xl p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-xl font-serif gold-text mb-2">Museum Artifact Media</h3>
          <p className="text-sm text-muted-foreground max-w-3xl">
            Upload one image for a premium glass-case presentation, or upload a sequenced set of angle shots to enable the new 360 inspection viewer.
          </p>
        </div>
        <div className="rounded-lg border border-primary/20 bg-background/60 px-4 py-3 text-xs uppercase tracking-wider text-primary/80">
          First frame should be the front-facing hero image
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search museum artifacts..."
            />
            <Button variant="outline" onClick={() => void loadArtifacts()} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              Refresh
            </Button>
          </div>

          <div className="rounded-lg border border-primary/15 bg-background/60 p-3 max-h-[420px] overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading museum artifacts...
              </div>
            ) : filteredArtifacts.length > 0 ? (
              filteredArtifacts.map((artifact) => (
                <button
                  key={artifact.id}
                  type="button"
                  onClick={() => setSelectedArtifactId(artifact.id)}
                  className={cn(
                    'w-full rounded-lg border px-3 py-3 text-left transition-colors',
                    selectedArtifact?.id === artifact.id
                      ? 'border-primary/35 bg-primary/10'
                      : 'border-primary/10 bg-card/40 hover:bg-muted/40',
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{artifact.name}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                        {artifact.galleryCategory || 'Museum Artifact'}
                      </p>
                    </div>
                    <span className="rounded-full border border-primary/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                      {artifact.mediaUrls.length} frame{artifact.mediaUrls.length === 1 ? '' : 's'}
                    </span>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No museum artifacts match the current search.</p>
            )}
          </div>

          {selectedArtifact && (
            <div className="rounded-lg border border-primary/15 bg-background/60 p-4 space-y-3 text-sm">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Selected Artifact</p>
                <p className="mt-1 font-semibold text-foreground">{selectedArtifact.name}</p>
              </div>
              <p className="text-muted-foreground leading-6">
                {selectedArtifact.description || 'No curatorial description yet.'}
              </p>
              <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-wider">
                {selectedArtifact.era && (
                  <span className="rounded-full border border-primary/15 px-2 py-1 text-primary/80">{selectedArtifact.era}</span>
                )}
                {selectedArtifact.galleryCategory && (
                  <span className="rounded-full border border-primary/15 px-2 py-1 text-primary/80">{selectedArtifact.galleryCategory}</span>
                )}
                <span className="rounded-full border border-primary/15 px-2 py-1 text-primary/80">
                  {selectedArtifact.isPublished ? 'Published' : 'Draft'}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <MuseumObjectViewer
            title={selectedArtifact?.name ?? 'Museum artifact'}
            mediaSources={workingMediaUrls}
            isLightMode={false}
            topLabel="Artifact Preview"
            topRightLabel={workingMediaUrls.length > 1 ? '360 Ready' : 'Glass Case'}
            footerLabel={selectedArtifact?.era ?? 'Museum Era'}
            showControls
            loading="eager"
            emptyLabel="Upload artifact imagery"
          />

          <div className="rounded-lg border border-primary/15 bg-background/60 p-4 space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => uploadInputRef.current?.click()} disabled={!selectedArtifact || isUploading}>
                {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                {isUploading ? 'Uploading...' : 'Upload Image Set'}
              </Button>
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => void handleUploadFiles(event.target.files)}
              />
              <Button variant="outline" onClick={() => setWorkingMediaUrls([])} disabled={!selectedArtifact || workingMediaUrls.length === 0}>
                <Trash2 className="h-4 w-4" />
                Clear Frames
              </Button>
              <Button onClick={() => void handleSave()} disabled={!selectedArtifact || isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? 'Saving...' : 'Save Media Order'}
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <Input
                value={manualUrl}
                onChange={(event) => setManualUrl(event.target.value)}
                placeholder="Paste an external image URL if needed"
              />
              <Button variant="outline" onClick={handleAddUrl} disabled={!selectedArtifact || !manualUrl.trim()}>
                <Link2 className="h-4 w-4" />
                Add URL
              </Button>
            </div>

            <div className="rounded-lg border border-primary/10 bg-card/40 p-4 space-y-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Frame Sequence</p>
              {workingMediaUrls.length > 0 ? (
                <div className="space-y-2">
                  {workingMediaUrls.map((mediaUrl, index) => (
                    <div
                      key={`${mediaUrl}-${index}`}
                      className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-primary/10 bg-background/70 px-3 py-3"
                    >
                      <span className="rounded-full border border-primary/15 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary/80">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">{describeMediaRef(mediaUrl)}</p>
                        <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                          {index === 0 ? 'Hero / front frame' : 'Rotation frame'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setWorkingMediaUrls((currentUrls) => moveItem(currentUrls, index, Math.max(index - 1, 0)))}
                          className="rounded-md border border-primary/15 p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          disabled={index === 0}
                          aria-label={`Move frame ${index + 1} up`}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWorkingMediaUrls((currentUrls) => moveItem(currentUrls, index, Math.min(index + 1, currentUrls.length - 1)))}
                          className="rounded-md border border-primary/15 p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition-colors"
                          disabled={index === workingMediaUrls.length - 1}
                          aria-label={`Move frame ${index + 1} down`}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setWorkingMediaUrls((currentUrls) => currentUrls.filter((_, currentIndex) => currentIndex !== index))}
                          className="rounded-md border border-destructive/20 p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          aria-label={`Remove frame ${index + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No media frames yet. Upload one hero image for the museum glass effect, or 12 to 24 evenly spaced angle shots for a convincing 360 rotation.
                </p>
              )}
            </div>

            <div className="rounded-lg border border-primary/10 bg-card/40 p-4 space-y-2 text-sm text-muted-foreground">
              <p className="text-[11px] uppercase tracking-wider">Capture Guidance</p>
              <p>- Documents and framed photographs: upload one clean, front-facing image.</p>
              <p>- Medals, gifts, crests, trophies, and ceremonial objects: upload a sequenced angle set captured under the same lighting.</p>
              <p>- Keep the background neutral, center the object, and avoid mixed zoom levels across frames.</p>
            </div>

            {status && <p className="text-sm text-primary">{status}</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}