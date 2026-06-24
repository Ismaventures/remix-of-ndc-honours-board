import { type Session } from '@supabase/supabase-js';

// Request queue simulation to maintain interface compatibility
export async function withRequestQueue<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
): Promise<T> {
  return await operation();
}

export function isInvalidRefreshTokenError(error: unknown): boolean {
  return false;
}

export async function clearBrokenSupabaseSession(): Promise<void> {
  localStorage.removeItem('ndc_admin_session');
  authListeners.forEach(cb => cb('SIGNED_OUT', null));
}

export async function getSafeSupabaseSession(): Promise<Session | null> {
  const sessionStr = localStorage.getItem('ndc_admin_session');
  if (sessionStr) {
    try {
      return JSON.parse(sessionStr);
    } catch {
      return null;
    }
  }
  return null;
}

const authListeners = new Set<Function>();

class MockStorageBucket {
  private bucketName: string;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
  }

  async upload(filePath: string, file: File | Blob | ArrayBuffer, options?: any) {
    try {
      let buffer: ArrayBuffer;
      let type = 'application/octet-stream';

      if (file instanceof File) {
        buffer = await file.arrayBuffer();
        type = file.type;
      } else if (file instanceof Blob) {
        buffer = await file.arrayBuffer();
        type = file.type;
      } else if (file instanceof ArrayBuffer) {
        buffer = file;
      } else {
        throw new Error('Unsupported upload file type');
      }

      const fileArray = new Uint8Array(buffer);
      const result = await window.electronAPI.saveMedia(this.bucketName, filePath, fileArray, type);

      if (!result.success) {
        return { data: null, error: { message: result.error || 'Upload failed' } };
      }

      return { data: { path: filePath }, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message || String(err) } };
    }
  }

  getPublicUrl(filePath: string) {
    return {
      data: {
        publicUrl: `local-media://${this.bucketName}/${filePath}`
      }
    };
  }

  async remove(paths: string[]) {
    return { data: null, error: null };
  }
}

class MockQueryBuilder {
  private table: string;
  private method: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private fields = '*';
  private payload: any = null;
  private filters: Array<{ type: string; column: string; value: any }> = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private rangeLimit: { from: number; to: number } | null = null;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields = '*') {
    this.method = 'select';
    this.fields = fields;
    return this;
  }

  insert(payload: any) {
    this.method = 'insert';
    this.payload = payload;
    return this;
  }

  update(payload: any) {
    this.method = 'update';
    this.payload = payload;
    return this;
  }

  delete() {
    this.method = 'delete';
    return this;
  }

  upsert(payload: any, options?: any) {
    this.method = 'upsert';
    this.payload = payload;
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push({ type: 'eq', column, value });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push({ type: 'neq', column, value });
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push({ type: 'in', column, value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  range(from: number, to: number) {
    this.rangeLimit = { from, to };
    return this;
  }

  limit(count: number) {
    this.rangeLimit = { from: 0, to: count - 1 };
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const result = await window.electronAPI.querySqlite({
        table: this.table,
        method: this.method,
        fields: this.fields,
        payload: this.payload,
        filters: this.filters,
        order: this.orderBy,
        range: this.rangeLimit
      });

      if (result.error) {
        throw new Error(result.error);
      }

      let data = result.data;
      if (this.isSingle) {
        data = data && data.length > 0 ? data[0] : null;
      } else if (this.isMaybeSingle) {
        data = data && data.length > 0 ? data[0] : null;
      }

      const response = { data, error: null };
      if (onfulfilled) return onfulfilled(response);
      return response;
    } catch (err: any) {
      const response = { data: null, error: { message: err.message || String(err) } };
      if (onrejected) return onrejected(response);
      if (onfulfilled) return onfulfilled(response);
      return response;
    }
  }
}

export const supabase = {
  from(table: string) {
    return new MockQueryBuilder(table);
  },

  storage: {
    from(bucketName: string) {
      return new MockStorageBucket(bucketName);
    }
  },

  auth: {
    async getSession() {
      const session = await getSafeSupabaseSession();
      return { data: { session }, error: null };
    },

    async signInWithPassword({ email, password }: any) {
      const result = await window.electronAPI.signIn(email, password);
      if (result.success) {
        const session: Session = {
          access_token: 'mock-token-session',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: result.userId || 'admin-uuid',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            email
          }
        };
        localStorage.setItem('ndc_admin_session', JSON.stringify(session));
        authListeners.forEach(cb => cb('SIGNED_IN', session));
        return { data: { session }, error: null };
      }
      return { data: { session: null }, error: { message: result.error || 'Invalid credentials' } };
    },

    async signUp({ email, password }: any) {
      const result = await window.electronAPI.signUp(email, password);
      if (result.success) {
        const session: Session = {
          access_token: 'mock-token-session',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: result.userId || 'admin-uuid',
            app_metadata: {},
            user_metadata: {},
            aud: 'authenticated',
            created_at: new Date().toISOString(),
            email
          }
        };
        localStorage.setItem('ndc_admin_session', JSON.stringify(session));
        authListeners.forEach(cb => cb('SIGNED_IN', session));
        return { data: { session }, error: null };
      }
      return { data: { session: null }, error: { message: result.error || 'Sign up failed' } };
    },

    async signOut() {
      localStorage.removeItem('ndc_admin_session');
      authListeners.forEach(cb => cb('SIGNED_OUT', null));
      return { error: null };
    },

    onAuthStateChange(callback: (event: string, session: any) => void) {
      authListeners.add(callback);
      getSafeSupabaseSession().then((session) => {
        callback('INITIAL_SESSION', session);
      });
      return {
        data: {
          subscription: {
            unsubscribe() {
              authListeners.delete(callback);
            }
          }
        }
      };
    }
  },

  channel(name: string) {
    return {
      on(event: string, filter: any, callback: Function) {
        return this;
      },
      subscribe() {
        return this;
      }
    };
  },

  removeChannel(channel: any) {
    // No-op
  }
};
