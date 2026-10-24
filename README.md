# 🤖 DroidOS
> **CasaOS-Inspired Android Home Server Platform for Termux**

DroidOS is a self-hosted server management platform designed to run directly on Android devices through Termux **without root access**. It turns any spare Android smartphone or tablet into a local home server with an elegant web dashboard accessible from any phone, tablet, or PC on your local Wi-Fi network.

---

## ✨ Features

- 📱 **Designed for Android & Termux**: Native non-root execution. Respects Android battery limits, background wake-locks, and path conventions (`/data/data/com.termux`).
- 🖥️ **CasaOS-Inspired Web Dashboard**: High-aesthetic, responsive dark UI built with React, Tailwind CSS, Lucide icons, and Recharts.
- 🚀 **Native Application Manager**: Launch, stop, restart, and monitor Node.js, Python, and bash scripts/services directly on Android.
- 📁 **Integrated Web File Manager**: Browse, upload, download, edit, and organize files on internal storage and `/sdcard`.
- 📊 **Real-time Hardware Telemetry**: Live CPU usage, RAM utilization, storage stats, network bandwidth, and Android device info streaming over WebSockets.
- 🐳 **Docker Remote Management**: Connect and orchestrate remote Docker daemons or local rootless Docker if available.
- 🔒 **Hardened Security**: First-run setup wizard, bcrypt salted passwords, JWT sessions with HTTP-only cookies, and IP rate limiting against brute-force attacks.
- 🛠️ **CLI Toolkit**: Dedicated `droidos` command-line utility for starting, stopping, tailing logs, checking status, and diagnosing environment health.

---

## 🚀 Quick Start on Android (Termux)

### 1. Requirements on Android
- [Termux](https://f-droid.org/en/packages/com.termux/) (Install from **F-Droid**, not Google Play Store)
- Android 7.0 or higher
- 200MB+ free internal storage

### 2. One-Line Installer
Open Termux on your phone and run:

```bash
curl -fsSL https://raw.githubusercontent.com/rsatoruu/DroidOS/main/scripts/install-termux.sh | bash
```

*Or if you cloned this repository locally:*

```bash
cd DroidOS
chmod +x scripts/install-termux.sh
./scripts/install-termux.sh
```

### 3. Start the Server
```bash
droidos start -d
```

### 4. Access the Dashboard
- **On the phone**: Open browser at `http://localhost:8080`
- **On another PC/phone (Same Wi-Fi)**: Open browser at `http://<phone-ip-address>:8080` (e.g. `http://192.168.1.150:8080`)

---

## 💻 Running on Linux / macOS / Windows

DroidOS also runs natively on standard desktop/server environments:

```bash
# 1. Install dependencies
npm install

# 2. Build packages and frontend
npm run build

# 3. Start DroidOS
npm start
# or via CLI
node bin/droidos.mjs start
```

---

## 🛠️ CLI Reference (`droidos`)

| Command | Description |
|---|---|
| `droidos start` | Start server in foreground with live logs |
| `droidos start -d` | Start server as background daemon |
| `droidos stop` | Stop running background server |
| `droidos restart` | Restart server daemon |
| `droidos status` | Display server status, uptime, PID, and LAN URLs |
| `droidos logs` | Tail server logs in real-time |
| `droidos env` | Show Android / Termux diagnostic report |
| `droidos help` | Show CLI help menu |

---

## 🔋 Termux Best Practices for 24/7 Home Server

1. **Keep CPU Awake (Wake Lock)**:
   ```bash
   termux-wake-lock
   ```
2. **Disable Android Battery Optimization**:
   Go to Android **Settings > Apps > Termux > Battery > Unrestricted / Don't optimize**.
3. **Allow Shared Storage Access**:
   ```bash
   termux-setup-storage
   ```

---

## 📂 Architecture Overview

```
DroidOS/
├── apps/
│   ├── dashboard/          # React + Vite + Tailwind CSS CasaOS dashboard
│   │   ├── src/pages/      # Dashboard, Apps, Files, Docker, Monitoring, Settings, Setup, Login
│   │   └── src/store/      # Zustand authentication and session store
│   └── server/             # Fastify + TypeScript backend
│       ├── src/routes/     # REST and WebSocket endpoints
│       ├── src/services/   # App process manager, monitoring, auth, environment
│       └── src/db/         # SQLite schema, migrations, and repository
├── packages/
│   └── shared/             # Shared TypeScript interfaces, types, and Zod schemas
├── bin/
│   └── droidos.mjs         # CLI command-line utility
└── scripts/
    └── install-termux.sh   # Termux automated setup script
```

---

## 📄 License
MIT License. Built for the Android self-hosting community.
