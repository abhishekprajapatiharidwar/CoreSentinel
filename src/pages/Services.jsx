import { useState, useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';
import { Search, Play, Square, RefreshCw, Server } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

export default function Services() {
  const { services, showNotification } = useAppStore(useShallow(s => ({
    services: s.services,
    showNotification: s.showNotification,
  })));
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');

  const filtered = useMemo(() => {
    let list = services;
    const q = search.toLowerCase();
    if (q) list = list.filter(s => s.name.toLowerCase().includes(q) || s.display_name.toLowerCase().includes(q));
    if (filterStatus !== 'All') list = list.filter(s => s.status.toLowerCase() === filterStatus.toLowerCase());
    return list;
  }, [services, search, filterStatus]);

  const handleControl = async (name, action) => {
    try {
      await invoke('control_service', { name, action });
      showNotification(`Service ${name} ${action}ed`, 'success');
    } catch (err) {
      showNotification(`Note: ${err} (demo mode)`, 'info');
    }
  };

  const running = services.filter(s => s.status.toLowerCase() === 'running').length;
  const stopped = services.filter(s => s.status.toLowerCase() === 'stopped').length;

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard icon={<Server size={16} />} label="Total Services" value={services.length} color="#94a3b8" />
        <SummaryCard icon={<Play size={16} />} label="Running" value={running} color="#10b981" />
        <SummaryCard icon={<Square size={16} />} label="Stopped" value={stopped} color="#ef4444" />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }} />
          <input
            type="text"
            placeholder="Search services..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 py-2 text-xs rounded-lg outline-none"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
          />
        </div>
        {['All', 'Running', 'Stopped'].map(f => (
          <button key={f} onClick={() => setFilterStatus(f)}
            className="px-3 py-1.5 text-xs rounded-lg"
            style={{
              background: filterStatus === f ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
              color: filterStatus === f ? '#60a5fa' : '#94a3b8',
              border: `1px solid ${filterStatus === f ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)'}`,
            }}>
            {f}
          </button>
        ))}
        <span className="ml-auto text-xs" style={{ color: '#64748b' }}>{filtered.length} services</span>
      </div>

      <div className="glass-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="data-table">
            <thead className="sticky top-0 z-10" style={{ background: '#0f111a' }}>
              <tr>
                <th>Display Name</th>
                <th>Service Name</th>
                <th>Status</th>
                <th>Start Type</th>
                <th>PID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(svc => {
                const isRunning = svc.status.toLowerCase() === 'running';
                return (
                  <tr key={svc.name}>
                    <td style={{ color: '#e2e8f0' }}>{svc.display_name}</td>
                    <td className="font-mono text-xs" style={{ color: '#94a3b8' }}>{svc.name}</td>
                    <td>
                      <span className={`badge ${isRunning ? 'badge-green' : svc.status === 'Stopped' ? 'badge-red' : 'badge-yellow'}`}>
                        {isRunning && <span className="w-1.5 h-1.5 rounded-full mr-1.5 inline-block pulse-dot" style={{ background: '#10b981' }} />}
                        {svc.status}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${svc.start_type === 'Automatic' ? 'badge-blue' : svc.start_type === 'Disabled' ? 'badge-red' : 'badge-gray'}`}>
                        {svc.start_type}
                      </span>
                    </td>
                    <td className="font-mono">{svc.pid || '—'}</td>
                    <td>
                      <div className="flex gap-1">
                        {!isRunning && (
                          <button onClick={() => handleControl(svc.name, 'start')}
                            className="flex items-center gap-1 px-2 py-0.5 text-xs rounded"
                            style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>
                            <Play size={10} /> Start
                          </button>
                        )}
                        {isRunning && (
                          <>
                            <button onClick={() => handleControl(svc.name, 'stop')}
                              className="flex items-center gap-1 px-2 py-0.5 text-xs rounded"
                              style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444' }}>
                              <Square size={10} /> Stop
                            </button>
                            <button onClick={() => handleControl(svc.name, 'restart')}
                              className="flex items-center gap-1 px-2 py-0.5 text-xs rounded"
                              style={{ background: 'rgba(59,130,246,0.1)', color: '#3b82f6' }}>
                              <RefreshCw size={10} /> Restart
                            </button>
                          </>
                        )}
                      </div>
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
        <div className="text-xl font-bold font-mono" style={{ color }}>{value}</div>
      </div>
    </div>
  );
}
