import { useState, useMemo, useCallback } from 'react'; // fixed
import { motion } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';
import { formatBytes, formatDuration, formatTimestamp, getPriorityLabel, cpuColor } from '../utils/formatters';
import {
  Search, ChevronUp, ChevronDown, X, RefreshCw,
  Trash2, PauseCircle, PlayCircle, Folder, Copy, Layers,
  AlertTriangle, Cpu, MemoryStick
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

const COLUMNS = [
  { key: 'name', label: 'Name', width: 160 },
  { key: 'pid', label: 'PID', width: 70 },
  { key: 'cpu_usage', label: 'CPU %', width: 75 },
  { key: 'ram_usage', label: 'Memory', width: 90 },
  { key: 'disk_read', label: 'Disk R', width: 80 },
  { key: 'disk_write', label: 'Disk W', width: 80 },
  { key: 'status', label: 'Status', width: 80 },
  { key: 'thread_count', label: 'Threads', width: 70 },
  { key: 'user', label: 'User', width: 100 },
  { key: 'run_time', label: 'Runtime', width: 80 },
  { key: 'parent_pid', label: 'PPID', width: 60 },
];

export default function Processes() {
  const { processes, processSearch, processSort,
    setProcessSearch, setProcessSort, selectedProcess, setSelectedProcess,
    setContextMenu, showNotification } = useAppStore(useShallow(s => ({
    processes: s.processes,
    processSearch: s.processSearch,
    processSort: s.processSort,
    setProcessSearch: s.setProcessSearch,
    setProcessSort: s.setProcessSort,
    selectedProcess: s.selectedProcess,
    setSelectedProcess: s.setSelectedProcess,
    setContextMenu: s.setContextMenu,
    showNotification: s.showNotification,
  })));

  const processSortField = processSort?.field ?? 'cpu_usage';
  const processSortDir   = processSort?.dir   ?? 'desc';

  const [confirmKill, setConfirmKill] = useState(null);

  const filteredProcesses = useMemo(() => {
    let list = processes;
    const q = processSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.pid.toString().includes(q) ||
        p.exe?.toLowerCase().includes(q) ||
        p.user?.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      const av = a[processSortField] ?? 0;
      const bv = b[processSortField] ?? 0;
      if (typeof av === 'string') return processSortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return processSortDir === 'asc' ? av - bv : bv - av;
    });
    return list;
  }, [processes, processSearch, processSortField, processSortDir]);

  const toggleSort = (key) => {
    if (processSortField === key) {
      setProcessSort(key, processSortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setProcessSort(key, 'desc');
    }
  };

  const handleContextMenu = useCallback((e, proc) => {
    e.preventDefault();
    setSelectedProcess(proc);
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        {
          icon: <Trash2 size={13} />, label: 'Kill Process', danger: true,
          onClick: () => setConfirmKill({ pid: proc.pid, name: proc.name, type: 'kill' })
        },
        {
          icon: <Layers size={13} />, label: 'Kill Process Tree', danger: true,
          onClick: () => setConfirmKill({ pid: proc.pid, name: proc.name, type: 'tree' })
        },
        { separator: true },
        {
          icon: <PauseCircle size={13} />, label: 'Suspend Process',
          onClick: () => handleSuspend(proc.pid, proc.name)
        },
        {
          icon: <PlayCircle size={13} />, label: 'Resume Process',
          onClick: () => handleResume(proc.pid, proc.name)
        },
        { separator: true },
        {
          icon: <Folder size={13} />, label: 'Open File Location',
          onClick: () => openFileLocation(proc.exe)
        },
        {
          icon: <Copy size={13} />, label: 'Copy PID',
          shortcut: proc.pid.toString(),
          onClick: () => { navigator.clipboard?.writeText(proc.pid.toString()); showNotification(`PID ${proc.pid} copied`, 'success'); }
        },
        {
          icon: <Copy size={13} />, label: 'Copy Name',
          onClick: () => { navigator.clipboard?.writeText(proc.name); showNotification('Name copied', 'success'); }
        },
      ]
    });
  }, [setSelectedProcess, setContextMenu, showNotification]);

  const handleKillConfirm = async () => {
    if (!confirmKill) return;
    try {
      if (confirmKill.type === 'tree') {
        await invoke('kill_process_tree', { pid: confirmKill.pid });
      } else {
        await invoke('kill_process', { pid: confirmKill.pid });
      }
      showNotification(`Process ${confirmKill.name} (${confirmKill.pid}) terminated`, 'success');
    } catch (err) {
      showNotification(`Failed: ${err}`, 'error');
    }
    setConfirmKill(null);
  };

  const handleSuspend = async (pid, name) => {
    try {
      await invoke('suspend_process', { pid });
      showNotification(`${name} suspended`, 'info');
    } catch (err) {
      showNotification(`Failed to suspend: ${err}`, 'error');
    }
  };

  const handleResume = async (pid, name) => {
    try {
      await invoke('resume_process', { pid });
      showNotification(`${name} resumed`, 'success');
    } catch (err) {
      showNotification(`Failed to resume: ${err}`, 'error');
    }
  };

  const openFileLocation = (exe) => {
    if (!exe) return;
    showNotification('Opening file location...', 'info');
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search by name, PID, path, user..."
            value={processSearch}
            onChange={e => setProcessSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-xs rounded-lg outline-none"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
          {processSearch && (
            <button onClick={() => setProcessSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2">
              <X size={13} color="#64748b" />
            </button>
          )}
        </div>
        <div className="text-xs px-3 py-1.5 rounded-lg" style={{ background: 'var(--input-bg)', color: 'var(--text-secondary)' }}>
          {filteredProcesses.length} / {processes.length} processes
        </div>
        <div className="ml-auto flex items-center gap-2">
          <SortIndicator field="cpu_usage" label="Top CPU" current={processSortField} dir={processSortDir} onSort={toggleSort} color="#3b82f6" />
          <SortIndicator field="ram_usage" label="Top RAM" current={processSortField} dir={processSortDir} onSort={toggleSort} color="#8b5cf6" />
        </div>
      </div>

      {/* Process Table */}
      <div className="glass-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="data-table">
            <thead className="sticky top-0 z-10" style={{ background: '#0f111a' }}>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key} onClick={() => toggleSort(col.key)} style={{ width: col.width }}>
                    <div className="flex items-center gap-1">
                      {col.label}
                      {processSortField === col.key && (
                        processSortDir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                      )}
                    </div>
                  </th>
                ))}
                <th style={{ width: 180 }}>Path</th>
              </tr>
            </thead>
            <tbody>
              {filteredProcesses.map(proc => (
                <ProcessRow
                  key={proc.pid}
                  proc={proc}
                  isSelected={selectedProcess?.pid === proc.pid}
                  onClick={() => setSelectedProcess(proc)}
                  onContextMenu={(e) => handleContextMenu(e, proc)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Process Detail */}
      {selectedProcess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>
              {selectedProcess.name} (PID: {selectedProcess.pid})
            </span>
            <button onClick={() => setSelectedProcess(null)}>
              <X size={14} color="#64748b" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3 text-xs">
            <DetailItem label="Executable" value={selectedProcess.exe || 'N/A'} mono />
            <DetailItem label="Command Line" value={selectedProcess.cmd?.join(' ') || 'N/A'} mono />
            <DetailItem label="Start Time" value={formatTimestamp(selectedProcess.start_time)} />
            <DetailItem label="Run Time" value={formatDuration(selectedProcess.run_time)} />
            <DetailItem label="Virtual Memory" value={formatBytes(selectedProcess.virtual_memory)} />
            <DetailItem label="User" value={selectedProcess.user} />
            <DetailItem label="Priority" value={getPriorityLabel(selectedProcess.priority)} />
            <DetailItem label="Threads" value={selectedProcess.thread_count} />
          </div>
          <div className="flex gap-2 mt-3">
            <ActionBtn icon={<Trash2 size={12} />} label="Kill" color="#ef4444" onClick={() => setConfirmKill({ pid: selectedProcess.pid, name: selectedProcess.name, type: 'kill' })} />
            <ActionBtn icon={<PauseCircle size={12} />} label="Suspend" color="#f59e0b" onClick={() => handleSuspend(selectedProcess.pid, selectedProcess.name)} />
            <ActionBtn icon={<PlayCircle size={12} />} label="Resume" color="#10b981" onClick={() => handleResume(selectedProcess.pid, selectedProcess.name)} />
          </div>
        </motion.div>
      )}

      {/* Kill Confirmation Dialog */}
      {confirmKill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-6 w-80"
            style={{ border: '1px solid rgba(239,68,68,0.3)' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle size={20} color="#ef4444" />
              <div>
                <div className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>
                  {confirmKill.type === 'tree' ? 'Kill Process Tree' : 'Kill Process'}
                </div>
                <div className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                  Terminate <span className="font-mono text-white">{confirmKill.name}</span> (PID {confirmKill.pid})?
                </div>
              </div>
            </div>
            {confirmKill.type === 'tree' && (
              <div className="text-xs p-2 rounded mb-3" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>
                This will also kill all child processes.
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmKill(null)} className="px-4 py-1.5 text-xs rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', color: '#94a3b8' }}>
                Cancel
              </button>
              <button onClick={handleKillConfirm} className="px-4 py-1.5 text-xs rounded-lg font-semibold" style={{ background: '#ef4444', color: 'white' }}>
                Kill Process
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function ProcessRow({ proc, isSelected, onClick, onContextMenu }) {
  const cpuPct = proc.cpu_usage;
  const color = cpuColor(cpuPct);

  return (
    <tr
      className={isSelected ? 'selected' : ''}
      onClick={onClick}
      onContextMenu={onContextMenu}
      style={{ cursor: 'pointer' }}
    >
      <td style={{ maxWidth: 160 }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: getStatusColor(proc.status) }} />
          <span className="truncate font-medium" title={proc.name}>{proc.name}</span>
        </div>
      </td>
      <td className="font-mono">{proc.pid}</td>
      <td>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs" style={{ color, minWidth: 42 }}>{cpuPct.toFixed(1)}%</span>
          <div className="usage-bar flex-1 max-w-16">
            <div className="usage-bar-fill" style={{ background: color, width: `${Math.min(100, cpuPct)}%` }} />
          </div>
        </div>
      </td>
      <td>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs">{formatBytes(proc.ram_usage)}</span>
        </div>
      </td>
      <td className="font-mono text-xs">{formatBytes(proc.disk_read)}/s</td>
      <td className="font-mono text-xs">{formatBytes(proc.disk_write)}/s</td>
      <td>
        <span className="badge" style={{
          background: `${getStatusColor(proc.status)}20`,
          color: getStatusColor(proc.status),
          border: `1px solid ${getStatusColor(proc.status)}30`,
        }}>
          {proc.status}
        </span>
      </td>
      <td className="font-mono">{proc.thread_count}</td>
      <td title={proc.user}>{proc.user?.split('\\').pop() ?? proc.user}</td>
      <td className="font-mono">{formatDuration(proc.run_time)}</td>
      <td className="font-mono">{proc.parent_pid ?? '—'}</td>
      <td title={proc.exe} style={{ maxWidth: 180 }}>
        <span className="font-mono text-xs truncate block" style={{ color: '#64748b' }}>{proc.exe}</span>
      </td>
    </tr>
  );
}

function SortIndicator({ field, label, current, dir, onSort, color }) {
  const active = current === field;
  return (
    <button
      onClick={() => onSort(field)}
      className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs"
      style={{
        background: active ? `${color}20` : 'rgba(255,255,255,0.05)',
        color: active ? color : '#94a3b8',
        border: `1px solid ${active ? color + '30' : 'rgba(255,255,255,0.08)'}`,
      }}
    >
      {label}
      {active && (dir === 'asc' ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
    </button>
  );
}

function DetailItem({ label, value, mono }) {
  return (
    <div>
      <div className="text-[10px] mb-0.5" style={{ color: '#64748b' }}>{label}</div>
      <div className={`text-xs truncate ${mono ? 'font-mono' : ''}`} style={{ color: '#e2e8f0' }} title={String(value)}>{value}</div>
    </div>
  );
}

function ActionBtn({ icon, label, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
      style={{ background: `${color}20`, color, border: `1px solid ${color}30` }}
    >
      {icon} {label}
    </button>
  );
}

function getStatusColor(status) {
  const s = (status || '').toLowerCase();
  if (s === 'run' || s === 'running') return '#10b981';
  if (s === 'sleep' || s === 'sleeping') return '#94a3b8';
  if (s === 'stopped') return '#ef4444';
  if (s === 'zombie') return '#f59e0b';
  return '#64748b';
}
