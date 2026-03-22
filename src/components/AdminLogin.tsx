import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface AdminLoginProps {
  onSuccess: () => void;
}

const QUICK_ADMIN_EMAIL = import.meta.env.VITE_QUICK_ADMIN_EMAIL || 'admin@ndc.gov.ng';
const QUICK_ADMIN_PASSWORD = import.meta.env.VITE_QUICK_ADMIN_PASSWORD || 'NDC_admin_2026!';

export function AdminLogin({ onSuccess }: AdminLoginProps) {
  const [email, setEmail] = useState(QUICK_ADMIN_EMAIL);
  const [password, setPassword] = useState(QUICK_ADMIN_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = async (targetEmail: string, targetPassword: string) => {
    setError(null);
    setLoading(true);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: targetEmail,
      password: targetPassword,
    });

    setLoading(false);

    if (signInError) {
      if ((signInError as any).status === 500) {
        setError('Authentication backend returned 500. Run `npm run admin:create-user` with SUPABASE_SERVICE_ROLE_KEY to repair/create the admin account.');
      } else {
        setError(signInError.message);
      }
      return;
    }

    onSuccess();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  const handleQuickLogin = async () => {
    setError(null);
    setLoading(true);

    // First try regular sign-in.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: QUICK_ADMIN_EMAIL,
      password: QUICK_ADMIN_PASSWORD,
    });

    if (!signInError) {
      setLoading(false);
      onSuccess();
      return;
    }

    // If account doesn't exist yet, bootstrap it with the same quick credentials.
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: QUICK_ADMIN_EMAIL,
      password: QUICK_ADMIN_PASSWORD,
    });

    if (signUpError) {
      setLoading(false);
      if ((signUpError as any).status === 500) {
        setError('Could not auto-create admin account from client. Run `npm run admin:create-user` using SUPABASE_SERVICE_ROLE_KEY.');
      } else {
        setError(signUpError.message);
      }
      return;
    }

    // If email confirmation is enabled, sign-in may not be immediate.
    if (!signUpData.session) {
      setLoading(false);
      setError('Admin account created. Please confirm the email in Supabase Auth settings or mailbox before login.');
      return;
    }

    setLoading(false);
    onSuccess();
  };

  return (
    <div className="max-w-md mx-auto mt-8 rounded-xl border border-primary/30 bg-card p-6 md:p-8 shadow-[0_0_30px_rgba(0,0,0,0.2)]">
      <h2 className="text-2xl font-bold font-serif gold-text mb-2">Admin Access</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Sign in with an authorized admin account to manage records and system settings.
      </p>

      <Button type="button" onClick={handleQuickLogin} disabled={loading} className="w-full mb-4">
        {loading ? 'Signing in...' : 'One-Click Admin Login'}
      </Button>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Email</label>
          <Input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="admin@ndc.gov.ng"
            required
            className="mt-1"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-widest text-muted-foreground">Password</label>
          <Input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="mt-1"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={loading} className="w-full">
          {loading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>
    </div>
  );
}
