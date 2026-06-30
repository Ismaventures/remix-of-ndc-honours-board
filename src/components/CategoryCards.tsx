import { useEffect, useState } from "react";
import { Shield, Award, Users, Globe, Star, Settings } from "lucide-react";
import ndcCrest from "/images/ndc-crest.png";
import { useThemeMode } from "@/hooks/useThemeMode";

export type ViewKey =
  | "home"
  | "commandants"
  | "fwc"
  | "fdc"
  | "participants"
  | "allied"
  | "visits"
  | "directing"
  | "admin"
  | "about-ndc"
  | "museum-collections"
  | "guided-tours"
  | "hall-of-fame"
  | "artifact-gallery"
  | "combined";

interface CategoryCardsProps {
  onSelect: (key: ViewKey) => void;
}

const CARDS: {
  key: ViewKey;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  cardGradient: string;
  accentGlow: string;
}[] = [
  {
    key: "fwc",
    label: "DISTINGUISHED FELLOWS OF WAR COLLEGE (fwc+)",
    subtitle: "",
    icon: Shield,
    color: "text-blue-600",
    cardGradient: "from-[#0f2c4e] via-[#14365d] to-[#1a4373]",
    accentGlow: "shadow-[0_0_0_1px_rgba(0,32,96,0.2),0_18px_42px_rgba(3,44,88,0.18)]",
  },
  {
    key: "fdc",
    label: "DISTINGUISHED FELLOWS OF DEFENCE COLLEGE (fdc+)",
    subtitle: "",
    icon: Award,
    color: "text-sky-600",
    cardGradient: "from-[#0e2d4a] via-[#133e66] to-[#195080]",
    accentGlow: "shadow-[0_0_0_1px_rgba(0,176,240,0.2),0_18px_42px_rgba(0,83,120,0.2)]",
  },
  {
    key: "allied",
    label: "ALLIED OFFICERS",
    subtitle: "INTERNATIONAL PARTNERSHIPS",
    icon: Globe,
    color: "text-cyan-600",
    cardGradient: "from-[#112f4f] via-[#19406b] to-[#205285]",
    accentGlow: "shadow-[0_0_0_1px_rgba(0,176,240,0.2),0_18px_42px_rgba(19,64,107,0.2)]",
  },
];

export function CategoryCards({ onSelect }: CategoryCardsProps) {
  const [mounted, setMounted] = useState(false);
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);



  return (
    <section className="mb-8 sm:mb-10">

      <div
        className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      >
        <div className="relative w-full max-w-6xl mx-auto px-4 py-5 sm:px-5 sm:py-6 md:px-6 md:py-7">
          <div className="relative z-10 flex flex-col md:flex-row flex-wrap justify-center items-center md:items-stretch gap-4 md:gap-6 stagger-reveal w-full">
            {CARDS.map((card) => {
              return (
                <div key={card.key} className="p-2 w-full md:flex-1 max-w-[360px] h-full">
                  <button
                    onClick={() => onSelect(card.key)}
                    className={`relative w-full h-[clamp(230px,36vh,310px)] sm:h-[clamp(250px,34vh,320px)] lg:h-[clamp(270px,33vh,330px)] overflow-hidden rounded-2xl border text-center group transition-all duration-500 hover:-translate-y-2.5 hover:scale-[1.012] flex flex-col items-center justify-center p-6 sm:p-8 ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${card.accentGlow} ${
                      isLightMode
                        ? "bg-[linear-gradient(160deg,#ffffff_0%,#f7faff_52%,#eef5ff_100%)] border-[#002060]/10 hover:shadow-[0_22px_48px_rgba(0,32,96,0.14)] hover:border-[#002060]/25"
                        : `bg-gradient-to-br ${card.cardGradient} border-white/10 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]`
                    }`}
                  >
                    {/* Top tri-service accent — refined thin line */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[5px] flex z-20">
                      <div className="flex-1 bg-[#002060]" />
                      <div className="flex-1 bg-[#C0392B]" />
                      <div className="flex-1 bg-[#00B0F0]" />
                    </div>
                    {/* Bottom tri-service accent */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[4px] flex z-20 opacity-80">
                      <div className="flex-1 bg-[#002060]" />
                      <div className="flex-1 bg-[#C0392B]" />
                      <div className="flex-1 bg-[#00B0F0]" />
                    </div>

                    {/* Gloss/Highlight Effect - Dark Mode Only */}
                    {!isLightMode && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-700" />
                        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 via-white/5 to-transparent opacity-80" />
                      </>
                    )}

                    {/* NDC Logo Background Watermark */}
                    <div
                      className={`absolute inset-0 m-auto w-56 h-56 transition-all duration-700 pointer-events-none transform group-hover:scale-105 group-hover:rotate-6 ${
                        isLightMode
                          ? "opacity-[0.035] group-hover:opacity-[0.06] filter grayscale"
                          : "opacity-[0.05] group-hover:opacity-[0.09] filter grayscale invert"
                      }`}
                    >
                      <img
                        src={ndcCrest}
                        alt=""
                        className="w-full h-full object-contain"
                      />
                    </div>

                    {/* Larger Centered NDC Crest Logo */}
                    <div className="relative z-10 flex flex-col items-center justify-center">
                      <div
                        className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl flex items-center justify-center group-hover:scale-105 transition-all duration-500 shadow-xl p-4 mb-6 relative overflow-hidden ${
                          isLightMode
                            ? "bg-white border border-slate-200/80 shadow-slate-200/50"
                            : "bg-black/30 border border-white/15 backdrop-blur-sm shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
                        }`}
                      >
                        {!isLightMode && (
                          <div className="absolute inset-0 bg-white/5"></div>
                        )}
                        <img
                          src={ndcCrest}
                          alt="NDC Crest"
                          className="w-full h-full object-contain relative z-10 drop-shadow-md"
                        />
                      </div>

                      {/* Upper Case Text Group */}
                      <div className="flex flex-col items-center">
                        <h3
                          className={`text-base sm:text-lg lg:text-xl leading-tight mb-2 tracking-wide text-center ${
                            isLightMode
                              ? "text-[#0f2a5f]"
                              : "text-white drop-shadow-md"
                          }`}
                          style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 700 }}
                        >
                          {card.label}
                        </h3>
                        {card.subtitle && (
                          <p
                            className={`text-[10px] sm:text-xs tracking-[0.15em] text-center ${
                              isLightMode ? "text-slate-400" : "text-white/60"
                            }`}
                            style={{ fontFamily: "'Manrope', sans-serif", fontWeight: 600, textTransform: 'uppercase' as const }}
                          >
                            {card.subtitle}
                          </p>
                        )}
                      </div>

                      {/* Hover reveal accent line */}
                      <div
                        className={`h-[2px] w-32 mt-6 overflow-hidden rounded-full ${isLightMode ? "bg-[#002060]/[0.06]" : "bg-white/[0.08]"}`}
                      >
                        <div
                          className={`h-full w-0 group-hover:w-full transition-all duration-[1200ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                            isLightMode
                              ? "bg-gradient-to-r from-transparent via-[#002060]/30 to-transparent"
                              : "bg-gradient-to-r from-transparent via-white/60 to-transparent"
                          }`}
                        />
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
