import { createClient, type Session } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase project URL and anon key
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let clearBrokenSessionPromise: Promise<void> | null = null;

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === 'object' && error && 'message' in error) {
		return String((error as { message?: unknown }).message ?? '');
	}
	return String(error ?? '');
}

export function isInvalidRefreshTokenError(error: unknown): boolean {
	const message = getErrorMessage(error);
	return /invalid refresh token|refresh token not found/i.test(message);
}

export async function clearBrokenSupabaseSession(): Promise<void> {
	if (clearBrokenSessionPromise) {
		await clearBrokenSessionPromise;
		return;
	}

	clearBrokenSessionPromise = (async () => {
		try {
			await supabase.auth.signOut({ scope: 'local' });
		} catch {
			// best-effort local cleanup only
		} finally {
			clearBrokenSessionPromise = null;
		}
	})();

	await clearBrokenSessionPromise;
}

export async function getSafeSupabaseSession(): Promise<Session | null> {
	if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

	try {
		const { data, error } = await supabase.auth.getSession();
		if (error) {
			if (isInvalidRefreshTokenError(error)) {
				await clearBrokenSupabaseSession();
				return null;
			}

			console.error('Failed to get Supabase session:', error.message);
			return null;
		}

		return data.session ?? null;
	} catch (error) {
		if (isInvalidRefreshTokenError(error)) {
			await clearBrokenSupabaseSession();
			return null;
		}

		console.error('Failed to get Supabase session:', getErrorMessage(error));
		return null;
	}
}
