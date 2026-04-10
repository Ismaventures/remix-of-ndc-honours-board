import { get, set } from 'idb-keyval';
import { getSafeSupabaseSession, supabase } from './supabaseClient';

const UI_SETTINGS_TABLE = 'ui_settings';
const LOCAL_SETTINGS_PREFIX = 'ui_setting_';

export function isSupabaseSettingsReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

/* ── Local (IndexedDB) helpers ── */
function localKey(settingKey: string): string {
  return `${LOCAL_SETTINGS_PREFIX}${settingKey}`;
}

async function loadLocal<T>(settingKey: string): Promise<T | null> {
  try {
    const val = await get<T>(localKey(settingKey));
    return val ?? null;
  } catch {
    return null;
  }
}

async function saveLocal<T>(settingKey: string, value: T): Promise<void> {
  try {
    await set(localKey(settingKey), value);
  } catch {
    // best-effort
  }
}

/* ── Supabase helpers ── */
async function loadRemote<T>(settingKey: string): Promise<T | null> {
  if (!isSupabaseSettingsReady()) return null;

  const session = await getSafeSupabaseSession();

  if (!session?.user) return null;

  const { data, error } = await supabase
    .from(UI_SETTINGS_TABLE)
    .select('setting_value')
    .eq('setting_key', settingKey)
    .eq('user_id', session.user.id)
    .maybeSingle();

  if (error) {
    console.error('Failed to load ui setting from Supabase:', error.message);
    return null;
  }

  return (data?.setting_value as T | undefined) ?? null;
}

async function saveRemote<T>(settingKey: string, value: T): Promise<boolean> {
  if (!isSupabaseSettingsReady()) return false;

  const session = await getSafeSupabaseSession();

  if (!session?.user) return false;

  const { error } = await supabase
    .from(UI_SETTINGS_TABLE)
    .upsert(
      {
        user_id: session.user.id,
        setting_key: settingKey,
        setting_value: value,
      },
      { onConflict: 'user_id,setting_key' }
    );

  if (error) {
    console.error('Failed to save ui setting to Supabase:', error.message);
    return false;
  }

  return true;
}

/* ── Public API: dual read/write with local fallback ── */

export async function loadUiSetting<T>(settingKey: string): Promise<T | null> {
  // Try Supabase first (source of truth when available)
  const remote = await loadRemote<T>(settingKey);
  if (remote != null) {
    // Sync back to local for offline fallback
    void saveLocal(settingKey, remote);
    return remote;
  }

  // Fall back to local IndexedDB
  return loadLocal<T>(settingKey);
}

export async function saveUiSetting<T>(settingKey: string, settingValue: T): Promise<boolean> {
  // Always save locally first (instant, offline-safe)
  await saveLocal(settingKey, settingValue);

  // Then save to Supabase (best-effort, may fail if offline/no auth)
  const ok = await saveRemote(settingKey, settingValue);
  return ok;
}
