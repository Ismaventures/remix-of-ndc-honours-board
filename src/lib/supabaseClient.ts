/* ─────────────────────────────────────────────────────────────
   Supabase Client — re-exports from localDb (IndexedDB)
   All data is local; no remote Supabase dependency.
   ───────────────────────────────────────────────────────────── */

export {
  supabase,
  withRequestQueue,
  getSafeSupabaseSession,
  clearBrokenSupabaseSession,
  isInvalidRefreshTokenError,
} from './localDb';
