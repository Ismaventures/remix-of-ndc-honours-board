import { useState, useMemo, useEffect } from "react";
import { ArrowLeft, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { Personnel, Category } from "@/data/mockData";
import { ProfileModal } from "./ProfileModal";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

interface OrganogramViewProps {
  data: Personnel[];
  title: string;
  category: Category;
  onBack: () => void;
}

// Group into a tree based on seniority.
// For a military command structure visualization, Top node = most senior.
function buildTree(personnel: Personnel[]) {
  if (!personnel.length) return null;
  const sorted = [...personnel].sort((a, b) => a.seniorityOrder - b.seniorityOrder);
  
  const root = { ...sorted[0], children: [] as any[] };
  let currentLevel = [root];
  let nextLevel: any[] = [];
  
  let i = 1;
  const maxChildren = 3;
  
  while (i < sorted.length) {
    for (const parent of currentLevel) {
      const take = Math.min(maxChildren, sorted.length - i);
      for (let j = 0; j < take; j++) {
        const child = { ...sorted[i], children: [] };
        parent.children.push(child);
        nextLevel.push(child);
        i++;
      }
      if (i >= sorted.length) break;
    }
    if (nextLevel.length > 0) {
      currentLevel = nextLevel;
      nextLevel = [];
    } else {
      break;
    }
  }
  
  return root;
}

export function OrganogramView({ data, title, category, onBack }: OrganogramViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const filtered = useMemo(() => {
    return data.filter(p => p.category === category);
  }, [data, category]);

  const treeData = useMemo(() => buildTree(filtered), [filtered]);

  const selectedPerson = useMemo(
    () => filtered.find((p) => p.id === selectedId) || null,
    [filtered, selectedId]
  );

  const renderNode = (node: any, level: number = 0) => {
    if (!node) return null;
    
    return (
      <li key={node.id} className="organogram-li relative">
        <div 
          onClick={() => setSelectedId(node.id)}
          className={`organogram-node group relative inline-flex flex-col items-center bg-card gold-border p-4 rounded-lg w-48 shadow-lg cursor-pointer card-lift mx-[10px] mb-8 organogram-fade-in`}
          style={{ animationDelay: `${level * 0.2}s` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg" />
          <div className="w-20 h-20 rounded-full overflow-hidden gold-border mb-3 z-10 bg-navy relative">
            {node.imageUrl ? (
              <img src={node.imageUrl} alt={node.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary font-bold text-xl">{node.name.charAt(0)}</div>
            )}
          </div>
          <div className="text-center z-10 w-full relative">
            <h4 className="text-sm font-bold font-serif leading-tight text-foreground">{node.name}</h4>
            <div className="text-[11px] text-primary mt-1 font-semibold tracking-wider uppercase">{node.rank}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">{node.period}</div>
          </div>
        </div>
        {node.children && node.children.length > 0 && (
          <ul className="organogram-ul flex justify-center mt-6 relative">
            {node.children.map((child: any) => renderNode(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className={`transition-all duration-700 ${mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-muted/50 transition-colors gold-border bg-background"
        >
          <ArrowLeft className="h-4 w-4 text-primary" />
        </button>
        <div>
          <h2 className="text-2xl font-bold font-serif gold-text">{title}</h2>
          <p className="text-xs text-muted-foreground uppercase tracking-widest mt-1 min-h-[16px]">
            Command Hierarchy View
          </p>
        </div>
      </div>

      <div className="bg-navy-deep gold-border shadow-[inset_0_0_40px_rgba(0,0,0,0.5)] rounded-xl p-2 md:p-8 min-h-[600px] flex flex-col relative overflow-hidden">
        {treeData ? (
          <TransformWrapper
            initialScale={1}
            minScale={0.3}
            maxScale={3}
            centerOnInit
            wheel={{ step: 0.1 }}
          >
            {({ zoomIn, zoomOut, resetTransform }: any) => (
              <>
                <div className="absolute top-4 right-4 z-20 flex gap-2">
                  <button onClick={() => zoomIn()} className="p-2 bg-navy gold-border rounded hover:bg-muted transition-colors">
                    <ZoomIn className="w-4 h-4 text-primary" />
                  </button>
                  <button onClick={() => zoomOut()} className="p-2 bg-navy gold-border rounded hover:bg-muted transition-colors">
                    <ZoomOut className="w-4 h-4 text-primary" />
                  </button>
                  <button onClick={() => resetTransform()} className="p-2 bg-navy gold-border rounded hover:bg-muted transition-colors">
                    <Maximize className="w-4 h-4 text-primary" />
                  </button>
                </div>
                <TransformComponent wrapperClass="w-full h-full min-h-[600px] !cursor-grab active:!cursor-grabbing">
                  <div className="organogram-container flex justify-center items-start pt-10 min-w-max pb-32 px-20">
                    <ul className="organogram-ul m-0 p-0 flex justify-center">
                      {renderNode(treeData)}
                    </ul>
                  </div>
                </TransformComponent>
              </>
            )}
          </TransformWrapper>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12">
            <div className="w-16 h-16 rounded-full gold-border flex items-center justify-center bg-muted/20 mb-4 animate-pulse-slow">
              <span className="text-primary text-2xl">?</span>
            </div>
            <h3 className="text-lg font-bold font-serif text-muted-foreground">No personnel records found</h3>
          </div>
        )}
      </div>

      {selectedPerson && <ProfileModal
        person={selectedPerson}
        onClose={() => setSelectedId(null)}
      />}
      
      <style>{`
        .organogram-ul {
          padding-top: 30px; 
          position: relative;
          transition: all 0.5s;
        }

        .organogram-li {
          float: left; text-align: center;
          list-style-type: none;
          position: relative;
          padding: 30px 10px 0 10px;
          transition: all 0.5s;
        }

        .organogram-li::before, .organogram-li::after{
          content: "";
          position: absolute; top: 0; right: 50%;
          border-top: 1px solid hsl(var(--primary));
          width: 50%; height: 30px;
        }
        .organogram-li::after{
          right: auto; left: 50%;
          border-left: 1px solid hsl(var(--primary));
        }

        .organogram-li:only-child::after, .organogram-li:only-child::before {
          display: none;
        }

        .organogram-li:only-child{ padding-top: 0;}

        .organogram-li:first-child::before, .organogram-li:last-child::after{
          border: 0 none;
        }
        .organogram-li:last-child::before{
          border-right: 1px solid hsl(var(--primary));
          border-radius: 0 4px 0 0;
        }
        .organogram-li:first-child::after{
          border-radius: 4px 0 0 0;
        }

        .organogram-ul::before{
          content: "";
          position: absolute; top: 0; left: 50%;
          border-left: 1px solid hsl(var(--primary));
          width: 0; height: 30px;
          transform: translateX(-50%);
        }

        .organogram-fade-in {
          animation: fade-down-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
          transform: translateY(-20px);
        }
        
        @keyframes fade-down-in {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
