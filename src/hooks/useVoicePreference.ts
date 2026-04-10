import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "museum_voice_preference";

/* ── Tiny pub-sub so every component reacts to changes ── */
const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}
function notify() { listeners.forEach((cb) => cb()); }

function getSnapshot(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

/**
 * Global voice preference hook.
 * Stores the selected voiceURI in localStorage and broadcasts changes
 * to every mounted consumer.
 */
export function useVoicePreference() {
  const voiceUri = useSyncExternalStore(subscribe, getSnapshot, () => "");

  const setVoiceUri = useCallback((uri: string) => {
    localStorage.setItem(STORAGE_KEY, uri);
    notify();
  }, []);

  return { voiceUri, setVoiceUri };
}

/* ── Resolve the saved URI to an actual SpeechSynthesisVoice ── */

const AFRICAN_LOCALE_RE = /en[_-](NG|GH|KE|ZA|TZ|UG|RW|ET|CM|SN|BW|ZW|MW|NA|LS|SZ|MZ)|zu[_-]|xh[_-]|af[_-]|sw[_-]|am[_-]|ha[_-]|ig[_-]|yo[_-]/i;
const AFRICAN_NAME_RE = /nigeria|ghana|kenya|south.africa|tanzania|uganda|rwanda|ethiopia|cameroon|senegal|swahili|african|nairobi|lagos|accra|johannesburg|zuri|imani|chilemba|ezinne|abeo|thando|amahle|lerato|thandiwe|bongi|naledi|busisiwe|siyanda|mandisa|themba|sipho|lunelo|jabulani|zulu|xhosa|afrikaan/i;

/**
 * Get the currently preferred voice.
 * If a voiceURI is saved — use that.  Otherwise fall back to African → English.
 */
export function getPreferredVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  const saved = localStorage.getItem(STORAGE_KEY);

  if (saved) {
    const match = voices.find((v) => v.voiceURI === saved);
    if (match) return match;
  }

  // Tier 1: exact African locale
  const africanLocales = ["en-NG", "en-GH", "en-KE", "en-ZA", "en-TZ"];
  for (const locale of africanLocales) {
    const m = voices.find((v) => v.lang.replace("_", "-").toLowerCase() === locale.toLowerCase());
    if (m) return m;
  }

  // Tier 2: partial African locale
  const localeMatch = voices.find((v) => AFRICAN_LOCALE_RE.test(v.lang));
  if (localeMatch) return localeMatch;

  // Tier 3: name match
  const nameMatch = voices.find((v) => AFRICAN_NAME_RE.test(v.name));
  if (nameMatch) return nameMatch;

  // Tier 4: any English
  return voices.find((v) => v.lang.startsWith("en")) || null;
}

/**
 * Get the preferred lang code for utterances.
 */
export function getPreferredLang(): string {
  const voice = getPreferredVoice();
  return voice?.lang ?? "en-NG";
}

/**
 * Label a voice for display — marks African ones prominently.
 */
export function voiceLabel(v: SpeechSynthesisVoice): string {
  const isAfrican = AFRICAN_LOCALE_RE.test(v.lang) || AFRICAN_NAME_RE.test(v.name);
  const flag = isAfrican ? "🌍 " : "";
  return `${flag}${v.name} (${v.lang})`;
}

/**
 * Sort voices: African first, then other English, then the rest.
 */
export function sortVoicesAfricanFirst(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => {
    const aAfrican = AFRICAN_LOCALE_RE.test(a.lang) || AFRICAN_NAME_RE.test(a.name);
    const bAfrican = AFRICAN_LOCALE_RE.test(b.lang) || AFRICAN_NAME_RE.test(b.name);
    if (aAfrican && !bAfrican) return -1;
    if (!aAfrican && bAfrican) return 1;
    const aEn = a.lang.startsWith("en");
    const bEn = b.lang.startsWith("en");
    if (aEn && !bEn) return -1;
    if (!aEn && bEn) return 1;
    return a.name.localeCompare(b.name);
  });
}
