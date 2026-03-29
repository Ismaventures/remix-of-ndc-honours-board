const fs = require('fs');
const filePath = 'src/components/AdminPanel.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = "{tab === 'theme' && (";
const endMarker = "{tab === 'transitions' && (";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex === -1 || endIndex === -1) {
    console.error('Could not find markers', startIndex, endIndex);
    process.exit(1);
}

const replacement = \        {tab === 'theme' && (
          <div className="view-enter">
            {/* The Top Action Bar */}
            <div className="surface-panel !p-3 mb-3 flex flex-wrap items-center justify-between gap-4 border border-primary/20 shadow-lg shadow-primary/5">
              <div>
                <h4 className="text-sm font-semibold gold-text tracking-wide uppercase">NLE Color Grade Workspace</h4>
                <p className="text-[10px] text-muted-foreground mt-0.5">Professional application-wide visual styling.</p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                 <div className="flex items-center gap-2 border-r border-primary/20 pr-3">
                   <div className="text-[10px] text-muted-foreground text-right">
                     Targeting:<br/><span className="text-primary font-medium">{featureTargetDeviceIds.length} Nodes</span>
                   </div>
                 </div>
                 <button onClick={() => setThemeDraft('indoor-defence-classic')}
                        className="px-3 py-1.5 rounded-md border border-primary/25 bg-background/50 hover:bg-muted text-[11px] font-medium text-foreground transition-all">
                    Reset Factory
                 </button>
                 <button onClick={applyThemeSettings} disabled={!isThemeDirty || featureTargetDeviceIds.length === 0}
                         className="px-5 py-1.5 rounded-md text-xs font-bold border border-primary/40 text-background bg-primary/90 hover:bg-primary shadow-[0_0_10px_rgba(255,215,0,0.2)] transition-all disabled:opacity-50 disabled:shadow-none">
                    Render Grade
                 </button>
              </div>
            </div>

            {/* The 3-Pane NLE Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr_280px] gap-3 h-[60vh] min-h-[400px]">
              
              {/* LEFT PANE: LUT Library */}
              <div className="rounded-lg border border-primary/20 bg-slate-900/60 flex flex-col overflow-hidden shadow-inner">
                <div className="p-2.5 border-b border-primary/15 bg-slate-950/80 flex items-center justify-between">
                  <h5 className="text-[10px] uppercase tracking-widest text-primary font-bold">Theme LUTs</h5>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
                  {THEME_OPTIONS.map(option => {
                    const isActive = themeDraft === option.mode;
                    return (
                      <button
                        key={option.mode}
                        onClick={() => setThemeDraft(option.mode)}
                        className={\\\w-full text-left p-3 rounded-md transition-all flex flex-col gap-1 \\\\\\}
                      >
                        <div className="flex items-center justify-between">
                          <span className={\\\	ext-xs font-bold \\\\\\}>{option.label}</span>
                          {isActive && <span className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_5px_rgba(255,215,0,0.8)]"></span>}
                        </div>
                        <span className="text-[9px] text-slate-500 leading-tight">{option.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* CENTER PANE: Grade Canvas */}
              <div className="rounded-lg border border-primary/20 bg-slate-900/60 flex flex-col overflow-hidden shadow-inner relative">
                <div className="p-2 border-b border-primary/10 flex justify-between items-center absolute top-0 w-full z-10 bg-gradient-to-b from-slate-950/90 to-transparent">
                     <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">Grade Canvas Preview</span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-950 relative overflow-hidden">
                   <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/10 to-transparent"></div>
                   
                   {/* Mock UI Canvas representing the active theme */}
                   <div className={\\\elative z-10 w-full max-w-sm rounded-xl border p-6 transition-all duration-700 \\\\\\}>
                      <div className="flex items-center gap-3 mb-4">
                        <div className={\\\w-12 h-12 rounded-full border-2 flex items-center justify-center \\\\\\}>
                           <div className={\\\w-6 h-6 rounded-full \\\\\\}></div>
                        </div>
                        <div>
                          <div className={\\\h-3 w-24 rounded mb-1.5 \\\\\\}></div>
                          <div className="h-2 w-32 rounded bg-slate-600/50"></div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-16 w-full rounded border border-white/10 bg-white/5 flex items-center justify-between px-4">
                           <div className="h-2 w-16 bg-white/20 rounded"></div>
                           <div className={\\\h-6 w-20 rounded \\\\\\}></div>
                        </div>
                      </div>
                   </div>
                   
                   <p className="mt-8 text-xs text-primary/70 uppercase tracking-widest font-bold z-10">{THEME_OPTIONS.find(o=>o.mode === themeDraft)?.label}</p>
                </div>
              </div>

              {/* RIGHT PANE: Scope Targets */}
              <div className="rounded-lg border border-primary/20 bg-slate-900/60 flex flex-col overflow-hidden shadow-inner">
                <div className="p-2.5 border-b border-primary/15 bg-slate-950/80 flex items-center justify-between">
                  <h5 className="text-[10px] uppercase tracking-widest text-primary font-bold">Grade Scope</h5>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-4 custom-scrollbar">
                  {/* Scope / Devices */}
                  <div className="bg-slate-950/60 rounded-md border border-primary/10 p-3 flex flex-col h-full">
                    <h6 className="text-[10px] font-bold text-foreground mb-1 uppercase tracking-wide">Target Render Nodes</h6>
                    <p className="text-[9px] text-slate-500 mb-3 leading-relaxed">Select screens to instantly push this grade to.</p>
                    
                    <button onClick={selectAllOnlineFeatureDevices} className="w-full py-1.5 mb-2 rounded bg-slate-800 border border-primary/20 text-[9px] uppercase font-bold text-primary hover:bg-primary/20 transition-all shadow-inner">
                      Select All Online
                    </button>
                    
                    <div className="flex-1 overflow-y-auto space-y-0.5 custom-scrollbar border border-slate-800 rounded bg-slate-950/80 p-0.5">
                      {onlineDevices.length === 0 ? (
                         <div className="p-3 text-center text-[10px] text-slate-500 italic">No online nodes available</div>
                      ) : (
                         onlineDevices.map(device => {
                           const isSelected = featureTargetDeviceIds.includes(device.device_id);
                           return (
                             <div key={device.device_id} 
                                  onClick={() => handleFeatureTargetToggle(device.device_id)}
                                  className={\\\px-2 py-1.5 rounded-sm text-[10px] cursor-pointer flex items-center justify-between transition-colors \\\\\\}>
                               <div className="flex items-center gap-2 truncate">
                                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></div>
                                  <span className="truncate">{device.device_label}</span>
                               </div>
                               {isSelected && <span className="text-[10px]">✓</span>}
                             </div>
                           );
                         })
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}\n        \;

content = content.substring(0, startIndex) + replacement + content.substring(endIndex);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully patched AdminPanel.tsx Theme tab NLE');
