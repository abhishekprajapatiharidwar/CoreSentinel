import { useState } from 'react';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';
import { Search, Rocket, ToggleLeft, ToggleRight, Folder } from 'lucide-react';

export default function StartupApps() {
  const { startupEntries, startupToggles, setStartupToggle, showNotification } = useAppStore(useShallow(s => ({
    startupEntries: s.startupEntries,
    startupToggles: s.startupToggles,
    setStartupToggle: s.setStartupToggle,
    showNotification: s.showNotification,
  })));
  const [search, setSearch] = useState('');

  // Merge live entries with persisted toggle overrides
  const displayEntries = startupEntries.map(e => ({
    ...e,
    enabled: startupToggles[e.name] !== undefined ? startupToggles[e.name] : e.enabled,
  }));
  const filtered = displayEntries.filter(e => !search || e.name.toLowerCase().includes(search.toLowerCase()));

  const toggleEntry = (entry) => {
    const next = !entry.enabled;
    setStartupToggle(entry.name, next);
    showNotification(`${entry.name} ${next ? 'enabled' : 'disabled'} at startup`, next ? 'success' : 'info');
  };

  const enabled = filtered.filter(e => e.enabled).length;

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(59,130,246,0.15)', color: '#3b82f6' }}><Rocket size={16} /></div>
          <div>
            <div className="text-xs" style={{ color: '#64748b' }}>Total Startup Apps</div>
            <div className="text-xl font-bold font-mono" style={{ color: '#3b82f6' }}>{filtered.length}</div>
          </div>
        </div>
        <div className="glass-card p-3 flex items-center gap-3">
          <div className="p-2 rounded-lg" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}><ToggleRight size={16} /></div>
          <div>
            <div className="text-xs" style={{ color: '#64748b' }}>Enabled</div>
            <div className="text-xl font-bold font-mono" style={{ color: '#10b981' }}>{enabled}</div>
          </div>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#64748b' }} />
        <input
          type="text"
          placeholder="Search startup apps..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-8 py-2 text-xs rounded-lg outline-none"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}
        />
      </div>

      <div className="glass-card flex-1 overflow-hidden flex flex-col">
        <div className="overflow-auto flex-1">
          <table className="data-table">
            <thead className="sticky top-0 z-10" style={{ background: '#0f111a' }}>
              <tr>
                <th>Name</th>
                <th>Publisher</th>
                <th>Command</th>
                <th>Location</th>
                <th>Status</th>
                <th>Toggle</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, i) => (
                <tr key={i}>
                  <td style={{ color: '#e2e8f0' }} className="font-medium">{entry.name}</td>
                  <td style={{ color: '#94a3b8' }}>{entry.publisher}</td>
                  <td title={entry.command} style={{ maxWidth: 200 }}>
                    <span className="font-mono text-xs truncate block" style={{ color: '#64748b' }}>{entry.command}</span>
                  </td>
                  <td>
                    <span className="badge badge-gray text-[10px]">{entry.location.split('\\').pop()}</span>
                  </td>
                  <td>
                    <span className={`badge ${entry.enabled ? 'badge-green' : 'badge-red'}`}>
                      {entry.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td>
                    <button onClick={() => toggleEntry(entry)} className="flex items-center gap-1 text-xs px-2 py-1 rounded"
                      style={{ background: entry.enabled ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: entry.enabled ? '#ef4444' : '#10b981' }}>
                      {entry.enabled ? <ToggleLeft size={12} /> : <ToggleRight size={12} />}
                      {entry.enabled ? 'Disable' : 'Enable'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
