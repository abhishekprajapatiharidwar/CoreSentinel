import { NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Cpu, Network, HardDrive, Sliders, Bell,
  Settings, ChevronLeft, ChevronRight, Rocket, Activity,
  PlayCircle, Zap, Server
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { useShallow } from 'zustand/shallow';

const NAV_ITEMS = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/processes', icon: Cpu, label: 'Processes' },
  { path: '/ports', icon: Network, label: 'Ports & Network' },
  { path: '/hardware', icon: HardDrive, label: 'Hardware' },
  { path: '/limiter', icon: Sliders, label: 'Resource Limiter' },
  { path: '/alerts', icon: Bell, label: 'Alerts' },
  { path: '/services', icon: Server, label: 'Services' },
  { path: '/startup', icon: Rocket, label: 'Startup Apps' },
  { path: '/analytics', icon: Activity, label: 'Analytics' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
  const { sidebarCollapsed, setSidebarCollapsed, alerts } = useAppStore(useShallow(s => ({
    sidebarCollapsed: s.sidebarCollapsed,
    setSidebarCollapsed: s.setSidebarCollapsed,
    alerts: s.alerts,
  })));
  const systemStats = useAppStore(s => s.systemStats);
  const unreadAlerts = alerts.length;

  return (
    <motion.div
      className="fixed left-0 top-0 h-full z-50 flex flex-col"
      animate={{ width: sidebarCollapsed ? 56 : 220 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center h-12 px-3 border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
          <Zap size={16} color="white" strokeWidth={2.5} />
        </div>
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="ml-2 overflow-hidden whitespace-nowrap"
            >
              <div className="text-sm font-bold tracking-wide" style={{ color: 'var(--text-primary)' }}>CoreSentinel</div>
              <div className="text-xs" style={{ color: 'var(--text-muted)', marginTop: '-2px' }}>System Monitor</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Live stats mini */}
      {systemStats && !sidebarCollapsed && (
        <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex gap-2">
            <MiniStat label="CPU" value={`${systemStats.cpu_usage.toFixed(0)}%`} color="#3b82f6" pct={systemStats.cpu_usage} />
            <MiniStat label="RAM" value={`${((systemStats.ram_used / systemStats.ram_total) * 100).toFixed(0)}%`} color="#8b5cf6" pct={(systemStats.ram_used / systemStats.ram_total) * 100} />
          </div>
        </div>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-2 overflow-y-auto overflow-x-hidden">
        {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
          <NavLink key={path} to={path}>
            {({ isActive }) => (
              <motion.div
                className="flex items-center gap-3 mx-2 my-0.5 rounded-lg cursor-pointer relative"
                style={{
                  padding: sidebarCollapsed ? '10px 12px' : '8px 12px',
                  background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
                  color: isActive ? '#60a5fa' : '#94a3b8',
                  borderLeft: isActive ? '2px solid #3b82f6' : '2px solid transparent',
                }}
                whileHover={{
                  background: isActive ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)',
                  color: '#e2e8f0',
                }}
                transition={{ duration: 0.1 }}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className="flex-shrink-0" />
                <AnimatePresence>
                  {!sidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.1 }}
                      className="text-xs font-medium whitespace-nowrap overflow-hidden"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {/* Alert badge */}
                {path === '/alerts' && unreadAlerts > 0 && (
                  <span className="absolute right-2 top-1.5 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
                    style={{ background: '#ef4444', color: 'white' }}>
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </span>
                )}
              </motion.div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Toggle button */}
      <div className="p-2 border-t" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-full flex items-center justify-center rounded-lg p-2 transition-colors"
          style={{ color: '#64748b' }}
          onMouseEnter={e => e.currentTarget.style.color = '#e2e8f0'}
          onMouseLeave={e => e.currentTarget.style.color = '#64748b'}
        >
          {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </motion.div>
  );
}

function MiniStat({ label, value, color, pct }) {
  return (
    <div className="flex-1">
      <div className="flex justify-between text-[10px] mb-0.5" style={{ color: '#64748b' }}>
        <span>{label}</span>
        <span style={{ color }}>{value}</span>
      </div>
      <div className="usage-bar">
        <motion.div
          className="usage-bar-fill"
          style={{ background: color, width: `${Math.min(100, pct)}%` }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}
