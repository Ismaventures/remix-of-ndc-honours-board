import { createClient, type Session } from '@supabase/supabase-js';

// TODO: Replace with your actual Supabase project URL and anon key
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let clearBrokenSessionPromise: Promise<void> | null = null;

// Request queue to serialize Supabase operations and avoid lock conflicts
let requestQueue: Promise<void> = Promise.resolve();

function isAuthLockError(error: unknown): boolean {
	const message = getErrorMessage(error);
	return /lock.*was released|lock.*stole|lock.*auth.?token/i.test(message);
}

export async function withRequestQueue<T>(
	operation: () => Promise<T>,
	maxRetries = 3,
): Promise<T> {
	// Chain this operation to the request queue
	const result = requestQueue.then(async () => {
		let lastError: unknown = null;
		const retryDelays = [0, 150, 500, 1200];

		for (let attempt = 0; attempt < Math.min(maxRetries, retryDelays.length); attempt++) {
			try {
				if (retryDelays[attempt] > 0) {
					// Add jitter to prevent thundering herd
					const jitter = Math.random() * retryDelays[attempt] * 0.2;
					await new Promise((resolve) => setTimeout(resolve, retryDelays[attempt] + jitter));
				}
				return await operation();
			} catch (error) {
				lastError = error;
				// If this is an auth lock error and we have retries left, continue
				if (isAuthLockError(error) && attempt < Math.min(maxRetries, retryDelays.length) - 1) {
					console.warn(`Auth lock error (attempt ${attempt + 1}/${maxRetries}), retrying...`, getErrorMessage(error));
					continue;
				}
				// For non-lock errors or last attempt, throw immediately
				throw error;
			}
		}

		throw lastError || new Error('Operation failed after max retries');
	});

	// Update the queue to wait for this operation
	requestQueue = result.catch(() => {
		// Catch errors to prevent queue from breaking on failed operations
	});

	return result;
}

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

	return withRequestQueue(async () => {
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
	}, 3);
}
