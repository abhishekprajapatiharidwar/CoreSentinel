import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';
import { getConnectionStateColor } from '../utils/formatters';
import { Search, X, Wifi, Activity, Globe, Shield, AlertTriangle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export default function PortsNetwork() {
  const { connections, portSearch, setPortSearch, showNotification } = useAppStore(useShallow(s => ({
    connections: s.connections,
    portSearch: s.portSearch,
    setPortSearch: s.setPortSearch,
    showNotification: s.showNotification,
  })));
  const [sortField, setSortField] = useState('local_port');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedConn, setSelectedConn] = useState(null);
  const [filterProtocol, setFilterProtocol] = useState('ALL');
  const [filterState, setFilterState] = useState('ALL');

  const filtered = useMemo(() => {
    let list = connections;
    const q = portSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(c =>
        c.local_port.toString().includes(q) ||
        c.remote_port.toString().includes(q) ||
        c.process_name.toLowerCase().includes(q) ||
        c.pid.toString().includes(q) ||
        c.local_addr.includes(q) ||
        c.remote_addr.includes(q) ||
        c.state.toLowerCase().includes(q)
      );
    }
    if (filterProtocol !== 'ALL') list = list.filter(c => c.protocol === filterProtocol);
    if (filterState !== 'ALL') list = list.filter(c => c.state === filterState);
    return [...list].sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      if (typeof av === 'string') return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === 'asc' ? av - bv : bv - av;
    });
  }, [connections, portSearch, sortField, sortDir, filterProtocol, filterState]);

  const states = useMemo(() => ['ALL', ...new Set(connections.map(c => c.state))], [connections]);
  const protocols = ['ALL', 'TCP', 'UDP'];

  const toggleSort = (key) => {
    if (sortField === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(key); setSortDir('asc'); }
  };

  const handleKillFromPort = async (conn) => {
    if (!conn.pid) return;
    try {
      await invoke('kill_process', { pid: conn.pid });
      showNotification(`Killed process ${conn.process_name} (PID ${conn.pid})`, 'success');
    } catch (err) {
      showNotification(`Failed: ${err}`, 'error');
    }
  };

  // Stats
  const listening = connections.filter(c => c.state === 'LISTENING').length;
  const established = connections.filter(c => c.state === 'ESTABLISHED').length;
  const suspicious = connections.filter(c =>
    c.remote_port === 4444 || c.remote_port === 31337 || c.remote_port === 12345
  ).length;

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        <SummaryCard icon={<Wifi size={16} />} label="Total" value={connections.length} color="#3b82f6" />
        <SummaryCard icon={<Activity size={16} />} label="Established" value={established} color="#10b981" />
        <SummaryCard icon={<Globe size={16} />} label="Listening" value={listening} color="#8b5cf6" />
        <SummaryCard icon={<Shield size={16} />} label="Suspicious" value={suspicious} color={suspicious > 0 ? '#ef4444' : '#64748b'} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search port, process, address..."
            value={portSearch}
            onChange={e => setPortSearch(e.target.value)}
            className="w-full pl-8 pr-8 py-2 text-xs rounded-lg outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
          />
          {portSearch && <button onClick={() => setPortSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2"><X size={13} color="#64748b" /></button>}
        </div>
        <div className="flex gap-1">
          {protocols.map(p => (
            <button key={p} onClick={() => setFilterProtocol(p)}
              className="px-3 py-1.5 text-xs rounded-lg"
              style={{
                background: filterProtocol === p ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                color: filterProtocol === p ? '#60a5fa' : '#94a3b8',
                border: `1px solid ${filterProtocol === p ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
              }}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {states.slice(0, 5).map(s => (
            <button key={s} onClick={() => setFilterState(s)}
              className="px-2 py-1.5 text-xs rounded-lg"
              style={{
                background: filterState === s ? `${getConnectionStateColor(s)}20` : 'rgba(255,255,255,0.05)',
                color: filterState === s ? getConnectionStateColor(s) : '#94a3b8',
                border: `1px solid ${filterState === s ? getConnectionStateColor(s) + '30' : 'rgba(255,255,255,0.08)'}`,
              }}>
              {s}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs" style={{ color: '#64748b' }}>{filtered.length} connections</span>
      </div>

      {/* Table */}
      <div className="glass-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="data-table">
            <thead className="sticky top-0 z-10" style={{ background: '#0f111a' }}>
              <tr>
                {[
                  { key: 'protocol', label: 'Protocol', w: 80 },
                  { key: 'local_addr', label: 'Local Address', w: 140 },
                  { key: 'local_port', label: 'Local Port', w: 90 },
                  { key: 'remote_addr', label: 'Remote Address', w: 140 },
                  { key: 'remote_port', label: 'Remote Port', w: 90 },
                  { key: 'state', label: 'State', w: 110 },
                  { key: 'process_name', label: 'Process', w: 130 },
                  { key: 'pid', label: 'PID', w: 70 },
                ].map(col => (
                  <th key={col.key} onClick={() => toggleSort(col.key)} style={{ width: col.w }}>
                    {col.label} {sortField === col.key && (sortDir === 'asc' ? '▲' : '▼')}
                  </th>
                ))}
                <th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((conn, i) => {
                const stateColor = getConnectionStateColor(conn.state);
                const isSuspicious = [4444, 31337, 12345].includes(conn.remote_port);
                return (
                  <tr key={i} onClick={() => setSelectedConn(conn)}
                    className={selectedConn === conn ? 'selected' : ''}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <span className={`badge badge-${conn.protocol === 'TCP' ? 'blue' : 'purple'}`}>
                        {conn.protocol}
                      </span>
                    </td>
                    <td className="font-mono text-xs">{conn.local_addr}</td>
                    <td className="font-mono font-semibold" style={{ color: '#e2e8f0' }}>{conn.local_port}</td>
                    <td className="font-mono text-xs">{conn.remote_addr || '—'}</td>
                    <td className="font-mono">{conn.remote_port || '—'}</td>
                    <td>
                      <span className="badge" style={{ background: `${stateColor}20`, color: stateColor, border: `1px solid ${stateColor}30` }}>
                        {isSuspicious && <AlertTriangle size={10} className="mr-1" />}
                        {conn.state}
                      </span>
                    </td>
                    <td className="font-medium" style={{ color: '#e2e8f0' }}>{conn.process_name}</td>
                    <td className="font-mono">{conn.pid}</td>
                    <td>
                      {conn.pid > 0 && (
                        <button
                          onClick={e => { e.stopPropagation(); handleKillFromPort(conn); }}
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                        >
                          Kill
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }) {
  return (
    <div className="glass-card p-3 flex items-center gap-3">
      <div className="p-2 rounded-lg" style={{ background: `${color}20`, color }}>{icon}</div>
      <div>
        <div className="text-xs" style={{ color: '#64748b' }}>{label}</div>
        <div className="text-lg font-bold font-mono" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}
