import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';
import { Bell, AlertTriangle, Cpu, MemoryStick, HardDrive, Trash2, Settings } from 'lucide-react';
import { useState } from 'react';

const CATEGORY_ICONS = {
  CPU: <Cpu size={14} />,
  RAM: <MemoryStick size={14} />,
  Disk: <HardDrive size={14} />,
  Network: <Bell size={14} />,
  Process: <AlertTriangle size={14} />,
};

const TYPE_COLORS = {
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  success: '#10b981',
};

export default function Alerts() {
  const { alerts, clearAlerts, alertConfig, setAlertConfig } = useAppStore(useShallow(s => ({
    alerts: s.alerts,
    clearAlerts: s.clearAlerts,
    alertConfig: s.alertConfig,
    setAlertConfig: s.setAlertConfig,
  })));

  const [showConfig, setShowConfig] = useState(false);
  const [localConfig, setLocalConfig] = useState({ ...alertConfig });

  const saveConfig = () => {
    setAlertConfig(localConfig);
    setShowConfig(false);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell size={16} color="#f59e0b" />
          <h2 className="text-sm font-semibold" style={{ color: '#e2e8f0' }}>System Alerts</h2>
          {alerts.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: '#ef444420', color: '#ef4444' }}>
              {alerts.length}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.05)', color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Settings size={13} /> Configure
          </button>
          <button
            onClick={clearAlerts}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
          >
            <Trash2 size={13} /> Clear All
          </button>
        </div>
      </div>

      {/* Alert config panel */}
      <AnimatePresence>
        {showConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-card p-4 overflow-hidden"
          >
            <h3 className="text-xs font-semibold mb-3" style={{ color: '#e2e8f0' }}>Alert Thresholds</h3>
            <div className="grid grid-cols-3 gap-4">
              <ThresholdInput
                label="CPU Threshold"
                value={localConfig.cpu_threshold}
                onChange={v => setLocalConfig(c => ({ ...c, cpu_threshold: v }))}
                color="#3b82f6"
              />
              <ThresholdInput
                label="RAM Threshold"
                value={localConfig.ram_threshold}
                onChange={v => setLocalConfig(c => ({ ...c, ram_threshold: v }))}
                color="#8b5cf6"
              />
              <ThresholdInput
                label="Disk Threshold"
                value={localConfig.disk_threshold}
                onChange={v => setLocalConfig(c => ({ ...c, disk_threshold: v }))}
                color="#f59e0b"
              />
            </div>
            <div className="flex items-center justify-between mt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  className="w-8 h-4 rounded-full relative cursor-pointer"
                  style={{ background: localConfig.enabled ? '#3b82f6' : 'rgba(255,255,255,0.15)' }}
                  onClick={() => setLocalConfig(c => ({ ...c, enabled: !c.enabled }))}
                >
                  <div
                    className="absolute top-0.5 w-3 h-3 rounded-full transition-all"
                    style={{
                      background: 'white',
                      left: localConfig.enabled ? '17px' : '2px',
                    }}
                  />
                </div>
                <span className="text-xs" style={{ color: '#94a3b8' }}>Enable alerts</span>
              </label>
              <button onClick={saveConfig} className="px-4 py-1.5 text-xs rounded-lg font-semibold"
                style={{ background: '#3b82f6', color: 'white' }}>
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Alert list */}
      <div className="glass-card flex-1 overflow-hidden flex flex-col">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full" style={{ color: '#64748b' }}>
            <Bell size={40} strokeWidth={1} className="mb-3" />
            <p className="text-sm">No alerts</p>
            <p className="text-xs mt-1">System is running normally</p>
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            <AnimatePresence initial={false}>
              {alerts.map(alert => {
                const color = TYPE_COLORS[alert.type] || '#94a3b8';
                return (
                  <motion.div
                    key={alert.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-start gap-3 p-3 border-b"
                    style={{ borderColor: 'rgba(255,255,255,0.05)' }}
                  >
                    <div className="p-1.5 rounded-lg flex-shrink-0 mt-0.5"
                      style={{ background: `${color}20`, color }}>
                      {CATEGORY_ICONS[alert.category] || <AlertTriangle size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="badge" style={{ background: `${color}20`, color, border: `1px solid ${color}30`, fontSize: '10px' }}>
                          {alert.category}
                        </span>
                        <span className="text-xs" style={{ color: '#64748b' }}>
                          {new Date(alert.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs mt-1" style={{ color: '#e2e8f0' }}>{alert.message}</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function ThresholdInput({ label, value, onChange, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{ color: '#64748b' }}>
        <span>{label}</span>
        <span style={{ color }}>{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full"
        style={{ accentColor: color }}
      />
    </div>
  );
}
