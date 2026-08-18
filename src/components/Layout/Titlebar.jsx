import { useLocation } from 'react-router-dom';
import { Clock, Wifi, Cpu, MemoryStick, Minimize2, Maximize2 } from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useShallow } from 'zustand/shallow';
import { formatBytes } from '../../utils/formatters';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/processes': 'Process Manager',
  '/ports': 'Ports & Network',
  '/hardware': 'Hardware Monitor',
  '/limiter': 'Resource Limiter',
  '/alerts': 'Alerts',
  '/services': 'Services Manager',
  '/startup': 'Startup Applications',
  '/analytics': 'Analytics',
  '/settings': 'Settings',
};

export default function Titlebar() {
  const location = useLocation();
  const { systemStats, systemInfo, compactMode, toggleCompactMode } = useAppStore(useShallow(s => ({
    systemStats: s.systemStats,
    systemInfo: s.systemInfo,
    compactMode: s.compactMode,
    toggleCompactMode: s.toggleCompactMode,
  })));
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const title = PAGE_TITLES[location.pathname] || 'CoreSentinel';

  return (
    <div
      className="flex items-center justify-between px-4 border-b flex-shrink-0"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--titlebar-bg)',
        height: compactMode ? '36px' : '48px',
        transition: 'height 0.2s ease',
      }}
    >
      {/* Page title */}
      <div className="flex items-center gap-2">
        <h1 className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: compactMode ? '12px' : '13px' }}>
          {title}
        </h1>
        {systemInfo && !compactMode && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--text-muted)', background: 'var(--input-bg)' }}>
            {systemInfo.hostname}
          </span>
        )}
      </div>

      {/* Status bar */}
      <div className="flex items-center gap-3">
        {systemStats && (
          <>
            <StatChip icon={<Cpu size={10} />} label="CPU" value={`${systemStats.cpu_usage.toFixed(1)}%`}
              color={systemStats.cpu_usage > 80 ? '#ef4444' : systemStats.cpu_usage > 60 ? '#f59e0b' : '#10b981'}
              compact={compactMode} />
            <StatChip icon={<MemoryStick size={10} />} label="RAM" value={formatBytes(systemStats.ram_used)}
              color="#8b5cf6" compact={compactMode} />
            {!compactMode && <>
              <StatChip icon={<Wifi size={10} />} label="↑" value={`${formatBytes(systemStats.net_upload)}/s`} color="#06b6d4" />
              <StatChip icon={<Wifi size={10} />} label="↓" value={`${formatBytes(systemStats.net_download)}/s`} color="#3b82f6" />
            </>}
          </>
        )}
        {!compactMode && (
          <div className="flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
            <Clock size={10} />
            <span>{time.toLocaleTimeString()}</span>
          </div>
        )}

        {/* Live dot */}
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: '#10b981' }} />
          {!compactMode && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>LIVE</span>}
        </div>

        {/* Compact toggle */}
        <motion.button
          onClick={toggleCompactMode}
          className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
          style={{
            background: compactMode ? 'rgba(59,130,246,0.15)' : 'var(--input-bg)',
            border: `1px solid ${compactMode ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
            color: compactMode ? 'var(--accent-blue)' : 'var(--text-muted)',
          }}
          whileTap={{ scale: 0.93 }}
          title={compactMode ? 'Switch to Full View' : 'Switch to Compact View'}
        >
          {compactMode ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
          {!compactMode && <span style={{ fontSize: '11px' }}>Compact</span>}
        </motion.button>
      </div>
    </div>
  );
}

function StatChip({ icon, label, value, color, compact }) {
  return (
    <div className="flex items-center gap-1" style={{ color: 'var(--text-muted)', fontSize: compact ? '11px' : '12px' }}>
      <span style={{ color: 'var(--text-muted)', display: compact ? 'none' : 'flex' }}>{icon}</span>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span className="font-mono font-medium" style={{ color }}>{value}</span>
    </div>
  );
}
