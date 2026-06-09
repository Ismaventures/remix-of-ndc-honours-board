import fs from 'fs';
let code = fs.readFileSync('src/components/AdminPanel.tsx', 'utf8');

// Add isSidebarCollapsed state
code = code.replace("const [tab, setTab] = useState<'", "const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);\n  const [tab, setTab] = useState<'");

// Update aside classes
code = code.replace(
  '<aside className="w-[260px] flex-shrink-0 flex flex-col border-r border-white/10 bg-[#090d13] p-4 lg:p-5 overflow-y-auto">',
  '<aside className={`flex-shrink-0 flex flex-col border-r border-white/10 bg-[#090d13] overflow-y-auto transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "w-[80px] p-2" : "w-[260px] p-4 lg:p-5"}`}>'
);

// Toggle button
code = code.replace(
  '<div className="mb-8 flex items-center gap-3">',
  '<div className={`mb-8 flex items-center ${isSidebarCollapsed ? "flex-col gap-4 mt-2" : "gap-3"}`}>\n<button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-2 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 text-white transition-all" title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M9 3v18"/></svg> </button>'
);


code = code.replace(
  /className={"w-full flex items-center gap-3 rounded-\[12px\] px-3 py-2\.5 text-left text-\[11px\] transition-all " \+ \(tab === '([^']+)' \? "bg-\[\#f4c866\]\/10 text-\[\#f4c866\] font-medium border border-\[\#f4c866\]\/20" : "text-white\/50 hover:bg-white\/5 hover:text-white"\)}>([^<]+)<\/button>/g,
  (match, tabName, label) => {
    return `className={"w-full flex items-center rounded-[12px] py-2.5 text-left text-[11px] transition-all " + (isSidebarCollapsed ? "justify-center px-0 " : "gap-3 px-3 ") + (tab === '${tabName}' ? "bg-[#f4c866]/10 text-[#f4c866] font-medium border border-[#f4c866]/20" : "text-white/50 hover:bg-white/5 hover:text-white")} title="${label}">
            {!isSidebarCollapsed && <span>${label}</span>}
          </button>`;
  }
);


// Hide section titles when collapsed
code = code.replace(
  /<p className="px-3 mb-2 mt-4 text-\[9px\] font-semibold uppercase tracking-wider text-white\/30">Archive Data<\/p>/g,
  '{!isSidebarCollapsed && <p className="px-3 mb-2 mt-4 text-[9px] font-semibold uppercase tracking-wider text-white/30">Archive Data</p>}'
);
code = code.replace(
  /<p className="px-3 mb-2 mt-6 text-\[9px\] font-semibold uppercase tracking-wider text-white\/30">Curator Tools<\/p>/g,
  '{!isSidebarCollapsed && <p className="px-3 mb-2 mt-6 text-[9px] font-semibold uppercase tracking-wider text-white/30">Curator Tools</p>}'
);
code = code.replace(
  /<p className="px-3 mb-2 mt-6 text-\[9px\] font-semibold uppercase tracking-wider text-white\/30">Atmosphere<\/p>/g,
  '{!isSidebarCollapsed && <p className="px-3 mb-2 mt-6 text-[9px] font-semibold uppercase tracking-wider text-white/30">Atmosphere</p>}'
);
code = code.replace(
  /<p className="px-3 mb-2 mt-6 text-\[9px\] font-semibold uppercase tracking-wider text-white\/30">Hardware Control<\/p>/g,
  '{!isSidebarCollapsed && <p className="px-3 mb-2 mt-6 text-[9px] font-semibold uppercase tracking-wider text-white/30">Hardware Control</p>}'
);

// Hide title when collapsed
code = code.replace(
  '<div>\n            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f4c866]">The Obsidian Gallery</p>\n            <p className="mt-0.5 text-[9px] text-white/40 uppercase tracking-widest">Curator Console</p>\n          </div>',
  '{!isSidebarCollapsed && <div>\n            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f4c866]">The Obsidian Gallery</p>\n            <p className="mt-0.5 text-[9px] text-white/40 uppercase tracking-widest">Curator Console</p>\n          </div>}'
);


fs.writeFileSync('src/components/AdminPanel.tsx', code);
console.log('Sidebar collapsible implemented');
