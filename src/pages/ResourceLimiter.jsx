import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';
import { formatBytes } from '../utils/formatters';
import CpuHeatmap from '../components/Charts/CpuHeatmap';
import { Search, Sliders, Cpu, CheckCircle, AlertTriangle, Layers, X, Trash2, Gauge, MemoryStick } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

const CPU_THROTTLE_OPTIONS = [
  { label: 'Suspend (0%)', value: 0, color: '#ef4444' },
  { label: '10%',  value: 10,  color: '#f97316' },
  { label: '25%',  value: 25,  color: '#f59e0b' },
  { label: '50%',  value: 50,  color: '#eab308' },
  { label: '75%',  value: 75,  color: '#84cc16' },
  { label: '100% (No limit)', value: 100, color: '#10b981' },
];

const PROFILES = [
  { id: 'eco',          label: 'Eco',         icon: '🌱', desc: '25% cores, low priority',    color: '#10b981' },
  { id: 'balanced',     label: 'Balanced',    icon: '⚖️', desc: '50% cores, normal priority', color: '#3b82f6' },
  { id: 'performance',  label: 'Performance', icon: '⚡', desc: 'All cores, high priority',   color: '#f59e0b' },
  { id: 'custom',       label: 'Custom',      icon: '🔧', desc: 'Manual core selection',      color: '#8b5cf6' },
];

const PRIORITY_LABELS = { '-1': 'Idle', 0: 'Below Normal', 1: 'Normal', 2: 'Above Normal', 3: 'High', 4: 'Realtime' };
const PRIORITY_COLORS = { '-1': '#64748b', 0: '#10b981', 1: '#3b82f6', 2: '#06b6d4', 3: '#f59e0b', 4: '#ef4444' };

export default function ResourceLimiter() {
  const { processes, systemStats, showNotification, saveRule, appliedRules, removeRule } = useAppStore(useShallow(s => ({
    processes: s.processes,
    systemStats: s.systemStats,
    showNotification: s.showNotification,
    saveRule: s.saveRule,
    appliedRules: s.appliedRules,
    removeRule: s.removeRule,
  })));

  const [search, setSearch] = useState('');
  const [selectedPids, setSelectedPids] = useState(new Set());
  const [selectedProfile, setSelectedProfile] = useState('custom');
  const [selectedCores, setSelectedCores] = useState([]);
  const [priority, setPriority] = useState(1);
  const [applying, setApplying] = useState(false);
  const [sortBy, setSortBy] = useState('cpu_usage');
  const [groupByName, setGroupByName] = useState(false);
  // New resource controls
  const [cpuThrottle, setCpuThrottle] = useState(100);       // 0=suspend,100=unlimited
  const [enableCpuThrottle, setEnableCpuThrottle] = useState(false);
  const [enableRamLimit, setEnableRamLimit] = useState(false);
  const [ramLimitMB, setRamLimitMB] = useState(512);
  const [activeTab, setActiveTab] = useState('affinity');  // 'affinity' | 'throttle' | 'memory'

  const numCores = systemStats?.cpu_logical_cores ?? (systemStats?.cpu_per_core?.length ?? 8);
  const allCores = useMemo(() => Array.from({ length: numCores }, (_, i) => i), [numCores]);

  // Group processes by name for the "group" view
  const groupedProcesses = useMemo(() => {
    const q = search.toLowerCase();
    const filtered = processes.filter(p =>
      !q || p.name.toLowerCase().includes(q) || p.pid.toString().includes(q)
    );
    if (!groupByName) {
      return filtered.sort((a, b) => b[sortBy] - a[sortBy]).slice(0, 80);
    }
    // Group by base name
    const map = new Map();
    for (const p of filtered) {
      const key = p.name.toLowerCase();
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(p);
    }
    // Flatten with group headers
    const result = [];
    for (const [, procs] of map) {
      procs.sort((a, b) => b[sortBy] - a[sortBy]);
      result.push({ isGroup: true, name: procs[0].name, procs, totalCpu: procs.reduce((s, p) => s + p.cpu_usage, 0), totalRam: procs.reduce((s, p) => s + p.ram_usage, 0) });
    }
    return result.sort((a, b) => b.totalCpu - a.totalCpu).slice(0, 40);
  }, [processes, search, sortBy, groupByName]);

  // All currently selected process objects
  const selectedProcesses = useMemo(() => processes.filter(p => selectedPids.has(p.pid)), [processes, selectedPids]);

  const toggleProcess = (proc) => {
    setSelectedPids(prev => {
      const next = new Set(prev);
      next.has(proc.pid) ? next.delete(proc.pid) : next.add(proc.pid);
      return next;
    });
  };

  const selectGroup = (procs) => {
    const allPids = procs.map(p => p.pid);
    const allSelected = allPids.every(pid => selectedPids.has(pid));
    setSelectedPids(prev => {
      const next = new Set(prev);
      if (allSelected) { allPids.forEach(pid => next.delete(pid)); }
      else { allPids.forEach(pid => next.add(pid)); }
      return next;
    });
  };

  const selectByName = (name) => {
    const matches = processes.filter(p => p.name.toLowerCase() === name.toLowerCase());
    const allSelected = matches.every(p => selectedPids.has(p.pid));
    setSelectedPids(prev => {
      const next = new Set(prev);
      if (allSelected) { matches.forEach(p => next.delete(p.pid)); }
      else { matches.forEach(p => next.add(p.pid)); }
      return next;
    });
  };

  const clearSelection = () => setSelectedPids(new Set());

  const toggleCore = (i) => {
    setSelectedCores(prev =>
      prev.includes(i) ? prev.filter(c => c !== i) : [...prev, i].sort((a, b) => a - b)
    );
    setSelectedProfile('custom');
  };

  const applyProfile = (id) => {
    setSelectedProfile(id);
    switch (id) {
      case 'eco':         setSelectedCores(allCores.slice(0, Math.max(1, Math.floor(numCores * 0.25)))); setPriority(0); break;
      case 'balanced':    setSelectedCores(allCores.slice(0, Math.floor(numCores * 0.5))); setPriority(1); break;
      case 'performance': setSelectedCores([...allCores]); setPriority(3); break;
      default: break;
    }
  };

  const handleApply = async () => {
    if (selectedPids.size === 0) { showNotification('Select at least one process', 'warning'); return; }

    setApplying(true);
    let ok = 0, fail = 0;

    for (const pid of selectedPids) {
      let anyOk = false;

      if (activeTab === 'affinity') {
        if (selectedCores.length === 0) { showNotification('Select at least one CPU core', 'warning'); setApplying(false); return; }
        try { await invoke('set_cpu_affinity', { pid, cores: selectedCores }); anyOk = true; } catch {}
        try { await invoke('set_process_priority', { pid, priority }); anyOk = true; } catch {}
      }

      if (activeTab === 'throttle' && enableCpuThrottle) {
        try { await invoke('throttle_process_cpu', { pid, percent: cpuThrottle }); anyOk = true; } catch (e) {
          console.warn('throttle failed:', e);
        }
      }

      if (activeTab === 'memory') {
        if (enableRamLimit) {
          try { await invoke('set_memory_limit', { pid, maxBytes: ramLimitMB * 1024 * 1024 }); anyOk = true; } catch {}
        }
      }

      if (anyOk) ok++; else fail++;
    }

    if (ok > 0 && fail === 0) {
      // Persist each unique process name as a rule
      const uniqueNames = [...new Set(selectedProcesses.map(p => p.name))];
      for (const name of uniqueNames) {
        if (activeTab === 'affinity') {
          saveRule({ processName: name, cores: selectedCores, priority, enabled: true });
        } else if (activeTab === 'throttle' && enableCpuThrottle) {
          saveRule({ processName: name, cpuThrottle, enabled: true });
        } else if (activeTab === 'memory' && enableRamLimit) {
          saveRule({ processName: name, ramLimitMB, enabled: true });
        }
      }
      showNotification(`✓ Applied to ${ok} process${ok > 1 ? 'es' : ''} — rule saved`, 'success');
    } else if (ok > 0)
      showNotification(`Applied to ${ok}/${ok + fail} (${fail} need admin rights)`, 'warning');
    else
      showNotification('Failed — administrator privileges may be required', 'error');

    setApplying(false);
  };

  const handleFreeMemory = async () => {
    if (selectedPids.size === 0) { showNotification('Select at least one process', 'warning'); return; }
    let ok = 0;
    for (const pid of selectedPids) {
      try { await invoke('free_process_memory', { pid }); ok++; } catch {}
    }
    if (ok > 0) showNotification(`✓ Working set cleared for ${ok} process${ok > 1 ? 'es' : ''}`, 'success');
    else showNotification('Failed to free memory (admin rights may be needed)', 'error');
  };

  return (
    <div className="grid gap-4 h-full" style={{ gridTemplateColumns: '240px 1fr' }}>

      {/* ── Process list ───────────────── */}
      <div className="glass-card flex flex-col overflow-hidden">
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Select Processes</span>
            {selectedPids.size > 0 && (
              <button onClick={clearSelection} className="flex items-center gap-1 text-[10px]"
                style={{ color: 'var(--text-muted)' }}>
                <X size={10} /> Clear ({selectedPids.size})
              </button>
            )}
          </div>
          <div className="relative mb-2">
            <Search size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input type="text" placeholder="Search name / PID..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-7 pr-2 py-1.5 text-xs rounded-lg outline-none"
              style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div className="flex gap-1 mb-2">
            {['cpu_usage', 'ram_usage'].map(f => (
              <button key={f} onClick={() => setSortBy(f)}
                className="flex-1 text-[10px] py-1 rounded"
                style={{ background: sortBy === f ? 'rgba(59,130,246,0.2)' : 'var(--input-bg)', color: sortBy === f ? 'var(--accent-blue)' : 'var(--text-muted)' }}>
                {f === 'cpu_usage' ? '↑ CPU' : '↑ RAM'}
              </button>
            ))}
            <button onClick={() => setGroupByName(g => !g)}
              className="flex-1 text-[10px] py-1 rounded flex items-center justify-center gap-0.5"
              style={{ background: groupByName ? 'rgba(139,92,246,0.2)' : 'var(--input-bg)', color: groupByName ? '#8b5cf6' : 'var(--text-muted)' }}
              title="Group by process name">
              <Layers size={10} /> Group
            </button>
          </div>

          {/* Quick-select by name from search */}
          {search && !groupByName && (
            <button onClick={() => selectByName(search)}
              className="w-full text-[10px] py-1.5 rounded-lg mb-1 font-semibold"
              style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(59,130,246,0.25)' }}>
              Select all "{search}" instances
            </button>
          )}
        </div>

        <div className="overflow-y-auto flex-1 text-xs">
          {!groupByName ? (
            // Flat list
            groupedProcesses.map(proc => (
              <ProcessRow key={proc.pid} proc={proc} selected={selectedPids.has(proc.pid)} onToggle={toggleProcess} />
            ))
          ) : (
            // Grouped view
            groupedProcesses.map(group => (
              <div key={group.name}>
                <div className="flex items-center gap-2 px-3 py-1.5 border-b cursor-pointer"
                  style={{ borderColor: 'var(--border)', background: 'var(--input-bg)' }}
                  onClick={() => selectGroup(group.procs)}>
                  <div className="w-3.5 h-3.5 rounded flex items-center justify-center border"
                    style={{
                      border: `1px solid ${group.procs.every(p => selectedPids.has(p.pid)) ? 'var(--accent-blue)' : 'var(--border)'}`,
                      background: group.procs.every(p => selectedPids.has(p.pid)) ? 'var(--accent-blue)' : 'transparent',
                    }}>
                    {group.procs.every(p => selectedPids.has(p.pid)) && <span className="text-white text-[8px]">✓</span>}
                  </div>
                  <span className="font-semibold flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{group.name}</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>×{group.procs.length}</span>
                </div>
                {group.procs.map(proc => (
                  <ProcessRow key={proc.pid} proc={proc} selected={selectedPids.has(proc.pid)} onToggle={toggleProcess} indent />
                ))}
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel ───────────────── */}
      <div className="flex flex-col gap-4 overflow-auto">

        {/* Selected summary */}
        {selectedPids.size > 0 && (
          <div className="glass-card p-3 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <CheckCircle size={14} color="var(--accent-blue)" />
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                {selectedPids.size} process{selectedPids.size > 1 ? 'es' : ''} selected
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap flex-1">
              {/* Show unique names */}
              {[...new Set(selectedProcesses.map(p => p.name))].slice(0, 8).map(name => {
                const count = selectedProcesses.filter(p => p.name === name).length;
                return (
                  <span key={name} className="text-[10px] px-2 py-0.5 rounded font-mono cursor-pointer"
                    style={{ background: 'rgba(59,130,246,0.15)', color: 'var(--accent-blue)', border: '1px solid rgba(59,130,246,0.2)' }}
                    onClick={() => selectByName(name)}>
                    {name} {count > 1 ? `×${count}` : ''}
                  </span>
                );
              })}
            </div>
            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              Total CPU: {selectedProcesses.reduce((s, p) => s + p.cpu_usage, 0).toFixed(1)}%
              · RAM: {formatBytes(selectedProcesses.reduce((s, p) => s + p.ram_usage, 0))}
            </span>
          </div>
        )}

        {/* ── Saved Rules ── */}
        {appliedRules.length > 0 && (
          <div className="glass-card p-4">
            <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Saved Rules (auto-applied on startup)
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {appliedRules.map(rule => (
                <div key={rule.processName} className="flex items-center gap-2 text-xs py-1 px-2 rounded"
                  style={{ background: 'var(--input-bg)' }}>
                  <span className="flex-1 font-mono truncate" style={{ color: 'var(--text-primary)' }}>{rule.processName}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {rule.cores?.length ? `${rule.cores.length} cores` : ''}
                    {rule.priority != null ? ` · P${rule.priority}` : ''}
                    {rule.cpuThrottle != null ? ` · CPU ${rule.cpuThrottle}%` : ''}
                    {rule.ramLimitMB != null ? ` · RAM ${rule.ramLimitMB}MB` : ''}
                  </span>
                  <button onClick={() => removeRule(rule.processName)} className="text-red-400 hover:text-red-300 ml-1">×</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab selector */}
        <div className="glass-card p-1 flex gap-1">
          {[
            { id: 'affinity', icon: <Cpu size={12} />, label: 'CPU Affinity & Priority' },
            { id: 'throttle', icon: <Gauge size={12} />, label: 'CPU Throttle' },
            { id: 'memory',   icon: <MemoryStick size={12} />, label: 'Memory Control' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: activeTab === tab.id ? 'rgba(59,130,246,0.2)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent-blue)' : 'var(--text-muted)',
              }}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: CPU Affinity ── */}
        {activeTab === 'affinity' && (<>
          <div className="glass-card p-4">
            <div className="text-xs font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Performance Profile</div>
            <div className="grid grid-cols-4 gap-2">
              {PROFILES.map(p => (
                <button key={p.id} onClick={() => applyProfile(p.id)}
                  className="p-3 rounded-xl text-left"
                  style={{ background: selectedProfile === p.id ? `${p.color}15` : 'var(--input-bg)', border: `1px solid ${selectedProfile === p.id ? p.color + '50' : 'var(--border)'}` }}>
                  <div className="text-lg mb-1">{p.icon}</div>
                  <div className="text-xs font-semibold" style={{ color: selectedProfile === p.id ? p.color : 'var(--text-primary)' }}>{p.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="glass-card p-4 flex-1">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>CPU Core Assignment</span>
              <div className="flex gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedCores.length}/{numCores} cores</span>
                <button onClick={() => setSelectedCores([...allCores])} className="text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--accent-blue)' }}>All</button>
                <button onClick={() => setSelectedCores([])} className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--input-bg)', color: 'var(--text-muted)' }}>None</button>
              </div>
            </div>
            <CpuHeatmap cores={systemStats?.cpu_per_core || Array(numCores).fill(0)} selectedCores={selectedCores} onToggleCore={toggleCore} selectable />
          </div>
          <div className="glass-card p-4">
            <div className="grid grid-cols-2 gap-6 items-end">
              <div>
                <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Process Priority</div>
                <div className="flex gap-1 flex-wrap">
                  {Object.entries(PRIORITY_LABELS).map(([val, label]) => {
                    const color = PRIORITY_COLORS[val] || '#94a3b8';
                    const active = priority === Number(val);
                    return (
                      <button key={val} onClick={() => setPriority(Number(val))} className="px-2 py-1 text-xs rounded"
                        style={{ background: active ? `${color}20` : 'var(--input-bg)', color: active ? color : 'var(--text-secondary)', border: `1px solid ${active ? color + '50' : 'var(--border)'}`, fontWeight: active ? 600 : 400 }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <ApplyButton selectedPids={selectedPids} applying={applying} onClick={handleApply}
                label={selectedPids.size > 0 ? `Apply to ${selectedPids.size} Process${selectedPids.size > 1 ? 'es' : ''} · ${selectedCores.length} Cores` : 'Apply Settings'}
                disabled={selectedPids.size === 0 || selectedCores.length === 0} />
            </div>
          </div>
        </>)}

        {/* ── TAB: CPU Throttle ── */}
        {activeTab === 'throttle' && (
          <div className="glass-card p-5 space-y-5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>CPU Usage Limit</span>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Enable</span>
                  <div className="w-8 h-4 rounded-full relative" style={{ background: enableCpuThrottle ? 'var(--accent-blue)' : 'var(--border-strong)' }}
                    onClick={() => setEnableCpuThrottle(e => !e)}>
                    <motion.div className="absolute top-0.5 w-3 h-3 rounded-full bg-white"
                      animate={{ left: enableCpuThrottle ? '17px' : '2px' }} transition={{ duration: 0.15 }} />
                  </div>
                </label>
              </div>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                Limit how much CPU a process can use. "Suspend" stops it completely (resumes when you set to 100%).
              </p>
              <div className="grid grid-cols-3 gap-2">
                {CPU_THROTTLE_OPTIONS.map(opt => (
                  <button key={opt.value} onClick={() => { setCpuThrottle(opt.value); setEnableCpuThrottle(true); }}
                    className="py-2.5 px-3 rounded-xl text-xs font-semibold"
                    style={{
                      background: cpuThrottle === opt.value ? `${opt.color}20` : 'var(--input-bg)',
                      border: `1px solid ${cpuThrottle === opt.value ? opt.color + '60' : 'var(--border)'}`,
                      color: cpuThrottle === opt.value ? opt.color : 'var(--text-secondary)',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
                  <span>Custom</span><span className="font-mono font-bold" style={{ color: cpuThrottle === 0 ? '#ef4444' : '#10b981' }}>{cpuThrottle === 0 ? 'SUSPENDED' : `${cpuThrottle}%`}</span>
                </div>
                <input type="range" min={0} max={100} step={5} value={cpuThrottle}
                  onChange={e => { setCpuThrottle(Number(e.target.value)); setEnableCpuThrottle(true); }}
                  className="w-full" style={{ accentColor: cpuThrottle === 0 ? '#ef4444' : 'var(--accent-blue)' }} />
              </div>
            </div>
            <ApplyButton selectedPids={selectedPids} applying={applying} onClick={handleApply}
              label={`Apply CPU Throttle (${cpuThrottle === 0 ? 'SUSPEND' : cpuThrottle + '%'}) to ${selectedPids.size || 0} Process${selectedPids.size !== 1 ? 'es' : ''}`}
              disabled={selectedPids.size === 0 || !enableCpuThrottle} />
          </div>
        )}

        {/* ── TAB: Memory ── */}
        {activeTab === 'memory' && (
          <div className="glass-card p-5 space-y-5">
            {/* Free Working Set */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Free Working Set (Trim RAM)</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    Immediately reclaim unused physical RAM pages from the selected processes.
                  </div>
                </div>
                <motion.button onClick={handleFreeMemory}
                  disabled={selectedPids.size === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold flex-shrink-0"
                  style={{
                    background: selectedPids.size > 0 ? 'linear-gradient(135deg, #10b981, #059669)' : 'var(--input-bg)',
                    color: selectedPids.size > 0 ? 'white' : 'var(--text-muted)',
                    cursor: selectedPids.size > 0 ? 'pointer' : 'not-allowed',
                  }}
                  whileTap={{ scale: 0.95 }}>
                  <Trash2 size={13} /> Free Memory
                </motion.button>
              </div>
            </div>

            {/* RAM Limit */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Maximum RAM Limit</div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Process is killed if it exceeds this limit (via Job Object).</div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Enable</span>
                  <div className="w-8 h-4 rounded-full relative" style={{ background: enableRamLimit ? 'var(--accent-purple)' : 'var(--border-strong)' }}
                    onClick={() => setEnableRamLimit(e => !e)}>
                    <motion.div className="absolute top-0.5 w-3 h-3 rounded-full bg-white"
                      animate={{ left: enableRamLimit ? '17px' : '2px' }} transition={{ duration: 0.15 }} />
                  </div>
                </label>
              </div>
              <div className="flex items-center gap-4 mb-3">
                <input type="range" min={64} max={8192} step={64} value={ramLimitMB}
                  onChange={e => setRamLimitMB(Number(e.target.value))}
                  className="flex-1" style={{ accentColor: 'var(--accent-purple)' }} />
                <div className="text-sm font-bold font-mono w-24 text-right" style={{ color: 'var(--accent-purple)' }}>
                  {ramLimitMB >= 1024 ? `${(ramLimitMB / 1024).toFixed(1)} GB` : `${ramLimitMB} MB`}
                </div>
              </div>
              <div className="flex gap-2">
                {[128, 256, 512, 1024, 2048, 4096].map(mb => (
                  <button key={mb} onClick={() => setRamLimitMB(mb)}
                    className="text-[10px] px-2 py-1 rounded"
                    style={{ background: ramLimitMB === mb ? 'rgba(139,92,246,0.2)' : 'var(--input-bg)', color: ramLimitMB === mb ? 'var(--accent-purple)' : 'var(--text-muted)', border: `1px solid ${ramLimitMB === mb ? 'rgba(139,92,246,0.3)' : 'var(--border)'}` }}>
                    {mb >= 1024 ? `${mb / 1024}GB` : `${mb}MB`}
                  </button>
                ))}
              </div>
            </div>
            <ApplyButton selectedPids={selectedPids} applying={applying} onClick={handleApply}
              label={`Apply RAM Limit (${ramLimitMB >= 1024 ? (ramLimitMB / 1024).toFixed(1) + ' GB' : ramLimitMB + ' MB'}) to ${selectedPids.size || 0} Process${selectedPids.size !== 1 ? 'es' : ''}`}
              disabled={selectedPids.size === 0 || !enableRamLimit} />
          </div>
        )}
      </div>
    </div>
  );
}

function ApplyButton({ selectedPids, applying, onClick, label, disabled }) {
  const canApply = !disabled && selectedPids.size > 0 && !applying;
  return (
    <motion.button onClick={onClick}
      disabled={!canApply}
      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
      style={{
        background: canApply ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : 'var(--input-bg)',
        color: canApply ? 'white' : 'var(--text-muted)',
        opacity: applying ? 0.7 : 1,
        cursor: canApply ? 'pointer' : 'not-allowed',
      }}
      whileTap={{ scale: 0.97 }}>
      <Sliders size={14} />
      {applying ? `Applying to ${selectedPids.size}...` : label}
    </motion.button>
  );
}

function ProcessRow({ proc, selected, onToggle, indent = false }) {
  return (
    <div onClick={() => onToggle(proc)} className="flex items-center gap-2 px-3 py-1.5 border-b cursor-pointer"
      style={{
        borderColor: 'var(--border)',
        paddingLeft: indent ? '24px' : '12px',
        background: selected ? 'rgba(59,130,246,0.08)' : 'transparent',
        borderLeft: `2px solid ${selected ? 'var(--accent-blue)' : 'transparent'}`,
      }}>
      <div className="w-3.5 h-3.5 rounded flex-shrink-0 flex items-center justify-center"
        style={{
          border: `1px solid ${selected ? 'var(--accent-blue)' : 'var(--border)'}`,
          background: selected ? 'var(--accent-blue)' : 'transparent',
        }}>
        {selected && <span className="text-white text-[8px]">✓</span>}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate text-xs" style={{ color: 'var(--text-primary)' }}>{proc.name}</div>
        <div className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
          PID {proc.pid} · {proc.cpu_usage.toFixed(1)}% · {formatBytes(proc.ram_usage)}
        </div>
      </div>
    </div>
  );
}
