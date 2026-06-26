/* ─────────────────────────────────────────────────────────────
   Local Database Layer — replaces Supabase with IndexedDB
   ───────────────────────────────────────────────────────────── */

const DB_NAME = 'ndc-honours-board';
const DB_VERSION = 2;

const getElectronAPI = () => {
  return typeof window !== 'undefined' ? (window as any).electronAPI : null;
};

export { openDb as openLocalDb };

const TABLES = [
  'personnel',
  'commandants',
  'visits',
  'audio_tracks',
  'audio_assignments',
  'global_site_control',
  'device_clients',
  'device_control_commands',
  'museum_artifacts',
  'museum_tours',
  'museum_tour_steps',
  'museum_about_items',
  'museum_sections',
  'museum_collection_wings',
  'museum_tour_routes',
  'ui_settings',
  'shared_ui_settings',
] as const;

type TableName = (typeof TABLES)[number];

let dbInstance: IDBDatabase | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of TABLES) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: 'id' });
          if (name === 'personnel') {
            store.createIndex('seniority_order', 'seniority_order');
            store.createIndex('category', 'category');
            store.createIndex('decoration', 'decoration');
          }
          if (name === 'commandants') {
            store.createIndex('tenure_start', 'tenure_start');
          }
          if (name === 'visits') {
            store.createIndex('date', 'date');
          }
          if (name === 'museum_artifacts') {
            store.createIndex('gallery_category', 'gallery_category');
            store.createIndex('is_published', 'is_published');
          }
          if (name === 'museum_tours') {
            store.createIndex('is_published', 'is_published');
          }
          if (name === 'museum_tour_steps') {
            store.createIndex('tour_id', 'tour_id');
          }
          if (name === 'ui_settings') {
            store.createIndex('setting_key', 'setting_key');
          }
          if (name === 'shared_ui_settings') {
            store.createIndex('setting_key', 'setting_key');
          }
          if (name === 'audio_assignments') {
            store.createIndex('context', 'context');
          }
        }
      }
    };
    req.onsuccess = () => {
      dbInstance = req.result;
      resolve(req.result);
    };
    req.onerror = () => reject(req.error);
  });
}

async function getAll(storeName: TableName): Promise<any[]> {
  const electronAPI = getElectronAPI();
  if (electronAPI) {
    const res = await electronAPI.querySqlite({ table: storeName, method: 'select' });
    if (res.error) throw new Error(typeof res.error === 'string' ? res.error : res.error.message);
    return res.data ?? [];
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result ?? []);
    req.onerror = () => reject(req.error);
  });
}

async function getById(storeName: TableName, id: string): Promise<any | undefined> {
  const electronAPI = getElectronAPI();
  if (electronAPI) {
    const res = await electronAPI.querySqlite({
      table: storeName,
      method: 'select',
      filters: [{ column: 'id', value: id, type: 'eq' }]
    });
    if (res.error) throw new Error(typeof res.error === 'string' ? res.error : res.error.message);
    return res.data?.[0];
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function put(storeName: TableName, data: any): Promise<void> {
  const electronAPI = getElectronAPI();
  if (electronAPI) {
    const res = await electronAPI.querySqlite({
      table: storeName,
      method: 'upsert',
      payload: data
    });
    if (res.error) throw new Error(typeof res.error === 'string' ? res.error : res.error.message);
    return;
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function putAll(storeName: TableName, items: any[]): Promise<void> {
  const electronAPI = getElectronAPI();
  if (electronAPI) {
    const res = await electronAPI.querySqlite({
      table: storeName,
      method: 'upsert',
      payload: items
    });
    if (res.error) throw new Error(typeof res.error === 'string' ? res.error : res.error.message);
    return;
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteById(storeName: TableName, id: string): Promise<void> {
  const electronAPI = getElectronAPI();
  if (electronAPI) {
    const res = await electronAPI.querySqlite({
      table: storeName,
      method: 'delete',
      filters: [{ column: 'id', value: id, type: 'eq' }]
    });
    if (res.error) throw new Error(typeof res.error === 'string' ? res.error : res.error.message);
    return;
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function clearStore(storeName: TableName): Promise<void> {
  const electronAPI = getElectronAPI();
  if (electronAPI) {
    const res = await electronAPI.querySqlite({
      table: storeName,
      method: 'delete',
      filters: []
    });
    if (res.error) throw new Error(typeof res.error === 'string' ? res.error : res.error.message);
    return;
  }

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    store.clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ─── Blob Storage (images, audio) ─── */

const BLOB_STORE = 'blobs';

function openBlobDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ndc-blobs', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(BLOB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveBlob(key: string, blob: Blob): Promise<void> {
  const db = await openBlobDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    tx.objectStore(BLOB_STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getBlob(key: string): Promise<Blob | undefined> {
  const db = await openBlobDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readonly');
    const req = tx.objectStore(BLOB_STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBlob(key: string): Promise<void> {
  const db = await openBlobDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    tx.objectStore(BLOB_STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteBlobByPrefix(prefix: string): Promise<void> {
  const db = await openBlobDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(BLOB_STORE, 'readwrite');
    const store = tx.objectStore(BLOB_STORE);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        if (typeof cursor.key === 'string' && cursor.key.startsWith(prefix)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ─── In-memory event emitters for realtime replacement ─── */
type ChangeCallback = (table: string) => void;
const changeListeners: Set<ChangeCallback> = new Set();

export function onTableChange(callback: ChangeCallback): () => void {
  changeListeners.add(callback);
  return () => changeListeners.delete(callback);
}

function notifyChange(table: string) {
  for (const cb of changeListeners) {
    try { cb(table); } catch { /* ignore */ }
  }
}

/* ─── Query Builder ─── */

type FilterFn = (row: any) => boolean;

interface OrderSpec {
  column: string;
  ascending: boolean;
}

class QueryBuilder {
  private tableName: TableName;
  private selectColumns: string | null = null;
  private filters: FilterFn[] = [];
  private sqlFilters: Array<{ column: string; value: any; type: string }> = [];
  private orders: OrderSpec[] = [];
  private rangeStart: number | null = null;
  private rangeEnd: number | null = null;
  private limitCount: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;

  constructor(tableName: TableName) {
    this.tableName = tableName;
  }

  select(columns?: string) {
    this.selectColumns = columns ?? '*';
    return this;
  }

  eq(column: string, value: any) {
    this.filters.push((row) => row[column] === value);
    this.sqlFilters.push({ column, value, type: 'eq' });
    return this;
  }

  neq(column: string, value: any) {
    this.filters.push((row) => row[column] !== value);
    this.sqlFilters.push({ column, value, type: 'neq' });
    return this;
  }

  gt(column: string, value: any) {
    this.filters.push((row) => row[column] > value);
    this.sqlFilters.push({ column, value, type: 'gt' });
    return this;
  }

  gte(column: string, value: any) {
    this.filters.push((row) => row[column] >= value);
    this.sqlFilters.push({ column, value, type: 'gte' });
    return this;
  }

  lt(column: string, value: any) {
    this.filters.push((row) => row[column] < value);
    this.sqlFilters.push({ column, value, type: 'lt' });
    return this;
  }

  lte(column: string, value: any) {
    this.filters.push((row) => row[column] <= value);
    this.sqlFilters.push({ column, value, type: 'lte' });
    return this;
  }

  like(column: string, pattern: string) {
    const regex = new RegExp(
      '^' + pattern.replace(/%/g, '.*').replace(/_/g, '.') + '$',
      'i',
    );
    this.filters.push((row) => regex.test(String(row[column] ?? '')));
    this.sqlFilters.push({ column, value: pattern, type: 'like' });
    return this;
  }

  ilike(column: string, pattern: string) {
    return this.like(column, pattern);
  }

  not(column: string, op: string, value: any) {
    if (op === 'is' || op === 'eq') {
      this.filters.push((row) => row[column] !== value);
      this.sqlFilters.push({ column, value, type: 'neq' });
    } else if (op === 'in') {
      this.filters.push((row) => !(value as any[]).includes(row[column]));
      this.sqlFilters.push({ column, value, type: 'not_in' });
    }
    return this;
  }

  in(column: string, values: any[]) {
    this.filters.push((row) => values.includes(row[column]));
    this.sqlFilters.push({ column, value: values, type: 'in' });
    return this;
  }

  is(column: string, value: any) {
    if (value === null) {
      this.filters.push((row) => row[column] == null);
      this.sqlFilters.push({ column, value: null, type: 'eq' });
    } else {
      this.filters.push((row) => row[column] === value);
      this.sqlFilters.push({ column, value, type: 'eq' });
    }
    return this;
  }

  order(column: string, opts?: { ascending?: boolean }) {
    this.orders.push({ column, ascending: opts?.ascending ?? true });
    return this;
  }

  range(from: number, to: number) {
    this.rangeStart = from;
    this.rangeEnd = to;
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
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

  private selectFields(row: any): any {
    if (this.selectColumns === '*' || !this.selectColumns) return row;
    const cols = this.selectColumns.split(',').map((c) => c.trim());
    const result: any = {};
    for (const col of cols) {
      if (col in row) result[col] = row[col];
    }
    return result;
  }

  private async executeQuery(): Promise<{ data: any; error: any }> {
    const electronAPI = getElectronAPI();
    if (electronAPI) {
      let range = undefined;
      if (this.rangeStart !== null && this.rangeEnd !== null) {
        range = { from: this.rangeStart, to: this.rangeEnd };
      } else if (this.limitCount !== null) {
        range = { from: 0, to: this.limitCount - 1 };
      }

      const queryDesc = {
        table: this.tableName,
        method: 'select',
        fields: this.selectColumns || '*',
        filters: this.sqlFilters,
        order: this.orders.length > 0 ? this.orders[0] : undefined,
        range,
      };

      const res = await electronAPI.querySqlite(queryDesc);
      if (res.error) {
        return { data: null, error: typeof res.error === 'string' ? { message: res.error } : res.error };
      }

      let rows = res.data ?? [];
      if (this.isSingle) {
        return { data: rows[0] ?? null, error: null };
      }
      if (this.isMaybeSingle) {
        return { data: rows[0] ?? null, error: null };
      }
      return { data: rows, error: null };
    }

    let rows = await getAll(this.tableName);

    for (const filter of this.filters) {
      rows = rows.filter(filter);
    }

    if (this.orders.length > 0) {
      rows.sort((a, b) => {
        for (const { column, ascending } of this.orders) {
          // Support both snake_case and camelCase column names
          const aVal = a[column] ?? a[column.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
          const bVal = b[column] ?? b[column.replace(/_([a-z])/g, (_, c) => c.toUpperCase())];
          if (aVal == null && bVal == null) continue;
          if (aVal == null) return ascending ? -1 : 1;
          if (bVal == null) return ascending ? 1 : -1;
          if (aVal < bVal) return ascending ? -1 : 1;
          if (aVal > bVal) return ascending ? 1 : -1;
        }
        return 0;
      });
    }

    const totalCount = rows.length;

    if (this.rangeStart !== null && this.rangeEnd !== null) {
      rows = rows.slice(this.rangeStart, this.rangeEnd + 1);
    }

    if (this.limitCount !== null) {
      rows = rows.slice(0, this.limitCount);
    }

    rows = rows.map((r) => this.selectFields(r));

    if (this.isSingle) {
      if (rows.length === 0) {
        return { data: null, error: null };
      }
      return { data: rows[0], error: null };
    }

    if (this.isMaybeSingle) {
      return { data: rows[0] ?? null, error: null };
    }

    return { data: rows, error: null };
  }

  then(resolve: any, reject?: any) {
    return this.executeQuery().then(resolve, reject);
  }
}

/* ─── Mutation Builder ─── */

class MutationBuilder {
  private tableName: TableName;
  private operation: 'insert' | 'update' | 'delete' | 'upsert';
  private payload: any;
  private filters: Array<{ column: string; value: any; op: string }> = [];
  private selectCols: string | null = null;
  private isSingle = false;
  private onConflict: string | null = null;

  constructor(
    tableName: TableName,
    operation: 'insert' | 'update' | 'delete' | 'upsert',
    payload?: any,
  ) {
    this.tableName = tableName;
    this.operation = operation;
    this.payload = payload;
  }

  eq(column: string, value: any) {
    this.filters.push({ column, value, op: 'eq' });
    return this;
  }

  select(columns?: string) {
    this.selectCols = columns ?? '*';
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isSingle = true;
    return this;
  }

  async execute(): Promise<{ data: any; error: any }> {
    const electronAPI = getElectronAPI();
    if (electronAPI) {
      let ipcMethod = this.operation;
      let ipcPayload = this.payload;
      
      const ipcFilters = this.filters.map(f => ({
        column: f.column,
        value: f.value,
        type: f.op === 'eq' ? 'eq' : 'neq'
      }));

      if (ipcMethod === 'update') {
        if (ipcFilters.length === 0 && ipcPayload?.id) {
          ipcFilters.push({ column: 'id', value: ipcPayload.id, type: 'eq' });
        }
      }

      if (ipcMethod === 'insert') {
        if (Array.isArray(ipcPayload)) {
          ipcPayload = ipcPayload.map(item => ({
            id: item.id ?? crypto.randomUUID(),
            ...item
          }));
        } else if (ipcPayload) {
          ipcPayload = {
            id: ipcPayload.id ?? crypto.randomUUID(),
            ...ipcPayload
          };
        }
      }

      const queryDesc = {
        table: this.tableName,
        method: ipcMethod,
        payload: ipcPayload,
        filters: ipcFilters,
      };

      const res = await electronAPI.querySqlite(queryDesc);
      if (res.error) {
        return { data: null, error: typeof res.error === 'string' ? { message: res.error } : res.error };
      }

      notifyChange(this.tableName);

      let data = res.data;
      if (this.isSingle && Array.isArray(data)) {
        data = data[0];
      }
      if (data && this.selectCols) {
        const cols = this.selectCols.split(',').map(c => c.trim());
        if (cols.length === 1 && cols[0] === '*') {
          // Keep all
        } else {
          if (Array.isArray(data)) {
            data = data.map(item => {
              const filtered: any = {};
              for (const col of cols) {
                if (col in item) filtered[col] = item[col];
              }
              return filtered;
            });
          } else {
            const filtered: any = {};
            for (const col of cols) {
              if (col in data) filtered[col] = data[col];
            }
            data = filtered;
          }
        }
      }

      return { data, error: null };
    }

    switch (this.operation) {
      case 'insert': {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const ids: any[] = [];
        for (const item of items) {
          const id = item.id ?? crypto.randomUUID();
          const row = { ...item, id };
          await put(this.tableName, row);
          ids.push(id);
          notifyChange(this.tableName);
        }
        if (this.isSingle && ids.length > 0) {
          if (this.selectCols) {
            const row = await getById(this.tableName, ids[0]);
            const cols = this.selectCols.split(',').map((c) => c.trim());
            const result: any = {};
            for (const col of cols) {
              if (col in row) result[col] = row[col];
            }
            return { data: result, error: null };
          }
          return { data: { id: ids[0] }, error: null };
        }
        return { data: ids, error: null };
      }

      case 'update': {
        if (this.filters.length === 0 && this.payload?.id) {
          await put(this.tableName, this.payload);
          notifyChange(this.tableName);
          return { data: this.payload, error: null };
        }
        let rows = await getAll(this.tableName);
        for (const { column, value } of this.filters) {
          rows = rows.filter((r) => r[column] === value);
        }
        for (const row of rows) {
          const updated = { ...row, ...this.payload };
          await put(this.tableName, updated);
          notifyChange(this.tableName);
        }
        return { data: rows, error: null };
      }

      case 'delete': {
        let rows = await getAll(this.tableName);
        for (const { column, value } of this.filters) {
          rows = rows.filter((r) => r[column] === value);
        }
        for (const row of rows) {
          await deleteById(this.tableName, row.id);
          notifyChange(this.tableName);
        }
        return { data: rows, error: null };
      }

      case 'upsert': {
        const items = Array.isArray(this.payload) ? this.payload : [this.payload];
        const conflictCol = this.onConflict
          ? this.onConflict.split(',').map((c) => c.trim())[0]
          : 'id';

        for (const item of items) {
          let existing = null;
          if (conflictCol === 'id') {
            existing = await getById(this.tableName, item.id);
          } else {
            const all = await getAll(this.tableName);
            existing = all.find((r) => r[conflictCol] === item[conflictCol]);
          }

          if (existing) {
            await put(this.tableName, { ...existing, ...item });
          } else {
            await put(this.tableName, item);
          }
          notifyChange(this.tableName);
        }
        return { data: items, error: null };
      }
    }
  }

  then(resolve: any, reject?: any) {
    return this.execute().then(resolve, reject);
  }
}

/* ─── Storage Layer ─── */

class StorageBucketBuilder {
  private bucketName: string;

  constructor(bucketName: string) {
    this.bucketName = bucketName;
  }

  async upload(
    path: string,
    file: File | Blob,
    _options?: { upsert?: boolean; contentType?: string; cacheControl?: string },
  ): Promise<{ data: { path: string } | null; error: { message: string } | null }> {
    try {
      const key = `${this.bucketName}/${path}`;
      const blob = file instanceof Blob ? file : new Blob([file]);
      await saveBlob(key, blob);
      return { data: { path }, error: null };
    } catch (err) {
      return { data: null, error: { message: String(err) } };
    }
  }

  async getPublicUrl(
    path: string,
  ): Promise<{ data: { publicUrl: string } }> {
    const key = `${this.bucketName}/${path}`;
    const blob = await getBlob(key);
    if (blob) {
      const url = URL.createObjectURL(blob);
      return { data: { publicUrl: url } };
    }
    return { data: { publicUrl: '' } };
  }

  async remove(
    paths: string[],
  ): Promise<{ data: null; error: { message: string } | null }> {
    try {
      for (const p of paths) {
        const key = `${this.bucketName}/${p}`;
        await deleteBlob(key);
      }
      return { data: null, error: null };
    } catch (err) {
      return { data: null, error: { message: String(err) } };
    }
  }

  async list(
    prefix: string,
  ): Promise<{ data: { name: string }[] | null; error: null }> {
    // IndexedDB doesn't support listing by prefix easily, return empty
    return { data: null, error: null };
  }
}

class StorageBuilder {
  from(bucket: string) {
    return new StorageBucketBuilder(bucket);
  }
}

/* ─── Auth Layer ─── */

const AUTH_KEY = 'ndc-auth-session';
const VALID_CREDENTIALS = [
  { email: 'admin@ndc.gov.ng', password: 'NDC_admin_2026!' },
  { email: 'admin@ndc.com', password: 'admin@ndc' },
];

interface AuthSession {
  user: {
    id: string;
    email: string;
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
  };
  access_token: string;
}

type AuthStateChangeCallback = (
  event: string,
  session: AuthSession | null,
) => void;

const authCallbacks: Set<AuthStateChangeCallback> = new Set();

function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function storeSession(session: AuthSession | null) {
  if (session) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  } else {
    localStorage.removeItem(AUTH_KEY);
  }
}

function createSession(email: string): AuthSession {
  return {
    user: {
      id: 'local-admin-001',
      email,
      app_metadata: { provider: 'local' },
      user_metadata: { full_name: 'Admin' },
    },
    access_token: 'local-token-' + Date.now(),
  };
}

class AuthBuilder {
  async signInWithPassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    const match = VALID_CREDENTIALS.find(c => c.email === email && c.password === password);
    if (match) {
      const session = createSession(email);
      storeSession(session);
      for (const cb of authCallbacks) {
        try { cb('SIGNED_IN', session); } catch { /* */ }
      }
      return { data: { user: session.user, session }, error: null };
    }
    return {
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    };
  }

  async signUp({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    if (VALID_CREDENTIALS.some(c => c.email === email)) {
      const session = createSession(email);
      storeSession(session);
      for (const cb of authCallbacks) {
        try { cb('SIGNED_UP', session); } catch { /* */ }
      }
      return { data: { user: session.user, session }, error: null };
    }
    return {
      data: { user: null, session: null },
      error: { message: 'Unable to register' },
    };
  }

  async signOut(_options?: { scope?: string }) {
    storeSession(null);
    for (const cb of authCallbacks) {
      try { cb('SIGNED_OUT', null); } catch { /* */ }
    }
    return { error: null };
  }

  async getSession() {
    const session = getStoredSession();
    return { data: { session }, error: null };
  }

  async getUser() {
    const session = getStoredSession();
    return { data: { user: session?.user ?? null }, error: null };
  }

  onAuthStateChange(callback: AuthStateChangeCallback) {
    authCallbacks.add(callback);
    // Fire initial state
    const session = getStoredSession();
    setTimeout(() => {
      try { callback(session ? 'SIGNED_IN' : 'SIGNED_OUT', session); } catch { /* */ }
    }, 0);
    return {
      data: {
        subscription: {
          unsubscribe: () => {
            authCallbacks.delete(callback);
          },
        },
      },
    };
  }
}

/* ─── Channel (realtime replacement — no-op) ─── */

class ChannelBuilder {
  private tableName: string | null = null;
  private eventFilter: string = '*';
  private callback: ((payload: any) => void) | null = null;

  on(
    _event: string,
    config: { schema?: string; table?: string; event?: string },
    callback: (payload: any) => void,
  ) {
    this.tableName = config.table ?? null;
    this.eventFilter = config.event ?? '*';
    this.callback = callback;
    return this;
  }

  subscribe() {
    // No-op for local mode
    return this;
  }
}

class ChannelBuilder2 {
  on() { return this; }
  subscribe() { return this; }
}

/* ─── Functions Builder ─── */

class FunctionsBuilder {
  async invoke(
    name: string,
    _options?: { body?: any },
  ): Promise<{ data: any; error: { message: string } | null }> {
    console.warn(`[localDb] Edge function "${name}" is not available in local mode.`);
    return {
      data: null,
      error: { message: `Edge function "${name}" is not available in local mode.` },
    };
  }
}

/* ─── Main Client ─── */

function from(tableName: string) {
  const t = tableName as TableName;
  return {
    select: (columns?: string) => new QueryBuilder(t).select(columns),
    insert: (data: any) => new MutationBuilder(t, 'insert', data),
    update: (data: any) => new MutationBuilder(t, 'update', data),
    delete: () => new MutationBuilder(t, 'delete'),
    upsert: (data: any, opts?: { onConflict?: string }) => {
      const builder = new MutationBuilder(t, 'upsert', data);
      if (opts?.onConflict) {
        (builder as any).onConflict = opts.onConflict;
      }
      return builder;
    },
  };
}

/* ─── Exported Client ─── */

export const supabase = {
  from,
  auth: new AuthBuilder(),
  storage: new StorageBuilder(),
  functions: new FunctionsBuilder(),
  channel: (_name: string) => new ChannelBuilder2(),
  removeChannel: (_ch: any) => Promise.resolve(),
};

export async function withRequestQueue<T>(
  operation: () => Promise<T>,
  _maxRetries = 3,
): Promise<T> {
  return operation();
}

export async function getSafeSupabaseSession(): Promise<AuthSession | null> {
  return getStoredSession();
}

export async function clearBrokenSupabaseSession(): Promise<void> {
  storeSession(null);
}

export function isInvalidRefreshTokenError(): boolean {
  return false;
}



export async function getDataForTable(tableName: string): Promise<any[]> {
  return getAll(tableName as TableName);
}

export async function getAllData(): Promise<Record<string, any[]>> {
  const result: Record<string, any[]> = {};
  for (const table of TABLES) {
    result[table] = await getAll(table);
  }
  return result;
}
