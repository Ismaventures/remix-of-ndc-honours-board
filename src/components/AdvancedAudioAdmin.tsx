import React, { useState, useRef, useEffect } from 'react';
import { useAudioStore, getAudioUrl, AudioTrack } from '@/hooks/useAudioStore';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Edit2, Play, Pause, Save, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function AdvancedAudioAdmin() {
  const { tracks, assignments, addTrack, deleteTrack, renameTrack, setAssignment, loadTracks } = useAudioStore();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const previewPlayTokenRef = useRef(0);

  useEffect(() => {
    loadTracks();
  }, [loadTracks]);

  // Load physical URLs for previewing tracks locally
  useEffect(() => {
    const loadUrls = async () => {
      const entries = await Promise.all(
        tracks.map(async (track) => {
          const url = await getAudioUrl(track.id);
          return [track.id, url] as const;
        }),
      );

      const urls: Record<string, string> = {};
      for (const [id, url] of entries) {
        if (url) urls[id] = url;
      }

      setAudioUrls((previous) => {
        Object.values(previous).forEach((oldUrl) => {
          if (oldUrl.startsWith('blob:') && !Object.values(urls).includes(oldUrl)) {
            URL.revokeObjectURL(oldUrl);
          }
        });
        return urls;
      });
    };
    void loadUrls();
  }, [tracks]);

  useEffect(() => {
    return () => {
      Object.values(audioUrls).forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [audioUrls]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    
    // Only mp3, wav
    if (!['audio/mpeg', 'audio/wav'].includes(file.type)) {
      alert("Only .mp3 and .wav files are supported.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadStatus('Audio is being uploaded...');
      await addTrack(file, file.name.split('.')[0]);
      setUploadStatus('Upload completed');
    } catch {
      setUploadStatus('Upload failed');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadStatus(null), 3000);
    }
  };

  const handlePlayPreview = async (id: string, url?: string) => {
    if (!url) {
      setUploadStatus('Audio preview unavailable. Re-upload or wait for sync.');
      setTimeout(() => setUploadStatus(null), 2500);
      return;
    }

    const token = Date.now();
    previewPlayTokenRef.current = token;

    if (playingId === id) {
      previewAudioRef.current?.pause();
      setPlayingId(null);
    } else {
      const audio = previewAudioRef.current;
      if (!audio) return;

      audio.pause();
      audio.src = url;
      audio.currentTime = 0;

      try {
        await audio.play();
        if (previewPlayTokenRef.current === token) {
          setPlayingId(id);
        }
      } catch (error) {
        const isAbort =
          error instanceof DOMException && error.name === 'AbortError';
        if (!isAbort) {
          setUploadStatus('Unable to play preview in this browser state.');
          setTimeout(() => setUploadStatus(null), 2500);
        }
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
            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-primary/20 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/50 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              <Upload className="w-4 h-4" /> Upload Audio
            </Button>
            <input type="file" accept=".mp3,.wav" className="hidden" ref={fileInputRef} onChange={handleUpload} />
          </div>

          {uploadStatus && (
            <p className={`text-xs ${uploadStatus === 'Upload completed' ? 'text-green-500' : uploadStatus === 'Upload failed' ? 'text-destructive' : 'text-primary/90'}`}>
              {uploadStatus}
            </p>
          )}

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
                          disabled={!audioUrls[track.id]}
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
