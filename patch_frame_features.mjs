import fs from 'fs';
let code = fs.readFileSync('src/components/DisplayFrameAdmin.tsx', 'utf8');

// ──────────────────────────────────────────────
// 1. Add resize state type & preset types
// ──────────────────────────────────────────────
code = code.replace(
  `type DragLayerState = {`,
  `type ResizeLayerState = {
  layerId: string;
  startClientX: number;
  startClientY: number;
  startScale: number;
  corner: 'nw' | 'ne' | 'sw' | 'se';
};

type LayoutPreset = {
  id: string;
  label: string;
  description: string;
  arrange: (layers: StudioLayer[], stageW: number, stageH: number) => StudioLayer[];
};

type DragLayerState = {`
);

// ──────────────────────────────────────────────
// 2. Add auto-arrange preset functions
// ──────────────────────────────────────────────
code = code.replace(
  `function normalizeScene(`,
  `const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: 'grid',
    label: 'Gallery Grid',
    description: 'Evenly spaced rows and columns like a professional museum wall.',
    arrange: (layers) => {
      const count = layers.length;
      if (count === 0) return layers;
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const cellW = 70 / cols;
      const cellH = 54 / rows;
      const baseScale = Math.max(12, Math.min(38, 60 / Math.max(cols, rows)));
      return layers.map((layer, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = -35 + cellW * col + cellW / 2;
        const y = -27 + cellH * row + cellH / 2;
        return { ...layer, x: clampNumber(x, -42, 42), y: clampNumber(y, -30, 30), scale: baseScale, rotation: 0, depth: 12 + i * 2 };
      });
    },
  },
  {
    id: 'cascade',
    label: 'Cascade Stack',
    description: 'Overlapping diagonal arrangement like scattered documents on a desk.',
    arrange: (layers) => {
      const count = layers.length;
      if (count === 0) return layers;
      const step = Math.min(14, 60 / count);
      const baseScale = Math.max(16, Math.min(32, 50 / Math.sqrt(count)));
      return layers.map((layer, i) => ({
        ...layer,
        x: clampNumber(-28 + i * step, -42, 42),
        y: clampNumber(-18 + i * step * 0.6, -30, 30),
        scale: baseScale,
        rotation: clampNumber(-8 + i * 3, -20, 20),
        depth: 8 + i * 5,
      }));
    },
  },
  {
    id: 'arc',
    label: 'Museum Arc',
    description: 'Evenly distributed along a gentle arc like items in a display vitrine.',
    arrange: (layers) => {
      const count = layers.length;
      if (count === 0) return layers;
      const baseScale = Math.max(14, Math.min(34, 55 / Math.sqrt(count)));
      return layers.map((layer, i) => {
        const t = count === 1 ? 0.5 : i / (count - 1);
        const angle = -0.7 + t * 1.4;
        const x = Math.sin(angle) * 34;
        const y = -Math.cos(angle) * 16 + 4;
        return { ...layer, x: clampNumber(x, -42, 42), y: clampNumber(y, -30, 30), scale: baseScale, rotation: clampNumber(angle * 8, -15, 15), depth: 10 + i * 3 };
      });
    },
  },
  {
    id: 'spotlight',
    label: 'Center Spotlight',
    description: 'One large hero piece in center with smaller pieces flanking symmetrically.',
    arrange: (layers) => {
      const count = layers.length;
      if (count === 0) return layers;
      if (count === 1) return [{ ...layers[0], x: 0, y: 0, scale: 40, rotation: 0, depth: 20 }];
      const hero = { ...layers[0], x: 0, y: -2, scale: Math.min(42, 55 / Math.sqrt(count)), rotation: 0, depth: 30 };
      const rest = layers.slice(1);
      const flanks = rest.map((layer, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const tier = Math.floor(i / 2);
        const x = side * (22 + tier * 10);
        const y = 6 + tier * 5;
        const sc = Math.max(14, hero.scale * 0.55 - tier * 3);
        return { ...layer, x: clampNumber(x, -42, 42), y: clampNumber(y, -30, 30), scale: sc, rotation: side * 4, depth: 8 + i * 2 };
      });
      return [hero, ...flanks];
    },
  },
  {
    id: 'mosaic',
    label: 'Tight Mosaic',
    description: 'Close-packed tiles for a dense, editorial photo wall look.',
    arrange: (layers) => {
      const count = layers.length;
      if (count === 0) return layers;
      const cols = Math.ceil(Math.sqrt(count * 1.4));
      const rows = Math.ceil(count / cols);
      const cellW = 80 / cols;
      const cellH = 58 / rows;
      const baseScale = Math.max(12, Math.min(28, 55 / Math.max(cols, rows)));
      return layers.map((layer, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const jitterX = ((i * 7) % 5 - 2) * 0.8;
        const jitterY = ((i * 3) % 5 - 2) * 0.5;
        const x = -40 + cellW * col + cellW / 2 + jitterX;
        const y = -29 + cellH * row + cellH / 2 + jitterY;
        return { ...layer, x: clampNumber(x, -42, 42), y: clampNumber(y, -30, 30), scale: baseScale, rotation: 0, depth: 12 + i };
      });
    },
  },
];

function normalizeScene(`
);

// ──────────────────────────────────────────────
// 3. Add resize ref + panel collapse state + drag-drop upload state
// ──────────────────────────────────────────────
code = code.replace(
  `const dragLayerRef = useRef<DragLayerState | null>(null);`,
  `const dragLayerRef = useRef<DragLayerState | null>(null);
  const resizeLayerRef = useRef<ResizeLayerState | null>(null);`
);

code = code.replace(
  `const [activePanel, setActivePanel] = useState<StudioPanel>("layers");`,
  `const [activePanel, setActivePanel] = useState<StudioPanel>("layers");
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const [dragOverFrame, setDragOverFrame] = useState(false);
  const [showPresetPicker, setShowPresetPicker] = useState(false);`
);

// ──────────────────────────────────────────────
// 4. Add resize pointermove/pointerup handler
// ──────────────────────────────────────────────
code = code.replace(
  `const handlePointerUp = () => {
      dragLayerRef.current = null;
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [scene.layers, updateLayer]);`,
  `const handlePointerUp = () => {
      dragLayerRef.current = null;
      resizeLayerRef.current = null;
    };

    const handleResizeMove = (event: PointerEvent) => {
      const rs = resizeLayerRef.current;
      const preview = previewRef.current;
      if (!rs || !preview) return;
      const rect = preview.getBoundingClientRect();
      const editableWidth = rect.width * (STAGE_REGION.width / 100);
      const deltaPixels = Math.abs(event.clientX - rs.startClientX) + Math.abs(event.clientY - rs.startClientY);
      const deltaScale = (deltaPixels / editableWidth) * 100;
      const direction = (rs.corner === 'se' || rs.corner === 'ne')
        ? (event.clientX > rs.startClientX ? 1 : -1)
        : (event.clientX < rs.startClientX ? 1 : -1);
      const newScale = clampNumber(rs.startScale + direction * deltaScale * 0.6, 8, 78);
      updateLayer(rs.layerId, { scale: newScale });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointermove", handleResizeMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointermove", handleResizeMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [scene.layers, updateLayer]);`
);

// ──────────────────────────────────────────────
// 5. Add drag-drop file handler for the frame canvas
// ──────────────────────────────────────────────
code = code.replace(
  `const handleDisplayParamChange = useCallback`,
  `const handleFrameDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverFrame(false);
    const files = Array.from(event.dataTransfer.files).filter(f => f.type.startsWith("image/"));
    if (files.length === 0) return;
    const oversized = files.find(f => f.size > MAX_MEDIA_BYTES);
    if (oversized) {
      setError(\`\${oversized.name} exceeds \${MAX_MEDIA_SIZE_MB}MB.\`);
      return;
    }
    setUploadingLayer(true);
    setError(null);
    try {
      const refs = await Promise.all(files.map(f => saveMediaFile(f)));
      updateScene((current) => {
        const offset = current.layers.length;
        const newLayers = refs.map((ref, i) => createLayer(ref, stripExtension(files[i].name), offset + i));
        return {
          ...current,
          layers: [...current.layers, ...newLayers],
          selectedLayerId: newLayers[newLayers.length - 1]?.id ?? current.selectedLayerId,
        };
      });
      flashSaved(\`\${files.length} artefact(s) dropped into the chamber.\`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Drop upload failed.");
    } finally {
      setUploadingLayer(false);
    }
  }, [flashSaved, updateScene]);

  const handleApplyPreset = useCallback((preset: LayoutPreset) => {
    updateScene((current) => {
      const arranged = preset.arrange([...current.layers], 100, 100);
      return { ...current, layers: arranged };
    });
    setShowPresetPicker(false);
    flashSaved(\`Applied "\${preset.label}" layout to \${scene.layers.length} artefacts.\`);
  }, [flashSaved, scene.layers.length, updateScene]);

  const handleDisplayParamChange = useCallback`
);

// ──────────────────────────────────────────────
// 6. Add resize handles + name labels to each artifact layer on canvas
// ──────────────────────────────────────────────
// Replace the artifact button rendering inside the stage region
code = code.replace(
  `<img src={previewUrl} alt={layer.label} className="pointer-events-none h-auto w-full object-contain" draggable={false} />
                      </button>`,
  `<img src={previewUrl} alt={layer.label} className="pointer-events-none h-auto w-full object-contain" draggable={false} />
                        {/* Artifact name label */}
                        <div className="pointer-events-none absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-black/70 px-2.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.14em] text-white/70 backdrop-blur-sm">
                          {layer.label}
                        </div>
                        {/* Resize handles (only if selected) */}
                        {isSelected && (
                          <>
                            {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => (
                              <div
                                key={corner}
                                onPointerDown={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  resizeLayerRef.current = {
                                    layerId: layer.id,
                                    startClientX: e.clientX,
                                    startClientY: e.clientY,
                                    startScale: layer.scale,
                                    corner,
                                  };
                                }}
                                className={\`absolute h-3 w-3 rounded-full border-2 border-[#f4c866] bg-[#0d1016] cursor-\${corner === 'nw' || corner === 'se' ? 'nwse' : 'nesw'}-resize z-50 hover:bg-[#f4c866] transition-colors \${
                                  corner === 'nw' ? '-top-1.5 -left-1.5' :
                                  corner === 'ne' ? '-top-1.5 -right-1.5' :
                                  corner === 'sw' ? '-bottom-1.5 -left-1.5' :
                                  '-bottom-1.5 -right-1.5'
                                }\`}
                              />
                            ))}
                          </>
                        )}
                      </button>`
);

// ──────────────────────────────────────────────
// 7. Add drag-drop zone events + overlay to the preview div
// ──────────────────────────────────────────────
code = code.replace(
  `ref={previewRef}
              className="relative aspect-[16/10] overflow-hidden rounded-[20px] border border-white/8 bg-black/40"
              style={{ backgroundColor: "#05070b", borderColor: "rgba(255,255,255,0.08)" }}
              onPointerMove={handleStagePointerMove}
              onPointerLeave={() => setPointer({ x: 50, y: 18 })}`,
  `ref={previewRef}
              className={\`relative aspect-[16/10] overflow-hidden rounded-[20px] border bg-black/40 transition-colors \${dragOverFrame ? "border-[#f4c866]/50 bg-[#f4c866]/5" : "border-white/8"}\`}
              style={{ backgroundColor: dragOverFrame ? "rgba(244,200,102,0.04)" : "#05070b", borderColor: dragOverFrame ? "rgba(244,200,102,0.5)" : "rgba(255,255,255,0.08)" }}
              onPointerMove={handleStagePointerMove}
              onPointerLeave={() => setPointer({ x: 50, y: 18 })}
              onDragOver={(e) => { e.preventDefault(); setDragOverFrame(true); }}
              onDragLeave={() => setDragOverFrame(false)}
              onDrop={handleFrameDrop}`
);

// Add drop overlay indicator inside the preview div
code = code.replace(
  `<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_55%)]" />`,
  `{dragOverFrame && (
                <div className="absolute inset-0 z-[500] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                  <div className="flex flex-col items-center gap-3">
                    <div className="rounded-full border-2 border-dashed border-[#f4c866]/50 p-6">
                      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#f4c866]"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    </div>
                    <p className="text-sm font-semibold text-[#f4c866] tracking-wide">Drop artefacts into the chamber</p>
                    <p className="text-[10px] text-white/40">Images will be auto-placed on the canvas</p>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03),transparent_55%)]" />`
);

// ──────────────────────────────────────────────
// 8. Add Preset Picker button + modal below the Import Assets button
// ──────────────────────────────────────────────
code = code.replace(
  `<Upload className="h-3.5 w-3.5" />
                {uploadingLayer ? "Adding..." : "Import Assets"}
              </button>
            </div>`,
  `<Upload className="h-3.5 w-3.5" />
                {uploadingLayer ? "Adding..." : "Import Assets"}
              </button>
              <button
                type="button"
                onClick={() => setShowPresetPicker(!showPresetPicker)}
                disabled={scene.layers.length < 2}
                className="inline-flex items-center gap-2 rounded-full border border-[#f4c866]/18 bg-[#f4c866]/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f4c866] transition hover:bg-[#f4c866]/16 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Auto-Arrange
              </button>
            </div>

            {showPresetPicker && (
              <div className="mb-4 rounded-[18px] border border-[#f4c866]/16 bg-[#f4c866]/5 p-4 animate-in slide-in-from-top-2">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f4c866]">Perfect Layout Presets</p>
                    <p className="mt-1 text-xs text-white/40">Auto-arrange {scene.layers.length} artefacts beautifully in one click.</p>
                  </div>
                  <button type="button" onClick={() => setShowPresetPicker(false)} className="rounded-full border border-white/10 p-1.5 text-white/40 hover:text-white transition"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {LAYOUT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="rounded-[14px] border border-white/8 bg-white/[0.03] p-3 text-left transition-all hover:border-[#f4c866]/20 hover:bg-[#f4c866]/8 group"
                    >
                      <p className="text-xs font-semibold text-white group-hover:text-[#f4c866] transition-colors">{preset.label}</p>
                      <p className="mt-1 text-[10px] text-white/35 leading-relaxed">{preset.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}`
);

// ──────────────────────────────────────────────
// 9. Make left panel collapsible
// ──────────────────────────────────────────────
code = code.replace(
  `<div className="grid gap-0 xl:grid-cols-[150px_minmax(0,1fr)_280px]">
          <aside
            className="flex flex-col justify-between border-b border-white/6 bg-[linear-gradient(180deg,#0f1218_0%,#0a0d13_100%)] p-4 xl:border-b-0 xl:border-r"`,
  `<div className={\`grid gap-0 xl:grid-cols-[\${leftPanelCollapsed ? "48px" : "150px"}_minmax(0,1fr)_\${rightPanelCollapsed ? "48px" : "280px"}]\`}>
          <aside
            className={\`flex flex-col justify-between border-b border-white/6 bg-[linear-gradient(180deg,#0f1218_0%,#0a0d13_100%)] xl:border-b-0 xl:border-r transition-all duration-300 \${leftPanelCollapsed ? "p-1.5" : "p-4"}\`}`
);

// Add collapse toggle to left aside 
code = code.replace(
  `<p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f4c866]">Curator Console</p>
              <p className="mt-1 text-[10px] text-white/38">Admin access</p>`,
  `<div className="flex items-center justify-between gap-1">
                {!leftPanelCollapsed && <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f4c866]">Curator Console</p>}
                <button type="button" onClick={() => setLeftPanelCollapsed(!leftPanelCollapsed)} className="rounded-full border border-white/10 p-1.5 text-white/40 hover:text-white transition" title={leftPanelCollapsed ? "Expand" : "Collapse"}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M9 3v18"/></svg>
                </button>
              </div>
              {!leftPanelCollapsed && <p className="mt-1 text-[10px] text-white/38">Admin access</p>}`
);

// Wrap left panel items in a conditional
code = code.replace(
  `<div className="mt-6 space-y-2">
                {PANEL_ITEMS.map`,
  `{!leftPanelCollapsed ? <div className="mt-6 space-y-2">
                {PANEL_ITEMS.map`
);

code = code.replace(
  `Publish Curation
            </button>
          </aside>`,
  `Publish Curation
            </button>) : (
              <div className="mt-4 space-y-2">
                {PANEL_ITEMS.map((panel) => {
                  const Icon = panel.icon;
                  const isActive = activePanel === panel.id;
                  return (
                    <button key={panel.id} type="button" onClick={() => setActivePanel(panel.id)} className={cn("w-full rounded-[12px] border p-2 flex items-center justify-center transition-all", isActive ? "border-[#f4c866]/20 bg-[#f4c866]/10" : "border-transparent bg-white/[0.02] hover:bg-white/[0.04]")} title={panel.label}>
                      <Icon className={cn("h-4 w-4", isActive ? "text-[#f4c866]" : "text-white/35")} />
                    </button>
                  );
                })}
              </div>
            )}
          </aside>`
);

// ──────────────────────────────────────────────
// 10. Make right panel collapsible
// ──────────────────────────────────────────────
code = code.replace(
  `<aside
            className="bg-[linear-gradient(180deg,#0d1016_0%,#0a0d13_100%)] p-4 sm:p-5"
            style={{ background: "linear-gradient(180deg, #0d1016 0%, #0a0d13 100%)" }}
          >
            <div className="space-y-4">
              <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                <h4 className="font-serif text-2xl text-[#f4c866]">Scene Metadata</h4>`,
  `<aside
            className={\`bg-[linear-gradient(180deg,#0d1016_0%,#0a0d13_100%)] transition-all duration-300 \${rightPanelCollapsed ? "p-1.5" : "p-4 sm:p-5"}\`}
            style={{ background: "linear-gradient(180deg, #0d1016 0%, #0a0d13 100%)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <button type="button" onClick={() => setRightPanelCollapsed(!rightPanelCollapsed)} className="rounded-full border border-white/10 p-1.5 text-white/40 hover:text-white transition" title={rightPanelCollapsed ? "Expand" : "Collapse"}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M15 3v18"/></svg>
              </button>
              {!rightPanelCollapsed && <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/30">Properties</p>}
            </div>
            {rightPanelCollapsed ? (
              <div className="space-y-2 mt-2">
                <div className="h-4 w-4 rounded-full bg-[#f4c866]/10 mx-auto" title="Scene Metadata" />
                <div className="h-4 w-4 rounded-full bg-white/5 mx-auto" title="Panel Controls" />
                <div className="h-4 w-4 rounded-full bg-emerald-500/10 mx-auto" title="Status" />
              </div>
            ) : (
            <div className="space-y-4">
              <div className="rounded-[18px] border border-white/8 bg-white/[0.02] p-4">
                <h4 className="font-serif text-2xl text-[#f4c866]">Scene Metadata</h4>`
);

// Close the ternary for right panel at the end
code = code.replace(
  `</div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}`,
  `</div>
            </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}`
);

fs.writeFileSync('src/components/DisplayFrameAdmin.tsx', code);
console.log('All features patched successfully!');
console.log('- Resize handles on selected artifacts');
console.log('- Drag-and-drop image upload onto frame canvas');
console.log('- 5 auto-arrange layout presets');
console.log('- Artifact name labels on frame');
console.log('- Collapsible left & right panels');
