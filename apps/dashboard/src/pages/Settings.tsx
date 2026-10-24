import { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  Shield,
  Smartphone,
  Server,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  Eye,
  EyeOff,
  BatteryCharging,
  Cpu,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';

interface SystemEnvironment {
  platform: string;
  arch: string;
  isAndroid: boolean;
  isTermux: boolean;
  termuxPrefix?: string;
  storageAccess: boolean;
  nodeVersion: string;
}

interface ServerSettings {
  dashboard_name?: string;
  theme?: string;
  lan_enabled?: string;
}

export function SettingsPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Settings State
  const [settings, setSettings] = useState<ServerSettings>({
    dashboard_name: 'DroidOS Home Server',
    theme: 'dark',
    lan_enabled: 'true',
  });

  // Environment State
  const [environment, setEnvironment] = useState<SystemEnvironment | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Feedback Messages
  const [settingsStatus, setSettingsStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [settingsRes, envRes] = await Promise.allSettled([
        api.get('/system/settings'),
        api.get('/system/environment'),
      ]);

      if (settingsRes.status === 'fulfilled' && settingsRes.value.data?.data) {
        setSettings((prev) => ({
          ...prev,
          ...settingsRes.value.data.data,
        }));
      }

      if (envRes.status === 'fulfilled' && envRes.value.data?.data) {
        setEnvironment(envRes.value.data.data);
      }
    } catch (err) {
      console.error('Failed to load settings data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsStatus(null);
    try {
      await api.patch('/system/settings', settings);
      setSettingsStatus({ type: 'success', message: 'Settings saved successfully!' });
      setTimeout(() => setSettingsStatus(null), 3500);
    } catch (err: any) {
      setSettingsStatus({
        type: 'error',
        message: err.response?.data?.error || 'Failed to update settings',
      });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword.length < 8) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    setSavingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      setPasswordStatus({ type: 'success', message: 'Password updated successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordStatus(null), 4000);
    } catch (err: any) {
      setPasswordStatus({
        type: 'error',
        message: err.response?.data?.error || 'Failed to change password.',
      });
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400 mb-3" />
        <p className="text-sm">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-brand-400" />
          Settings & System
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Configure server preferences, manage security, and inspect Android Termux environment.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: General & Security */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Preferences */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Server className="w-4 h-4 text-brand-400" />
              General Preferences
            </h2>

            {settingsStatus && (
              <div
                className={`flex items-center gap-2 p-3 mb-4 rounded-lg text-sm ${
                  settingsStatus.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}
              >
                {settingsStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {settingsStatus.message}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Dashboard Name
                </label>
                <input
                  type="text"
                  value={settings.dashboard_name ?? ''}
                  onChange={(e) => setSettings({ ...settings, dashboard_name: e.target.value })}
                  placeholder="DroidOS Home Server"
                  className="input w-full"
                />
                <span className="text-xs text-slate-500 mt-1 block">
                  Displayed on the header and browser tab.
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Appearance Theme
                </label>
                <select
                  value={settings.theme ?? 'dark'}
                  onChange={(e) => setSettings({ ...settings, theme: e.target.value })}
                  className="input w-full bg-surface-700"
                >
                  <option value="dark">Dark Theme (Default)</option>
                  <option value="slate">Slate Minimal</option>
                  <option value="amoled">Pure AMOLED Black</option>
                </select>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div>
                  <div className="text-sm font-medium text-slate-200">LAN Discovery</div>
                  <div className="text-xs text-slate-500">Allow other devices on Wi-Fi to reach this server</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.lan_enabled === 'true'}
                  onChange={(e) =>
                    setSettings({ ...settings, lan_enabled: e.target.checked ? 'true' : 'false' })
                  }
                  className="h-4 w-4 rounded border-slate-700 bg-surface-800 text-brand-600 focus:ring-brand-500"
                />
              </div>

              <div className="pt-3 border-t border-surface-600 flex justify-end">
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="btn-primary flex items-center gap-2"
                >
                  {savingSettings ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>

          {/* Security & Password */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              Security & Credentials
            </h2>

            {passwordStatus && (
              <div
                className={`flex items-center gap-2 p-3 mb-4 rounded-lg text-sm ${
                  passwordStatus.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                    : 'bg-red-500/10 border border-red-500/20 text-red-300'
                }`}
              >
                {passwordStatus.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                {passwordStatus.message}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    placeholder="Enter current password"
                    className="input w-full pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="Min 8 characters"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter password"
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-surface-600 flex justify-end">
                <button
                  type="submit"
                  disabled={savingPassword || !currentPassword || !newPassword}
                  className="btn-primary flex items-center gap-2"
                >
                  {savingPassword ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Android & Termux Specs */}
        <div className="space-y-6">
          {/* Termux & Android Info */}
          <div className="card p-5">
            <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-brand-400" />
              Android Environment
            </h2>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-1.5 border-b border-surface-600">
                <span className="text-slate-400">Environment</span>
                <span className="font-semibold text-brand-300">
                  {environment?.isTermux ? 'Android Termux' : 'Linux / Desktop Host'}
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-600">
                <span className="text-slate-400">Architecture</span>
                <span className="text-slate-200 font-mono">{environment?.arch || 'arm64'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-600">
                <span className="text-slate-400">Platform</span>
                <span className="text-slate-200">{environment?.platform || 'linux'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-600">
                <span className="text-slate-400">Node.js Engine</span>
                <span className="text-slate-200 font-mono">{environment?.nodeVersion || 'v20+'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-surface-600">
                <span className="text-slate-400">Shared Storage (/sdcard)</span>
                <span
                  className={`font-medium ${
                    environment?.storageAccess ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {environment?.storageAccess ? 'Granted (termux-setup-storage)' : 'Limited / Default'}
                </span>
              </div>
              {environment?.termuxPrefix && (
                <div className="pt-1">
                  <span className="text-slate-400 block mb-1">Termux Prefix:</span>
                  <span className="text-slate-300 font-mono text-[11px] break-all bg-surface-900/60 p-1.5 rounded block">
                    {environment.termuxPrefix}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Termux Tips Card */}
          <div className="card p-5 bg-gradient-to-br from-surface-800 to-brand-950/20 border-brand-500/20">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <BatteryCharging className="w-4 h-4 text-amber-400" />
              Termux Wake-Lock Guide
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              To keep DroidOS running smoothly when the Android screen is turned off:
            </p>
            <div className="bg-surface-900 p-2.5 rounded font-mono text-xs text-brand-300 mb-2">
              $ termux-wake-lock
            </div>
            <p className="text-[11px] text-slate-400">
              Also disable battery optimization for the Termux app in Android Settings &gt; Battery &gt; App Battery Usage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
