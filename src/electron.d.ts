export {};

declare global {
  interface Window {
    electronAPI: {
      querySqlite(queryDesc: {
        table: string;
        method: 'select' | 'insert' | 'update' | 'delete' | 'upsert';
        fields?: string;
        payload?: any;
        filters?: Array<{ type: string; column: string; value: any }>;
        order?: { column: string; ascending: boolean } | null;
        range?: { from: number; to: number } | null;
      }): Promise<{ data: any; error: string | null }>;
      saveMedia(
        bucketName: string,
        filePath: string,
        fileArray: Uint8Array,
        fileType: string
      ): Promise<{ success: boolean; url?: string; error?: string }>;
      signIn(
        email: string,
        password: string
      ): Promise<{ success: boolean; userId?: string; error?: string }>;
      signUp(
        email: string,
        password: string
      ): Promise<{ success: boolean; userId?: string; error?: string }>;

      // Google Drive sync
      driveAuth(): Promise<{
        authenticated: boolean;
        email?: string;
        name?: string;
        picture?: string;
        error?: string;
      }>;
      driveSignOut(): Promise<{ authenticated: false }>;
      driveAuthStatus(): Promise<{
        authenticated: boolean;
        email?: string;
        name?: string;
        picture?: string;
      }>;
      drivePush(): Promise<{
        success: boolean;
        uploaded?: number;
        skipped?: number;
        errors?: number;
        error?: string;
      }>;
      drivePull(): Promise<{
        success: boolean;
        downloaded?: number;
        skipped?: number;
        errors?: number;
        message?: string;
        error?: string;
      }>;
      driveSyncStatus(): Promise<{
        lastPushTime: string | null;
        lastPullTime: string | null;
        filesUploaded?: number;
        filesDownloaded?: number;
      }>;
      onDriveSyncProgress(
        callback: (data: {
          phase: 'uploading' | 'downloading';
          file: string;
          current?: number;
          total?: number;
        }) => void
      ): () => void;
      onDriveSyncReload(callback: () => void): () => void;
    };
  }
}
