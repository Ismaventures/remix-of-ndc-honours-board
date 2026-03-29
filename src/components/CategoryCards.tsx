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
  accentGlow: string;
}[] = [
  {
    key: "commandants",
    label: "Commandants",
    subtitle: "Leadership Chronicle",
    icon: Shield,
    color: "text-amber-600",
    cardGradient: "from-[#2f2508] via-[#3f3210] to-[#524117]",
    accentGlow: "shadow-[0_0_0_1px_rgba(255,215,0,0.34),0_20px_46px_rgba(0,0,0,0.2)]",
  },
  {
    key: "fwc",
    label: "Distinguished Fellows (FWC)",
    subtitle: "Fellows of the War College",
    icon: Shield,
    color: "text-blue-600",
    cardGradient: "from-[#0f2c4e] via-[#14365d] to-[#1a4373]",
    accentGlow: "shadow-[0_0_0_1px_rgba(0,32,96,0.2),0_18px_42px_rgba(3,44,88,0.18)]",
  },
  {
    key: "fdc",
    label: "Distinguished Fellows (FDC)",
    subtitle: "Fellows of the Defence College",
    icon: Award,
    color: "text-sky-600",
    cardGradient: "from-[#0e2d4a] via-[#133e66] to-[#195080]",
    accentGlow: "shadow-[0_0_0_1px_rgba(0,176,240,0.2),0_18px_42px_rgba(0,83,120,0.2)]",
  },
  {
    key: "directing",
    label: "Directing Staff",
    subtitle: "Chronicle of Excellence",
    icon: Users,
    color: "text-indigo-600",
    cardGradient: "from-[#1a365d] via-[#214373] to-[#2a528a]",
    accentGlow: "shadow-[0_0_0_1px_rgba(0,32,96,0.2),0_18px_42px_rgba(33,67,115,0.18)]",
  },
  {
    key: "allied",
    label: "Allied Officers",
    subtitle: "International Partnerships",
    icon: Globe,
    color: "text-cyan-600",
    cardGradient: "from-[#112f4f] via-[#19406b] to-[#205285]",
    accentGlow: "shadow-[0_0_0_1px_rgba(0,176,240,0.2),0_18px_42px_rgba(19,64,107,0.2)]",
  },
  {
    key: "visits",
    label: "Distinguished Visits",
    subtitle: "Honours & Ceremonies",
    icon: Star,
    color: "text-blue-500",
    cardGradient: "from-[#1d3455] via-[#264570] to-[#30578a]",
    accentGlow: "shadow-[0_0_0_1px_rgba(0,32,96,0.2),0_18px_42px_rgba(38,69,112,0.2)]",
  },
  {
    key: "admin",
    label: "Admin Panel",
    subtitle: "Manage Records",
    icon: Settings,
    color: "text-slate-600",
    cardGradient: "from-[#2e3747] via-[#3a445d] to-[#475270]",
    accentGlow: "shadow-[0_0_0_1px_rgba(71,82,112,0.24),0_18px_42px_rgba(24,35,53,0.2)]",
  },
];

type CrestParticle = {
  id: number;
  left: number;
  top: number;
  size: number;
  rotate: number;
  transitionSec: number;
};

const randomInRange = (min: number, max: number) =>
  min + Math.random() * (max - min);

const createParticle = (id: number): CrestParticle => ({
  id,
  left: randomInRange(4, 96),
  top: randomInRange(6, 94),
  size: randomInRange(48, 128),
  rotate: randomInRange(-25, 25),
  transitionSec: randomInRange(5.5, 10.5),
});

export function CategoryCards({ onSelect }: CategoryCardsProps) {
  const [mounted, setMounted] = useState(false);
  const { themeMode } = useThemeMode();
  const isLightMode = themeMode.startsWith("outdoor");
  const [scatteredCrests, setScatteredCrests] = useState<CrestParticle[]>(() =>
    Array.from({ length: 16 }, (_, i) => createParticle(i)),
  );

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setScatteredCrests((current) =>
        current.map((crest) => ({
          ...crest,
          left: randomInRange(2, 98),
          top: randomInRange(4, 96),
          size: randomInRange(50, 132),
          rotate: randomInRange(-32, 32),
          transitionSec: randomInRange(6, 11),
        })),
      );
    }, 5200);

    return () => clearInterval(interval);
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
        <div className="relative w-full max-w-6xl mx-auto rounded-[28px] border border-[#002060]/15 bg-[linear-gradient(165deg,#ffffff_0%,#f6f9ff_52%,#eff6ff_100%)] px-3 py-4 sm:px-4 sm:py-5 md:px-5 md:py-6 overflow-hidden shadow-[0_18px_48px_rgba(0,32,96,0.12)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[linear-gradient(90deg,rgba(0,32,96,0.08)_1px,transparent_1px),linear-gradient(rgba(0,32,96,0.08)_1px,transparent_1px)] bg-[size:36px_36px]" />
          <img
            src={ndcCrest}
            alt=""
            className="pointer-events-none absolute -left-20 top-8 h-56 w-56 object-contain opacity-[0.06]"
          />
          <img
            src={ndcCrest}
            alt=""
            className="pointer-events-none absolute -right-20 bottom-6 h-56 w-56 object-contain opacity-[0.06]"
          />

          <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
            {scatteredCrests.map((crest) => (
              <img
                key={crest.id}
                src={ndcCrest}
                alt=""
                className={`absolute object-contain ${isLightMode ? "opacity-[0.05]" : "opacity-[0.08] invert"}`}
                style={{
                  width: `${crest.size}px`,
                  height: `${crest.size}px`,
                  left: `${crest.left}%`,
                  top: `${crest.top}%`,
                  transform: `translate(-50%, -50%) rotate(${crest.rotate}deg)`,
                  transition: `left ${crest.transitionSec}s ease-in-out, top ${crest.transitionSec}s ease-in-out, transform ${crest.transitionSec}s ease-in-out, width ${crest.transitionSec}s ease-in-out, height ${crest.transitionSec}s ease-in-out`,
                }}
              />
            ))}
          </div>

          <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-5">
            {CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className="p-1 h-full">
                  <button
                    onClick={() => onSelect(card.key)}
                    className={`relative w-full h-[clamp(220px,36vh,300px)] sm:h-[clamp(240px,34vh,310px)] lg:h-[clamp(260px,33vh,320px)] overflow-hidden rounded-2xl border text-left group transition-all duration-500 hover:-translate-y-2 flex flex-col justify-end ring-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${card.accentGlow} ${
                      isLightMode
                        ? "bg-[linear-gradient(160deg,#ffffff_0%,#f7faff_52%,#eef5ff_100%)] border-[#002060]/12 hover:shadow-[0_22px_44px_rgba(0,32,96,0.16)] hover:border-[#002060]/30"
                        : `bg-gradient-to-br ${card.cardGradient} border-white/10 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)]`
                    }`}
                  >
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-[7px] flex z-20">
                      <div className="flex-1 bg-[#002060]" />
                      <div className="flex-1 bg-[#FF0000]" />
                      <div className="flex-1 bg-[#00B0F0]" />
                    </div>
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[6px] flex z-20 opacity-90">
                      <div className="flex-1 bg-[#002060]" />
                      <div className="flex-1 bg-[#FF0000]" />
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
                    className={`absolute -right-16 -top-16 w-72 h-72 transition-all duration-700 pointer-events-none transform group-hover:scale-105 group-hover:rotate-6 ${
                      isLightMode
                        ? "opacity-[0.055] group-hover:opacity-[0.09] filter grayscale"
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
      </div>

    </section>
  );
}
