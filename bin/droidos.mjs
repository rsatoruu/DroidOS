#!/usr/bin/env node
/**
 * DroidOS CLI Manager
 * Provides management commands for DroidOS in Termux and host systems.
 */
import { existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, createReadStream, openSync } from 'node:fs';
import { join } from 'node:path';
import { homedir, networkInterfaces } from 'node:os';
import { spawn } from 'node:child_process';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

const DATA_DIR = process.env.DROIDOS_DATA_DIR || join(homedir(), '.droidos');
const PID_FILE = join(DATA_DIR, 'droidos.pid');
const LOG_FILE = join(DATA_DIR, 'droidos.log');
const DEFAULT_PORT = parseInt(process.env.DROIDOS_PORT || '8080', 10);

mkdirSync(DATA_DIR, { recursive: true });

function getLocalIPs() {
  const nets = networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results.length > 0 ? results : ['127.0.0.1'];
}

function getRunningPid() {
  if (!existsSync(PID_FILE)) return null;
  try {
    const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10);
    // Check if process is alive
    process.kill(pid, 0);
    return pid;
  } catch {
    return null;
  }
}

function printBanner() {
  console.log(`
  \x1b[35m┌──────────────────────────────────────────────┐\x1b[0m
  \x1b[35m│\x1b[0m   \x1b[1;36m🤖 DroidOS - Android Home Server\x1b[0m           \x1b[35m│\x1b[0m
  \x1b[35m│\x1b[0m   CasaOS-inspired Server on Termux           \x1b[35m│\x1b[0m
  \x1b[35m└──────────────────────────────────────────────┘\x1b[0m
`);
}

async function cmdStart(args) {
  printBanner();
  const existingPid = getRunningPid();
  if (existingPid) {
    console.log(`\x1b[33m[!] DroidOS is already running (PID: ${existingPid})\x1b[0m`);
    const ips = getLocalIPs();
    console.log(`\x1b[32m[✓] Access Dashboard:\x1b[0m`);
    console.log(`    - Local:   http://localhost:${DEFAULT_PORT}`);
    for (const ip of ips) {
      console.log(`    - Network: http://${ip}:${DEFAULT_PORT}`);
    }
    return;
  }

  const isDaemon = args.includes('-d') || args.includes('--daemon');
  const serverScript = existsSync(join(ROOT_DIR, 'apps/server/dist/index.js'))
    ? join(ROOT_DIR, 'apps/server/dist/index.js')
    : join(ROOT_DIR, 'apps/server/src/index.ts');

  const useTsx = serverScript.endsWith('.ts');

  console.log(`\x1b[34m[*] Starting DroidOS server...\x1b[0m`);
  console.log(`    - Data directory: ${DATA_DIR}`);
  console.log(`    - Port: ${DEFAULT_PORT}`);

  if (isDaemon) {
    const out = openSync(LOG_FILE, 'a');
    const err = openSync(LOG_FILE, 'a');

    const cmd = useTsx ? 'npx' : 'node';
    const cmdArgs = useTsx ? ['tsx', serverScript] : [serverScript];

    const child = spawn(cmd, cmdArgs, {
      cwd: ROOT_DIR,
      detached: true,
      stdio: ['ignore', out, err],
      env: { ...process.env, HOST: '0.0.0.0', DROIDOS_HOST: '0.0.0.0', DROIDOS_PORT: String(DEFAULT_PORT), DROIDOS_DATA_DIR: DATA_DIR },
    });

    child.unref();
    writeFileSync(PID_FILE, String(child.pid));

    console.log(`\x1b[32m[✓] DroidOS daemon started with PID ${child.pid}\x1b[0m`);
    console.log(`\x1b[34m[*] Logs are written to: ${LOG_FILE}\x1b[0m`);
    const ips = getLocalIPs();
    console.log(`\x1b[32m[✓] Dashboard URLs:\x1b[0m`);
    console.log(`    - Local:   http://localhost:${DEFAULT_PORT}`);
    for (const ip of ips) {
      console.log(`    - Network: http://${ip}:${DEFAULT_PORT}`);
    }
  } else {
    // Run foreground
    const cmd = useTsx ? (process.platform === 'win32' ? 'npx.cmd' : 'npx') : 'node';
    const cmdArgs = useTsx ? ['tsx', serverScript] : [serverScript];

    const child = spawn(cmd, cmdArgs, {
      cwd: ROOT_DIR,
      stdio: 'inherit',
      env: { ...process.env, HOST: '0.0.0.0', DROIDOS_HOST: '0.0.0.0', DROIDOS_PORT: String(DEFAULT_PORT), DROIDOS_DATA_DIR: DATA_DIR },
    });

    writeFileSync(PID_FILE, String(child.pid));

    const cleanup = () => {
      try {
        if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
      } catch {}
    };

    process.on('SIGINT', () => {
      cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(0);
    });
    child.on('exit', () => {
      cleanup();
    });
  }
}

function cmdStop() {
  const pid = getRunningPid();
  if (!pid) {
    console.log(`\x1b[33m[!] DroidOS is not running.\x1b[0m`);
    return;
  }

  console.log(`\x1b[34m[*] Stopping DroidOS (PID: ${pid})...\x1b[0m`);
  try {
    process.kill(pid, 'SIGTERM');
    if (existsSync(PID_FILE)) unlinkSync(PID_FILE);
    console.log(`\x1b[32m[✓] DroidOS server stopped.\x1b[0m`);
  } catch (err) {
    console.error(`\x1b[31m[x] Failed to stop process ${pid}: ${err.message}\x1b[0m`);
  }
}

async function cmdStatus() {
  const pid = getRunningPid();
  printBanner();

  if (!pid) {
    console.log(`Status: \x1b[31m● Stopped\x1b[0m`);
    return;
  }

  console.log(`Status:  \x1b[32m● Running\x1b[0m (PID: ${pid})`);
  console.log(`Data:    ${DATA_DIR}`);

  // Query health endpoint
  const req = http.get(`http://localhost:${DEFAULT_PORT}/api/system/health`, (res) => {
    let data = '';
    res.on('data', (c) => (data += c));
    res.on('end', () => {
      try {
        const json = JSON.parse(data);
        if (json.success) {
          const uptimeSec = Math.floor(json.data.uptime);
          const hrs = Math.floor(uptimeSec / 3600);
          const mins = Math.floor((uptimeSec % 3600) / 60);
          const secs = uptimeSec % 60;
          console.log(`Uptime:  ${hrs}h ${mins}m ${secs}s`);
          console.log(`Version: ${json.data.version}`);
          console.log(`Setup:   ${json.data.setupRequired ? 'Pending setup wizard' : 'Configured'}`);
        }
      } catch {}

      const ips = getLocalIPs();
      console.log(`\n\x1b[1;37mNetwork Endpoints:\x1b[0m`);
      console.log(`  Local:   http://localhost:${DEFAULT_PORT}`);
      for (const ip of ips) {
        console.log(`  LAN:     http://${ip}:${DEFAULT_PORT}`);
      }
    });
  });

  req.on('error', () => {
    console.log(`\x1b[33mWarning: Process is alive but API port ${DEFAULT_PORT} is not answering yet.\x1b[0m`);
  });
}

function cmdLogs() {
  if (!existsSync(LOG_FILE)) {
    console.log(`\x1b[33mNo log file found at ${LOG_FILE}\x1b[0m`);
    return;
  }

  console.log(`\x1b[34m[*] Streaming logs from ${LOG_FILE} (Ctrl+C to stop)...\x1b[0m\n`);
  const tail = spawn(process.platform === 'win32' ? 'powershell' : 'tail', 
    process.platform === 'win32' 
      ? ['-Command', `Get-Content -Path "${LOG_FILE}" -Wait -Tail 50`]
      : ['-f', '-n', '50', LOG_FILE],
    { stdio: 'inherit' }
  );

  process.on('SIGINT', () => {
    tail.kill();
    process.exit(0);
  });
}

function cmdEnv() {
  printBanner();
  const isTermux = Boolean(process.env.TERMUX_VERSION || process.env.PREFIX?.includes('com.termux'));
  const isAndroid = process.platform === 'android' || isTermux;

  console.log(`\x1b[1;37mEnvironment Assessment:\x1b[0m`);
  console.log(`  Platform:         ${process.platform} (${process.arch})`);
  console.log(`  Android:          ${isAndroid ? '\x1b[32mYes\x1b[0m' : 'No'}`);
  console.log(`  Termux:           ${isTermux ? '\x1b[32mYes (prefix: ' + process.env.PREFIX + ')\x1b[0m' : 'No'}`);
  console.log(`  Node.js:          ${process.version}`);
  console.log(`  Storage (/sdcard): ${existsSync('/sdcard') ? '\x1b[32mAccessible\x1b[0m' : 'Standard filesystem'}`);

  const ips = getLocalIPs();
  console.log(`  Network IPs:      ${ips.join(', ')}`);

  if (isAndroid) {
    console.log(`\n\x1b[1;33mTermux Recommendations:\x1b[0m`);
    console.log(`  1. Run \x1b[36mtermux-wake-lock\x1b[0m to prevent Android CPU sleep.`);
    console.log(`  2. Run \x1b[36mtermux-setup-storage\x1b[0m to grant shared storage access.`);
  }
}

function printHelp() {
  printBanner();
  console.log(`
\x1b[1mUsage:\x1b[0m droidos <command> [options]

\x1b[1mCommands:\x1b[0m
  start [-d, --daemon]  Start DroidOS server (foreground or daemon)
  stop                  Stop running DroidOS server
  restart               Restart DroidOS server
  status                Show running status, uptime, and endpoints
  logs                  Tail live log output
  env                   Display Android / Termux environment diagnostic
  help                  Show this help menu

\x1b[1mEnvironment Variables:\x1b[0m
  DROIDOS_PORT          Listening port (default: 8080)
  DROIDOS_DATA_DIR      Database and config directory (default: ~/.droidos)
  JWT_SECRET            Custom secret key for JWT session tokens
`);
}

const args = process.argv.slice(2);
const command = args[0] || 'help';

switch (command) {
  case 'start':
    cmdStart(args.slice(1));
    break;
  case 'stop':
    cmdStop();
    break;
  case 'restart':
    cmdStop();
    setTimeout(() => cmdStart(args.slice(1)), 1500);
    break;
  case 'status':
    cmdStatus();
    break;
  case 'logs':
    cmdLogs();
    break;
  case 'env':
    cmdEnv();
    break;
  case 'help':
  case '--help':
  case '-h':
    printHelp();
    break;
  default:
    console.log(`\x1b[31mUnknown command: ${command}\x1b[0m`);
    printHelp();
    process.exit(1);
}
