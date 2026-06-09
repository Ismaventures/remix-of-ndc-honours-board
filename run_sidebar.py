import re

with open('src/components/AdminPanel.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

pattern = re.compile(r'<div className="admin-obsidian-theme page-enter-slide(.*?)<div className="relative">', re.DOTALL)

new_layout = '''<div className="admin-obsidian-theme fixed inset-0 z-[100] flex overflow-hidden bg-[radial-gradient(ellipse_at_top,#141926_0%,#090d13_80%)] text-white font-sans">
      {/* OBSIDIAN CONSOLE SIDEBAR */}
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
          <button onClick={() => setTab('personnel')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'personnel' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}>Personnel Ledger</button>
          <button onClick={() => setTab('visits')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'visits' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}>VIP Visits</button>
          <button onClick={() => setTab('commandants')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'commandants' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}>Commandants</button>

          <p className="px-3 mb-2 mt-6 text-[9px] font-semibold uppercase tracking-wider text-white/30">Curator Tools</p>
          <button onClick={() => setTab('museum')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'museum' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}>Exhibits</button>
          <button onClick={() => setTab('content')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'content' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}>Content Narrative</button>

          <p className="px-3 mb-2 mt-6 text-[9px] font-semibold uppercase tracking-wider text-white/30">Atmosphere</p>
          <button onClick={() => setTab('theme')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'theme' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}>Visual Styles</button>
          <button onClick={() => setTab('transitions')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'transitions' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}>Transitions</button>
          <button onClick={() => setTab('audio')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'audio' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}>Narrative Audio</button>

          <p className="px-3 mb-2 mt-6 text-[9px] font-semibold uppercase tracking-wider text-white/30">Hardware Control</p>
          <button onClick={() => setTab('devices')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'devices' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}>Endpoint Links</button>
          <button onClick={() => setTab('guide')} className={"w-full flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-[11px] transition-all " + (tab === 'guide' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")}>AI Guide</button>
        </div>
      </aside>

      {/* MAIN CONTENT STAGE */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto relative bg-[linear-gradient(180deg,#0b0e14_0%,#0d1016_100%)]">
        <div className="w-full flex-1 p-4 md:p-8 max-w-[1400px] mx-auto">
        <div className="relative">'''

code = pattern.sub(new_layout, code)
code = code.replace('</main>', '</main></div>')

with open('src/components/AdminPanel.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print('Sidebar patched!')
