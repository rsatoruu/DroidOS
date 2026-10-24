import { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon,
  Play,
  Trash2,
  Loader2,
  Smartphone,
  Copy,
  Check,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { api } from '../lib/api';

interface CommandOutput {
  id: string;
  command: string;
  timestamp: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

const QUICK_COMMANDS = [
  { label: 'Uptime', cmd: 'uptime' },
  { label: 'Memory (free -m)', cmd: 'free -m' },
  { label: 'Storage (df -h)', cmd: 'df -h' },
  { label: 'Wake Lock', cmd: 'termux-wake-lock' },
  { label: 'Network (ip a / ifconfig)', cmd: 'ip a 2>/dev/null || ifconfig || ipconfig' },
  { label: 'Node & Python', cmd: 'node -v; python3 --version || python --version' },
  { label: 'Installed packages', cmd: 'pkg list-installed 2>/dev/null || npm list --depth=0' },
  { label: 'Directory list (ls -la)', cmd: 'ls -la' },
];

export function TerminalPage() {
  const [history, setHistory] = useState<CommandOutput[]>([]);
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(false);
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Focus input on mount and on history changes
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (!loading) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [history, loading]);

  // Global keydown listener to focus input whenever typing
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // If user is pressing keys like letters/numbers and activeElement is not an input
      if (
        document.activeElement !== inputRef.current &&
        !['Tab', 'Escape', 'Alt', 'Control', 'Meta', 'Shift'].includes(e.key) &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey
      ) {
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const handleExecute = async (cmdToRun?: string) => {
    const rawCmd = (cmdToRun || command).trim();
    if (!rawCmd || loading) return;

    setLoading(true);
    setCmdHistory((prev) => [rawCmd, ...prev.filter((c) => c !== rawCmd)]);
    setHistoryIndex(-1);
    setCommand('');

    try {
      const res = await api.post('/system/exec', { command: rawCmd });
      const data = res.data?.data || {};

      const newOutput: CommandOutput = {
        id: Math.random().toString(36).substring(2, 9),
        command: rawCmd,
        timestamp: new Date().toLocaleTimeString(),
        stdout: data.stdout || '',
        stderr: data.stderr || '',
        exitCode: data.exitCode ?? 0,
        durationMs: data.durationMs ?? 0,
      };

      setHistory((prev) => [...prev, newOutput]);
    } catch (err: any) {
      const newOutput: CommandOutput = {
        id: Math.random().toString(36).substring(2, 9),
        command: rawCmd,
        timestamp: new Date().toLocaleTimeString(),
        stdout: '',
        stderr: err.response?.data?.error || err.message || 'Execution error',
        exitCode: 1,
        durationMs: 0,
      };
      setHistory((prev) => [...prev, newOutput]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleExecute();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (cmdHistory.length > 0 && historyIndex < cmdHistory.length - 1) {
        const nextIndex = historyIndex + 1;
        setHistoryIndex(nextIndex);
        setCommand(cmdHistory[nextIndex]!);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIndex = historyIndex - 1;
        setHistoryIndex(nextIndex);
        setCommand(cmdHistory[nextIndex]!);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCommand('');
      }
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const focusTerminalInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div
      className={`space-y-4 max-w-6xl mx-auto flex flex-col ${
        isExpanded ? 'fixed inset-0 z-50 p-4 bg-surface-900 overflow-y-auto' : ''
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <TerminalIcon className="w-6 h-6 text-brand-400" />
            Web Terminal & Shell
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Execute shell commands directly in Termux or host environment with full interactive shell input.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {history.length > 0 && (
            <button
              onClick={() => setHistory([])}
              className="btn-secondary flex items-center gap-1.5 text-xs py-1.5"
              title="Clear Terminal"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              Clear
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="btn-secondary flex items-center gap-1.5 text-xs py-1.5"
            title={isExpanded ? 'Minimize' : 'Expand full screen'}
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {isExpanded ? 'Exit Fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>

      {/* Quick Command Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
        <span className="text-xs text-slate-500 font-medium shrink-0 flex items-center gap-1">
          <Smartphone className="w-3.5 h-3.5" /> Quick:
        </span>
        {QUICK_COMMANDS.map((item) => (
          <button
            key={item.label}
            onClick={() => handleExecute(item.cmd)}
            disabled={loading}
            className="text-xs px-2.5 py-1 rounded-md bg-surface-800 border border-surface-600 hover:border-brand-500/50 hover:bg-surface-700 text-slate-300 transition-colors shrink-0 font-mono"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Terminal Screen - Clicking anywhere focuses the prompt input */}
      <div
        onClick={focusTerminalInput}
        className="card p-0 overflow-hidden border-surface-600 bg-[#0d1117] flex-1 flex flex-col shadow-2xl rounded-xl cursor-text"
      >
        {/* Terminal Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-surface-700 select-none">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="text-xs font-mono text-slate-400 ml-2">droidos@termux:~</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500">
            {history.length} commands executed
          </div>
        </div>

        {/* Console Body with History and Inline Input */}
        <div className="p-4 flex-1 min-h-[380px] max-h-[600px] overflow-y-auto font-mono text-xs space-y-4">
          {history.length === 0 && !loading && (
            <div className="text-slate-500 space-y-1 select-none">
              <div className="text-brand-300 font-semibold">DroidOS Interactive Shell v0.1.0</div>
              <div>Click anywhere inside this terminal to type commands. Press Enter to execute.</div>
              <div className="text-slate-600 pt-1">Use Up/Down arrows to navigate previous commands.</div>
            </div>
          )}

          {history.map((item) => (
            <div key={item.id} className="space-y-1.5 group">
              {/* Command Prompt */}
              <div className="flex items-center justify-between text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold select-none">droidos@host:~$</span>
                  <span className="font-semibold text-white">{item.command}</span>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] text-slate-500">{item.durationMs}ms</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded ${
                      item.exitCode === 0
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}
                  >
                    code: {item.exitCode}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCopy(item.id, item.stdout || item.stderr);
                    }}
                    className="text-slate-500 hover:text-slate-300 p-1"
                    title="Copy output"
                  >
                    {copiedId === item.id ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                  </button>
                </div>
              </div>

              {/* Stdout Output */}
              {item.stdout && (
                <pre className="text-slate-300 whitespace-pre-wrap bg-surface-900/60 p-3 rounded border border-surface-700/50 overflow-x-auto leading-relaxed">
                  {item.stdout}
                </pre>
              )}

              {/* Stderr Output */}
              {item.stderr && (
                <pre className="text-red-400 whitespace-pre-wrap bg-red-950/20 p-3 rounded border border-red-500/30 overflow-x-auto leading-relaxed">
                  {item.stderr}
                </pre>
              )}
            </div>
          ))}

          {/* Execution Spinner */}
          {loading && (
            <div className="flex items-center gap-2 text-brand-400 bg-brand-500/10 border border-brand-500/20 p-2.5 rounded-lg animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-brand-400" />
              <span className="font-semibold">Executing command...</span>
            </div>
          )}

          {/* Authentic Inline Prompt Input Line with High-Visibility Focus */}
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-900/90 border border-brand-500/40 shadow-inner">
            <span className="text-emerald-400 font-bold select-none whitespace-nowrap flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
              droidos@host:~$
            </span>
            <input
              ref={inputRef}
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="type command and press Enter (or click Run below)..."
              className="flex-1 bg-transparent font-mono text-xs text-white placeholder-slate-500 focus:outline-none border-none p-0 outline-none"
              autoFocus
            />
            {command && (
              <button
                type="button"
                onClick={() => setCommand('')}
                className="text-slate-500 hover:text-slate-300 text-[10px] px-1.5 py-0.5 rounded bg-surface-800"
              >
                Clear
              </button>
            )}
          </div>

          <div ref={terminalEndRef} />
        </div>

        {/* Bottom Synced Command Input Bar */}
        <div className="p-3 bg-[#161b22] border-t border-surface-700 flex items-center gap-2 select-none">
          <div className="flex items-center gap-1.5 font-mono text-xs text-emerald-400 shrink-0 font-bold pl-1">
            <span>&gt;</span>
          </div>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Type command here (e.g. dir, uptime, node -v, ping 8.8.8.8, docker ps)..."
            className="input bg-[#090d13] border-surface-600 focus:border-brand-500 font-mono text-xs text-white placeholder-slate-500 flex-1 py-2 px-3"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleExecute();
            }}
            disabled={loading || !command.trim()}
            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 font-semibold shrink-0"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Run <kbd className="hidden sm:inline text-[10px] opacity-75 font-mono ml-0.5">↵</kbd>
          </button>
        </div>
      </div>
    </div>
  );
}
