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
    };
  }
}
