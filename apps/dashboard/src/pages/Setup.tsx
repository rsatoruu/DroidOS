import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';

export function SetupPage() {
  const navigate = useNavigate();
  const { setSetupRequired, login } = useAuthStore();
  const [step, setStep] = useState<'info' | 'create'>('info');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/setup', { username, password });
      setSuccess(true);

      // Auto-login
      const res = await api.post('/auth/login', { username, password });
      const { user, token } = res.data.data;
      login(user, token);
      setSetupRequired(false);
      setTimeout(() => navigate('/'), 1000);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-brand-400/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 mb-4">
            <Bot className="w-8 h-8 text-brand-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">DroidOS</h1>
          <p className="text-slate-400 text-sm mt-1">Android Home Server Platform</p>
        </div>

        <div className="card border-surface-500">
          {step === 'info' ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Welcome to DroidOS</h2>
                <p className="text-slate-400 text-sm">
                  Let's set up your personal home server. This will take about 2 minutes.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-200">Secure by default</div>
                    <div className="text-xs text-slate-400">Runs on localhost until you enable LAN access</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-200">No root required</div>
                    <div className="text-xs text-slate-400">Runs entirely within your Termux environment</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-700">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-slate-200">LAN accessible</div>
                    <div className="text-xs text-slate-400">Manage from any device on your Wi-Fi network</div>
                  </div>
                </div>
              </div>

              <button className="btn-primary w-full justify-center" onClick={() => setStep('create')}>
                Get Started →
              </button>
            </div>
          ) : (
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-white mb-1">Create Administrator Account</h2>
                <p className="text-slate-400 text-sm">This will be your only login. Choose a strong password.</p>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-900/30 border border-red-800/50 text-red-300 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-900/30 border border-emerald-800/50 text-emerald-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Setup complete! Redirecting...
                </div>
              )}

              <div>
                <label className="label">Username</label>
                <input
                  className="input"
                  type="text"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                  pattern="[a-zA-Z0-9_\-]+"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input
                    className="input pr-10"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="label">Confirm Password</label>
                <input
                  className="input"
                  type={showPass ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full justify-center"
                disabled={loading || success}
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Setting up...</>
                ) : (
                  'Complete Setup'
                )}
              </button>

              <button type="button" className="btn-ghost w-full justify-center text-xs" onClick={() => setStep('info')}>
                ← Back
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-4">
          DroidOS v0.1.0 · Powered by Node.js + Fastify
        </p>
      </div>
    </div>
  );
}
