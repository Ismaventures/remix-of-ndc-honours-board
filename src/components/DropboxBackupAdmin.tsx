import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Loader2, CheckCircle2, AlertCircle, LogOut, FileDown, FileUp, User } from 'lucide-react';

const DROPBOX_FOLDER_NAME = 'Apps/NDC-Honours-Board-Backup';

interface DropboxAuthStatus {
  authenticated: boolean;
  email?: string;
  name?: string;
  picture?: string;
}

interface SyncProgress {
  phase: 'uploading' | 'downloading';
  file: string;
  current?: number;
  total?: number;
}

export function DropboxBackupAdmin() {
  const [authStatus, setAuthStatus] = useState<DropboxAuthStatus>({ authenticated: false });
  const [syncStatus, setSyncStatus] = useState<{ lastPushTime: string | null; lastPullTime: string | null }>({
    lastPushTime: null,
    lastPullTime: null,
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Check auth and sync status on mount
  useEffect(() => {
    checkAuthAndStatus();
  }, []);

  const checkAuthAndStatus = async () => {
    if (!window.electronAPI) {
      setIsCheckingAuth(false);
      return;
    }
    try {
      const auth = await window.electronAPI.dropboxAuthStatus();
      setAuthStatus(auth);

      const sync = await window.electronAPI.dropboxSyncStatus();
      setSyncStatus(sync);
    } catch (err: any) {
      console.error('Error fetching Dropbox status:', err);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Subscribe to progress notifications
  useEffect(() => {
    if (!window.electronAPI) return;

    const cleanup = window.electronAPI.onDropboxSyncProgress((data) => {
      setProgress(data);
    });

    return () => {
      cleanup();
    };
  }, []);

  const handleSignIn = async () => {
    if (!window.electronAPI) return;
    setSyncError(null);
    setSyncSuccess(null);
    try {
      const res = await window.electronAPI.dropboxAuth();
      if (res.authenticated) {
        setAuthStatus(res);
        setSyncSuccess('Successfully connected to Dropbox!');
        // Refresh sync times
        const sync = await window.electronAPI.dropboxSyncStatus();
        setSyncStatus(sync);
      } else if (res.error) {
        setSyncError(res.error);
      }
    } catch (err: any) {
      setSyncError(err.message || 'Authorization failed.');
    }
  };

  const handleSignOut = async () => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.dropboxSignOut();
      setAuthStatus({ authenticated: false });
      setSyncSuccess('Disconnected Dropbox account.');
      setProgress(null);
    } catch (err: any) {
      setSyncError('Failed to sign out.');
    }
  };

  const handlePush = async () => {
    if (!window.electronAPI) return;
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    setProgress(null);
    try {
      const res = await window.electronAPI.dropboxPush();
      if (res.success) {
        if (res.uploaded === 0) {
          setSyncSuccess('Upload complete! Local files are already up-to-date with Dropbox.');
        } else {
          setSyncSuccess(`Upload complete! Successfully backed up ${res.uploaded} file(s) to Dropbox.`);
        }
        const sync = await window.electronAPI.dropboxSyncStatus();
        setSyncStatus(sync);
      } else {
        setSyncError(res.error || 'Failed to complete cloud backup upload.');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Error occurred during backup upload.');
    } finally {
      setIsSyncing(false);
      setProgress(null);
    }
  };

  const handlePull = async () => {
    if (!window.electronAPI) return;
    setIsSyncing(true);
    setSyncError(null);
    setSyncSuccess(null);
    setProgress(null);
    try {
      const res = await window.electronAPI.dropboxPull();
      if (res.success) {
        if (res.downloaded === 0) {
          setSyncSuccess('Download sync complete! Local files are already up-to-date with Dropbox.');
        } else {
          setSyncSuccess(`Sync download complete! Updated ${res.downloaded} file(s) from Dropbox.`);
        }
        const sync = await window.electronAPI.dropboxSyncStatus();
        setSyncStatus(sync);
      } else {
        setSyncError(res.error || 'Failed to sync download from cloud backup.');
      }
    } catch (err: any) {
      setSyncError(err.message || 'Error occurred during download sync.');
    } finally {
      setIsSyncing(false);
      setProgress(null);
    }
  };

  if (!window.electronAPI) {
    return (
      <div className="p-6 text-center border border-dashed rounded-xl bg-slate-50 text-slate-500">
        <CloudOff className="mx-auto w-12 h-12 mb-3 text-slate-400" />
        <h3 className="font-semibold text-lg">Desktop Integration Only</h3>
        <p className="text-sm mt-1 max-w-md mx-auto">
          Dropbox backup is only available when running the packaged application on your system. It cannot be accessed in raw browser mode.
        </p>
      </div>
    );
  }

  if (isCheckingAuth) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-[#002060]" />
        <p className="text-sm text-slate-500 mt-3">Verifying Dropbox Connection...</p>
      </div>
    );
  }

  return (
    <div className="view-enter space-y-6">
      <div className="rounded-[24px] border border-slate-200 bg-white shadow-md p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5 gap-4">
          <div>
            <h4 className="text-xl font-bold text-[#002060] flex items-center gap-2">
              <Cloud className="w-6 h-6 text-blue-600" />
              Dropbox Cloud Backup & Sync
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Backup your local database and course images to Dropbox. Sync across multiple systems running this app.
            </p>
          </div>
          
          {authStatus.authenticated && (
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-xs font-medium transition-all"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect Dropbox
            </button>
          )}
        </div>

        {/* Sync Warnings / Credentials Guidance */}
        {!authStatus.authenticated && (
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex gap-3 text-blue-900 text-xs leading-relaxed">
            <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-blue-950 mb-1">Connecting for the first time?</p>
              <p>
                To secure your backups, this application connects to your Dropbox account. It stores files in your app folder under <strong className="text-blue-950">{DROPBOX_FOLDER_NAME}</strong>:
              </p>
              <ul className="list-disc pl-4 mt-1.5 space-y-0.5">
                <li>Your personnel database file (SQLite)</li>
                <li>Your local media files (surnames matching, portraits, audio tracks)</li>
              </ul>
              <p className="mt-2 text-blue-700 font-medium">
                Make sure you have placed a valid Dropbox credentials JSON file named `dropbox-credentials.json` in the application Resources folder.
              </p>
            </div>
          </div>
        )}

        {/* Authentication State Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-xl border border-slate-100 p-5 bg-slate-50/50 flex flex-col justify-center">
            {authStatus.authenticated ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#002060]/5 text-[#002060] border border-[#002060]/10 flex items-center justify-center shadow-sm shrink-0">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <h5 className="font-semibold text-sm text-slate-800">{authStatus.name || 'Dropbox Connected'}</h5>
                  <p className="text-xs text-slate-500 mt-0.5">{authStatus.email}</p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-green-700 font-semibold px-2 py-0.5 bg-green-50 border border-green-150 rounded-full mt-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse"></span>
                    Ready to backup and sync
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4 space-y-3">
                <CloudOff className="mx-auto w-10 h-10 text-slate-400" />
                <div>
                  <h5 className="font-semibold text-sm text-slate-800">Dropbox Not Connected</h5>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Sign in to connect Dropbox and authorize backups for this device.
                  </p>
                </div>
                <button
                  onClick={handleSignIn}
                  className="px-5 py-2 bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-800 hover:to-blue-900 text-white font-medium text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
                >
                  <Cloud className="w-4 h-4" />
                  Connect Dropbox
                </button>
              </div>
            )}
          </div>

          {/* Sync Stats Card */}
          <div className="rounded-xl border border-slate-100 p-5 bg-slate-50/50 flex flex-col justify-between">
            <h5 className="font-semibold text-xs text-slate-400 uppercase tracking-wider">Sync Info & Times</h5>
            <div className="mt-3 space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                <span className="text-slate-500">Last Upload:</span>
                <span className="font-semibold text-slate-800">
                  {syncStatus.lastPushTime ? new Date(syncStatus.lastPushTime).toLocaleString() : 'Never'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Last Download:</span>
                <span className="font-semibold text-slate-800">
                  {syncStatus.lastPullTime ? new Date(syncStatus.lastPullTime).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>App Folder:</span>
              <code className="bg-slate-150 px-1.5 py-0.5 rounded text-slate-600 text-[10px] overflow-hidden text-ellipsis max-w-[150px]">
                {DROPBOX_FOLDER_NAME}
              </code>
            </div>
          </div>
        </div>

        {/* Notifications Area */}
        {syncError && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-150 flex gap-2 text-xs text-red-800">
            <AlertCircle className="w-4.5 h-4.5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Sync Failed: </span>
              {syncError}
            </div>
          </div>
        )}
        {syncSuccess && (
          <div className="p-4 rounded-xl bg-green-50 border border-green-150 flex gap-2 text-xs text-green-800">
            <CheckCircle2 className="w-4.5 h-4.5 text-green-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Success: </span>
              {syncSuccess}
            </div>
          </div>
        )}

        {/* Action Panel */}
        {authStatus.authenticated && (
          <div className="border-t border-slate-100 pt-6">
            <h5 className="font-semibold text-sm text-slate-700 mb-4">Manual Operations</h5>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Upload Card */}
              <div className="p-5 border border-slate-100 rounded-xl bg-white hover:shadow-md hover:border-blue-150 transition-all group flex flex-col justify-between">
                <div>
                  <h6 className="font-bold text-sm text-[#002060] flex items-center gap-1.5">
                    <FileUp className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform" />
                    Upload Local Data to Cloud
                  </h6>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Saves your local database (`database.sqlite`) and all directories under `local_media/` up to Dropbox. Existing files are updated if modified. Use this when you have added photos or personnel entries locally and want to make sure they are safely stored in the cloud.
                  </p>
                </div>
                <button
                  onClick={handlePush}
                  disabled={isSyncing}
                  className="w-full mt-4 py-2 border border-[#002060] hover:bg-blue-50 text-[#002060] font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <FileUp className="w-3.5 h-3.5" />
                      Upload to Dropbox
                    </>
                  )}
                </button>
              </div>

              {/* Download Card */}
              <div className="p-5 border border-slate-100 rounded-xl bg-white hover:shadow-md hover:border-red-150 transition-all group flex flex-col justify-between">
                <div>
                  <h6 className="font-bold text-sm text-[#FF0000] flex items-center gap-1.5">
                    <FileDown className="w-4 h-4 text-red-600 group-hover:scale-110 transition-transform" />
                    Download Cloud Data to Local
                  </h6>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                    Downloads any newer database or media files present in your Dropbox app folder. It is safe: it only downloads files that are missing locally or have been updated on Dropbox. Use this to pull database records and photos added on other systems.
                  </p>
                </div>
                <button
                  onClick={handlePull}
                  disabled={isSyncing}
                  className="w-full mt-4 py-2 border border-[#FF0000] hover:bg-red-50 text-[#FF0000] font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSyncing ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Syncing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin-hover" />
                      Download from Dropbox
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sync Progress overlay/area */}
        {isSyncing && progress && (
          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 mt-6 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-blue-900 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700" />
                {progress.phase === 'uploading' ? 'Uploading to Dropbox...' : 'Downloading from Dropbox...'}
              </span>
              {progress.current && progress.total ? (
                <span className="font-mono text-blue-700">
                  {progress.current} / {progress.total} files ({Math.round((progress.current / progress.total) * 100)}%)
                </span>
              ) : null}
            </div>

            {/* Progress bar */}
            {progress.current && progress.total && (
              <div className="w-full bg-blue-150 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all duration-300"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
            )}

            <div className="text-[10px] text-slate-500 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
              Active: {progress.file}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
