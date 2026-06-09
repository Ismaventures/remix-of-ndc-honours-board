/**
 * Pick an African-accented English voice from the system's speech synthesis voices.
 *
 * Priority order:
 *  1. Nigerian English (en-NG)
 *  2. Ghanaian English (en-GH)
 *  3. Kenyan English (en-KE)
 *  4. South African English (en-ZA)
 *  5. Tanzanian / Swahili-region English
 *  6. Any voice whose name mentions an African country/region
 *  7. Fallback to any available English voice
 */
export function pickAfricanVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();

  // Tier 1: Exact African locale matches (ordered by preference)
  const africanLocales = ["en-NG", "en-GH", "en-KE", "en-ZA", "en-TZ"];
  for (const locale of africanLocales) {
    const match = voices.find((v) => v.lang.replace("_", "-").toLowerCase() === locale.toLowerCase());
    if (match) return match;
  }

  // Tier 2: Partial locale match (e.g. en_NG, en-ng)
  const africanLocaleRegex = /en[_-](NG|GH|KE|ZA|TZ|UG|RW|ET|CM|SN|BW|ZW|MW|NA|LS|SZ|MZ)/i;
  const localeMatch = voices.find((v) => africanLocaleRegex.test(v.lang));
  if (localeMatch) return localeMatch;

  // Tier 3: Voice name mentions an African country/region
  const africanNameRegex = /nigeria|ghana|kenya|south.africa|tanzania|uganda|rwanda|ethiopia|cameroon|senegal|swahili|african|nairobi|lagos|accra|johannesburg/i;
  const nameMatch = voices.find((v) => africanNameRegex.test(v.name));
  if (nameMatch) return nameMatch;

  // Tier 4: Any English voice (absolute fallback)
  return voices.find((v) => v.lang.startsWith("en")) || null;
}
