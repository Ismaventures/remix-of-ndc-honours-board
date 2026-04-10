import { useEffect, useState, useRef } from "react";
import { Mic, ChevronDown, Check, Download } from "lucide-react";
import { useVoicePreference, sortVoicesAfricanFirst } from "@/hooks/useVoicePreference";
import { useThemeMode } from "@/hooks/useThemeMode";
import { cn } from "@/lib/utils";

const AFRICAN_LOCALE_RE = /en[_-](NG|GH|KE|ZA|TZ|UG|RW|ET|CM|SN|BW|ZW|MW|NA|LS|SZ|MZ)|zu[_-]|xh[_-]|af[_-]|sw[_-]|am[_-]|ha[_-]|ig[_-]|yo[_-]/i;
const AFRICAN_NAME_RE = /nigeria|ghana|kenya|south.africa|tanzania|uganda|rwanda|ethiopia|cameroon|senegal|swahili|african|nairobi|lagos|accra|johannesburg|zuri|imani|chilemba|ezinne|abeo|thando|amahle|lerato|thandiwe|bongi|naledi|busisiwe|siyanda|mandisa|themba|sipho|lunelo|jabulani|zulu|xhosa|afrikaan/i;

function isAfricanVoice(v: SpeechSynthesisVoice) {
  return AFRICAN_LOCALE_RE.test(v.lang) || AFRICAN_NAME_RE.test(v.name);
}

export function VoiceSelector() {
  const { voiceUri, setVoiceUri } = useVoicePreference();
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [open, setOpen] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load voices
  useEffect(() => {
    function load() {
      const all = speechSynthesis.getVoices();
      if (all.length > 0) {
        setVoices(sortVoicesAfricanFirst(all));
      }
    }
    load();
    speechSynthesis.onvoiceschanged = load;
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Preview a voice
  function preview(voice: SpeechSynthesisVoice) {
    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance("Welcome to the National Defence College Museum.");
    utt.voice = voice;
    utt.rate = 0.9;
    utt.pitch = 0.95;
    utt.onstart = () => setPreviewing(true);
    utt.onend = () => setPreviewing(false);
    utt.onerror = () => setPreviewing(false);
    speechSynthesis.speak(utt);
  }

  const selectedVoice = voices.find((v) => v.voiceURI === voiceUri);
  const displayName = selectedVoice ? selectedVoice.name.split(/[-(]/)[0].trim() : "Select Voice";

  const africanVoices = voices.filter(isAfricanVoice);
  const englishVoices = voices.filter((v) => v.lang.startsWith("en") && !isAfricanVoice(v));
  const otherVoices = voices.filter((v) => !v.lang.startsWith("en") && !isAfricanVoice(v));

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-all",
          isLightMode
            ? "border-slate-200 bg-white/80 text-slate-700 hover:bg-slate-50"
            : "border-white/12 bg-white/[0.05] text-white/70 hover:bg-white/[0.08]",
        )}
        title="Choose narration voice"
      >
        <Mic className="h-3 w-3 flex-shrink-0" />
        <span className="max-w-[90px] truncate hidden sm:inline">{displayName}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className={cn(
            "absolute right-0 top-full mt-2 z-[200] w-[320px] max-h-[70vh] overflow-y-auto rounded-xl border shadow-2xl",
            isLightMode
              ? "border-slate-200 bg-white"
              : "border-white/12 bg-[#0f1420]",
          )}
        >
          {/* Header */}
          <div className={cn("sticky top-0 z-10 border-b px-4 py-3", isLightMode ? "border-slate-100 bg-white" : "border-white/8 bg-[#0f1420]")}>
            <p className={cn("text-[11px] font-bold uppercase tracking-[0.18em]", isLightMode ? "text-slate-900" : "text-white")}>
              Narration Voice
            </p>
            <p className={cn("mt-1 text-[10px]", isLightMode ? "text-slate-500" : "text-white/40")}>
              Applies to all narration across the museum
            </p>
          </div>

          {/* African Voices — Real system voices */}
          {africanVoices.length > 0 && (
            <div className="px-2 py-2">
              <p className={cn("px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em]", isLightMode ? "text-amber-700" : "text-[#d4af37]")}>
                🌍 African Voices
              </p>
              {africanVoices.map((v) => (
                <VoiceOption
                  key={v.voiceURI}
                  voice={v}
                  selected={v.voiceURI === voiceUri}
                  isLight={isLightMode}
                  featured
                  onSelect={() => { setVoiceUri(v.voiceURI); preview(v); }}
                />
              ))}
            </div>
          )}

          {/* Install guide when no African voices found */}
          {africanVoices.length === 0 && (
            <div className={cn("px-3 py-3 border-b", isLightMode ? "border-slate-100 bg-amber-50/60" : "border-white/6 bg-[#d4af37]/5")}>
              <p className={cn("text-[10px] font-bold uppercase tracking-[0.16em] mb-2", isLightMode ? "text-amber-800" : "text-[#f4c866]")}>
                🌍 Get African Voices
              </p>
              <p className={cn("text-[10px] leading-relaxed mb-2", isLightMode ? "text-amber-700" : "text-white/50")}>
                No African voices detected. To get real African-accented voices:
              </p>
              <div className={cn("space-y-1.5 text-[10px] leading-relaxed", isLightMode ? "text-amber-900/80" : "text-white/60")}>
                <p className="flex gap-1.5">
                  <span className="font-bold shrink-0">1.</span>
                  <span><b>Use Microsoft Edge</b> — it has cloud African voices (Zuri 🇿🇦, Imani 🇹🇿, Chilemba 🇰🇪, Ezinne 🇳🇬) built-in.</span>
                </p>
                <p className="flex gap-1.5">
                  <span className="font-bold shrink-0">2.</span>
                  <span><b>Windows Settings:</b> Settings → Time & Language → Speech → Add voices → search "English (South Africa)" or "English (Nigeria)".</span>
                </p>
                <p className="flex gap-1.5">
                  <span className="font-bold shrink-0">3.</span>
                  <span><b>Windows Settings:</b> Settings → Time & Language → Language & region → Add a language → search "Zulu", "Xhosa", or "Afrikaans" → Install voice pack.</span>
                </p>
              </div>
              <p className={cn("mt-2 text-[9px] italic", isLightMode ? "text-amber-600" : "text-white/30")}>
                After installing, restart your browser and the voices will appear above.
              </p>
            </div>
          )}

          {/* English Voices */}
          {englishVoices.length > 0 && (
            <div className={cn("px-2 py-2 border-t", isLightMode ? "border-slate-100" : "border-white/6")}>
              <p className={cn("px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em]", isLightMode ? "text-slate-500" : "text-white/30")}>
                English Voices
              </p>
              {englishVoices.map((v) => (
                <VoiceOption
                  key={v.voiceURI}
                  voice={v}
                  selected={v.voiceURI === voiceUri}
                  isLight={isLightMode}
                  onSelect={() => { setVoiceUri(v.voiceURI); preview(v); }}
                />
              ))}
            </div>
          )}

          {/* Other Voices */}
          {otherVoices.length > 0 && (
            <div className={cn("px-2 py-2 border-t", isLightMode ? "border-slate-100" : "border-white/6")}>
              <p className={cn("px-2 py-1 text-[9px] font-bold uppercase tracking-[0.2em]", isLightMode ? "text-slate-400" : "text-white/20")}>
                Other Languages
              </p>
              {otherVoices.map((v) => (
                <VoiceOption
                  key={v.voiceURI}
                  voice={v}
                  selected={v.voiceURI === voiceUri}
                  isLight={isLightMode}
                  onSelect={() => { setVoiceUri(v.voiceURI); preview(v); }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VoiceOption({
  voice,
  selected,
  isLight,
  featured,
  onSelect,
}: {
  voice: SpeechSynthesisVoice;
  selected: boolean;
  isLight: boolean;
  featured?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left transition-all",
        selected
          ? isLight
            ? "bg-amber-50 border border-amber-200"
            : "bg-[#d4af37]/10 border border-[#d4af37]/20"
          : isLight
            ? "hover:bg-slate-50 border border-transparent"
            : "hover:bg-white/[0.04] border border-transparent",
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-[12px] font-semibold truncate",
          featured
            ? isLight ? "text-amber-800" : "text-[#f4c866]"
            : isLight ? "text-slate-800" : "text-white/80",
        )}>
          {voice.name}
        </p>
        <p className={cn("text-[10px] truncate", isLight ? "text-slate-400" : "text-white/30")}>
          {voice.lang}
          {voice.localService ? " · Local" : " · Cloud"}
        </p>
      </div>
      {selected && (
        <Check className={cn("h-3.5 w-3.5 flex-shrink-0", isLight ? "text-amber-600" : "text-[#d4af37]")} />
      )}
    </button>
  );
}
