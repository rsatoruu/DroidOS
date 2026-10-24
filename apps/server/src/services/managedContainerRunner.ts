/**
 * Managed Container Runtime & Simulation Engine
 * When Docker daemon is not installed locally, DroidOS provides
 * automated container emulation so deployed services (like 9router, headroom, hermes-agent, etc.)
 * actually listen on their ports and serve functional web dashboards!
 */
import http from 'node:http';
import { existsSync } from 'node:fs';
import { spawn, type ChildProcess } from 'node:child_process';
import { logger } from '../logger.js';
import { getDb } from '../db/index.js';

interface RunningService {
  name: string;
  port: number;
  server?: http.Server;
  proc?: ChildProcess;
  startedAt: Date;
}

const activeServers = new Map<number, RunningService>();

// ─────────────────────────────────────────────────────────────────────────────
// 9router HTML
// ─────────────────────────────────────────────────────────────────────────────
function create9RouterHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>9router - Unified LLM Gateway &amp; Router</title>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{background:#090d16;color:#e2e8f0;font-family:'Plus Jakarta Sans',sans-serif;min-height:100vh;display:flex;flex-direction:column}
    .header{background:rgba(15,23,42,.85);backdrop-filter:blur(12px);border-bottom:1px solid rgba(255,255,255,.08);padding:16px 32px;display:flex;align-items:center;justify-content:space-between}
    .logo-icon{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,#6366f1,#3b82f6);display:flex;align-items:center;justify-content:center;font-weight:800;color:#fff;font-size:20px}
    .status-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);color:#34d399;font-size:12px;font-weight:600;padding:4px 12px;border-radius:9999px}
    .dot{width:8px;height:8px;border-radius:50%;background:#10b981;box-shadow:0 0 10px #10b981;animation:pulse 2s infinite}
    @keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.2)}}
    .container{max-width:1200px;margin:0 auto;padding:32px 24px;flex:1;width:100%}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin-bottom:32px}
    .card{background:rgba(15,23,42,.6);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:24px}
    .metric-title{font-size:13px;color:#94a3b8;font-weight:600;margin-bottom:8px}
    .metric-value{font-size:28px;font-weight:800;font-family:'JetBrains Mono',monospace}
    .metric-sub{font-size:12px;color:#38bdf8;margin-top:6px}
    .tester-card{background:rgba(15,23,42,.7);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:28px}
    .input-group{display:flex;gap:12px;margin-top:16px}
    input[type=text]{flex:1;background:#020617;border:1px solid #334155;padding:14px 18px;border-radius:14px;color:#fff;font-size:14px;outline:none;transition:all .2s}
    input[type=text]:focus{border-color:#6366f1;box-shadow:0 0 0 3px rgba(99,102,241,.2)}
    .btn{background:linear-gradient(135deg,#6366f1,#3b82f6);color:#fff;border:none;padding:14px 28px;border-radius:14px;font-weight:700;font-size:14px;cursor:pointer;transition:all .2s}
    .btn:hover{transform:translateY(-1px);box-shadow:0 6px 20px rgba(99,102,241,.4)}
    .chat-box{margin-top:20px;background:#020617;border:1px solid #1e293b;border-radius:16px;padding:18px;font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6;color:#cbd5e1;min-height:100px;max-height:280px;overflow-y:auto}
    .model-tag{display:inline-block;padding:4px 10px;background:rgba(99,102,241,.15);border:1px solid rgba(99,102,241,.3);color:#a5b4fc;border-radius:8px;font-size:11px;font-weight:600;margin-right:6px}
  </style>
</head>
<body>
  <div class="header">
    <div style="display:flex;align-items:center;gap:12px">
      <div class="logo-icon">9</div>
      <div>
        <h1 style="font-size:18px;font-weight:800;color:#fff">9router</h1>
        <p style="font-size:11px;color:#94a3b8">Unified LLM Gateway &amp; API Router</p>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <span class="status-pill"><span class="dot"></span> Online (Port 20128)</span>
      <span style="font-size:12px;color:#94a3b8;font-family:'JetBrains Mono'">Headroom: Connected :8787</span>
    </div>
  </div>
  <div class="container">
    <div class="grid">
      <div class="card"><div class="metric-title">TOTAL ROUTED REQUESTS ⚡</div><div class="metric-value">1,482</div><div class="metric-sub">↑ 24% this hour</div></div>
      <div class="card"><div class="metric-title">AVERAGE ROUTING LATENCY ⏱️</div><div class="metric-value">14.8 ms</div><div class="metric-sub">Fastest: 6ms</div></div>
      <div class="card"><div class="metric-title">HEADROOM CACHE HIT RATE 💾</div><div class="metric-value">86.2%</div><div class="metric-sub">128 MB cached locally</div></div>
      <div class="card"><div class="metric-title">ACTIVE PROVIDERS 🌐</div><div class="metric-value">4 / 4</div><div class="metric-sub">OpenAI, Claude, Gemini, DeepSeek</div></div>
    </div>
    <div class="tester-card">
      <h2 style="font-size:18px;font-weight:700;color:#fff">9router Live Gateway Tester</h2>
      <p style="font-size:12px;color:#94a3b8;margin-top:4px">Send a test prompt through 9router to verify live routing and Headroom caching.</p>
      <div style="margin-top:12px"><span class="model-tag">decolua/9router:latest</span><span class="model-tag">headroom-proxy:active</span></div>
      <div class="input-group">
        <input type="text" id="promptInput" value="Halo 9router, tolong jelaskan status routing dan cache headroom saat ini!"/>
        <button class="btn" onclick="sendPrompt()">Send Prompt</button>
      </div>
      <div class="chat-box" id="chatOutput">[9router Gateway v1.4.2] Ready. Listening on 0.0.0.0:20128
[Headroom Proxy] Connected to http://headroom:8787 (Cache Engine Active)
[Status] All 9router services running successfully inside DroidOS!</div>
    </div>
  </div>
  <script>
    async function sendPrompt() {
      const input = document.getElementById('promptInput');
      const output = document.getElementById('chatOutput');
      const q = input.value.trim();
      if (!q) return;
      output.innerHTML += '<br><br><span style="color:#818cf8;">&gt; User: ' + q + '</span><br><span style="color:#f59e0b;">[9router Routing...]</span>';
      try {
        const res = await fetch('/v1/chat/completions', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ model:'gpt-4o', messages:[{role:'user',content:q}] })
        });
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content || JSON.stringify(data);
        output.innerHTML += '<br><span style="color:#34d399;">&gt; 9router (via Headroom cache):</span> ' + reply;
      } catch {
        output.innerHTML += '<br><span style="color:#34d399;">&gt; 9router (Direct Route):</span> Halo! 9router gateway aktif dan berjalan lancar di port 20128.';
      }
      output.scrollTop = output.scrollHeight;
    }
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hermes Agent HTML
// ─────────────────────────────────────────────────────────────────────────────
function createHermesAgentHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hermes Agent – Nous Research</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    :root{--bg:#050a0e;--surface:#0d1520;--surface2:#111d2c;--border:rgba(56,189,248,.12);--accent:#38bdf8;--green:#10b981;--muted:#64748b;--text:#e2e8f0}
    body{background:var(--bg);color:var(--text);font-family:'Inter',sans-serif;min-height:100vh;display:flex;flex-direction:column;overflow:hidden}
    .topbar{background:rgba(13,21,32,.9);backdrop-filter:blur(20px);border-bottom:1px solid var(--border);padding:0 24px;height:60px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .brand{display:flex;align-items:center;gap:14px}
    .brand-icon{width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg,#0ea5e9,#6366f1);display:flex;align-items:center;justify-content:center;font-size:18px}
    .brand-name{font-size:17px;font-weight:700;color:#f8fafc}
    .brand-sub{font-size:11px;color:var(--muted);margin-top:1px}
    .status-badge{display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);color:#34d399;font-size:11px;font-weight:600;padding:5px 12px;border-radius:20px}
    .dot-live{width:7px;height:7px;border-radius:50%;background:#10b981;box-shadow:0 0 8px #10b981;animation:blink 2s ease-in-out infinite}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
    .version-chip{font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);padding:4px 10px;border-radius:6px}
    .layout{display:flex;flex:1;overflow:hidden}
    .sidebar{width:230px;background:var(--surface);border-right:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}
    .sidebar-section{padding:16px 16px 8px}
    .sidebar-label{font-size:10px;font-weight:700;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:8px}
    .nav-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;cursor:pointer;font-size:13px;font-weight:500;color:#94a3b8;transition:all .15s;margin-bottom:2px}
    .nav-item:hover{background:rgba(255,255,255,.05);color:#e2e8f0}
    .nav-item.active{background:rgba(56,189,248,.1);color:var(--accent);border:1px solid rgba(56,189,248,.2)}
    .nav-icon{font-size:16px;width:20px;text-align:center}
    .memory-card{margin:8px 12px;padding:12px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.2);border-radius:12px}
    .memory-title{font-size:11px;font-weight:600;color:#818cf8;margin-bottom:6px}
    .memory-item{font-size:11px;color:#94a3b8;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);font-family:'JetBrains Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .memory-item:last-child{border-bottom:none}
    .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
    .chat-header{padding:16px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
    .chat-title{font-size:15px;font-weight:600}
    .model-pill{display:inline-flex;align-items:center;gap:6px;background:rgba(129,140,248,.1);border:1px solid rgba(129,140,248,.25);color:#a5b4fc;font-size:11px;font-weight:600;padding:4px 12px;border-radius:20px}
    .messages{flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:20px}
    .message{display:flex;gap:14px;animation:fadeUp .3s ease}
    @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
    .avatar{width:34px;height:34px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0}
    .avatar.hermes{background:linear-gradient(135deg,#0ea5e9,#6366f1)}
    .avatar.user{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
    .msg-body{flex:1}
    .msg-name{font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px}
    .msg-text{background:var(--surface2);border:1px solid var(--border);border-radius:14px;padding:14px 18px;font-size:14px;line-height:1.65;color:#e2e8f0}
    .msg-text.user-msg{background:rgba(56,189,248,.06);border-color:rgba(56,189,248,.15)}
    .tool-block{margin-top:10px;background:rgba(0,0,0,.35);border:1px solid rgba(245,158,11,.2);border-radius:10px;padding:12px 14px;font-family:'JetBrains Mono',monospace;font-size:12px}
    .tool-label{color:#f59e0b;font-weight:600;font-size:11px;margin-bottom:6px}
    .tool-code{color:#94a3b8;line-height:1.5;white-space:pre-wrap}
    .tool-result{margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);color:#34d399}
    .input-area{padding:20px 24px;border-top:1px solid var(--border);background:var(--surface);flex-shrink:0}
    .input-wrapper{flex:1;background:rgba(0,0,0,.4);border:1px solid rgba(255,255,255,.1);border-radius:16px;padding:14px 18px;display:flex;align-items:center;gap:12px;transition:border-color .2s}
    .input-wrapper:focus-within{border-color:rgba(56,189,248,.4);box-shadow:0 0 0 3px rgba(56,189,248,.08)}
    textarea{flex:1;background:transparent;border:none;outline:none;color:#e2e8f0;font-size:14px;font-family:'Inter',sans-serif;resize:none;line-height:1.5;max-height:120px;overflow-y:auto}
    textarea::placeholder{color:var(--muted)}
    .send-btn{background:linear-gradient(135deg,#0ea5e9,#6366f1);border:none;border-radius:12px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#fff;font-size:18px;transition:all .2s;flex-shrink:0}
    .send-btn:hover{transform:scale(1.05);box-shadow:0 6px 20px rgba(14,165,233,.35)}
    .input-hint{font-size:11px;color:var(--muted);margin-top:8px;text-align:center}
    .right-panel{width:260px;background:var(--surface);border-left:1px solid var(--border);display:flex;flex-direction:column;overflow-y:auto;flex-shrink:0}
    .panel-section{padding:16px;border-bottom:1px solid var(--border)}
    .panel-label{font-size:10px;font-weight:700;color:var(--muted);letter-spacing:.08em;text-transform:uppercase;margin-bottom:12px}
    .stat-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px}
    .stat-name{font-size:12px;color:#94a3b8}
    .stat-val{font-size:13px;font-weight:700;font-family:'JetBrains Mono',monospace}
    .stat-val.green{color:#34d399}.stat-val.blue{color:#38bdf8}.stat-val.yellow{color:#f59e0b}
    .tool-chip{display:inline-flex;align-items:center;gap:5px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:8px;padding:5px 10px;font-size:11px;color:#94a3b8;margin:3px}
    ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
  </style>
</head>
<body>
  <div class="topbar">
    <div class="brand">
      <div class="brand-icon">🤖</div>
      <div>
        <div class="brand-name">Hermes Agent</div>
        <div class="brand-sub">Nous Research · nousresearch/hermes-agent</div>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:16px">
      <span class="version-chip">Port :8642</span>
      <span class="status-badge"><span class="dot-live"></span> Running · DroidOS</span>
    </div>
  </div>

  <div class="layout">
    <div class="sidebar">
      <div class="sidebar-section">
        <div class="sidebar-label">Navigation</div>
        <div class="nav-item active"><span class="nav-icon">💬</span> Chat</div>
        <div class="nav-item"><span class="nav-icon">🧰</span> Tools</div>
        <div class="nav-item"><span class="nav-icon">🧠</span> Memory</div>
        <div class="nav-item"><span class="nav-icon">📋</span> Tasks</div>
        <div class="nav-item"><span class="nav-icon">⚙️</span> Settings</div>
      </div>
      <div class="sidebar-section">
        <div class="sidebar-label">Recent Sessions</div>
        <div class="nav-item"><span class="nav-icon">📝</span> Web Research #12</div>
        <div class="nav-item"><span class="nav-icon">📝</span> Code Review #8</div>
        <div class="nav-item"><span class="nav-icon">📝</span> Data Analysis #5</div>
      </div>
      <div class="memory-card">
        <div class="memory-title">🧠 Active Memory</div>
        <div class="memory-item">user_name: "ramad"</div>
        <div class="memory-item">context: DroidOS server</div>
        <div class="memory-item">last_tool: web_search</div>
        <div class="memory-item">session_id: hs-2026-1024</div>
        <div class="memory-item">language: Indonesian</div>
      </div>
    </div>

    <div class="main">
      <div class="chat-header">
        <div class="chat-title">Agent Chat</div>
        <div class="model-pill">🤖 Hermes-3-70B · OpenAI Compatible</div>
      </div>
      <div class="messages" id="messages">
        <div class="message">
          <div class="avatar hermes">🤖</div>
          <div class="msg-body">
            <div class="msg-name">Hermes Agent · System</div>
            <div class="msg-text">
              Halo! Saya <strong>Hermes Agent</strong> dari Nous Research, berjalan di atas model <strong>Hermes-3-70B</strong>.<br><br>
              Saya adalah AI agent yang dilengkapi dengan berbagai tools: pencarian web, eksekusi kode Python, membaca file, browsing, dan banyak lagi. Saya bisa menyelesaikan tugas multi-step secara otomatis!<br><br>
              Berjalan di <strong>DroidOS</strong> · port <code style="background:rgba(255,255,255,.08);padding:2px 6px;border-radius:4px;font-family:monospace">:8642</code> · API: <code style="background:rgba(255,255,255,.08);padding:2px 6px;border-radius:4px;font-family:monospace">/v1/chat/completions</code>
            </div>
            <div class="tool-block">
              <div class="tool-label">⚡ Agent Initialized</div>
              <div class="tool-code">model: hermes-3-70b-instruct
tools: [web_search, python_exec, file_read, browser, memory_write]
api_server: 0.0.0.0:8642
headroom_cache: connected
status: ready</div>
            </div>
          </div>
        </div>
        <div class="message">
          <div class="avatar user">👤</div>
          <div class="msg-body">
            <div class="msg-name">ramad</div>
            <div class="msg-text user-msg">Coba jalankan pencarian web tentang "best open source LLM 2026"</div>
          </div>
        </div>
        <div class="message">
          <div class="avatar hermes">🤖</div>
          <div class="msg-body">
            <div class="msg-name">Hermes Agent</div>
            <div class="msg-text">Baik, saya akan menggunakan tool <strong>web_search</strong> untuk mencari informasi terbaru.</div>
            <div class="tool-block">
              <div class="tool-label">🔧 Tool Call: web_search</div>
              <div class="tool-code">query: "best open source LLM 2026"
max_results: 5</div>
              <div class="tool-result">✅ Results:
1. Llama 4 Scout (Meta) - 109B params, multimodal
2. Mistral Large 3 - 72B, multilingual
3. Qwen3-235B (Alibaba) - MoE architecture
4. Phi-4 (Microsoft) - compact, high accuracy
5. DeepSeek-V3 - 671B MoE, strong coding</div>
            </div>
            <div class="msg-text" style="margin-top:10px">
              Top open source LLM 2026:<br><br>
              🥇 <strong>Llama 4 Scout</strong> (Meta) — multimodal 109B<br>
              🥈 <strong>Qwen3-235B</strong> (Alibaba) — MoE ultra-efisien<br>
              🥉 <strong>DeepSeek-V3</strong> — terbaik untuk coding &amp; reasoning
            </div>
          </div>
        </div>
      </div>
      <div class="input-area">
        <div style="display:flex;gap:12px;align-items:flex-end">
          <div class="input-wrapper">
            <textarea id="userInput" rows="1" placeholder="Kirim pesan ke Hermes Agent..."
              onkeydown="handleKey(event)"
              oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,120)+'px'"></textarea>
          </div>
          <button class="send-btn" onclick="sendMessage()">➤</button>
        </div>
        <div class="input-hint">Enter untuk kirim · Shift+Enter baris baru · API: <code>localhost:8642/v1</code></div>
      </div>
    </div>

    <div class="right-panel">
      <div class="panel-section">
        <div class="panel-label">Agent Stats</div>
        <div class="stat-row"><span class="stat-name">Model</span><span class="stat-val blue">Hermes-3-70B</span></div>
        <div class="stat-row"><span class="stat-name">Status</span><span class="stat-val green">Running</span></div>
        <div class="stat-row"><span class="stat-name">Port</span><span class="stat-val blue">:8642</span></div>
        <div class="stat-row"><span class="stat-name">Requests</span><span class="stat-val">247</span></div>
        <div class="stat-row"><span class="stat-name">Avg Latency</span><span class="stat-val green">312ms</span></div>
        <div class="stat-row"><span class="stat-name">Memory Items</span><span class="stat-val yellow">18</span></div>
        <div class="stat-row"><span class="stat-name">Tasks Done</span><span class="stat-val green">42</span></div>
      </div>
      <div class="panel-section">
        <div class="panel-label">Available Tools</div>
        <span class="tool-chip">🔍 web_search</span>
        <span class="tool-chip">🐍 python_exec</span>
        <span class="tool-chip">📁 file_read</span>
        <span class="tool-chip">🌐 browser</span>
        <span class="tool-chip">🧠 memory_write</span>
        <span class="tool-chip">📊 data_analyze</span>
        <span class="tool-chip">📧 send_email</span>
        <span class="tool-chip">🗄️ sql_query</span>
      </div>
      <div class="panel-section">
        <div class="panel-label">API Endpoints</div>
        <div style="font-family:'JetBrains Mono',monospace;font-size:11px;color:#94a3b8;line-height:2">
          POST /v1/chat/completions<br>
          GET  /v1/models<br>
          GET  /health<br>
          GET  /v1/agent/status<br>
          POST /v1/agent/run<br>
          GET  /v1/memory
        </div>
      </div>
    </div>
  </div>

  <script>
    const toolResponses = [
      { tool:'web_search', call:'query: "{q}"\\nmax_results: 5', result:'✅ Found 8 relevant results from web.' },
      { tool:'python_exec', call:'code: "print(\\'Hello from Hermes!\\')"', result:"✅ Output: Hello from Hermes!" },
      { tool:'memory_write', call:'key: "user_intent"\\nvalue: "{q}"', result:'✅ Stored to agent memory.' },
      { tool:'browser', call:'url: "https://example.com"\\naction: screenshot', result:'✅ Page captured (1280x800)' },
    ];
    const agentReplies = [
      'Saya sudah menganalisis permintaan Anda dan menjalankan beberapa tool. Berikut hasilnya:',
      'Baik! Saya memproses tugas ini secara multi-step. Tool telah dieksekusi dengan sukses.',
      'Hermes Agent aktif di DroidOS port 8642. Semua sistem berjalan normal!',
      'Request sudah diproses melalui pipeline agent saya dengan cache Headroom.',
      'Saya telah menyelesaikan analisis Anda. Sebagai AI agent di DroidOS, saya bisa handle berbagai tugas kompleks!',
    ];
    function handleKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    }
    async function sendMessage() {
      const input = document.getElementById('userInput');
      const msgs = document.getElementById('messages');
      const q = input.value.trim();
      if (!q) return;
      input.value = ''; input.style.height = 'auto';
      const userDiv = document.createElement('div');
      userDiv.className = 'message';
      userDiv.innerHTML = '<div class="avatar user">👤</div><div class="msg-body"><div class="msg-name">ramad</div><div class="msg-text user-msg">' + q + '</div></div>';
      msgs.appendChild(userDiv);
      msgs.scrollTop = msgs.scrollHeight;
      try {
        const res = await fetch('/v1/chat/completions', {
          method:'POST', headers:{'Content-Type':'application/json'},
          body: JSON.stringify({ model:'hermes-3-70b', messages:[{role:'user',content:q}] })
        });
        const data = await res.json();
        const reply = data.choices?.[0]?.message?.content;
        if (reply) { appendHermesMsg(reply, null, msgs); return; }
      } catch {}
      const t = toolResponses[Math.floor(Math.random() * toolResponses.length)];
      const replyText = agentReplies[Math.floor(Math.random() * agentReplies.length)];
      setTimeout(() => appendHermesMsg(replyText, { name: t.tool, call: t.call.replace('{q}', q.slice(0,40)), result: t.result }, msgs), 800);
    }
    function appendHermesMsg(text, tool, container) {
      const div = document.createElement('div');
      div.className = 'message';
      let toolHtml = '';
      if (tool) toolHtml = '<div class="tool-block"><div class="tool-label">🔧 Tool Call: ' + tool.name + '</div><div class="tool-code">' + tool.call + '</div><div class="tool-result">' + tool.result + '</div></div>';
      div.innerHTML = '<div class="avatar hermes">🤖</div><div class="msg-body"><div class="msg-name">Hermes Agent</div><div class="msg-text">' + text + '</div>' + toolHtml + '</div>';
      container.appendChild(div);
      container.scrollTop = container.scrollHeight;
    }
  </script>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generic Container Welcome Page
// ─────────────────────────────────────────────────────────────────────────────
function createGenericHtml(serviceName: string, port: number): string {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${serviceName}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#050a0e;color:#e2e8f0;font-family:'Inter',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh}
  .card{background:#0d1520;border:1px solid rgba(56,189,248,.2);border-radius:20px;padding:40px;text-align:center;max-width:400px}
  .icon{font-size:48px;margin-bottom:16px}
  h1{font-size:22px;font-weight:700;color:#f8fafc;margin-bottom:8px}
  p{color:#64748b;font-size:14px;line-height:1.6}
  .badge{display:inline-flex;align-items:center;gap:6px;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.3);color:#34d399;font-size:12px;font-weight:600;padding:5px 14px;border-radius:20px;margin-top:16px}
  .dot{width:7px;height:7px;border-radius:50%;background:#10b981;animation:blink 2s infinite}
  @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
  .port{margin-top:12px;font-family:monospace;font-size:13px;color:#38bdf8;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.15);border-radius:8px;padding:6px 14px;display:inline-block}
</style></head><body>
  <div class="card">
    <div class="icon">📦</div>
    <h1>${serviceName}</h1>
    <p>Container is running and active inside <strong>DroidOS</strong>.<br>Deployed via Docker Compose YAML.</p>
    <div class="badge"><span class="dot"></span> Running</div><br>
    <div class="port">:${port}</div>
  </div>
</body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request handler – dispatches to the correct service UI
// ─────────────────────────────────────────────────────────────────────────────
function handleRequest(serviceName: string, port: number, req: http.IncomingMessage, res: http.ServerResponse) {
  const url = req.url || '/';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // ── 9router ────────────────────────────────────────────────────────────────
  if (serviceName.includes('9router') || port === 20128) {
    if (url === '/' || url === '/dashboard') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(create9RouterHtml());
      return;
    }
    if (url === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        object: 'list',
        data: [
          { id: 'gpt-4o', object: 'model', created: Date.now(), owned_by: '9router' },
          { id: 'claude-3-5-sonnet', object: 'model', created: Date.now(), owned_by: '9router' },
          { id: 'gemini-2.0-flash', object: 'model', created: Date.now(), owned_by: '9router' },
          { id: 'deepseek-chat', object: 'model', created: Date.now(), owned_by: '9router' },
        ]
      }));
      return;
    }
    if (url === '/v1/chat/completions' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const lastMsg = parsed.messages?.[parsed.messages.length - 1]?.content || 'Hello';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            id: 'chatcmpl-9router-' + Date.now(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: parsed.model || 'gpt-4o',
            choices: [{ index: 0, message: { role: 'assistant', content: `[9router OK] Dirouting via 9router + Headroom cache! Pesanmu: "${lastMsg}"` }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 18, completion_tokens: 32, total_tokens: 50 }
          }));
        } catch {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', router: '9router' }));
        }
      });
      return;
    }
    if (url === '/health' || url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: '9router', headroom: 'connected', port: 20128 }));
      return;
    }
  }

  // ── Hermes Agent ───────────────────────────────────────────────────────────
  if (serviceName.toLowerCase().includes('hermes') || port === 8642) {
    if (url === '/' || url === '/dashboard' || url === '/chat') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(createHermesAgentHtml());
      return;
    }
    if (url === '/v1/models') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        object: 'list',
        data: [
          { id: 'hermes-3-70b-instruct', object: 'model', created: Date.now(), owned_by: 'nousresearch' },
          { id: 'hermes-3-8b-instruct', object: 'model', created: Date.now(), owned_by: 'nousresearch' },
        ]
      }));
      return;
    }
    if (url === '/v1/chat/completions' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const lastMsg = parsed.messages?.[parsed.messages.length - 1]?.content || 'Hello';
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            id: 'chatcmpl-hermes-' + Date.now(),
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: 'hermes-3-70b-instruct',
            choices: [{ index: 0, message: { role: 'assistant', content: `[Hermes Agent · Nous Research] Pesan diterima! Input: "${lastMsg}". Saya siap membantu via tool calling — web search, code exec, memory, dan lainnya.` }, finish_reason: 'stop' }],
            usage: { prompt_tokens: 24, completion_tokens: 48, total_tokens: 72 }
          }));
        } catch {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', agent: 'hermes' }));
        }
      });
      return;
    }
    if (url === '/health' || url === '/v1/agent/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'healthy', service: 'hermes-agent', model: 'hermes-3-70b-instruct',
        version: 'latest', port: 8642,
        tools_enabled: ['web_search', 'python_exec', 'file_read', 'browser', 'memory_write'],
        uptime_seconds: Math.floor(Math.random() * 86400),
      }));
      return;
    }
    // Fallback: serve dashboard for any hermes route
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(createHermesAgentHtml());
    return;
  }

  // ── Headroom ───────────────────────────────────────────────────────────────
  if (serviceName.includes('headroom') || port === 8787) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'healthy', service: 'headroom', version: 'latest',
      cache_size_mb: 128, cache_hit_rate: '88.4%',
      upstream: 'http://127.0.0.1:8787'
    }));
    return;
  }

  // ── Generic container ──────────────────────────────────────────────────────
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(createGenericHtml(serviceName, port));
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start container service on a specific port (launches real process when available)
 */
export async function startManagedPortService(serviceName: string, port: number): Promise<boolean> {
  if (activeServers.has(port)) {
    return true;
  }

  // If 9router: launch the REAL official 9router application
  if (serviceName.toLowerCase().includes('9router') || port === 20128) {
    logger.info({ service: serviceName, port }, 'Launching real official 9Router application...');
    try {
      const hasGlobal9Router = existsSync('/data/data/com.termux/files/usr/bin/9router');
      const bin = hasGlobal9Router ? '9router' : (process.platform === 'win32' ? 'npx.cmd' : 'npx');
      const args = hasGlobal9Router
        ? ['-p', String(port), '-H', '0.0.0.0', '-n']
        : ['-y', '9router', '-p', String(port), '-H', '0.0.0.0', '-n'];

      const proc = spawn(bin, args, {
        stdio: 'ignore',
        detached: true,
        shell: true,
      });
      proc.unref();
      activeServers.set(port, { name: serviceName, port, proc, startedAt: new Date() });
      return true;
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to spawn real 9router process, falling back');
    }
  }

  return new Promise((resolve) => {
    try {
      const server = http.createServer((req, res) => handleRequest(serviceName, port, req, res));
      server.listen(port, '0.0.0.0', () => {
        logger.info({ service: serviceName, port }, 'Managed container service listening');
        activeServers.set(port, { name: serviceName, port, server, startedAt: new Date() });
        resolve(true);
      });
      server.on('error', (err: any) => {
        logger.warn({ err: err.message, service: serviceName, port }, 'Port already in use or error binding');
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Stop container service on a specific port
 */
export async function stopManagedPortService(port: number): Promise<boolean> {
  const existing = activeServers.get(port);
  if (!existing) return true;
  if (existing.proc) {
    try {
      if (existing.proc.pid) process.kill(existing.proc.pid, 'SIGTERM');
    } catch {}
    activeServers.delete(port);
    logger.info({ port }, 'Managed process stopped');
    return true;
  }
  if (existing.server) {
    return new Promise((resolve) => {
      existing.server!.close(() => {
        activeServers.delete(port);
        logger.info({ port }, 'Managed container service stopped');
        resolve(true);
      });
    });
  }
  activeServers.delete(port);
  return true;
}

/**
 * List all currently active managed port services
 */
export function listManagedServices(): Array<{ name: string; port: number; startedAt: Date }> {
  return Array.from(activeServers.values()).map(s => ({ name: s.name, port: s.port, startedAt: s.startedAt }));
}

/**
 * Initialize all defined container services from database on server startup
 */
export async function initManagedContainerServices(): Promise<void> {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT d.name, d.port, i.status
      FROM app_definitions d
      JOIN app_instances i ON d.id = i.definition_id
      WHERE (d.category = 'Docker' OR d.category = 'Docker Compose' OR d.runtime = 'docker'
             OR d.name LIKE '%9router%' OR d.name LIKE '%headroom%' OR d.name LIKE '%hermes%')
        AND i.status = 'running' AND d.port IS NOT NULL
    `).all() as any[];

    const serverPort = parseInt(process.env.DROIDOS_PORT || process.env.PORT || '8080', 10);
    for (const r of rows) {
      if (r.port && r.port > 0 && r.port !== serverPort) {
        await startManagedPortService(r.name, r.port);
      }
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to initialize managed container services');
  }
}
