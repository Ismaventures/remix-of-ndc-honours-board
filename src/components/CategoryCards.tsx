import { useEffect, useState } from "react";
import { Shield, Award, Users, Globe, Star, Settings } from "lucide-react";
import ndcCrest from "/images/ndc-crest.png";

export type ViewKey =
  | "home"
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
  cardGradient: string;
  panelGradient: string;
  glossGradient: string;
  hoverGlow: string;
  edgeTone: string;
}[] = [
  {
    key: "fwc",
    label: "Distinguished Fellows (FWC)",
    subtitle: "Fellows of the War College",
    icon: Shield,
    cardGradient: "from-[#0c2547] via-[#12335d] to-[#163f71]",
    panelGradient: "from-[#081b35]/96 via-[#0b2548]/90 to-transparent",
    glossGradient: "from-white/18 via-white/6 to-transparent",
    hoverGlow: "hover:shadow-[0_18px_45px_rgba(33,84,145,0.45)]",
    edgeTone: "border-[#355f93]/65",
  },
  {
    key: "fdc",
    label: "Distinguished Fellows (FDC)",
    subtitle: "Fellows of the Defence College",
    icon: Award,
    cardGradient: "from-[#0c2742] via-[#123a60] to-[#1a4a75]",
    panelGradient: "from-[#071c33]/96 via-[#0a2844]/90 to-transparent",
    glossGradient: "from-white/16 via-white/6 to-transparent",
    hoverGlow: "hover:shadow-[0_18px_45px_rgba(31,96,152,0.43)]",
    edgeTone: "border-[#3a678f]/65",
  },
  {
    key: "directing",
    label: "Directing Staff",
    subtitle: "Chronicle of Excellence",
    icon: Users,
    cardGradient: "from-[#17315a] via-[#1d3d68] to-[#234b77]",
    panelGradient: "from-[#0c203d]/96 via-[#112d50]/90 to-transparent",
    glossGradient: "from-white/18 via-white/7 to-transparent",
    hoverGlow: "hover:shadow-[0_18px_45px_rgba(52,108,168,0.4)]",
    edgeTone: "border-[#416f9d]/65",
  },
  {
    key: "allied",
    label: "Allied Officers",
    subtitle: "International Partnerships",
    icon: Globe,
    cardGradient: "from-[#0f2b4b] via-[#174069] to-[#1d4f7c]",
    panelGradient: "from-[#0a2038]/96 via-[#0f2c4e]/90 to-transparent",
    glossGradient: "from-white/17 via-white/6 to-transparent",
    hoverGlow: "hover:shadow-[0_18px_45px_rgba(35,101,161,0.4)]",
    edgeTone: "border-[#3d6d9a]/65",
  },
  {
    key: "visits",
    label: "Distinguished Visits",
    subtitle: "Honours & Ceremonies",
    icon: Star,
    cardGradient: "from-[#1a3050] via-[#24416a] to-[#2d5080]",
    panelGradient: "from-[#0e233f]/96 via-[#163255]/90 to-transparent",
    glossGradient: "from-white/16 via-white/6 to-transparent",
    hoverGlow: "hover:shadow-[0_18px_45px_rgba(69,115,175,0.38)]",
    edgeTone: "border-[#4e739f]/65",
  },
  {
    key: "admin",
    label: "Admin Panel",
    subtitle: "Manage Records",
    icon: Settings,
    cardGradient: "from-[#2d3444] via-[#37405a] to-[#424d69]",
    panelGradient: "from-[#1f2737]/96 via-[#29334a]/90 to-transparent",
    glossGradient: "from-white/14 via-white/5 to-transparent",
    hoverGlow: "hover:shadow-[0_18px_45px_rgba(92,111,148,0.35)]",
    edgeTone: "border-[#617294]/60",
  },
];

export function CategoryCards({ onSelect }: CategoryCardsProps) {
  const [mounted, setMounted] = useState(false);

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
                  className={`relative w-full h-[240px] sm:h-[280px] lg:h-[300px] overflow-hidden rounded-xl bg-gradient-to-br ${card.cardGradient} ${card.edgeTone} border text-left group transition-all duration-500 hover:-translate-y-1.5 ${card.hoverGlow} flex flex-col justify-end`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${card.glossGradient} opacity-70 group-hover:opacity-100 transition-opacity duration-500`}
                  />

                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/12 via-white/[0.04] to-transparent opacity-90" />

                  {/* NDC Logo Background Watermark */}
                  <div className="absolute right-[-20%] top-[-10%] w-64 h-64 opacity-[0.06] group-hover:opacity-12 transition-all duration-700 pointer-events-none transform group-hover:scale-110 group-hover:rotate-3">
                    <img
                      src={ndcCrest}
                      alt=""
                      className="w-full h-full object-contain filter grayscale invert"
                    />
                  </div>

                  <div className="absolute top-4 right-4 text-white/12 group-hover:text-white/18 transition-colors duration-500">
                    <Icon className="w-24 h-24 sm:w-32 sm:h-32" />
                  </div>

                  <div
                    className={`relative p-4 sm:p-6 z-10 w-full bg-gradient-to-t ${card.panelGradient} pt-10 sm:pt-12`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-14 h-14 rounded-full bg-[#0a1f3c]/85 border border-white/25 flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-lg p-2 relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/8"></div>
                        <img
                          src={ndcCrest}
                          alt="NDC Crest"
                          className="w-full h-full object-contain relative z-10 drop-shadow-md"
                        />
                      </div>
                      <div className="w-10 h-10 rounded-full bg-black/20 border border-white/25 flex items-center justify-center shrink-0 shadow-inner backdrop-blur-sm">
                        <Icon className="h-5 w-5 text-white/90" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg sm:text-xl font-bold font-serif leading-snug text-white mb-1 transition-colors drop-shadow-sm">
                        {card.label}
                      </h3>
                      <p className="text-xs text-white/70 tracking-widest uppercase">
                        {card.subtitle}
                      </p>
                    </div>

                    <div className="h-0.5 w-full bg-white/20 mt-4 overflow-hidden rounded-full">
                      <div className="h-full bg-white/75 w-0 group-hover:w-full transition-all duration-700 ease-out" />
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
