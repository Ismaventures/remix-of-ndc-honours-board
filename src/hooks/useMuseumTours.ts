import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type {
  MuseumArtifact,
  MuseumLinkedView,
  MuseumTour,
  MuseumTourStep,
} from "@/types/domain";

const MUSEUM_TOURS_CACHE_KEY = "ndc_cache_museum_tours_v1";

type MuseumArtifactRow = {
  id: string;
  name: string;
  description: string | null;
  era: string | null;
  origin_label: string | null;
  strategic_significance: string | null;
  media_urls: string[] | null;
  tags: string[] | null;
  related_artifact_ids: string[] | null;
  gallery_category: string | null;
  period_label: string | null;
  map_lat: number | null;
  map_lng: number | null;
  map_zoom: number | null;
  linked_view: string | null;
  linked_record_id: string | null;
  is_published: boolean;
};

type MuseumTourRow = {
  id: string;
  name: string;
  description: string | null;
  duration_estimate_min: number | null;
  cover_image_url: string | null;
  theme: string | null;
  language_code: string | null;
  auto_mode_enabled: boolean | null;
  display_order: number | null;
  is_published: boolean;
};

type MuseumTourStepRow = {
  id: string;
  tour_id: string;
  artifact_id: string | null;
  step_order: number;
  title: string;
  narration_text: string | null;
  narration_audio_track_id: string | null;
  audio_url: string | null;
  duration_sec: number | null;
  auto_advance: boolean | null;
  language_code: string | null;
  map_lat: number | null;
  map_lng: number | null;
  map_zoom: number | null;
  linked_view: string | null;
  linked_record_id: string | null;
  is_published: boolean;
};

function safeLinkedView(value: string | null): MuseumLinkedView | undefined {
  if (!value) return undefined;

  switch (value) {
    case "home":
    case "about-ndc":
    case "museum-collections":
    case "guided-tours":
    case "hall-of-fame":
    case "commandants":
    case "fwc":
    case "fdc":
    case "directing":
    case "allied":
    case "visits":
      return value;
    default:
      return undefined;
  }
}

function readMuseumTourCache(): MuseumTour[] | null {
  try {
    const raw = localStorage.getItem(MUSEUM_TOURS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MuseumTour[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function writeMuseumTourCache(tours: MuseumTour[]): void {
  try {
    localStorage.setItem(MUSEUM_TOURS_CACHE_KEY, JSON.stringify(tours));
  } catch {
    // Best-effort cache write.
  }
}

function mapArtifactRowToArtifact(row: MuseumArtifactRow): MuseumArtifact {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    era: row.era ?? "Museum Narrative",
    origin: row.origin_label ?? "NDC Museum",
    strategicSignificance: row.strategic_significance ?? "",
    mediaUrls: row.media_urls ?? [],
    tags: row.tags ?? [],
    relatedArtifactIds: row.related_artifact_ids ?? [],
    galleryCategory: row.gallery_category ?? undefined,
    periodLabel: row.period_label ?? undefined,
    mapLat: row.map_lat ?? undefined,
    mapLng: row.map_lng ?? undefined,
    mapZoom: row.map_zoom ?? undefined,
    linkedView: safeLinkedView(row.linked_view),
    linkedRecordId: row.linked_record_id ?? undefined,
  };
}

function buildRemoteTours(
  tourRows: MuseumTourRow[],
  stepRows: MuseumTourStepRow[],
  artifactRows: MuseumArtifactRow[],
): MuseumTour[] {
  const artifactMap = new Map<string, MuseumArtifact>(
    artifactRows.map((row) => [row.id, mapArtifactRowToArtifact(row)]),
  );

  return [...tourRows]
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
    .map((tourRow) => {
      const steps = stepRows
        .filter((step) => step.tour_id === tourRow.id)
        .sort((a, b) => a.step_order - b.step_order)
        .map<MuseumTourStep>((step) => {
          const artifact = step.artifact_id
            ? artifactMap.get(step.artifact_id) ?? null
            : null;

          return {
            id: step.id,
            tourId: tourRow.id,
            stepOrder: step.step_order,
            title: step.title,
            narrationText: step.narration_text ?? "",
            artifactId: step.artifact_id ?? undefined,
            artifact,
            audioTrackId: step.narration_audio_track_id ?? undefined,
            audioUrl: step.audio_url ?? undefined,
            durationSec: step.duration_sec ?? undefined,
            autoAdvance: step.auto_advance ?? true,
            languageCode: step.language_code ?? tourRow.language_code ?? undefined,
            mapLat: step.map_lat ?? artifact?.mapLat,
            mapLng: step.map_lng ?? artifact?.mapLng,
            mapZoom: step.map_zoom ?? artifact?.mapZoom,
            linkedView: safeLinkedView(step.linked_view) ?? artifact?.linkedView,
            linkedRecordId: step.linked_record_id ?? artifact?.linkedRecordId,
          };
        });

      return {
        id: tourRow.id,
        name: tourRow.name,
        description: tourRow.description ?? "",
        durationEstimateMinutes: tourRow.duration_estimate_min ?? undefined,
        coverImageUrl: tourRow.cover_image_url ?? undefined,
        theme: tourRow.theme ?? undefined,
        languageCode: tourRow.language_code ?? undefined,
        autoModeEnabled: tourRow.auto_mode_enabled ?? true,
        steps,
      };
    })
    .filter((tour) => tour.steps.length > 0);
}

export function useMuseumTours(fallbackTours: MuseumTour[]) {
  const [tours, setTours] = useState<MuseumTour[]>(() => {
    const cached = readMuseumTourCache();
    return cached && cached.length > 0 ? cached : fallbackTours;
  });
  const [isLoading, setIsLoading] = useState(tours.length === 0);

  useEffect(() => {
    if (fallbackTours.length > 0 && tours.length === 0) {
      setTours(fallbackTours);
    }
  }, [fallbackTours, tours.length]);

  useEffect(() => {
    let disposed = false;

    const loadMuseumTours = async () => {
      setIsLoading(true);

      try {
        const [tourResponse, stepResponse, artifactResponse] = await Promise.all([
          supabase
            .from("museum_tours")
            .select("*")
            .eq("is_published", true),
          supabase
            .from("museum_tour_steps")
            .select("*")
            .eq("is_published", true),
          supabase
            .from("museum_artifacts")
            .select("*")
            .eq("is_published", true),
        ]);

        if (tourResponse.error) throw tourResponse.error;
        if (stepResponse.error) throw stepResponse.error;
        if (artifactResponse.error) throw artifactResponse.error;

        const remoteTours = buildRemoteTours(
          (tourResponse.data as MuseumTourRow[] | null) ?? [],
          (stepResponse.data as MuseumTourStepRow[] | null) ?? [],
          (artifactResponse.data as MuseumArtifactRow[] | null) ?? [],
        );

        if (disposed) return;

        if (remoteTours.length > 0) {
          setTours(remoteTours);
          writeMuseumTourCache(remoteTours);
          setIsLoading(false);
          return;
        }

        setTours(fallbackTours);
        setIsLoading(false);
      } catch {
        if (disposed) return;
        const cached = readMuseumTourCache();
        setTours(cached && cached.length > 0 ? cached : fallbackTours);
        setIsLoading(false);
      }
    };

    void loadMuseumTours();

    return () => {
      disposed = true;
    };
  }, [fallbackTours]);

  return {
    tours,
    isLoading,
  };
}
