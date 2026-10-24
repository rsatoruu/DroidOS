import { useEffect, useState } from 'react';
import {
  FolderOpen, File, Upload, Download, Trash2, FolderPlus,
  ArrowLeft, ChevronRight, RefreshCw, Loader2, Edit3, X, Check,
} from 'lucide-react';
import { api } from '../lib/api';

interface FileItem {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
  mtime: string;
}

interface DirListing {
  path: string;
  parent: string;
  items: FileItem[];
  allowedRoots: string[];
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '—';
  const k = 1024;
  const s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}

export function FilesPage() {
  const [listing, setListing] = useState<DirListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPath, setCurrentPath] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [renamingItem, setRenamingItem] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [editingFile, setEditingFile] = useState<{ path: string; content: string } | null>(null);

  const fetchListing = async (path?: string) => {
    setLoading(true);
    try {
      const res = await api.get('/files/list', { params: path ? { path } : {} });
      setListing(res.data.data);
      if (path) setCurrentPath(path);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Failed to list directory');
    } finally {
      setLoading(false);
      setSelected(new Set());
    }
  };

  useEffect(() => { fetchListing(); }, []);

  const navigate = (item: FileItem) => {
    if (item.isDirectory) fetchListing(item.path);
  };

  const goUp = () => {
    if (listing?.parent) fetchListing(listing.parent);
  };

  const deleteSelected = async () => {
    if (!confirm(`Delete ${selected.size} item(s)? This cannot be undone.`)) return;
    setActionLoading('delete');
    try {
      await api.delete('/files/delete', { data: { paths: Array.from(selected) } });
      await fetchListing(currentPath || undefined);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Delete failed');
    } finally {
      setActionLoading('');
    }
  };

  const createFolder = async () => {
    if (!newFolderName.trim()) return;
    setActionLoading('mkdir');
    try {
      const folderPath = `${listing?.path ?? ''}/${newFolderName.trim()}`;
      await api.post('/files/mkdir', { path: folderPath });
      setNewFolderName('');
      setShowNewFolder(false);
      await fetchListing(currentPath || undefined);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Failed to create folder');
    } finally {
      setActionLoading('');
    }
  };

  const doRename = async (item: FileItem) => {
    if (!renameVal.trim()) return;
    const dir = item.path.substring(0, item.path.lastIndexOf('/'));
    const newPath = `${dir}/${renameVal.trim()}`;
    try {
      await api.post('/files/rename', { from: item.path, to: newPath });
      setRenamingItem(null);
      await fetchListing(currentPath || undefined);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Rename failed');
    }
  };

  const openTextFile = async (item: FileItem) => {
    try {
      const res = await api.get('/files/read', { params: { path: item.path } });
      setEditingFile({ path: item.path, content: res.data.data.content });
    } catch (err: any) {
      alert('Cannot read file: ' + (err.response?.data?.error ?? err.message));
    }
  };

  const saveTextFile = async () => {
    if (!editingFile) return;
    try {
      await api.put('/files/write', editingFile);
      setEditingFile(null);
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Save failed');
    }
  };

  const downloadFile = (item: FileItem) => {
    window.open(`/api/files/download?path=${encodeURIComponent(item.path)}`, '_blank');
  };

  const pathParts = (listing?.path ?? '').split('/').filter(Boolean);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">File Manager</h1>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <button className="btn-danger text-xs" onClick={deleteSelected} disabled={!!actionLoading}>
              {actionLoading === 'delete' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete ({selected.size})
            </button>
          )}
          <button className="btn-secondary text-xs" onClick={() => setShowNewFolder(true)}>
            <FolderPlus className="w-3.5 h-3.5" /> New Folder
          </button>
          <button className="btn-ghost text-xs" onClick={() => fetchListing(currentPath || undefined)}>
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-slate-500 overflow-x-auto">
        <button onClick={() => fetchListing()} className="hover:text-slate-200">~</button>
        {pathParts.map((part, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="w-3 h-3" />
            <button
              onClick={() => fetchListing('/' + pathParts.slice(0, i + 1).join('/'))}
              className="hover:text-slate-200"
            >
              {part}
            </button>
          </span>
        ))}
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div className="flex items-center gap-2">
          <input
            className="input w-48 text-sm"
            placeholder="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createFolder()}
            autoFocus
          />
          <button className="btn-primary text-xs" onClick={createFolder}>
            {actionLoading === 'mkdir' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Create
          </button>
          <button className="btn-ghost text-xs" onClick={() => setShowNewFolder(false)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="card">
        {/* Go up */}
        {listing?.parent && listing.parent !== listing.path && (
          <div
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-700 cursor-pointer mb-1"
            onClick={goUp}
          >
            <ArrowLeft className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-400">..</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-10 rounded" />)}
          </div>
        ) : !listing || listing.items.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <FolderOpen className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">Empty directory</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-700">
            {listing.items.map((item) => (
              <div
                key={item.path}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-700 group"
              >
                <input
                  type="checkbox"
                  checked={selected.has(item.path)}
                  onChange={(e) => {
                    const s = new Set(selected);
                    e.target.checked ? s.add(item.path) : s.delete(item.path);
                    setSelected(s);
                  }}
                  className="accent-brand-500"
                />

                <div
                  className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                  onClick={() => navigate(item)}
                >
                  {item.isDirectory ? (
                    <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <File className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  {renamingItem === item.path ? (
                    <input
                      className="input text-sm py-0.5 w-40"
                      value={renameVal}
                      onChange={(e) => setRenameVal(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') doRename(item); if (e.key === 'Escape') setRenamingItem(null); }}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-sm text-slate-200 truncate">{item.name}</span>
                  )}
                </div>

                <span className="text-xs text-slate-500 hidden sm:block">{item.isFile ? formatSize(item.size) : ''}</span>

                {/* Item actions (shown on hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.isFile && (
                    <>
                      <button
                        className="btn-ghost p-1 text-xs"
                        onClick={() => openTextFile(item)}
                        title="Edit"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        className="btn-ghost p-1 text-xs"
                        onClick={() => downloadFile(item)}
                        title="Download"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <button
                    className="btn-ghost p-1 text-xs"
                    onClick={() => { setRenamingItem(item.path); setRenameVal(item.name); }}
                    title="Rename"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Text editor modal */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative w-full max-w-2xl bg-surface-800 border border-surface-500 rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b border-surface-600">
              <div className="font-mono text-sm text-slate-300 truncate">{editingFile.path}</div>
              <button onClick={() => setEditingFile(null)} className="text-slate-400 hover:text-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              className="flex-1 bg-surface-900 p-4 font-mono text-sm text-slate-200 resize-none focus:outline-none min-h-[300px]"
              value={editingFile.content}
              onChange={(e) => setEditingFile({ ...editingFile, content: e.target.value })}
            />
            <div className="flex items-center justify-end gap-3 p-4 border-t border-surface-600">
              <button className="btn-secondary" onClick={() => setEditingFile(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveTextFile}>Save File</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
