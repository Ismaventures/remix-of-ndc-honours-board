import { supabase } from './supabaseClient';

const UI_SETTINGS_TABLE = 'ui_settings';

export function isSupabaseSettingsReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

export async function loadUiSetting<T>(settingKey: string): Promise<T | null> {
  if (!isSupabaseSettingsReady()) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();

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

export async function saveUiSetting<T>(settingKey: string, settingValue: T): Promise<boolean> {
  if (!isSupabaseSettingsReady()) return false;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.user) return false;

  const { error } = await supabase
    .from(UI_SETTINGS_TABLE)
    .upsert(
      {
        user_id: session.user.id,
        setting_key: settingKey,
        setting_value: settingValue,
      },
      { onConflict: 'user_id,setting_key' }
    );

  if (error) {
    console.error('Failed to save ui setting to Supabase:', error.message);
    return false;
  }

  return true;
}
