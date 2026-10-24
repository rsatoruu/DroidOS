import { useState } from 'react';
import {
  X,
  FileCode,
  Upload,
  Play,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Container,
  Layers,
} from 'lucide-react';
import { api } from '../lib/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

const TEMPLATES: Record<string, string> = {
  nginx: `version: '3.8'
services:
  web:
    image: nginx:alpine
    container_name: nginx-web
    ports:
      - "8085:80"
    restart: unless-stopped`,

  nextcloud: `version: '3.8'
services:
  app:
    image: nextcloud:apache
    container_name: nextcloud
    ports:
      - "8080:80"
    restart: unless-stopped`,

  adguard: `version: '3.8'
services:
  adguard:
    image: adguard/adguardhome:latest
    container_name: adguard-home
    ports:
      - "3000:3000"
      - "53:53/udp"
    restart: unless-stopped`,

  redis: `version: '3.8'
services:
  cache:
    image: redis:alpine
    container_name: redis-cache
    ports:
      - "6379:6379"
    restart: unless-stopped`,

  postgres: `version: '3.8'
services:
  db:
    image: postgres:alpine
    container_name: postgres-db
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_PASSWORD=droidos_secret
    restart: unless-stopped`,
};

export function ComposeDeployModal({ onClose, onSuccess }: Props) {
  const [yamlContent, setYamlContent] = useState(TEMPLATES.nginx!);
  const [appName, setAppName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setYamlContent(content);
        if (!appName) {
          const cleanName = file.name.replace(/\.(ya?ml)$/i, '').replace(/[-_]/g, ' ');
          setAppName(cleanName);
        }
      }
    };
    reader.readAsText(file);
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await api.post('/docker/compose', {
        yaml: yamlContent,
        name: appName.trim() || undefined,
      });

      if (res.data?.success) {
        setSuccessMsg(res.data.data?.message || 'App deployed successfully!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to deploy docker.yaml');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-surface-700 bg-surface-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Deploy with docker.yaml
              </h2>
              <p className="text-xs text-slate-400">
                Paste or upload a Docker Compose file to install apps directly to the Dashboard.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-surface-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleDeploy} className="p-5 flex-1 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-900/30 border border-red-800/50 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <div className="font-semibold">{successMsg}</div>
            </div>
          )}

          {/* Quick Template Picker + Upload Button */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs scrollbar-thin">
              <span className="text-slate-500 text-[11px] font-medium mr-1">Templates:</span>
              {Object.keys(TEMPLATES).map((key) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setYamlContent(TEMPLATES[key]!)}
                  className="px-2 py-1 rounded-md bg-surface-700 hover:bg-surface-600 border border-surface-600 text-slate-300 text-[11px] capitalize transition-colors"
                >
                  {key}
                </button>
              ))}
            </div>

            <label className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload docker.yaml</span>
              <input
                type="file"
                accept=".yml,.yaml,text/yaml"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {/* YAML Editor */}
          <div>
            <label className="label flex items-center justify-between">
              <span>Docker Compose / docker.yaml</span>
              <span className="text-[10px] text-slate-500 font-mono">YAML syntax</span>
            </label>
            <div className="relative rounded-xl border border-surface-600 overflow-hidden bg-[#0d1117]">
              <textarea
                value={yamlContent}
                onChange={(e) => setYamlContent(e.target.value)}
                rows={12}
                placeholder="version: '3.8'&#10;services:&#10;  my-app:&#10;    image: nginx:alpine&#10;    ports:&#10;      - '8080:80'"
                className="w-full bg-transparent p-3.5 font-mono text-xs text-emerald-300 placeholder-slate-600 focus:outline-none resize-y leading-relaxed"
                required
              />
            </div>
          </div>

          {/* Optional Name Override */}
          <div>
            <label className="label">Custom App Name (Optional)</label>
            <input
              className="input text-xs"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="Leave empty to use container_name / service name"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-surface-700">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-brand-400" />
              <span>Instantly visible in Dashboard & Applications</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary text-xs py-2 px-3.5"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500"
                disabled={loading || !yamlContent.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deploying...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Deploy to Dashboard
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
