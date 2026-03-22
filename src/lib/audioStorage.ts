import { supabase } from './supabaseClient';

export interface RemoteAudioTrack {
  id: string;
  name: string;
  filename: string;
  bucketPath: string;
}

export interface RemoteAudioAssignment {
  context: string;
  trackId: string | null;
}

const AUDIO_BUCKET = import.meta.env.VITE_SUPABASE_AUDIO_BUCKET || 'ndc-audio';
const AUDIO_TABLE = 'audio_tracks';

function normalizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export function isSupabaseAudioReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

export async function uploadAudioToSupabase(id: string, name: string, file: File): Promise<RemoteAudioTrack | null> {
  if (!isSupabaseAudioReady()) return null;

  const safeFilename = normalizeFilename(file.name);
  const bucketPath = `tracks/${id}-${safeFilename}`;

  const { error: storageError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .upload(bucketPath, file, {
      upsert: true,
      contentType: file.type || 'audio/mpeg',
      cacheControl: '3600',
    });

  if (storageError) {
    console.error(`Supabase storage upload failed (bucket: ${AUDIO_BUCKET}):`, storageError.message);
    return null;
  }

  const { error: dbError } = await supabase
    .from(AUDIO_TABLE)
    .upsert(
      {
        id,
        name,
        filename: file.name,
        bucket_path: bucketPath,
      },
      { onConflict: 'id' }
    );

  if (dbError) {
    console.error('Supabase audio metadata upsert failed:', dbError.message);
    return null;
  }

  return {
    id,
    name,
    filename: file.name,
    bucketPath,
  };
}

export async function listAudioTracksFromSupabase(): Promise<RemoteAudioTrack[]> {
  if (!isSupabaseAudioReady()) return [];

  const { data, error } = await supabase
    .from(AUDIO_TABLE)
    .select('id,name,filename,bucket_path')
    .order('name', { ascending: true });

  if (error) {
    console.error('Supabase audio tracks fetch failed:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    filename: row.filename,
    bucketPath: row.bucket_path,
  }));
}

export async function getSupabaseAudioUrl(bucketPath: string): Promise<string | null> {
  if (!isSupabaseAudioReady()) return null;

  const { data } = supabase.storage.from(AUDIO_BUCKET).getPublicUrl(bucketPath);
  return data?.publicUrl ?? null;
}

export async function deleteAudioFromSupabase(id: string, bucketPath?: string): Promise<boolean> {
  if (!isSupabaseAudioReady()) return false;

  if (bucketPath) {
    const { error: storageError } = await supabase.storage.from(AUDIO_BUCKET).remove([bucketPath]);
    if (storageError) {
      console.error('Supabase storage delete failed:', storageError.message);
      return false;
    }
  }

  const { error: dbError } = await supabase.from(AUDIO_TABLE).delete().eq('id', id);
  if (dbError) {
    console.error('Supabase audio metadata delete failed:', dbError.message);
    return false;
  }

  return true;
}

export async function renameAudioInSupabase(id: string, newName: string): Promise<boolean> {
  if (!isSupabaseAudioReady()) return false;

  const { error } = await supabase.from(AUDIO_TABLE).update({ name: newName }).eq('id', id);
  if (error) {
    console.error('Supabase audio metadata rename failed:', error.message);
    return false;
  }

  return true;
}

export async function listAudioAssignmentsFromSupabase(): Promise<RemoteAudioAssignment[]> {
  if (!isSupabaseAudioReady()) return [];

  const { data, error } = await supabase
    .from('audio_assignments')
    .select('context,track_id');

  if (error) {
    console.error('Supabase audio assignments fetch failed:', error.message);
    return [];
  }

  return (data ?? []).map((row: any) => ({
    context: row.context,
    trackId: row.track_id,
  }));
}

export async function upsertAudioAssignmentToSupabase(context: string, trackId: string | null): Promise<boolean> {
  if (!isSupabaseAudioReady()) return false;

  const { error } = await supabase
    .from('audio_assignments')
    .upsert({ context, track_id: trackId }, { onConflict: 'context' });

  if (error) {
    console.error('Supabase audio assignment upsert failed:', error.message);
    return false;
  }

  return true;
}
