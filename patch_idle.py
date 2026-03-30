import sys

with open('src/components/IdleStageOverlay.tsx', 'r') as f:
    content = f.read()

# adding to DESIGN_CLASS_MAP
preboot_props = """  'preboot-sequence': {
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
},"""

content = content.replace('} as const;', preboot_props + '\n} as const;')

state_logic = """  const design = DESIGN_CLASS_MAP[settings.design] ?? DESIGN_CLASS_MAP['orbital-command'];

  const [activeCycleIndex, setActiveCycleIndex] = useState(0);

  useEffect(() => {
    if (settings.design === 'preboot-sequence') {
      const interval = setInterval(() => {
        setActiveCycleIndex((prev) => (prev + 1) % (BRANCH_LOGOS.length + 1));
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [settings.design]);

  const cycleLogos = [...BRANCH_LOGOS, { id: 'ndc', src: ndcCrest, name: 'National Defence College' }];
  const currentPrebootLogo = cycleLogos[activeCycleIndex].src;"""

content = content.replace("  const design = DESIGN_CLASS_MAP[settings.design] ?? DESIGN_CLASS_MAP['orbital-command'];", state_logic)

preboot_jsx = """
      {settings.design === 'preboot-sequence' && (
        <motion.div
          className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none mix-blend-plus-lighter"
          animate={{ rotate: 360 }}
          transition={{ duration: 150, repeat: Infinity, ease: "linear" }}
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
                className="w-full h-full object-cover"
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
"""

content = content.replace("{settings.design === 'flag-parade' && (", preboot_jsx + "\n      {settings.design === 'flag-parade' && (")

content = content.replace(
    '<div className="absolute inset-0 flex items-center justify-center pointer-events-none">',
    "{settings.design !== 'preboot-sequence' && ( \\n      <div className=\"absolute inset-0 flex items-center justify-center pointer-events-none\">"
)

content = content.replace(
    '''</motion.div>
      </div>

      <div className="absolute bottom-8''',
    '''</motion.div>
      </div>
      )}

      <div className="absolute bottom-8'''
)

with open('src/components/IdleStageOverlay.tsx', 'w') as f:
    f.write(content)

print("done")
