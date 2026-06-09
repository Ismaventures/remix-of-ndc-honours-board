import fs from 'fs';
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// Replace tab container with Sidebar structure
const oldHeader = /<div className="flex h-\[5px\] rounded-t-lg overflow-hidden mb-6">[\s\S]*?<div className="flex overflow-x-auto gap-2 mb-6 pb-2 no-scrollbar">[\s\S]*?<\/div>[\s\S]*?<div className="relative">/;

const newLayout = 
      <div className="fixed inset-0 z-[100] flex overflow-hidden bg-[radial-gradient(ellipse_at_top,#141926_0%,#090d13_80%)] text-white font-sans">
        
        {/* SIDEBAR */}
        <aside className="w-[260px] flex-shrink-0 flex flex-col border-r border-white/10 bg-[#090d13] p-4 lg:p-5 overflow-y-auto">
          <div className="mb-8 flex items-center gap-3">
            <button onClick={onBack} className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all"><ArrowLeft className="h-4 w-4" /></button>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f4c866]">The Obsidian Gallery</p>
              <p className="mt-0.5 text-[9px] text-white/40 uppercase tracking-widest">Curator Console</p>
            </div>
          </div>
          
          <div className="space-y-1 flex-1">
            <p className="px-3 mb-2 mt-4 text-[9px] font-semibold uppercase tracking-wider text-white/30">Archive Data</p>
            <button onClick={() => setTab('personnel')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'personnel' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}><span className="w-4 h-4" /> Personnel Ledger</button>
            <button onClick={() => setTab('visits')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'visits' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}><span className="w-4 h-4" /> VIP Visits</button>
            <button onClick={() => setTab('commandants')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'commandants' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}><span className="w-4 h-4" /> Commandants</button>

            <p className="px-3 mb-2 mt-6 text-[9px] font-semibold uppercase tracking-wider text-white/30">Curator Tools</p>
            <button onClick={() => setTab('museum')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'museum' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}><span className="w-4 h-4" /> Exhibits</button>
            <button onClick={() => setTab('content')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'content' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}><span className="w-4 h-4" /> Content Narrative</button>

            <p className="px-3 mb-2 mt-6 text-[9px] font-semibold uppercase tracking-wider text-white/30">Atmosphere</p>
            <button onClick={() => setTab('theme')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'theme' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}><span className="w-4 h-4" /> Visual Styles</button>
            <button onClick={() => setTab('transitions')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'transitions' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}><span className="w-4 h-4" /> Transitions</button>
            <button onClick={() => setTab('audio')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'audio' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}><span className="w-4 h-4" /> Narrative Audio</button>

            <p className="px-3 mb-2 mt-6 text-[9px] font-semibold uppercase tracking-wider text-white/30">Hardware Control</p>
            <button onClick={() => setTab('devices')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'devices' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}><span className="w-4 h-4" /> Endpoint Links</button>
            <button onClick={() => setTab('guide')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'guide' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}><span className="w-4 h-4" /> AI Guide</button>
          </div>
        </aside>

        {/* MAIN BODY AREA */}
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
          {guideFlowActive && tab !== 'guide' && (
            <div className="sticky top-0 z-[101] m-4 md:m-6 rounded-[16px] border border-[#f4c866]/30 bg-[#f4c866]/10 p-3 sm:px-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-lg backdrop-blur-xl">
              <p className="text-xs text-[#f4c866]">Testing active feature branch. Return to Guide to continue script.</p>
              <button onClick={() => setTab('guide')} className="px-4 py-2 rounded-full bg-[#f4c866] text-[#0d1016] text-[10px] uppercase font-bold tracking-widest hover:brightness-110">Return to Guide</button>
            </div>
          )}

          <div className="w-full flex-1 p-4 md:p-8 xl:p-10 max-w-[1400px] mx-auto relative">
;

code = code.replace(oldHeader, newLayout);
fs.writeFileSync('src/components/AdminPanel.tsx', code);
console.log('Restructured sidebar successfully.');
