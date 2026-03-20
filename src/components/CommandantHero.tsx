import { useEffect, useState } from 'react';
import { Shield, Star } from 'lucide-react';
import ndcCrest from '/images/ndc-crest.png';

export function CommandantHero() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative overflow-hidden rounded-lg gold-border gold-glow bg-card mb-8">
      {/* Subtle radar sweep */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-military-green/8 via-transparent to-primary/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-primary/5 animate-radar-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full border border-primary/3 animate-radar-pulse" style={{ animationDelay: '1.5s' }} />
      </div>

      <div className="relative flex flex-col md:flex-row items-center gap-8 p-8 md:p-12">
        {/* Portrait side */}
        <div
          className={`shrink-0 transition-all duration-1000 ease-out ${
            visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
          }`}
        >
          <div className="relative">
            <div className="w-44 h-56 md:w-52 md:h-64 rounded bg-muted gold-border-strong flex items-center justify-center overflow-hidden animate-float">
              <div className="flex flex-col items-center gap-3 text-primary/40">
                <Shield className="h-16 w-16" />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Official Portrait</span>
              </div>
            </div>
            {/* Gold corner accents */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-primary/60 rounded-tl" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-primary/60 rounded-tr" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-primary/60 rounded-bl" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-primary/60 rounded-br" />
          </div>
        </div>

        {/* Details side */}
        <div
          className={`flex-1 text-center md:text-left transition-all duration-1000 ease-out delay-300 ${
            visible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
          }`}
        >
          <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
            <Star className="h-3.5 w-3.5 text-primary animate-pulse-slow" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-medium">
              Current Commandant
            </span>
            <Star className="h-3.5 w-3.5 text-primary animate-pulse-slow" />
          </div>

          <h2 className="text-3xl md:text-4xl font-bold font-serif mb-1 leading-tight">
            Rear Admiral A.A. Ahmad
          </h2>

          {/* Animated gold underline */}
          <div className="relative h-0.5 w-full max-w-xs mx-auto md:mx-0 mb-4 overflow-hidden">
            <div
              className={`absolute inset-y-0 left-0 bg-gradient-to-r from-transparent via-primary to-transparent transition-all duration-1500 ease-out delay-700 ${
                visible ? 'w-full' : 'w-0'
              }`}
            />
          </div>

          <p className="text-base gold-text font-medium mb-2">
            Commandant, National Defence College Nigeria
          </p>

          <p
            className={`text-sm text-muted-foreground leading-relaxed max-w-lg transition-all duration-1000 ease-out delay-500 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            Providing strategic leadership and direction for the premier institution 
            of higher defence and strategic studies in Nigeria, fostering excellence 
            in national security education and inter-service cooperation.
          </p>

          <div
            className={`flex items-center gap-4 mt-5 justify-center md:justify-start transition-all duration-1000 ease-out delay-700 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
          >
            <img src={ndcCrest} alt="NDC Crest" className="h-10 w-10 object-contain opacity-60" />
            <div className="h-8 w-px bg-primary/20" />
            <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Intellect · Courage · Patriotism
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
