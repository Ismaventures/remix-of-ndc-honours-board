import { useEffect, useState } from "react";
import { Shield, Award, Users, Globe, Star, Settings } from "lucide-react";
import { Category } from "@/types/domain";
import ndcCrest from "/images/ndc-crest.png";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

export type ViewKey = "home" | "fwc" | "fdc" | "directing" | "allied" | "visits" | "admin";

interface CategoryCardsProps {
  onSelect: (key: ViewKey) => void;
}

const CARDS: {
  key: ViewKey;
  label: string;
  subtitle: string;
  icon: React.ElementType;
  accentClass: string;
}[] = [
  {
    key: "fwc",
    label: "Distinguished Fellows (FWC)",
    subtitle: "Fellows of the War College",
    icon: Shield,
    accentClass: "from-primary/20 to-transparent",
  },
  {
    key: "fdc",
    label: "Distinguished Fellows (FDC)",
    subtitle: "Fellows of the Defence College",
    icon: Award,
    accentClass: "from-secondary/20 to-transparent",
  },
  {
    key: "directing",
    label: "Directing Staff",
    subtitle: "Chronicle of Excellence",
    icon: Users,
    accentClass: "from-primary/15 to-secondary/15",
  },
  {
    key: "allied",
    label: "Allied Officers",
    subtitle: "International Partnerships",
    icon: Globe,
    accentClass: "from-secondary/20 to-transparent",
  },
  {
    key: "visits",
    label: "Distinguished Visits",
    subtitle: "Honours & Ceremonies",
    icon: Star,
    accentClass: "from-primary/12 to-secondary/8",
  },
  {
    key: "admin",
    label: "Admin Panel",
    subtitle: "Manage Records",
    icon: Settings,
    accentClass: "from-muted/40 to-transparent",
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
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold font-serif gold-text tracking-wider uppercase text-center mt-6 sm:mt-8">Chronicles of Staff</h2>
        <div className="h-1 w-24 bg-primary mt-2 mb-2 rounded-full" />
        <p className="text-xs sm:text-sm text-muted-foreground tracking-widest uppercase text-center">Select a category to view hierarchy</p>
      </div>

      <div className={`transition-all duration-1000 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10"}`}>
        <Carousel
          opts={{
            align: "start",
            loop: true,
          }}
          className="w-full max-w-6xl mx-auto"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {CARDS.map((card, i) => {
              const Icon = card.icon;
              return (
                <CarouselItem key={card.key} className="pl-2 md:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                  <div className="p-1 h-full">
                    <button
                      onClick={() => onSelect(card.key)}
                      className="relative w-full h-[240px] sm:h-[280px] lg:h-[300px] overflow-hidden premium-card-border shimmer-effect rounded-xl bg-card text-left group transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(200,169,81,0.2)] flex flex-col justify-end"
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br ${card.accentClass} opacity-80 group-hover:opacity-100 transition-opacity duration-500 mix-blend-overlay`} />
                      
                      {/* NDC Logo Background Watermark */}
                      <div className="absolute right-[-20%] top-[-10%] w-64 h-64 opacity-[0.03] group-hover:opacity-10 transition-all duration-700 pointer-events-none transform group-hover:scale-110 group-hover:rotate-3">
                        <img src={ndcCrest} alt="" className="w-full h-full object-contain filter grayscale invert" />
                      </div>

                      <div className="absolute top-4 right-4 text-primary/10 group-hover:text-primary/20 transition-colors duration-500">
                        <Icon className="w-24 h-24 sm:w-32 sm:h-32" />
                      </div>

                      <div className="relative p-4 sm:p-6 z-10 w-full bg-gradient-to-t from-background via-background/95 to-transparent pt-10 sm:pt-12">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-14 h-14 rounded-full bg-navy gold-border flex items-center justify-center group-hover:scale-110 transition-transform duration-500 shadow-lg p-2 relative overflow-hidden">
                            <div className="absolute inset-0 bg-primary/10 animate-pulse-slow"></div>
                            <img src={ndcCrest} alt="NDC Crest" className="w-full h-full object-contain relative z-10 drop-shadow-md" />
                          </div>
                          <div className="w-10 h-10 rounded-full bg-muted/40 border border-primary/20 flex items-center justify-center shrink-0 shadow-inner">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-lg sm:text-xl font-bold font-serif leading-snug text-foreground mb-1 group-hover:text-primary transition-colors drop-shadow-sm">{card.label}</h3>
                          <p className="text-xs text-muted-foreground tracking-widest uppercase">{card.subtitle}</p>
                        </div>

                        <div className="h-0.5 w-full bg-primary/20 mt-4 overflow-hidden rounded-full">
                          <div className="h-full bg-primary w-0 group-hover:w-full transition-all duration-700 ease-out" />
                        </div>
                      </div>
                    </button>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
          <div className="hidden md:flex justify-center mt-6 gap-4 relative w-full h-8">
            <CarouselPrevious className="static translate-y-0 gold-border bg-background hover:bg-muted text-primary border-2" />
            <CarouselNext className="static translate-y-0 gold-border bg-background hover:bg-muted text-primary border-2" />
          </div>
        </Carousel>
      </div>
    </section>
  );
}
