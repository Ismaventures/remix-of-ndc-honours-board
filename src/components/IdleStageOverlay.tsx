import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import ndcCrest from '/images/ndc-crest.png';
import type { IdleStageSettings } from '@/hooks/useIdleStageSettings';
import type { Commandant } from '@/types/domain';
import { useResolvedMediaUrl } from '@/hooks/useResolvedMediaUrl';
import { getCommandantDisplayTitle } from '@/lib/utils';

interface IdleStageOverlayProps {
  settings: IdleStageSettings;
  commandants?: Commandant[];
  onExit: () => void;
}

const BRANCH_LOGOS = [
  { id: 'navy', src: '/images/Badge_of_the_Nigerian_Navy.svg', name: 'Nigerian Navy', zoom: 1 },
  { id: 'army', src: '/images/Emblem_of_the_Nigerian_Army.svg', name: 'Nigerian Army', zoom: 1 },
  { id: 'airforce', src: '/Nigerian_Air_Force_emblem.svg.png', name: 'Nigerian Air Force', zoom: 1 },
  { id: 'dhq', src: '/dhq logo.jpg', name: 'Defence Headquarters', zoom: 1 },
];

type ServiceBranch = 'navy' | 'army' | 'airforce' | 'dhq';

const BRANCH_THEME: Record<
  ServiceBranch,
  { logo: string; badge: string; glow: string }
> = {
  navy: {
    logo: '/images/Badge_of_the_Nigerian_Navy.svg',
    badge: 'Nigerian Navy',
    glow: 'from-[#0b2e75]/70 via-[#0ea5e9]/30 to-transparent',
  },
  army: {
    logo: '/images/Emblem_of_the_Nigerian_Army.svg',
    badge: 'Nigerian Army',
    glow: 'from-[#8b1b1b]/65 via-[#f59e0b]/22 to-transparent',
  },
  airforce: {
    logo: '/Nigerian_Air_Force_emblem.svg.png',
    badge: 'Nigerian Air Force',
    glow: 'from-[#0e3a8a]/65 via-[#38bdf8]/28 to-transparent',
  },
  dhq: {
    logo: '/dhq logo.jpg',
    badge: 'Defence Headquarters',
    glow: 'from-[#0f172a]/70 via-[#d4af37]/22 to-transparent',
  },
};

function inferCommandantBranch(commandant: Commandant): ServiceBranch {
  const text = `${commandant.name} ${commandant.rank ?? ''} ${commandant.title ?? ''} ${commandant.description ?? ''}`.toLowerCase();

  if (
    text.includes('air force') ||
    text.includes('air marshal') ||
    text.includes('air vice marshal') ||
    text.includes('group captain') ||
    text.includes('wing commander')
  ) {
    return 'airforce';
  }

  if (
    text.includes('navy') ||
    text.includes('naval') ||
    text.includes('admiral') ||
    text.includes('commodore')
  ) {
    return 'navy';
  }

  if (
    text.includes('army') ||
    text.includes('brigadier') ||
    text.includes('major general') ||
    text.includes('lieutenant general') ||
    text.includes('lt gen') ||
    text.includes('colonel')
  ) {
    return 'army';
  }

  return 'dhq';
}

function IdleCommandantShowcase({ commandant }: { commandant: Commandant }) {
  const imageUrl = useResolvedMediaUrl(commandant.imageUrl);
  const branch = inferCommandantBranch(commandant);
  const branchTheme = BRANCH_THEME[branch];
  const tenureLabel = `${commandant.tenureStart}${commandant.tenureEnd ? ` - ${commandant.tenureEnd}` : ' - Present'}`;
  const title = getCommandantDisplayTitle(commandant, 'Commandant');

  return (
    <motion.div
      className="absolute inset-0 z-20 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.1, ease: 'easeInOut' }}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${branchTheme.glow}`} />

      <motion.img
        src={branchTheme.logo}
        alt={branchTheme.badge}
        className="absolute left-[-8vw] top-1/2 h-[72vh] w-[72vh] max-h-[760px] max-w-[760px] -translate-y-1/2 object-contain opacity-[0.14] blur-[1px]"
        animate={{ rotate: [0, 6, 0], scale: [1, 1.04, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.img
        src={branchTheme.logo}
        alt={branchTheme.badge}
        className="absolute right-[-10vw] top-1/2 h-[66vh] w-[66vh] max-h-[700px] max-w-[700px] -translate-y-1/2 object-contain opacity-[0.1] blur-[1px]"
        animate={{ rotate: [0, -7, 0], scale: [1, 1.03, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
      />

      <div className="absolute inset-x-4 bottom-16 md:inset-x-8 md:bottom-14">
        <div className="mx-auto max-w-4xl rounded-2xl border border-[#f0d27844] bg-[#020817cc] px-4 py-3 backdrop-blur-xl shadow-[0_20px_70px_rgba(2,8,23,0.6)] md:px-6 md:py-4">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="h-16 w-12 overflow-hidden rounded-md border border-white/20 bg-slate-900/80 md:h-20 md:w-14">
              {imageUrl ? (
                <img src={imageUrl} alt={commandant.name} className="h-full w-full object-cover object-top" />
              ) : (
                <div className="h-full w-full bg-slate-800/90" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#f4d36a] md:text-[11px]">
                Commandant Archive Showcase - {branchTheme.badge}
              </p>
              <h3 className="mt-1 truncate text-sm font-bold text-white md:text-lg">{commandant.name}</h3>
              <p className="truncate text-[11px] font-semibold italic text-[#ffb4a8] md:text-sm">{title}</p>
            </div>

            <div className="shrink-0 rounded-md border border-white/20 bg-white/5 px-3 py-1.5 text-right">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/70 md:text-[11px]">Tenure</p>
              <p className="text-[11px] font-semibold text-white md:text-sm">{tenureLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

const DESIGN_CLASS_MAP = {
  'orbital-command': {
    shell: 'bg-[#010813]',
    aura: 'bg-[radial-gradient(circle_at_20%_18%,rgba(0,80,175,0.32),transparent_42%),radial-gradient(circle_at_80%_75%,rgba(212,175,55,0.16),transparent_48%),radial-gradient(circle_at_center,rgba(1,20,45,0.92),rgba(1,8,19,1)_74%)]',
    gridOpacity: 'opacity-[0.2]',
    labelTone: 'text-[#FFD66B]',
    ringTone: 'border-[#9eb4ff33]',
    innerRingTone: 'border-[#fbd87933]',
    nodeTone: 'border-[#ffd866] shadow-[0_0_24px_rgba(255,216,102,0.34)]',
    orbitDurationSec: 65,
    counterOrbitDurationSec: 65,
    watermarkOpacity: 'opacity-[0.08]',
  },
  'flag-parade': {
    shell: 'bg-[#090a14]',
    aura: 'bg-[radial-gradient(circle_at_18%_25%,rgba(232,30,30,0.24),transparent_40%),radial-gradient(circle_at_82%_18%,rgba(4,52,122,0.35),transparent_44%),linear-gradient(120deg,rgba(5,10,35,0.95)_5%,rgba(22,6,14,0.9)_48%,rgba(3,20,60,0.95)_95%)]',
    gridOpacity: 'opacity-[0.14]',
    labelTone: 'text-[#FFE07A]',
    ringTone: 'border-[#f8717138]',
    innerRingTone: 'border-[#fde68a40]',
    nodeTone: 'border-[#ffe07a] shadow-[0_0_26px_rgba(248,113,113,0.3)]',
    orbitDurationSec: 52,
    counterOrbitDurationSec: 52,
    watermarkOpacity: 'opacity-[0.06]',
  },
  'radar-grid': {
    shell: 'bg-[#010b12]',
    aura: 'bg-[radial-gradient(circle_at_center,rgba(0,180,170,0.2),rgba(0,10,18,0.95)_58%),radial-gradient(circle_at_18%_22%,rgba(20,130,220,0.16),transparent_46%),radial-gradient(circle_at_82%_68%,rgba(0,205,120,0.15),transparent_46%)]',
    gridOpacity: 'opacity-[0.24]',
    labelTone: 'text-[#79E8D3]',
    ringTone: 'border-[#2dd4bf3d]',
    innerRingTone: 'border-[#38bdf83f]',
    nodeTone: 'border-[#5eead4] shadow-[0_0_26px_rgba(45,212,191,0.28)]',
    orbitDurationSec: 74,
    counterOrbitDurationSec: 74,
    watermarkOpacity: 'opacity-[0.05]',
  },
  'preboot-sequence': {
    shell: 'bg-[#010813]',
    aura: 'bg-[radial-gradient(circle_at_center,#001533_0%,#010612_70%,#000000_100%)]',
    gridOpacity: 'opacity-[0.1]',
    labelTone: 'text-[#8ab4f8]',
    ringTone: 'border-transparent',
    innerRingTone: 'border-transparent',
    nodeTone: 'border-transparent',
    orbitDurationSec: 999,
    counterOrbitDurationSec: 999,
    watermarkOpacity: 'opacity-0',
  },
  'holographic-display': {
    shell: 'bg-[#020617]',
    aura: 'bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.15),rgba(2,6,23,0.95)_60%),linear-gradient(rgba(30,58,138,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(30,58,138,0.1)_1px,transparent_1px)]',
    gridOpacity: 'opacity-[0.3]',
    labelTone: 'text-[#38bdf8]',
    ringTone: 'border-[#38bdf833]',
    innerRingTone: 'border-[#818cf840]',
    nodeTone: 'border-[#38bdf8] shadow-[0_0_20px_rgba(56,189,248,0.5)]',
    orbitDurationSec: 40,
    counterOrbitDurationSec: 40,
    watermarkOpacity: 'opacity-[0.04]',
  },
  'commandant-honour-wall': {
    shell: 'bg-[#030712]',
    aura: 'bg-[radial-gradient(circle_at_20%_15%,rgba(15,40,95,0.42),transparent_42%),radial-gradient(circle_at_82%_72%,rgba(212,175,55,0.22),transparent_46%),radial-gradient(circle_at_center,rgba(2,18,48,0.94),rgba(2,6,16,1)_72%)]',
    gridOpacity: 'opacity-[0.18]',
    labelTone: 'text-[#f0d278]',
    ringTone: 'border-[#c7d2fe33]',
    innerRingTone: 'border-[#f0d27842]',
    nodeTone: 'border-[#f5d575] shadow-[0_0_28px_rgba(245,213,117,0.3)]',
    orbitDurationSec: 58,
    counterOrbitDurationSec: 58,
    watermarkOpacity: 'opacity-[0.07]',
  },
} as const;

export function IdleStageOverlay({ settings, commandants = [], onExit }: IdleStageOverlayProps) {
  const design = DESIGN_CLASS_MAP[settings.design] ?? DESIGN_CLASS_MAP['orbital-command'];
  const [activeCycleIndex, setActiveCycleIndex] = useState(0);

  const commandantCycle = useMemo(() => {
    const past = commandants.filter((entry) => !entry.isCurrent);
    const source = past.length > 0 ? past : commandants;
    return [...source].sort((a, b) => b.tenureStart - a.tenureStart);
  }, [commandants]);

  const activeCommandant = commandantCycle.length
    ? commandantCycle[activeCycleIndex % commandantCycle.length]
    : null;

  useEffect(() => {
    if (settings.design === 'preboot-sequence') {
      const interval = setInterval(() => {
        setActiveCycleIndex((prev) => (prev + 1) % (BRANCH_LOGOS.length + 1));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [settings.design]);

  useEffect(() => {
    if (settings.design === 'preboot-sequence') return;
    if (commandantCycle.length <= 1) return;

    const interval = setInterval(() => {
      setActiveCycleIndex((prev) => (prev + 1) % commandantCycle.length);
    }, 6800);

    return () => clearInterval(interval);
  }, [settings.design, commandantCycle.length]);

  const cycleLogos = [...BRANCH_LOGOS, { id: 'ndc', src: ndcCrest, name: 'National Defence College' }];
  const currentPrebootLogo = cycleLogos[activeCycleIndex].src;
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onExit}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          onExit();
        }
      }}
      className={`fixed inset-0 z-[115] overflow-hidden ${design.shell}`}
      aria-label="Idle stage overlay"
    >
      <div className={`absolute inset-0 ${design.aura}`} />

      <div
        className={`absolute inset-0 pointer-events-none ${design.gridOpacity}`}
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '42px 42px',
        }}
      />

      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ rotate: 360 }}
        transition={{ duration: 180, repeat: Infinity, ease: 'linear' }}
      >
        <div
          className={`absolute -inset-[130%] ${design.watermarkOpacity}`}
          style={{
            backgroundImage: `url(${ndcCrest})`,
            backgroundSize: '260px 260px',
            backgroundRepeat: 'repeat',
            filter: 'grayscale(100%)',
          }}
        />
      </motion.div>
      {settings.design === 'preboot-sequence' && (
        <motion.div
          className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none mix-blend-plus-lighter"
          animate={{ opacity: [0.2, 0.3, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <AnimatePresence mode="popLayout">
            <motion.div
              key={currentPrebootLogo}
              className="absolute w-[120vw] h-[120vw] md:w-[80vw] md:h-[80vw] max-w-[1000px] max-h-[1000px] rounded-full overflow-hidden flex items-center justify-center opacity-[0.25]"
              initial={{ opacity: 0, scale: 0.8, filter: "blur(15px)" }}
              animate={{ opacity: 0.25, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.2, filter: "blur(15px)" }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              style={{
                WebkitMaskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 70%)',
                maskImage: 'radial-gradient(circle, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 70%)'
              }}
            >
              <img
                src={currentPrebootLogo}
                className="w-full h-full object-contain p-8 md:p-12"
                alt="background watermark"
              />
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}

      {settings.design === 'holographic-display' && (
        <>
          <motion.div
            className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.1),transparent_70%)] pointer-events-none"
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
             className="absolute left-[20%] top-[30%] w-64 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent shadow-[0_0_8px_rgba(34,211,238,0.8)] pointer-events-none"
             animate={{ opacity: [0, 1, 0], scaleX: [0.5, 1.5, 0.5], translateX: [-50, 50, -50] }}
             transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
             className="absolute right-[20%] bottom-[30%] w-64 h-[1px] bg-gradient-to-r from-transparent via-blue-400/50 to-transparent shadow-[0_0_8px_rgba(96,165,250,0.8)] pointer-events-none"
             animate={{ opacity: [0, 1, 0], scaleX: [0.5, 1.5, 0.5], translateX: [50, -50, 50] }}
             transition={{ duration: 5.5, repeat: Infinity, ease: 'linear' }}
          />
        </>
      )}
      {settings.design === 'flag-parade' && (
        <>
          <motion.div
            className="absolute inset-y-0 left-0 w-1/3 bg-red-600/22 pointer-events-none"
            animate={{ opacity: [0.22, 0.4, 0.22] }}
            transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-y-0 left-1/3 w-1/3 bg-yellow-200/10 pointer-events-none"
            animate={{ opacity: [0.08, 0.22, 0.08] }}
            transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute inset-y-0 right-0 w-1/3 bg-blue-700/24 pointer-events-none"
            animate={{ opacity: [0.2, 0.38, 0.2] }}
            transition={{ duration: 5.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </>
      )}

      {settings.design === 'radar-grid' && (
        <>
          <motion.div
            className="absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/10 pointer-events-none"
            animate={{ scale: [0.8, 1.15], opacity: [0.32, 0] }}
            transition={{ duration: 4.2, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute left-1/2 top-1/2 h-[150vmax] w-[150vmax] -translate-x-1/2 -translate-y-1/2 rounded-full border border-emerald-300/10 pointer-events-none"
            animate={{ rotate: 360 }}
            transition={{ duration: 7, repeat: Infinity, ease: 'linear' }}
          >
            <div className="absolute left-1/2 top-1/2 h-1/2 w-1/2 origin-top-left bg-[conic-gradient(from_0deg,rgba(52,211,153,0.32),rgba(20,184,166,0.14)_35%,transparent_70%)]" />
          </motion.div>
        </>
      )}

      {settings.design === 'commandant-honour-wall' && activeCommandant && (
        <AnimatePresence mode="wait">
          <IdleCommandantShowcase key={activeCommandant.id} commandant={activeCommandant} />
        </AnimatePresence>
      )}

      {settings.design !== 'preboot-sequence' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <motion.div
            className="relative w-[300px] h-[300px] md:w-[560px] md:h-[560px]"    
            animate={{ rotate: 360 }}
            transition={{ duration: design.orbitDurationSec, repeat: Infinity, ease: 'linear' }}
          >
          <div className={`absolute inset-[7%] rounded-full border ${design.ringTone}`} />
          <div className={`absolute inset-[17%] rounded-full border ${design.innerRingTone} border-dashed`} />

          {BRANCH_LOGOS.map((logo, index) => {
            const angle = index * (360 / BRANCH_LOGOS.length);
            return (
              <div
                key={logo.id}
                className="absolute inset-0"
                style={{ transform: `rotate(${angle}deg)` }}
              >
                <motion.div
                  className="absolute left-1/2 top-[8%] -translate-x-1/2"
                  animate={{ rotate: -360 }}
                  transition={{ duration: design.counterOrbitDurationSec, repeat: Infinity, ease: 'linear' }}
                >
                  <div className={`w-20 h-20 md:w-28 md:h-28 rounded-full bg-slate-100/95 border-[3px] ${design.nodeTone} p-[7px] md:p-[9px]`}>
                    <div className="w-full h-full rounded-full overflow-hidden">
                      <img
                        src={logo.src}
                        alt={logo.name}
                        className="w-full h-full object-contain [clip-path:circle(50%_at_50%_50%)]"
                        style={{ transform: `scale(${logo.zoom})` }}
                      />
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}

          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            animate={{ scale: [1, 1.06, 1] }}
            transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <div className="w-32 h-32 md:w-44 md:h-44 rounded-full border-2 border-[#ffd866aa] bg-[#010813e8] backdrop-blur-xl shadow-[0_0_35px_rgba(0,138,255,0.28)] flex items-center justify-center">
              <img src={ndcCrest} alt="NDC crest" className="w-[72%] h-[72%] object-contain" />
            </div>
          </motion.div>
        </motion.div>
      </div>
      )}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center px-4 pointer-events-none">
        <p className={`text-[11px] md:text-xs uppercase tracking-[0.28em] font-semibold ${design.labelTone}`}>
          Idle Isolation Stage Active
        </p>
        <p className="mt-2 text-xs md:text-sm text-white/75">
          Touch, click, or press any key to resume archive view.
        </p>
      </div>
    </div>
  );
}
