import { useState, useEffect } from 'react';
import {
  ShoppingBag, Search, Download, CheckCircle2, ExternalLink, Loader2,
  Server, FolderOpen, Database, Globe, Radio, ShieldCheck, Code2, Zap,
  ArrowRight, Cpu, Wifi, FileText, Container, AlertTriangle, Play,
  Layers, X, Star, Tag, Clock, RefreshCw, Package, Lock, Monitor,
  Film, Music, Rss, Home, BookOpen, BarChart2, Cloud, Terminal, HardDrive,
  Plus, Settings,
} from 'lucide-react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import { CasaInstallModal } from '../components/CasaInstallModal';

interface CatalogApp {
  id: string;
  name: string;
  category: string;
  description: string;
  longDescription: string;
  icon: any;
  iconBg: string;
  port: number;
  dockerImage?: string;
  volumes?: string[];
  env?: Record<string, string>;
  command?: string;
  tags: string[];
  featured?: boolean;
  website?: string;
  stars?: number;
}

const CATALOG_APPS: CatalogApp[] = [
  // ─── NETWORK & TUNNEL ─────────────────────────────────────────────────────
  {
    id: 'cloudflare-tunnel',
    name: 'Cloudflare Tunnel',
    category: 'Network & Security',
    description: 'Expose local services to the internet securely via Cloudflare, no port forwarding needed.',
    longDescription: 'Cloudflare Tunnel (formerly Argo Tunnel) creates a secure, outbound-only connection from your server to Cloudflare\'s edge. No inbound ports need to be opened. Protect your origin server and expose any local HTTP service to the internet with full DDoS protection and access policies.',
    icon: Cloud,
    iconBg: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    port: 0,
    dockerImage: 'cloudflare/cloudflared:latest',
    env: { TUNNEL_TOKEN: 'YOUR_TUNNEL_TOKEN_HERE' },
    command: 'cloudflared tunnel --no-autoupdate run',
    tags: ['Cloudflare', 'Tunnel', 'Network', 'Security', 'Proxy'],
    featured: true,
    website: 'https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/',
    stars: 5,
  },
  {
    id: 'nginx-proxy-manager',
    name: 'Nginx Proxy Manager',
    category: 'Network & Security',
    description: 'Manage reverse proxies and SSL certificates (Let\'s Encrypt) with a beautiful web GUI.',
    longDescription: 'Expose your self-hosted apps to the world with free automated SSL certificates via Let\'s Encrypt, access lists, and a visual proxy management interface.',
    icon: Globe,
    iconBg: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
    port: 81,
    dockerImage: 'jc21/nginx-proxy-manager:latest',
    tags: ['Nginx', 'Proxy', 'SSL', 'Web', 'Reverse Proxy'],
    featured: true,
    website: 'https://nginxproxymanager.com',
    stars: 5,
  },
  {
    id: 'wireguard-easy',
    name: 'WireGuard Easy',
    category: 'Network & Security',
    description: 'The easiest way to install & manage WireGuard VPN on your server.',
    longDescription: 'WireGuard Easy provides a simple web UI for managing a WireGuard VPN server. Create and revoke client configs, see connected clients, and download QR codes instantly.',
    icon: Wifi,
    iconBg: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    port: 51821,
    dockerImage: 'ghcr.io/wg-easy/wg-easy:latest',
    env: { WG_HOST: '0.0.0.0', PASSWORD: 'changeme', WG_DEFAULT_ADDRESS: '10.8.0.x' },
    tags: ['VPN', 'WireGuard', 'Network', 'Security'],
    featured: true,
    website: 'https://github.com/wg-easy/wg-easy',
    stars: 4,
  },
  {
    id: 'adguard-home',
    name: 'AdGuard Home',
    category: 'Network & Security',
    description: 'Network-wide ad-blocking and privacy protection DNS server.',
    longDescription: 'Blocks ads and tracking across all devices in your home network by acting as a local DNS resolver with customizable block lists.',
    icon: ShieldCheck,
    iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    port: 3000,
    dockerImage: 'adguard/adguardhome:latest',
    tags: ['DNS', 'AdBlock', 'Security', 'Privacy'],
    featured: true,
    website: 'https://adguard.com/adguard-home.html',
    stars: 5,
  },

  // ─── FILES & STORAGE ──────────────────────────────────────────────────────
  {
    id: 'nextcloud',
    name: 'Nextcloud Hub',
    category: 'Storage & Files',
    description: 'Self-hosted productivity platform: file sync, share, calendar, and office suite.',
    longDescription: 'The most popular open-source cloud storage platform. Full privacy and control over your data. Includes file sync, sharing, contacts, calendar, video calls, and an integrated office suite.',
    icon: FolderOpen,
    iconBg: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    port: 8080,
    dockerImage: 'nextcloud:apache',
    tags: ['Cloud', 'Files', 'Storage', 'Nextcloud', 'Office'],
    featured: true,
    website: 'https://nextcloud.com',
    stars: 5,
  },
  {
    id: 'filebrowser',
    name: 'FileBrowser',
    category: 'Storage & Files',
    description: 'Clean web-based file browser. View, upload, download, share, and manage files in-browser.',
    longDescription: 'A modern, fast file manager with multi-user support, sharing links, text editing, media preview, and command-line integration.',
    icon: HardDrive,
    iconBg: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
    port: 8082,
    dockerImage: 'filebrowser/filebrowser:latest',
    tags: ['Files', 'Storage', 'Browser', 'Upload'],
    website: 'https://filebrowser.org',
    stars: 4,
  },
  {
    id: 'syncthing',
    name: 'Syncthing',
    category: 'Storage & Files',
    description: 'Continuous file synchronization across multiple devices — no cloud required.',
    longDescription: 'Open-source peer-to-peer file synchronization tool. Files are transferred directly between devices with TLS encryption. No cloud or central server required.',
    icon: RefreshCw,
    iconBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    port: 8384,
    dockerImage: 'syncthing/syncthing:latest',
    tags: ['Sync', 'Files', 'P2P', 'Backup'],
    website: 'https://syncthing.net',
    stars: 4,
  },
  {
    id: 'minio',
    name: 'MinIO Object Storage',
    category: 'Storage & Files',
    description: 'S3-compatible high-performance object storage for unstructured data.',
    longDescription: 'MinIO is an S3-compatible object storage server suitable for machine learning, analytics, and app data. Fully open source and deployable anywhere.',
    icon: Package,
    iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    port: 9001,
    dockerImage: 'minio/minio:latest',
    env: { MINIO_ROOT_USER: 'admin', MINIO_ROOT_PASSWORD: 'changeme123' },
    command: 'server /data --console-address \":9001\"',
    tags: ['S3', 'Storage', 'Object', 'MinIO'],
    website: 'https://min.io',
    stars: 4,
  },

  // ─── MEDIA ────────────────────────────────────────────────────────────────
  {
    id: 'jellyfin',
    name: 'Jellyfin',
    category: 'Media',
    description: 'Free and open-source media server — stream movies, TV shows, and music to any device.',
    longDescription: 'Jellyfin is the volunteer-built media solution. Stream your personal movies, series, and music to any phone, tablet, TV, or PC — no fees, no tracking, no limits.',
    icon: Film,
    iconBg: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    port: 8096,
    dockerImage: 'jellyfin/jellyfin:latest',
    tags: ['Media', 'Streaming', 'Video', 'Jellyfin'],
    featured: true,
    website: 'https://jellyfin.org',
    stars: 5,
  },
  {
    id: 'plex',
    name: 'Plex Media Server',
    category: 'Media',
    description: 'The ultimate media server for organizing and streaming your personal collection.',
    longDescription: 'Plex organizes video, music, and photos from personal media libraries and streams them to smart TVs, streaming boxes, and mobile devices.',
    icon: Monitor,
    iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    port: 32400,
    dockerImage: 'plexinc/pms-docker:latest',
    env: { PLEX_CLAIM: '', TZ: 'Asia/Jakarta' },
    tags: ['Media', 'Streaming', 'Plex', 'Video'],
    website: 'https://plex.tv',
    stars: 4,
  },
  {
    id: 'navidrome',
    name: 'Navidrome Music Server',
    category: 'Media',
    description: 'Modern and fast self-hosted music server and streamer compatible with Subsonic/Airsonic.',
    longDescription: 'Navidrome allows you to enjoy your music collection from anywhere, through a modern web UI and many compatible apps for mobile and desktop.',
    icon: Music,
    iconBg: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
    port: 4533,
    dockerImage: 'deluan/navidrome:latest',
    env: { ND_SCANSCHEDULE: '1h', ND_LOGLEVEL: 'info' },
    tags: ['Music', 'Streaming', 'Audio', 'Subsonic'],
    website: 'https://navidrome.org',
    stars: 4,
  },

  // ─── MANAGEMENT & MONITORING ──────────────────────────────────────────────
  {
    id: 'portainer',
    name: 'Portainer CE',
    category: 'Management',
    description: 'Powerful web management UI for Docker containers, images, and volumes.',
    longDescription: 'Manage all your Docker containers, networks, volumes, and stacks through an intuitive web interface. Essential for any home server running Docker.',
    icon: Container,
    iconBg: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    port: 9000,
    dockerImage: 'portainer/portainer-ce:latest',
    volumes: ['/var/run/docker.sock:/var/run/docker.sock'],
    tags: ['Docker', 'Management', 'Admin', 'Portainer'],
    featured: true,
    website: 'https://portainer.io',
    stars: 5,
  },
  {
    id: 'uptime-kuma',
    name: 'Uptime Kuma',
    category: 'Management',
    description: 'Self-hosted monitoring tool with beautiful status pages and instant alerts.',
    longDescription: 'Monitor uptime of HTTP/HTTPS websites, TCP ports, ping, DNS records, and Docker containers with Telegram, Discord, Slack, and email alerts.',
    icon: BarChart2,
    iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    port: 3001,
    dockerImage: 'louislam/uptime-kuma:latest',
    tags: ['Monitoring', 'Uptime', 'Status', 'Alerts'],
    featured: true,
    website: 'https://github.com/louislam/uptime-kuma',
    stars: 5,
  },
  {
    id: 'grafana',
    name: 'Grafana',
    category: 'Management',
    description: 'Open observability and analytics platform. Visualize metrics from any data source.',
    longDescription: 'Grafana allows you to query, visualize, alert on, and explore your metrics, logs, and traces. Connect to Prometheus, InfluxDB, or any supported data source.',
    icon: BarChart2,
    iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    port: 3000,
    dockerImage: 'grafana/grafana-oss:latest',
    tags: ['Monitoring', 'Metrics', 'Analytics', 'Grafana'],
    website: 'https://grafana.com',
    stars: 5,
  },
  {
    id: 'heimdall',
    name: 'Heimdall Dashboard',
    category: 'Management',
    description: 'Elegant application dashboard for quick access to all your self-hosted services.',
    longDescription: 'Heimdall is a way to organise all those links to your most used web sites and web applications in a simple way. Extremely fast, lightweight, and beautiful.',
    icon: Home,
    iconBg: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
    port: 8090,
    dockerImage: 'linuxserver/heimdall:latest',
    tags: ['Dashboard', 'Links', 'Launcher', 'Home'],
    website: 'https://heimdall.site',
    stars: 4,
  },

  // ─── SECURITY & PASSWORDS ─────────────────────────────────────────────────
  {
    id: 'vaultwarden',
    name: 'Vaultwarden',
    category: 'Security',
    description: 'Lightweight Bitwarden-compatible password manager server written in Rust.',
    longDescription: 'Securely store and sync your passwords, credit cards, and 2FA secrets across all devices with complete self-hosting privacy. 100% compatible with Bitwarden clients.',
    icon: Lock,
    iconBg: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    port: 8088,
    dockerImage: 'vaultwarden/server:latest',
    tags: ['Passwords', 'Security', 'Bitwarden', 'Privacy'],
    featured: true,
    website: 'https://github.com/dani-garcia/vaultwarden',
    stars: 5,
  },
  {
    id: 'authelia',
    name: 'Authelia',
    category: 'Security',
    description: 'Open-source authentication and authorization server with 2FA support.',
    longDescription: 'Authelia acts as a companion for reverse proxies by enabling single sign-on (SSO) and two-factor authentication for all your web apps.',
    icon: ShieldCheck,
    iconBg: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    port: 9091,
    dockerImage: 'authelia/authelia:latest',
    tags: ['Auth', '2FA', 'SSO', 'Security'],
    website: 'https://authelia.com',
    stars: 4,
  },

  // ─── DEVELOPER TOOLS ──────────────────────────────────────────────────────
  {
    id: 'gitea',
    name: 'Gitea',
    category: 'Developer Tools',
    description: 'Lightweight self-hosted Git service — your own GitHub/GitLab alternative.',
    longDescription: 'Gitea is a community-managed lightweight code hosting solution. Includes Git repos, issue tracking, code review, wikis, and CI/CD through Gitea Actions.',
    icon: Code2,
    iconBg: 'bg-green-500/20 text-green-400 border-green-500/30',
    port: 3000,
    dockerImage: 'gitea/gitea:latest',
    env: { USER_UID: '1000', USER_GID: '1000' },
    tags: ['Git', 'DevOps', 'Code', 'Repository'],
    website: 'https://gitea.io',
    stars: 5,
  },
  {
    id: 'code-server',
    name: 'VS Code Server',
    category: 'Developer Tools',
    description: 'VS Code in the browser — full development environment accessible from anywhere.',
    longDescription: 'Run VS Code on any machine and access it from the browser. Full extension support, integrated terminal, and a rich development experience without a local install.',
    icon: Terminal,
    iconBg: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
    port: 8443,
    dockerImage: 'lscr.io/linuxserver/code-server:latest',
    env: { PASSWORD: 'changeme', SUDO_PASSWORD: 'changeme', TZ: 'Asia/Jakarta' },
    tags: ['IDE', 'VSCode', 'Developer', 'Browser'],
    featured: true,
    website: 'https://code.visualstudio.com/docs/remote/vscode-server',
    stars: 5,
  },
  {
    id: 'n8n',
    name: 'n8n Automation',
    category: 'Developer Tools',
    description: 'Powerful workflow automation — connect apps and automate tasks without coding.',
    longDescription: 'n8n is an extendable workflow automation tool. It\'s self-hosted, fair-code licensed, and can integrate with hundreds of services via a visual node editor.',
    icon: Zap,
    iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    port: 5678,
    dockerImage: 'n8nio/n8n:latest',
    env: { N8N_BASIC_AUTH_ACTIVE: 'true', N8N_BASIC_AUTH_USER: 'admin', N8N_BASIC_AUTH_PASSWORD: 'changeme' },
    tags: ['Automation', 'Workflow', 'Integration', 'n8n'],
    website: 'https://n8n.io',
    stars: 5,
  },
  {
    id: 'drone-ci',
    name: 'Drone CI',
    category: 'Developer Tools',
    description: 'Lightweight CI/CD server built on Docker for automated builds and deployments.',
    longDescription: 'Drone is a modern continuous integration and delivery platform built on container technology. Simple YAML pipelines, fast execution.',
    icon: Server,
    iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    port: 8001,
    dockerImage: 'drone/drone:latest',
    env: { DRONE_SERVER_HOST: 'localhost', DRONE_SERVER_PROTO: 'http', DRONE_RPC_SECRET: 'changeme' },
    tags: ['CI/CD', 'DevOps', 'Automation', 'Build'],
    website: 'https://drone.io',
    stars: 4,
  },

  // ─── DATABASES ────────────────────────────────────────────────────────────
  {
    id: 'postgres',
    name: 'PostgreSQL 16',
    category: 'Databases',
    description: 'The world\'s most advanced open-source relational database.',
    longDescription: 'PostgreSQL is a powerful, open-source object-relational database system with over 35 years of active development. Renowned for its reliability, feature robustness, and performance.',
    icon: Database,
    iconBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    port: 5432,
    dockerImage: 'postgres:16-alpine',
    env: { POSTGRES_PASSWORD: 'changeme', POSTGRES_USER: 'admin', POSTGRES_DB: 'droidos' },
    tags: ['Database', 'SQL', 'Postgres', 'RDBMS'],
    website: 'https://postgresql.org',
    stars: 5,
  },
  {
    id: 'mysql',
    name: 'MySQL 8',
    category: 'Databases',
    description: 'The world\'s most popular open-source relational database management system.',
    longDescription: 'MySQL is a widely used, open-source relational database management system (RDBMS). Trusted by thousands of enterprises for reliable, scalable, and secure data storage.',
    icon: Database,
    iconBg: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    port: 3306,
    dockerImage: 'mysql:8-oracle',
    env: { MYSQL_ROOT_PASSWORD: 'changeme', MYSQL_DATABASE: 'droidos', MYSQL_USER: 'admin', MYSQL_PASSWORD: 'changeme' },
    tags: ['Database', 'SQL', 'MySQL', 'RDBMS'],
    website: 'https://mysql.com',
    stars: 4,
  },
  {
    id: 'redis',
    name: 'Redis Cache',
    category: 'Databases',
    description: 'Ultra-fast in-memory data store, cache, session storage, and message broker.',
    longDescription: 'Official Redis image for high-performance caching, real-time analytics, session management, and pub/sub message queuing.',
    icon: Zap,
    iconBg: 'bg-red-500/20 text-red-400 border-red-500/30',
    port: 6379,
    dockerImage: 'redis:7-alpine',
    tags: ['Database', 'Cache', 'Redis', 'Memory', 'Pub/Sub'],
    website: 'https://redis.io',
    stars: 5,
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    category: 'Databases',
    description: 'Popular NoSQL document database for modern applications.',
    longDescription: 'MongoDB is the most popular NoSQL database, providing high performance and flexible schema for storing and querying JSON-like documents.',
    icon: Database,
    iconBg: 'bg-green-500/20 text-green-400 border-green-500/30',
    port: 27017,
    dockerImage: 'mongo:7',
    env: { MONGO_INITDB_ROOT_USERNAME: 'admin', MONGO_INITDB_ROOT_PASSWORD: 'changeme' },
    tags: ['Database', 'NoSQL', 'MongoDB', 'Documents'],
    website: 'https://mongodb.com',
    stars: 4,
  },

  // ─── READING & NOTES ──────────────────────────────────────────────────────
  {
    id: 'freshrss',
    name: 'FreshRSS',
    category: 'Reading & News',
    description: 'Self-hosted RSS aggregator to follow your favorite news and blogs.',
    longDescription: 'FreshRSS is a free, self-hostable aggregator. Read articles from multiple RSS/Atom feeds in one place, without ads or tracking.',
    icon: Rss,
    iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    port: 8070,
    dockerImage: 'lscr.io/linuxserver/freshrss:latest',
    tags: ['RSS', 'News', 'Reading', 'Aggregator'],
    website: 'https://freshrss.org',
    stars: 4,
  },
  {
    id: 'wallabag',
    name: 'Wallabag',
    category: 'Reading & News',
    description: 'Save articles to read later — your own self-hosted Pocket alternative.',
    longDescription: 'Wallabag is a self-hosted read-it-later app. Save web articles, books, and pages to read offline on any device without tracking.',
    icon: BookOpen,
    iconBg: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    port: 8800,
    dockerImage: 'wallabag/wallabag:latest',
    env: { SYMFONY__ENV__DOMAIN_NAME: 'http://localhost:8800' },
    tags: ['Reading', 'Articles', 'Pocket', 'Bookmark'],
    website: 'https://wallabag.org',
    stars: 3,
  },
];

const ALL_CATEGORIES = [
  'All',
  'Network & Security',
  'Storage & Files',
  'Media',
  'Management',
  'Security',
  'Developer Tools',
  'Databases',
  'Reading & News',
];

function StarRating({ stars = 3 }: { stars?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} className={`w-3 h-3 ${s <= stars ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
      ))}
    </div>
  );
}

function AppDetailModal({
  app,
  onClose,
  onInstall,
  onCustomize,
  isInstalling,
  isInstalled,
}: {
  app: CatalogApp;
  onClose: () => void;
  onInstall: (app: CatalogApp) => void;
  onCustomize?: (app: CatalogApp) => void;
  isInstalling: boolean;
  isInstalled: boolean;
}) {
  const Icon = app.icon;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative p-6 border-b border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-start gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${app.iconBg} shrink-0`}>
              <Icon className="w-8 h-8" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-white">{app.name}</h2>
              <p className="text-sm text-slate-400 mt-1">{app.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <StarRating stars={app.stars} />
                <span className="px-2 py-0.5 rounded-full text-xs bg-slate-700/60 text-slate-300 border border-slate-600/40">
                  {app.category}
                </span>
                {app.dockerImage && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-blue-500/15 text-blue-400 border border-blue-500/25 flex items-center gap-1">
                    <Container className="w-3 h-3" /> Docker
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-slate-300 mb-2">About</h3>
            <p className="text-sm text-slate-400 leading-relaxed">{app.longDescription}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {app.dockerImage && (
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                <p className="text-xs text-slate-500 mb-1">Docker Image</p>
                <p className="text-xs text-slate-200 font-mono truncate">{app.dockerImage}</p>
              </div>
            )}
            {app.port > 0 && (
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
                <p className="text-xs text-slate-500 mb-1">Default Port</p>
                <p className="text-sm text-slate-200 font-mono">{app.port}</p>
              </div>
            )}
          </div>

          {app.env && Object.keys(app.env).length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-2">Environment Variables</h3>
              <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40 space-y-1.5">
                {Object.entries(app.env).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs font-mono">
                    <span className="text-emerald-400">{k}</span>
                    <span className="text-slate-500">=</span>
                    <span className="text-slate-300">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {app.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {app.tags.map((tag) => (
                <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-slate-700/60 text-slate-400 border border-slate-600/30">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {app.website && (
              <a
                href={app.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all border border-slate-700/40"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Website
              </a>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onCustomize && !isInstalled && (
              <button
                type="button"
                onClick={() => onCustomize(app)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800 border border-slate-700 hover:border-slate-500 text-slate-200 transition-all"
              >
                <Settings className="w-4 h-4 text-slate-400" /> Customize
              </button>
            )}
            <button
              onClick={() => onInstall(app)}
              disabled={isInstalling || isInstalled}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isInstalled
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : isInstalling
                    ? 'bg-brand-500/20 text-brand-300 cursor-wait'
                    : 'btn-primary shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40'
              }`}
            >
              {isInstalled ? (
                <><CheckCircle2 className="w-4 h-4" /> Installed</>
              ) : isInstalling ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Installing...</>
              ) : (
                <><Download className="w-4 h-4" /> Install</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CloudflareInstallModal({
  onClose,
  onInstall,
  isInstalling,
}: {
  onClose: () => void;
  onInstall: (token: string) => void;
  isInstalling: boolean;
}) {
  const [token, setToken] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700/70 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-slide-up">
        {/* Header with Cloudflare branding */}
        <div className="p-5 border-b border-slate-700/50 bg-gradient-to-r from-orange-950/40 to-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Install Cloudflare Tunnel
              </h2>
              <p className="text-xs text-slate-400">Expose DroidOS services to the internet securely</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onInstall(token);
          }}
          className="p-5 space-y-4"
        >
          <div>
            <label className="label flex items-center justify-between">
              <span>Cloudflare Tunnel Token</span>
              <span className="text-[10px] text-orange-400 font-normal">Zero Trust</span>
            </label>
            <textarea
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Paste your Cloudflare Tunnel token here (e.g. eyJh... or leave blank for local mode)"
              rows={3}
              className="input text-xs font-mono w-full"
            />
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Get your token from{' '}
              <a
                href="https://one.dash.cloudflare.com"
                target="_blank"
                rel="noreferrer"
                className="text-orange-400 hover:underline"
              >
                Cloudflare Zero Trust Dashboard → Networks → Tunnels
              </a>
              . You can also paste it later anytime.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs space-y-1">
            <p className="font-semibold flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> CasaOS-Style Zero Config Tunnel
            </p>
            <p className="text-orange-400/80 leading-relaxed text-[11px]">
              No port forwarding or public IP required. Once installed, your apps appear on your Cloudflare dashboard and DroidOS home screen.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700/50">
            <button type="button" onClick={onClose} className="btn-secondary text-xs py-2 px-3.5">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isInstalling}
              className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 bg-orange-600 hover:bg-orange-500 text-white font-semibold shadow-lg shadow-orange-500/20"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Installing...
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" /> Install Cloudflare
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function AppStorePage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installMsg, setInstallMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [dockerAvailable, setDockerAvailable] = useState<boolean | null>(null);
  const [selectedApp, setSelectedApp] = useState<CatalogApp | null>(null);
  const [showCloudflareModal, setShowCloudflareModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customModalData, setCustomModalData] = useState<any>(null);

  const handleCustomize = (app: CatalogApp) => {
    setSelectedApp(null);
    setCustomModalData({
      name: app.name,
      image: app.dockerImage,
      port: app.port > 0 ? app.port : undefined,
      containerPort: app.port > 0 ? app.port : undefined,
      volumes: app.volumes,
      env: app.env,
      icon: app.id,
      category: app.category,
    });
    setShowCustomModal(true);
  };

  useEffect(() => {
    checkDockerStatus();
    loadInstalledApps();
  }, []);

  const checkDockerStatus = async () => {
    try {
      const res = await api.get('/docker/local/status');
      setDockerAvailable(!!res.data?.data?.daemonAvailable);
    } catch {
      setDockerAvailable(false);
    }
  };

  const loadInstalledApps = async () => {
    try {
      const [appsRes, dockerRes] = await Promise.allSettled([
        api.get('/apps'),
        api.get('/docker/containers'),
      ]);
      const ids = new Set<string>();
      if (appsRes.status === 'fulfilled') {
        for (const a of appsRes.value.data?.data ?? []) {
          CATALOG_APPS.forEach((ca) => {
            if (a.name?.toLowerCase().includes(ca.name.toLowerCase()) ||
                ca.name.toLowerCase().includes((a.name ?? '').toLowerCase())) {
              ids.add(ca.id);
            }
          });
        }
      }
      if (dockerRes.status === 'fulfilled') {
        for (const c of dockerRes.value.data?.data ?? []) {
          CATALOG_APPS.forEach((ca) => {
            if (ca.dockerImage && c.image?.includes(ca.dockerImage.split(':')[0])) {
              ids.add(ca.id);
            }
          });
        }
      }
      setInstalledIds(ids);
    } catch {}
  };

  const handleInstall = async (app: CatalogApp, customEnv?: Record<string, string>) => {
    if (app.id === 'cloudflare-tunnel' && !customEnv && !showCloudflareModal) {
      setShowCloudflareModal(true);
      return;
    }

    setInstallingId(app.id);
    setInstallMsg(null);
    setSelectedApp(null);
    setShowCloudflareModal(false);

    try {
      if (app.dockerImage) {
        const payload: any = {
          name: app.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          title: app.name,
          image: app.dockerImage,
          icon: app.id,
          category: 'Docker',
          port: app.port > 0 ? app.port : undefined,
          hostPort: app.port > 0 ? app.port : undefined,
          containerPort: app.port > 0 ? app.port : undefined,
        };
        const env = { ...(app.env || {}), ...(customEnv || {}) };
        if (Object.keys(env).length > 0) payload.env = env;
        if (app.volumes) payload.volumes = app.volumes;

        const res = await api.post('/docker/containers/run', payload);
        if (res.data?.success) {
          setInstalledIds((prev) => new Set([...prev, app.id]));
          setInstallMsg({
            type: 'success',
            text: `✓ ${app.name} installed successfully! Available on Dashboard.`,
          });
          await loadInstalledApps();
          setTimeout(() => setInstallMsg(null), 6000);
          return;
        }
      }

      // Native fallback
      await api.post('/apps', {
        name: app.name,
        description: app.description,
        command: app.command || `echo "Started ${app.name}"`,
        port: app.port,
        autoStart: false,
        tags: app.tags,
      });
      setInstalledIds((prev) => new Set([...prev, app.id]));
      setInstallMsg({ type: 'success', text: `✓ ${app.name} registered successfully on Dashboard!` });
      await loadInstalledApps();
      setTimeout(() => setInstallMsg(null), 5000);
    } catch (err: any) {
      setInstallMsg({
        type: 'error',
        text: err.response?.data?.error || `Failed to install ${app.name}.`,
      });
      setTimeout(() => setInstallMsg(null), 8000);
    } finally {
      setInstallingId(null);
    }
  };

  const filteredApps = CATALOG_APPS.filter((app) => {
    const matchesSearch =
      !search ||
      app.name.toLowerCase().includes(search.toLowerCase()) ||
      app.description.toLowerCase().includes(search.toLowerCase()) ||
      app.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCategory === 'All' || app.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const featuredApps = CATALOG_APPS.filter((a) => a.featured);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-400" />
            App Store
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            One-click install for {CATALOG_APPS.length} self-hosted Docker applications
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setCustomModalData(null);
              setShowCustomModal(true);
            }}
            className="btn-primary text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-brand-500/25"
          >
            <Plus className="w-4 h-4" /> Custom Install
          </button>
          <Link
            to="/docker"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-700/60 transition-all border border-slate-700/40"
          >
            <Container className="w-4 h-4" />
            Manage Containers
          </Link>
        </div>
      </div>

      {/* Docker Status Banner */}
      {dockerAvailable === false && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Docker is not available on this host</p>
            <p className="text-amber-400/70 mt-0.5">
              Docker container apps require Docker Desktop (Windows/Mac) or Docker Engine (Linux). Apps will be registered as definitions only.{' '}
              <Link to="/docker" className="underline hover:text-amber-200">Configure Docker →</Link>
            </p>
          </div>
        </div>
      )}
      {dockerAvailable === true && (
        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <p>Docker is running — apps will be pulled and started automatically.</p>
        </div>
      )}

      {/* Install Message */}
      {installMsg && (
        <div className={`flex items-center gap-2 p-3.5 rounded-xl text-sm border ${
          installMsg.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
            : 'bg-red-500/10 border-red-500/20 text-red-300'
        }`}>
          {installMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {installMsg.text}
        </div>
      )}

      {/* Featured Apps */}
      {selectedCategory === 'All' && !search && (
        <div>
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            Featured Apps
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {featuredApps.slice(0, 8).map((app) => {
              const Icon = app.icon;
              const isInstalled = installedIds.has(app.id);
              const isInstalling = installingId === app.id;
              return (
                <div
                  key={app.id}
                  className="card p-4 cursor-pointer hover:border-brand-500/40 transition-all group"
                  onClick={() => setSelectedApp(app)}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center border mb-3 ${app.iconBg}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">{app.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{app.description}</p>
                  <div className="flex items-center justify-between mt-3">
                    <StarRating stars={app.stars} />
                    {isInstalled ? (
                      <span className="flex items-center gap-1 text-xs text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" /> Installed
                      </span>
                    ) : (
                      <button
                        className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                        onClick={(e) => { e.stopPropagation(); handleInstall(app); }}
                        disabled={isInstalling}
                      >
                        {isInstalling ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        Install
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search apps, categories, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input w-full pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {ALL_CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                  : 'bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:text-white hover:border-slate-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* App Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-white">
            {selectedCategory === 'All' ? 'All Apps' : selectedCategory}
            <span className="ml-2 text-sm text-slate-500 font-normal">({filteredApps.length})</span>
          </h2>
        </div>
        {filteredApps.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">No apps found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredApps.map((app) => {
              const Icon = app.icon;
              const isInstalled = installedIds.has(app.id);
              const isInstalling = installingId === app.id;
              return (
                <div
                  key={app.id}
                  className="card flex flex-col cursor-pointer hover:border-brand-500/40 transition-all group"
                  onClick={() => setSelectedApp(app)}
                >
                  <div className="p-4 flex-1">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center border shrink-0 ${app.iconBg}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      {app.dockerImage && (
                        <span className="px-1.5 py-0.5 text-[10px] bg-blue-500/15 text-blue-400 border border-blue-500/25 rounded-md flex items-center gap-0.5">
                          <Container className="w-2.5 h-2.5" /> Docker
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-semibold text-white group-hover:text-brand-300 transition-colors">{app.name}</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2">{app.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {app.tags.slice(0, 3).map((tag) => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-500 border border-slate-700/30">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="px-4 pb-4 pt-2 border-t border-slate-700/30 flex items-center justify-between">
                    <StarRating stars={app.stars} />
                    <button
                      onClick={(e) => { e.stopPropagation(); isInstalled ? null : handleInstall(app); }}
                      disabled={isInstalling}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        isInstalled
                          ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                          : isInstalling
                            ? 'text-brand-400 bg-brand-500/10 cursor-wait'
                            : 'btn-primary text-xs'
                      }`}
                    >
                      {isInstalled ? (
                        <><CheckCircle2 className="w-3 h-3" /> Installed</>
                      ) : isInstalling ? (
                        <><Loader2 className="w-3 h-3 animate-spin" /> Installing...</>
                      ) : (
                        <><Download className="w-3 h-3" /> Install</>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cloudflare Install Modal */}
      {showCloudflareModal && (
        <CloudflareInstallModal
          onClose={() => setShowCloudflareModal(false)}
          onInstall={(token) => {
            const cfApp = CATALOG_APPS.find((a) => a.id === 'cloudflare-tunnel');
            if (cfApp) {
              handleInstall(cfApp, { TUNNEL_TOKEN: token || 'DEMO_TUNNEL_TOKEN' });
            }
          }}
          isInstalling={installingId === 'cloudflare-tunnel'}
        />
      )}

      {/* App Detail Modal */}
      {selectedApp && (
        <AppDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onInstall={handleInstall}
          onCustomize={handleCustomize}
          isInstalling={installingId === selectedApp.id}
          isInstalled={installedIds.has(selectedApp.id)}
        />
      )}

      {/* CasaOS Custom Install Modal */}
      {showCustomModal && (
        <CasaInstallModal
          onClose={() => setShowCustomModal(false)}
          onSuccess={() => {
            loadInstalledApps();
          }}
          initialData={customModalData}
        />
      )}
    </div>
  );
}
