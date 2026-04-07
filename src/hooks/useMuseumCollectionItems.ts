import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type ImageSettings = {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  opacity?: number;
  hueRotate?: number;
  sepia?: number;
  blur?: number;
  warmth?: number;
  bgPreset?: string;
  bgCustomUrl?: string;
  depthZ?: number;
  perspective?: number;
  objectInset?: number;
  freeRotation?: boolean;
  animation?: string;
  animationSpeed?: number;
  bgFade?: number;
};

type CollectionItem = {
  id: string;
  name: string;
  imageUrl: string;
  mediaUrls?: string[];
  description: string;
  era: string;
  tag: string;
  location?: string;
  imageSettings?: ImageSettings;
};

type MuseumArtifactRow = {
  id: string;
  name: string;
  description: string | null;
  era: string | null;
  origin_label: string | null;
  media_urls: string[] | null;
  tags: string[] | null;
  gallery_category: string | null;
  period_label: string | null;
  collection_id: string | null;
  tag: string | null;
  location: string | null;
  display_order: number | null;
  image_settings: ImageSettings | null;
  is_published: boolean;
};

type CollectionKey = "history" | "state" | "regional" | "world" | "archives";

const COLLECTION_KEYS: CollectionKey[] = ["history", "state", "regional", "world", "archives"];

function normalizeLabel(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function formatTag(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function inferCollectionKey(row: MuseumArtifactRow): CollectionKey | null {
  // Use explicit collection_id if set
  if (row.collection_id && COLLECTION_KEYS.includes(row.collection_id as CollectionKey)) {
    return row.collection_id as CollectionKey;
  }

  const haystack = normalizeLabel(
    [row.gallery_category, row.name, row.description, ...(row.tags ?? [])]
      .filter(Boolean)
      .join(" "),
  );

  if (/archive|archives|hall of fame|registry|publications|research|records|visitors/.test(haystack)) return "archives";
  if (/regional|ecowas|west africa|african union|pan african|continental/.test(haystack)) return "regional";
  if (/world|global|international|allied nations|diplomatic|comparative/.test(haystack)) return "world";
  if (/state|national|armed forces|honours|security architecture|civic/.test(haystack)) return "state";
  if (/history|founding|institutional memory|milestone|anniversary|crest|charter/.test(haystack)) return "history";

  return null;
}

function mapRowToCollectionItem(row: MuseumArtifactRow): CollectionItem {
  return {
    id: row.id,
    name: row.name,
    imageUrl: row.media_urls?.[0] ?? "",
    mediaUrls: row.media_urls ?? [],
    description: row.description ?? "Museum artifact narrative pending.",
    era: row.period_label ?? row.era ?? "Museum Narrative",
    tag: row.tag ?? formatTag(row.tags?.[0] ?? row.gallery_category ?? "Archive Object"),
    location: row.location ?? row.origin_label ?? undefined,
    imageSettings: row.image_settings ?? undefined,
  };
}

function buildCollectionItemsById(
  fallbackItemsByCollection: Record<string, CollectionItem[]>,
  remoteRows: MuseumArtifactRow[],
): Record<string, CollectionItem[]> {
  const remoteItems = remoteRows.map((row) => ({
    collectionKey: inferCollectionKey(row),
    item: mapRowToCollectionItem(row),
  }));
  const unusedRemoteIds = new Set(remoteItems.map((entry) => entry.item.id));
  const remoteByName = new Map<string, Array<{ collectionKey: CollectionKey | null; item: CollectionItem }>>();

  remoteItems.forEach((entry) => {
    const key = normalizeLabel(entry.item.name);
    const bucket = remoteByName.get(key) ?? [];
    bucket.push(entry);
    remoteByName.set(key, bucket);
  });

  const nextByCollection = COLLECTION_KEYS.reduce<Record<string, CollectionItem[]>>((accumulator, key) => {
    const fallbackItems = fallbackItemsByCollection[key] ?? [];
    const mergedFallback = fallbackItems.map((fallbackItem) => {
      const possibleMatches = remoteByName.get(normalizeLabel(fallbackItem.name)) ?? [];
      const directMatch = possibleMatches.find((entry) => unusedRemoteIds.has(entry.item.id));

      if (!directMatch) {
        return fallbackItem;
      }

      unusedRemoteIds.delete(directMatch.item.id);

      return {
        ...fallbackItem,
        imageUrl: directMatch.item.imageUrl || fallbackItem.imageUrl,
        mediaUrls: directMatch.item.mediaUrls && directMatch.item.mediaUrls.length > 0 ? directMatch.item.mediaUrls : fallbackItem.mediaUrls,
        description: directMatch.item.description || fallbackItem.description,
        era: directMatch.item.era || fallbackItem.era,
        tag: directMatch.item.tag || fallbackItem.tag,
        location: directMatch.item.location || fallbackItem.location,
        imageSettings: directMatch.item.imageSettings || fallbackItem.imageSettings,
      };
    });

    const remoteAppended = remoteItems
      .filter((entry) => entry.collectionKey === key && unusedRemoteIds.has(entry.item.id))
      .map((entry) => {
        unusedRemoteIds.delete(entry.item.id);
        return entry.item;
      });

    accumulator[key] = [...mergedFallback, ...remoteAppended];
    return accumulator;
  }, {});

  return nextByCollection;
}

export function useMuseumCollectionItems(fallbackItemsByCollection: Record<string, CollectionItem[]>) {
  const [remoteRows, setRemoteRows] = useState<MuseumArtifactRow[]>([]);

  useEffect(() => {
    let disposed = false;

    const loadArtifacts = async () => {
      try {
        const { data, error } = await supabase
          .from("museum_artifacts")
          .select("id, name, description, era, origin_label, media_urls, tags, gallery_category, period_label, collection_id, tag, location, display_order, image_settings, is_published")
          .eq("is_published", true)
          .order("display_order");

        if (error || disposed) {
          return;
        }

        setRemoteRows((data as MuseumArtifactRow[] | null) ?? []);
      } catch {
        if (!disposed) {
          setRemoteRows([]);
        }
      }
    };

    void loadArtifacts();

    return () => {
      disposed = true;
    };
  }, []);

  const collectionItemsById = useMemo(
    () => buildCollectionItemsById(fallbackItemsByCollection, remoteRows),
    [fallbackItemsByCollection, remoteRows],
  );

  return { collectionItemsById };
}