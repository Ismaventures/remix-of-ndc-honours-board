import { useEffect, useState } from "react";
import { Shield, Award, Users, Globe, Star, Settings } from "lucide-react";
import ndcCrest from "/images/ndc-crest.png";
import { useThemeMode } from "@/hooks/useThemeMode";

export type ViewKey =
  | "home"
  | "commandants"
  | "fwc"
  | "fdc"
  | "directing"
  | "allied"
  | "visits"
  | "admin";

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
}[] = [
  {
    key: "commandants",
    label: "Commandants",
    subtitle: "Leadership Chronicle",
    icon: Shield,
    color: "text-amber-600",
    cardGradient: "from-[#2f2508] via-[#3f3210] to-[#524117]",
  },
  {
    key: "fwc",
    label: "Distinguished Fellows (FWC)",
    subtitle: "Fellows of the War College",
    icon: Shield,
    color: "text-blue-600",
    cardGradient: "from-[#0f2c4e] via-[#14365d] to-[#1a4373]",
  },
  {
    key: "fdc",
    label: "Distinguished Fellows (FDC)",
    subtitle: "Fellows of the Defence College",
    icon: Award,
    color: "text-sky-600",
    cardGradient: "from-[#0e2d4a] via-[#133e66] to-[#195080]",
  },
  {
    key: "directing",
    label: "Directing Staff",
    subtitle: "Chronicle of Excellence",
    icon: Users,
    color: "text-indigo-600",
    cardGradient: "from-[#1a365d] via-[#214373] to-[#2a528a]",
  },
  {
    key: "allied",
    label: "Allied Officers",
    subtitle: "International Partnerships",
    icon: Globe,
    color: "text-cyan-600",
    cardGradient: "from-[#112f4f] via-[#19406b] to-[#205285]",
  },
  {
    key: "visits",
    label: "Distinguished Visits",
    subtitle: "Honours & Ceremonies",
    icon: Star,
    color: "text-blue-500",
    cardGradient: "from-[#1d3455] via-[#264570] to-[#30578a]",
  },
  {
    key: "admin",
    label: "Admin Panel",
    subtitle: "Manage Records",
    icon: Settings,
    color: "text-slate-600",
    cardGradient: "from-[#2e3747] via-[#3a445d] to-[#475270]",
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
      <div className="mb-6 flex flex-col items-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif text-foreground tracking-wider uppercase text-center mt-6 sm:mt-8">
          Chronicles of Directing Staff
        </h2>
        <div className="h-1 w-24 bg-border mt-2 mb-2 rounded-full" />
        <p className="text-xs sm:text-sm text-muted-foreground tracking-widest uppercase text-center">
          Select a category to view hierarchy
        </p>
      </div>

      <div
        className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}
      >
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
          {CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.key} className="p-1 h-full">
                <button
                  onClick={() => onSelect(card.key)}
                  className={`relative w-full h-[clamp(220px,36vh,300px)] sm:h-[clamp(240px,34vh,310px)] lg:h-[clamp(260px,33vh,320px)] overflow-hidden rounded-2xl border text-left group transition-all duration-500 hover:-translate-y-2 flex flex-col justify-end ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    isLightMode
                      ? "bg-white border-slate-100 shadow-[0_8px_30px_rgba(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] hover:border-slate-200"
                      : `bg-gradient-to-br ${card.cardGradient} border-white/10 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]`
                  }`}
                >
                  {/* Gloss/Highlight Effect - Dark Mode Only */}
                  {!isLightMode && (
                    <>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-white/5 to-transparent opacity-60 group-hover:opacity-90 transition-opacity duration-700" />
                      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/10 via-white/5 to-transparent opacity-80" />
                    </>
                  )}

                  {/* NDC Logo Background Watermark */}
                  <div
                    className={`absolute -right-16 -top-16 w-72 h-72 transition-all duration-700 pointer-events-none transform group-hover:scale-105 group-hover:rotate-6 ${
                      isLightMode
                        ? "opacity-[0.03] group-hover:opacity-[0.06] filter grayscale"
                        : "opacity-[0.08] group-hover:opacity-[0.14] filter grayscale invert"
                    }`}
                  >
                    <img
                      src={ndcCrest}
                      alt=""
                      className="w-full h-full object-contain"
                    />
                  </div>

                  {/* Background Icon */}
                    <div
                      className={`absolute top-4 right-4 sm:top-5 sm:right-5 transition-colors duration-500 transform group-hover:scale-110 group-hover:-rotate-3 will-change-transform ${
                      isLightMode
                        ? "text-slate-100 group-hover:text-slate-200"
                        : "text-white/15 group-hover:text-white/25"
                    }`}
                  >
                    <Icon
                        className="w-20 h-20 sm:w-28 sm:h-28 lg:w-32 lg:h-32"
                      strokeWidth={1}
                    />
                  </div>

                  <div
                    className={`relative p-4 sm:p-6 z-10 w-full pt-10 sm:pt-14 ${
                      !isLightMode
                        ? "bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div
                        className={`w-14 h-14 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-xl p-2.5 relative overflow-hidden backdrop-blur-sm ${
                          isLightMode
                            ? "bg-white border border-slate-100 shadow-slate-200/50"
                            : "bg-black/25 border border-white/20"
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
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-inner backdrop-blur-sm ${
                          isLightMode
                            ? "bg-slate-50 border border-slate-100"
                            : "bg-white/10 border border-white/20"
                        }`}
                      >
                        <Icon
                          className={`h-5 w-5 ${isLightMode ? card.color : "text-white/95"}`}
                        />
                      </div>
                    </div>
                    <div>
                      <h3
                        className={`text-lg sm:text-xl font-bold font-serif leading-tight mb-1.5 transition-colors tracking-tight ${
                          isLightMode
                            ? "text-slate-900 drop-shadow-none"
                            : "text-white drop-shadow-md"
                        }`}
                      >
                        {card.label}
                      </h3>
                      <p
                        className={`text-[11px] sm:text-xs tracking-widest uppercase font-medium ${
                          isLightMode ? "text-slate-500" : "text-white/75"
                        }`}
                      >
                        {card.subtitle}
                      </p>
                    </div>

                    <div
                      className={`h-[2px] w-full mt-5 overflow-hidden rounded-full ${isLightMode ? "bg-slate-100" : "bg-white/10"}`}
                    >
                      <div
                        className={`h-full w-0 group-hover:w-full transition-all duration-1000 ease-in-out opacity-80 ${
                          isLightMode
                            ? "bg-gradient-to-r from-slate-200 via-slate-400 to-slate-200"
                            : "bg-gradient-to-r from-white/40 via-white/80 to-white/40"
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
    </section>
  );
}
