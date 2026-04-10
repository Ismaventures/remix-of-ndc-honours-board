import { get, set } from 'idb-keyval';
import { supabase } from './supabaseClient';

const SHARED_UI_SETTINGS_TABLE = 'shared_ui_settings';
const LOCAL_SHARED_SETTINGS_PREFIX = 'shared_ui_setting_';

export function isSupabaseSharedSettingsReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

function localKey(settingKey: string): string {
  return `${LOCAL_SHARED_SETTINGS_PREFIX}${settingKey}`;
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

async function loadRemote<T>(settingKey: string): Promise<T | null> {
  if (!isSupabaseSharedSettingsReady()) return null;

  const { data, error } = await supabase
    .from(SHARED_UI_SETTINGS_TABLE)
    .select('setting_value')
    .eq('setting_key', settingKey)
    .maybeSingle();

  if (error) {
    console.error('Failed to load shared ui setting from Supabase:', error.message);
    return null;
  }

  return (data?.setting_value as T | undefined) ?? null;
}

async function saveRemote<T>(settingKey: string, value: T): Promise<boolean> {
  if (!isSupabaseSharedSettingsReady()) return false;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return false;

  const { error } = await supabase
    .from(SHARED_UI_SETTINGS_TABLE)
    .upsert(
      {
        setting_key: settingKey,
        setting_value: value,
        updated_by: session.user.id,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'setting_key' }
    );

  if (error) {
    console.error('Failed to save shared ui setting to Supabase:', error.message);
    return false;
  }

  return true;
}

export async function loadSharedSetting<T>(settingKey: string): Promise<T | null> {
  const remote = await loadRemote<T>(settingKey);
  if (remote != null) {
    void saveLocal(settingKey, remote);
    return remote;
  }

  return loadLocal<T>(settingKey);
}

export async function saveSharedSetting<T>(settingKey: string, settingValue: T): Promise<boolean> {
  await saveLocal(settingKey, settingValue);
  const ok = await saveRemote(settingKey, settingValue);
  return ok;
}