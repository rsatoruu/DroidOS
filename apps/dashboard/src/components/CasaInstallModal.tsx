import { useState } from 'react';
import {
  X,
  Container,
  FileCode,
  Upload,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Layers,
  Sparkles,
  Server,
  FolderOpen,
  Globe,
  Database,
  Shield,
  Film,
  Music,
  Download,
  Terminal,
} from 'lucide-react';
import { api } from '../lib/api';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    name?: string;
    image?: string;
    port?: number;
    containerPort?: number;
    ports?: { host: number; container: number; protocol?: string }[];
    volumes?: string[];
    env?: Record<string, string>;
    icon?: string;
    category?: string;
  };
}

const POPULAR_IMAGES = [
  { name: 'Nginx', image: 'nginx:alpine', port: 8085, containerPort: 80, icon: 'Globe' },
  { name: 'Jellyfin', image: 'jellyfin/jellyfin:latest', port: 8096, containerPort: 8096, icon: 'Film' },
  { name: 'qBittorrent', image: 'linuxserver/qbittorrent:latest', port: 8080, containerPort: 8080, icon: 'Download' },
  { name: 'AdGuard Home', image: 'adguard/adguardhome:latest', port: 3000, containerPort: 3000, icon: 'Shield' },
  { name: 'Nextcloud', image: 'nextcloud:apache', port: 8081, containerPort: 80, icon: 'FolderOpen' },
  { name: 'Portainer CE', image: 'portainer/portainer-ce:latest', port: 9000, containerPort: 9000, icon: 'Container' },
  { name: 'Vaultwarden', image: 'vaultwarden/server:latest', port: 8082, containerPort: 80, icon: 'Shield' },
  { name: 'Redis', image: 'redis:alpine', port: 6379, containerPort: 6379, icon: 'Database' },
  { name: 'PostgreSQL', image: 'postgres:alpine', port: 5432, containerPort: 5432, icon: 'Database' },
  { name: 'Uptime Kuma', image: 'louislam/uptime-kuma:1', port: 3001, containerPort: 3001, icon: 'Activity' },
];

const COMPOSE_TEMPLATES: Record<string, string> = {
  qbittorrent: `version: '3.8'
services:
  qbittorrent:
    image: linuxserver/qbittorrent:latest
    container_name: qbittorrent
    environment:
      - PUID=1000
      - PGID=1000
      - TZ=Etc/UTC
      - WEBUI_PORT=8080
    ports:
      - "8080:8080"
      - "6881:6881"
      - "6881:6881/udp"
    restart: unless-stopped`,

  jellyfin: `version: '3.8'
services:
  jellyfin:
    image: jellyfin/jellyfin:latest
    container_name: jellyfin
    ports:
      - "8096:8096"
    restart: unless-stopped`,

  adguard: `version: '3.8'
services:
  adguardhome:
    image: adguard/adguardhome:latest
    container_name: adguard-home
    ports:
      - "3000:3000"
      - "53:53/udp"
    restart: unless-stopped`,

  nextcloud: `version: '3.8'
services:
  nextcloud:
    image: nextcloud:apache
    container_name: nextcloud
    ports:
      - "8081:80"
    restart: unless-stopped`,

  portainer: `version: '3.8'
services:
  portainer:
    image: portainer/portainer-ce:latest
    container_name: portainer
    ports:
      - "9000:9000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
    restart: unless-stopped`,
};

export function CasaInstallModal({ onClose, onSuccess, initialData }: Props) {
  const [tab, setTab] = useState<'form' | 'yaml'>('form');

  // Form states
  const [title, setTitle] = useState(initialData?.name || '');
  const [image, setImage] = useState(initialData?.image || '');
  const [icon, setIcon] = useState(initialData?.icon || '');
  const [hostPort, setHostPort] = useState(initialData?.port ? String(initialData.port) : '');
  const [containerPort, setContainerPort] = useState(
    initialData?.containerPort ? String(initialData.containerPort) : (initialData?.port ? String(initialData.port) : '')
  );

  const [ports, setPorts] = useState<{ host: string; container: string; protocol: string }[]>(
    initialData?.ports?.map((p) => ({
      host: String(p.host),
      container: String(p.container),
      protocol: p.protocol || 'tcp',
    })) || []
  );

  const [volumes, setVolumes] = useState<{ host: string; container: string }[]>(
    initialData?.volumes?.map((v) => {
      const [h, c] = v.split(':');
      return { host: h || '', container: c || '' };
    }) || []
  );

  const [envs, setEnvs] = useState<{ key: string; value: string }[]>(
    initialData?.env
      ? Object.entries(initialData.env).map(([key, value]) => ({ key, value }))
      : []
  );

  const [network, setNetwork] = useState('bridge');
  const [restartPolicy, setRestartPolicy] = useState('unless-stopped');
  const [privileged, setPrivileged] = useState(false);
  const [command, setCommand] = useState('');

  // YAML state
  const [yamlContent, setYamlContent] = useState(COMPOSE_TEMPLATES.qbittorrent);

  // Status & Progress
  const [installing, setInstalling] = useState(false);
  const [installStep, setInstallStep] = useState(1);
  const [installLogs, setInstallLogs] = useState<string[]>([]);
  const [installComplete, setInstallComplete] = useState(false);
  const [installedAppId, setInstalledAppId] = useState<string | null>(null);
  const [installedPort, setInstalledPort] = useState<number | null>(null);
  const [error, setError] = useState('');

  const handleImageChange = (newImg: string) => {
    setImage(newImg);
    if (!title) {
      const base = newImg.split(':')[0]!.split('/').pop() || '';
      const formatted = base
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setTitle(formatted);
    }
  };

  const handleSelectPopular = (item: typeof POPULAR_IMAGES[0]) => {
    setImage(item.image);
    setTitle(item.name);
    setHostPort(String(item.port));
    setContainerPort(String(item.containerPort));
    setIcon(item.icon);
  };

  const addPort = () => setPorts([...ports, { host: '', container: '', protocol: 'tcp' }]);
  const removePort = (idx: number) => setPorts(ports.filter((_, i) => i !== idx));

  const addVolume = () => setVolumes([...volumes, { host: '', container: '' }]);
  const removeVolume = (idx: number) => setVolumes(volumes.filter((_, i) => i !== idx));

  const addEnv = () => setEnvs([...envs, { key: '', value: '' }]);
  const removeEnv = (idx: number) => setEnvs(envs.filter((_, i) => i !== idx));

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setYamlContent(content);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInstalling(true);
    setInstallComplete(false);
    setInstallStep(1);
    setInstallLogs(['[CasaOS] Validating container configuration...']);

    try {
      if (tab === 'yaml') {
        setInstallLogs((prev) => [...prev, '[CasaOS] Parsing Docker Compose YAML manifest...']);
        setInstallStep(2);

        const res = await api.post('/docker/compose', { yaml: yamlContent, name: title || undefined });
        setInstallStep(3);
        setInstallLogs((prev) => [
          ...prev,
          '[CasaOS] Creating services & volumes...',
          `[CasaOS] ${res.data?.data?.message || 'Services initialized successfully.'}`,
        ]);

        await new Promise((r) => setTimeout(r, 600));
        setInstallStep(4);
        setInstallLogs((prev) => [...prev, '[CasaOS] Container registered into Dashboard!']);
        setInstallComplete(true);
        onSuccess();
        return;
      }

      // Tab: form
      if (!image.trim()) {
        throw new Error('Docker image is required.');
      }

      const safeName = (title || image.split(':')[0]!).toLowerCase().replace(/[^a-z0-9_-]/g, '-');
      const primaryHPort = hostPort ? parseInt(hostPort, 10) : undefined;
      const primaryCPort = containerPort ? parseInt(containerPort, 10) : primaryHPort;

      // Construct port mappings
      const allPorts: { host: number; container: number; protocol?: string }[] = [];
      if (primaryHPort && primaryCPort) {
        allPorts.push({ host: primaryHPort, container: primaryCPort, protocol: 'tcp' });
      }
      for (const p of ports) {
        const h = parseInt(p.host, 10);
        const c = parseInt(p.container, 10);
        if (!isNaN(h) && !isNaN(c)) {
          allPorts.push({ host: h, container: c, protocol: p.protocol || 'tcp' });
        }
      }

      // Construct volumes
      const allVolumes: string[] = [];
      for (const v of volumes) {
        if (v.host.trim() && v.container.trim()) {
          allVolumes.push(`${v.host.trim()}:${v.container.trim()}`);
        }
      }

      // Construct env
      const allEnv: Record<string, string> = {};
      for (const env of envs) {
        if (env.key.trim()) {
          allEnv[env.key.trim()] = env.value;
        }
      }

      setInstallLogs((prev) => [
        ...prev,
        `[CasaOS] Pulling Docker image ${image}...`,
        `[CasaOS] Binding ports: ${allPorts.map((p) => `${p.host}:${p.container}`).join(', ') || 'None'}`,
      ]);
      setInstallStep(2);

      const payload = {
        name: safeName,
        title: title || safeName,
        image: image.trim(),
        icon: icon.trim() || undefined,
        category: 'Docker',
        ports: allPorts.length > 0 ? allPorts : undefined,
        hostPort: primaryHPort,
        containerPort: primaryCPort,
        volumes: allVolumes.length > 0 ? allVolumes : undefined,
        env: Object.keys(allEnv).length > 0 ? allEnv : undefined,
        network,
        restartPolicy,
        command: command.trim() || undefined,
        privileged,
      };

      setInstallStep(3);
      setInstallLogs((prev) => [...prev, `[CasaOS] Spawning container ${safeName}...`]);

      const res = await api.post('/docker/containers/run', payload);
      const data = res.data?.data;

      setInstallStep(4);
      setInstallLogs((prev) => [
        ...prev,
        `[CasaOS] Container ID: ${data?.id || 'Created'}`,
        `[CasaOS] Status: Running`,
        `[CasaOS] Installation completed successfully!`,
      ]);

      setInstalledAppId(data?.appId || null);
      setInstalledPort(primaryHPort || null);
      setInstallComplete(true);
      onSuccess();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Failed to install container';
      setError(msg);
      setInstallLogs((prev) => [...prev, `[ERROR] ${msg}`]);
    } finally {
      setInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="card w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border-slate-700/60 bg-surface-900/95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-700/60 bg-surface-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-400">
              <Container className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Install a Customized App
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30">
                  CasaOS Mode
                </span>
              </h2>
              <p className="text-xs text-slate-400">Deploy any Docker container with customized ports, volumes, and env</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center px-6 pt-3 border-b border-surface-700/40 gap-4 bg-surface-850">
          <button
            type="button"
            onClick={() => setTab('form')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'form'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            App Form
          </button>
          <button
            type="button"
            onClick={() => setTab('yaml')}
            className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'yaml'
                ? 'border-brand-500 text-brand-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            Docker Compose (YAML)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}

          {/* Installing / Complete state */}
          {(installing || installComplete) && (
            <div className="p-5 rounded-2xl bg-surface-800/80 border border-surface-700/60 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {installComplete ? (
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center text-brand-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {installComplete ? 'Container Installed & Running!' : 'Installing Container...'}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {installComplete
                        ? 'App is active and accessible on your CasaOS Dashboard.'
                        : `Step ${installStep} of 4: Processing Docker execution`}
                    </p>
                  </div>
                </div>

                {installComplete && installedPort && (
                  <a
                    href={`http://${window.location.hostname}:${installedPort}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary text-xs flex items-center gap-1.5"
                  >
                    Open Web UI <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>

              {/* Step indicator */}
              <div className="grid grid-cols-4 gap-2 text-[11px] font-medium text-slate-400">
                <div className={`p-2 rounded-lg border text-center ${installStep >= 1 ? 'border-brand-500/40 bg-brand-500/10 text-brand-300' : 'border-surface-700 bg-surface-800'}`}>
                  1. Validate
                </div>
                <div className={`p-2 rounded-lg border text-center ${installStep >= 2 ? 'border-brand-500/40 bg-brand-500/10 text-brand-300' : 'border-surface-700 bg-surface-800'}`}>
                  2. Pull Image
                </div>
                <div className={`p-2 rounded-lg border text-center ${installStep >= 3 ? 'border-brand-500/40 bg-brand-500/10 text-brand-300' : 'border-surface-700 bg-surface-800'}`}>
                  3. Bind & Start
                </div>
                <div className={`p-2 rounded-lg border text-center ${installStep >= 4 ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : 'border-surface-700 bg-surface-800'}`}>
                  4. Ready
                </div>
              </div>

              {/* Console log window */}
              <div className="p-3 rounded-xl bg-black/60 border border-slate-800 font-mono text-xs text-slate-300 max-h-36 overflow-y-auto space-y-1">
                {installLogs.map((log, i) => (
                  <div key={i} className={log.includes('[ERROR]') ? 'text-red-400' : log.includes('successfully') ? 'text-emerald-400' : 'text-slate-300'}>
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'form' && (
            <form id="casa-install-form" onSubmit={handleSubmit} className="space-y-6">
              {/* Quick Popular Container Chips */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                  Popular CasaOS Apps (1-Click Fill)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_IMAGES.map((item) => (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleSelectPopular(item)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        image === item.image
                          ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                          : 'bg-surface-800/80 border-surface-700/60 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">
                    Docker Image <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. linuxserver/qbittorrent:latest"
                    value={image}
                    onChange={(e) => handleImageChange(e.target.value)}
                    className="input w-full font-mono text-xs"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Supports Docker Hub, GHCR, Quay, etc.</span>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1.5">
                    App Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. qBittorrent"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input w-full text-sm"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Display title on CasaOS Dashboard</span>
                </div>
              </div>

              {/* Web UI Port */}
              <div className="p-4 rounded-xl bg-surface-800/40 border border-surface-700/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-brand-400" /> Web UI Port Forwarding
                  </span>
                  <span className="text-[11px] text-slate-400">Host Port → Container Port</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Host Port (Access via browser)</label>
                    <input
                      type="number"
                      placeholder="e.g. 8080"
                      value={hostPort}
                      onChange={(e) => setHostPort(e.target.value)}
                      className="input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Container Port (App internal)</label>
                    <input
                      type="number"
                      placeholder="e.g. 8080"
                      value={containerPort}
                      onChange={(e) => setContainerPort(e.target.value)}
                      className="input w-full text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Ports */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Additional Port Mappings</label>
                  <button
                    type="button"
                    onClick={addPort}
                    className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Port
                  </button>
                </div>

                {ports.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No additional port mappings defined.</p>
                ) : (
                  <div className="space-y-2">
                    {ports.map((p, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Host (e.g. 6881)"
                          value={p.host}
                          onChange={(e) => {
                            const updated = [...ports];
                            updated[idx]!.host = e.target.value;
                            setPorts(updated);
                          }}
                          className="input w-1/3 text-xs"
                        />
                        <span className="text-slate-500">:</span>
                        <input
                          type="number"
                          placeholder="Container (e.g. 6881)"
                          value={p.container}
                          onChange={(e) => {
                            const updated = [...ports];
                            updated[idx]!.container = e.target.value;
                            setPorts(updated);
                          }}
                          className="input w-1/3 text-xs"
                        />
                        <select
                          value={p.protocol}
                          onChange={(e) => {
                            const updated = [...ports];
                            updated[idx]!.protocol = e.target.value;
                            setPorts(updated);
                          }}
                          className="input w-24 text-xs"
                        >
                          <option value="tcp">TCP</option>
                          <option value="udp">UDP</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => removePort(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Volumes */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Volume & Storage Mounts</label>
                  <button
                    type="button"
                    onClick={addVolume}
                    className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Volume
                  </button>
                </div>

                {volumes.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No custom volumes mounted.</p>
                ) : (
                  <div className="space-y-2">
                    {volumes.map((v, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Host path (e.g. /home/data)"
                          value={v.host}
                          onChange={(e) => {
                            const updated = [...volumes];
                            updated[idx]!.host = e.target.value;
                            setVolumes(updated);
                          }}
                          className="input flex-1 text-xs font-mono"
                        />
                        <span className="text-slate-500">:</span>
                        <input
                          type="text"
                          placeholder="Container path (e.g. /data)"
                          value={v.container}
                          onChange={(e) => {
                            const updated = [...volumes];
                            updated[idx]!.container = e.target.value;
                            setVolumes(updated);
                          }}
                          className="input flex-1 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => removeVolume(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Environment Variables */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-300">Environment Variables</label>
                  <button
                    type="button"
                    onClick={addEnv}
                    className="text-xs text-brand-400 hover:text-brand-300 flex items-center gap-1 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Variable
                  </button>
                </div>

                {envs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No environment variables set.</p>
                ) : (
                  <div className="space-y-2">
                    {envs.map((env, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="KEY (e.g. PUID)"
                          value={env.key}
                          onChange={(e) => {
                            const updated = [...envs];
                            updated[idx]!.key = e.target.value;
                            setEnvs(updated);
                          }}
                          className="input w-1/2 text-xs font-mono"
                        />
                        <span className="text-slate-500">=</span>
                        <input
                          type="text"
                          placeholder="VALUE (e.g. 1000)"
                          value={env.value}
                          onChange={(e) => {
                            const updated = [...envs];
                            updated[idx]!.value = e.target.value;
                            setEnvs(updated);
                          }}
                          className="input w-1/2 text-xs font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => removeEnv(idx)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Advanced Settings */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 border-t border-surface-700/50">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Restart Policy</label>
                  <select
                    value={restartPolicy}
                    onChange={(e) => setRestartPolicy(e.target.value)}
                    className="input w-full text-xs"
                  >
                    <option value="unless-stopped">Unless Stopped</option>
                    <option value="always">Always</option>
                    <option value="on-failure">On Failure</option>
                    <option value="no">Never</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Network Mode</label>
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value)}
                    className="input w-full text-xs"
                  >
                    <option value="bridge">Bridge (Default)</option>
                    <option value="host">Host</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={privileged}
                      onChange={(e) => setPrivileged(e.target.checked)}
                      className="rounded border-slate-700 bg-surface-800 text-brand-500 focus:ring-brand-500/20"
                    />
                    Privileged Mode
                  </label>
                </div>
              </div>
            </form>
          )}

          {tab === 'yaml' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-semibold text-slate-300">Quick Templates:</span>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.keys(COMPOSE_TEMPLATES).map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setYamlContent(COMPOSE_TEMPLATES[key]!)}
                      className="px-2 py-1 rounded bg-surface-800 hover:bg-surface-700 text-[11px] text-slate-300 font-mono border border-surface-700/60"
                    >
                      {key}
                    </button>
                  ))}
                  <label className="px-2 py-1 rounded bg-surface-800 hover:bg-surface-700 text-[11px] text-brand-300 font-mono border border-brand-500/30 cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" /> Upload .yml
                    <input type="file" accept=".yml,.yaml" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div>
                <textarea
                  value={yamlContent}
                  onChange={(e) => setYamlContent(e.target.value)}
                  rows={14}
                  className="input w-full font-mono text-xs leading-relaxed bg-black/40 border-slate-700 resize-none"
                  placeholder="Paste docker-compose.yml here..."
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-surface-700/60 bg-surface-800/40">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost text-xs"
          >
            {installComplete ? 'Close' : 'Cancel'}
          </button>

          <div className="flex items-center gap-2">
            {installComplete ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSuccess();
                }}
                className="btn-primary text-xs flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Go to Dashboard
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={installing || (!image && tab === 'form')}
                className="btn-primary text-xs flex items-center gap-1.5 shadow-lg shadow-brand-500/25"
              >
                {installing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Installing...
                  </>
                ) : (
                  <>
                    <Container className="w-4 h-4" /> Install Container
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
