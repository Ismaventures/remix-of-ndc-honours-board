import re

file_path = r'c:\Users\AHMED\Desktop\ndcmuseum\remix-of-ndc-honours-board\src\components\MuseumExperience.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Locate the Main Presentation Area
start_marker = "      {/* Main Presentation Area */}"
end_marker = "      </div>\n    </motion.div>\n  );\n}"

start_idx = content.find(start_marker)
end_idx = content.find(end_marker, start_idx)

if start_idx != -1 and end_idx != -1:
    new_body = '''      {/* Main Presentation Area - FULL VIEW */}
      <div className="relative z-10 flex-1 flex flex-col overflow-x-hidden overflow-y-auto">
        {/* Dramatic Media Container - Full Width */}
        <div className="w-full h-[50vh] min-h-[400px] relative bg-black flex items-center justify-center border-b border-inherit flex-shrink-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={\\-\\-media}
              variants={{
                initial: { opacity: 0, scale: 1.03 },
                animate: { opacity: 1, scale: 1 },
                exit: { opacity: 0, scale: 0.97 }
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full"
            >
              {currentItem.imageUrl ? (
                <>
                  <div className="absolute inset-0 saturate-[1.05] contrast-[1.05]">
                    <img src={currentItem.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 blur-3xl scale-110" />
                    <img src={currentItem.imageUrl} alt="" className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] px-4 py-8" />
                  </div>
                  {/* Subtle inner dark vignette specifically for the image */}
                  <div className="absolute inset-0 shadow-[inset_0_0_80px_rgba(0,0,0,0.8)] pointer-events-none" />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center border-2 border-dashed border-white/5 bg-white/[0.01]">
                   <p className="text-sm font-semibold tracking-[0.16em] uppercase text-white/30 text-center leading-loose">Image Not<br/>Available</p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          
          {/* Timeline counter overlay */}
          <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 z-20 flex items-center gap-3 px-4 py-2 rounded-lg border border-white/15 bg-black/50 backdrop-blur-md">
            <span className="text-[#FFD700] text-[12px] font-serif italic tracking-widest">
              NO. {(currentIndex + 1).toString().padStart(3, '0')}
            </span>
            <span className="w-6 h-[1px] bg-white/20" />
            <span className="text-white/60 text-[12px] font-serif italic tracking-widest">
              {items.length.toString().padStart(3, '0')}
            </span>
          </div>
        </div>

        {/* Archival Plaque - Full Width Bottom */}
        <div className={cn(
          "w-full flex flex-col p-6 md:p-10 lg:px-16 lg:py-12 flex-shrink-0",
          isLightMode ? "bg-gradient-to-b from-transparent to-[#eef4fb]" : "bg-gradient-to-b from-transparent to-[#0a1122]"
        )}>
          <AnimatePresence mode="wait">
            <motion.div
              key={\\-\\-text}
              variants={{
                initial: { opacity: 0, y: 30 },
                animate: { opacity: 1, y: 0 },
                exit: { opacity: 0, y: -20 }
              }}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 1.0, ease: CINEMATIC_EASE, delay: 0.05 }}
              className="w-full max-w-5xl mx-auto flex flex-col"
            >
              {/* Context Label & Title Header */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
                <div className="flex-1">
                  <p className={cn(
                    "text-[10px] font-extrabold uppercase tracking-[0.25em] mb-4 flex items-center gap-3",
                    isLightMode ? "text-[#002060]/60" : "text-white/50"
                  )}>
                    <span className="block w-8 h-[2px] bg-[#FF0000]" />
                    {activeCol.title}
                  </p>
                  <h2 className={cn("text-4xl md:text-5xl lg:text-6xl font-bold font-serif leading-tight", isLightMode ? "text-[#0c1a36]" : "text-white")}>
                    {currentItem.name}
                  </h2>
                </div>

                {/* Archival Metadata Grid - Horizontal layout for full view */}
                <div className="flex flex-wrap gap-4 shrink-0">
                  {currentItem.era && (
                    <div className={cn("px-4 py-3 rounded-lg border flex flex-col justify-center", isLightMode ? "border-[#002060]/10 bg-[#002060]/[0.02]" : "border-white/10 bg-white/[0.02]")}>
                      <p className="text-[9px] uppercase tracking-[0.18em] opacity-50 mb-1.5 font-bold">Era</p>
                      <p className="text-xs font-semibold">{currentItem.era}</p>
                    </div>
                  )}
                  {currentItem.location && (
                    <div className={cn("px-4 py-3 rounded-lg border flex flex-col justify-center", isLightMode ? "border-[#002060]/10 bg-[#002060]/[0.02]" : "border-white/10 bg-white/[0.02]")}>
                      <p className="text-[9px] uppercase tracking-[0.18em] opacity-50 mb-1.5 font-bold">Location</p>
                      <p className={cn("text-xs font-semibold", isLightMode ? "text-[#e62e2e]" : "text-[#FF6B6B]")}>{currentItem.location}</p>
                    </div>
                  )}
                  {currentItem.tag && (
                    <div className={cn("px-5 py-3 rounded-lg border flex flex-col justify-center", isLightMode ? "border-[#002060]/10 bg-[#002060]/[0.02]" : "border-white/10 bg-white/[0.02]")}>
                      <p className="text-[9px] uppercase tracking-[0.18em] opacity-50 mb-1.5 font-bold">Classification</p>
                      <p className={cn("text-xs font-bold uppercase tracking-[0.12em]", isLightMode ? "text-[#005080]" : "text-[#00B0F0]")}>{currentItem.tag}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className={cn("h-[1px] w-full mb-10", isLightMode ? "bg-[#002060]/10" : "bg-white/10")} />

              {/* Narrative Content - Centered Reading Experience */}
              <div className="prose prose-lg xl:prose-xl max-w-4xl">
                <p className={cn(
                  "leading-loose first-line:uppercase first-line:tracking-widest first-letter:text-6xl md:first-letter:text-7xl first-letter:font-serif first-letter:font-bold first-letter:mr-3 first-letter:float-left first-letter:text-[#FFD700]", 
                  isLightMode ? "text-[#002060]/80" : "text-white/80"
                )}>
                  {currentItem.description}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Lower controls (Tabs and Playback) */}
          <div className="mt-14 pt-8 border-t border-inherit flex flex-col lg:flex-row items-center justify-between gap-8 max-w-5xl mx-auto w-full">
             <div className="flex gap-2 flex-wrap justify-center lg:justify-start">
                {collections.map((col) => (
                  <button
                    key={col.id}
                    onClick={() => goToCollection(col.id)}
                    className={cn(
                      "rounded-sm px-4 py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-300",
                      col.id === activeCol.id
                        ? isLightMode ? "bg-[#002060] text-white" : "bg-white text-black"
                        : "opacity-40 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5"
                    )}
                  >
                    {col.title.replace(" Collection", "").replace(" Hall of Fame", "")}
                  </button>
                ))}
             </div>
             
             <div className="flex items-center w-full lg:w-auto flex-1 lg:flex-none gap-6 justify-center lg:justify-end">
                <div className="flex flex-1 lg:w-64 max-w-md items-center gap-1.5">
                  {items.map((item, i) => (
                    <button
                      key={item.id}
                      onClick={() => goToItem(i)}
                      className={cn(
                        "h-[3px] transition-all duration-500 rounded-full",
                        i === currentIndex
                          ? "flex-[3] bg-[#FFD700]"
                          : isLightMode ? "flex-1 bg-[#002060]/15 hover:bg-[#002060]/40" : "flex-1 bg-white/15 hover:bg-white/40",
                      )}
                      aria-label={Go to item \\}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => goToItem(currentIndex - 1, -1)} className="p-3 opacity-50 hover:opacity-100 transition-opacity rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button onClick={() => { stopSpeech(); setIsPlaying((p) => !p); }} className={cn("p-5 rounded-full transition-all shadow-md", isPlaying ? "text-[#FFD700] bg-[#FFD700]/10 border border-[#FFD700]/30" : "hover:bg-black/5 dark:hover:bg-white/5 border border-transparent")}>
                    {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-1" /> }
                  </button>
                  <button onClick={() => goToItem(currentIndex + 1, 1)} className="p-3 opacity-50 hover:opacity-100 transition-opacity rounded-full hover:bg-black/5 dark:hover:bg-white/5">
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </div>
             </div>
          </div>
        </div>
'''

    content = content[:start_idx] + new_body + content[end_idx:]
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched completely!")
else:
    print("Could not find markers.")
