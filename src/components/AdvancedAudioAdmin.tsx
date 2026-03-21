import React, { useState, useRef, useEffect } from 'react';
import { useAudioStore, getAudioUrl, AudioTrack } from '@/hooks/useAudioStore';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Edit2, Play, Pause, Save, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function AdvancedAudioAdmin() {
  const { tracks, assignments, addTrack, deleteTrack, renameTrack, setAssignment } = useAudioStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Load physical URLs for previewing tracks locally
  useEffect(() => {
    const loadUrls = async () => {
      const urls: Record<string, string> = {};
      for (const track of tracks) {
        const url = await getAudioUrl(track.id);
        if (url) urls[track.id] = url;
      }
      setAudioUrls(urls);
    };
    loadUrls();
  }, [tracks]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    
    // Only mp3, wav
    if (!['audio/mpeg', 'audio/wav'].includes(file.type)) {
      alert("Only .mp3 and .wav files are supported.");
      return;
    }
    
    await addTrack(file, file.name.split('.')[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePlayPreview = (id: string, url: string) => {
    if (playingId === id) {
      previewAudioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.src = url;
        previewAudioRef.current.play();
        setPlayingId(id);
      }
    }
  };
  
  const startEdit = (track: AudioTrack) => {
      setEditingId(track.id);
      setEditName(track.name);
  };
  
  const saveEdit = () => {
      if (editingId && editName.trim()) {
          renameTrack(editingId, editName);
      }
      setEditingId(null);
  };

  const AssignmentSelector = ({ label, contextKey }: { label: string, contextKey: keyof typeof assignments }) => (
    <div className="flex items-center justify-between p-3 bg-background/50 border border-primary/10 rounded-md">
       <span className="text-sm font-medium">{label}</span>
       <select
         value={assignments[contextKey] || ''}
         onChange={(e) => setAssignment(contextKey, e.target.value || null)}
         className="bg-accent/50 border border-primary/20 text-sm p-1.5 rounded-md focus:outline-none focus:border-primary w-48 text-muted-foreground"
       >
          <option value="">None</option>
          {tracks.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
       </select>
    </div>
  );

  return (
    <div className="bg-card/50 gold-border rounded-xl p-6 space-y-8">
      <div>
        <h3 className="text-xl font-serif gold-text mb-2">Advanced Background Audio System</h3>
        <p className="text-sm text-muted-foreground">
          Upload military-appropriate ambient tones, ceremonial instrumentals, and assign them globally or contextually.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
        {/* Upload Storage Area */}
        <div className="space-y-4">
          <h4 className="text-md font-semibold text-primary/80 uppercase tracking-widest border-b border-primary/20 pb-2">Audio Storage</h4>
          <div className="flex items-center gap-4">
            <Button onClick={() => fileInputRef.current?.click()} className="bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/50 transition-all flex items-center gap-2">
              <Upload className="w-4 h-4" /> Upload Local Audio
            </Button>
            <input type="file" accept=".mp3,.wav" className="hidden" ref={fileInputRef} onChange={handleUpload} />
          </div>

          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {tracks.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">No local audio tracks uploaded yet.</p>
            ) : tracks.map((track) => (
               <div key={track.id} className="flex items-center justify-between p-2 rounded-md bg-background border border-border group hover:border-primary/50 transition-colors">
                  
                  {editingId === track.id ? (
                      <div className="flex items-center gap-2 w-full pr-2">
                          <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm" />
                          <Button size="icon" variant="ghost" onClick={saveEdit} className="h-8 w-8 text-green-500 hover:bg-green-500/20"><Save className="w-4 h-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingId(null)} className="h-8 w-8 text-red-500 hover:bg-red-500/20"><X className="w-4 h-4" /></Button>
                      </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Button
                           size="icon"
                           variant="ghost"
                           className="w-8 h-8 rounded-full bg-accent/50 text-primary hover:bg-primary hover:text-primary-foreground shrink-0"
                           onClick={() => handlePlayPreview(track.id, audioUrls[track.id])}
                        >
                           {playingId === track.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <div className="flex flex-col overflow-hidden">
                           <span className="text-sm font-medium truncate">{track.name}</span>
                           <span className="text-[10px] text-muted-foreground truncate">{track.filename}</span>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                         <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => startEdit(track)}>
                            <Edit2 className="w-3.5 h-3.5" />
                         </Button>
                         <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={() => deleteTrack(track.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                         </Button>
                      </div>
                    </>
                  )}
               </div>
            ))}
          </div>
        </div>

        {/* Assignments Context Area */}
        <div className="space-y-4">
           <h4 className="text-md font-semibold text-primary/80 uppercase tracking-widest border-b border-primary/20 pb-2">Assignments</h4>
           <div className="space-y-3">
              <AssignmentSelector label="Preloader (Boot) Sequence" contextKey="preloader" />
              <AssignmentSelector label="Global Auto Display Mode" contextKey="globalAuto" />
              <AssignmentSelector label="FWC (Fellows) Context" contextKey="distinguished_fellows_fwc" />
              <AssignmentSelector label="FDC (Fellows) Context" contextKey="distinguished_fellows_fdc" />
              <AssignmentSelector label="Directing Staff Context" contextKey="directing_staff" />
              <AssignmentSelector label="Allied Officers Context" contextKey="allied_officers" />
           </div>
        </div>

      </div>
      
      {/* Hidden audio element purely for admin previews */}
      <audio ref={previewAudioRef} onEnded={() => setPlayingId(null)} />
    </div>
  );
}
