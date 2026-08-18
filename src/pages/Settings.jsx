import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';
import { Settings as SettingsIcon, Monitor, Bell, Palette, Info, Sun, Moon, Laptop } from 'lucide-react';

const SECTIONS = [
  { id: 'appearance', label: 'Appearance', icon: <Palette size={14} /> },
  { id: 'monitoring', label: 'Monitoring', icon: <Monitor size={14} /> },
  { id: 'alerts', label: 'Alerts', icon: <Bell size={14} /> },
  { id: 'about', label: 'About', icon: <Info size={14} /> },
];

const THEMES = [
  { id: 'dark', label: 'Dark', icon: <Moon size={16} />, desc: 'Dark futuristic theme', preview: ['#0a0c14', '#141624', '#1e2235'] },
  { id: 'light', label: 'Light', icon: <Sun size={16} />, desc: 'Clean light theme', preview: ['#f0f2f8', '#ffffff', '#e8eaf2'] },
];

const ACCENT_COLORS = [
  { id: 'blue', color: '#3b82f6', label: 'Blue' },
  { id: 'purple', color: '#8b5cf6', label: 'Purple' },
  { id: 'cyan', color: '#06b6d4', label: 'Cyan' },
  { id: 'green', color: '#10b981', label: 'Green' },
  { id: 'orange', color: '#f59e0b', label: 'Amber' },
  { id: 'red', color: '#ef4444', label: 'Red' },
  { id: 'pink', color: '#ec4899', label: 'Pink' },
];

export default function Settings() {
  const { alertConfig, setAlertConfig, showNotification, systemInfo, theme, setTheme } = useAppStore(useShallow(s => ({
    alertConfig: s.alertConfig,
    setAlertConfig: s.setAlertConfig,
    showNotification: s.showNotification,
    systemInfo: s.systemInfo,
    theme: s.theme,
    setTheme: s.setTheme,
  })));

  const [section, setSection] = useState('appearance');
  const [refreshRate, setRefreshRate] = useState(1000);
  const [accentColor, setAccentColor] = useState('#3b82f6');
  const [localAlertConfig, setLocalAlertConfig] = useState({ ...alertConfig });

  const saveAlerts = () => {
    setAlertConfig(localAlertConfig);
    showNotification('Alert settings saved', 'success');
  };

  return (
    <div className="flex h-full gap-4">
      {/* Section nav */}
      <div className="w-44 flex-shrink-0">
        <div className="glass-card p-2 space-y-1">
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left transition-all"
              style={{
                background: section === s.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: section === s.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                borderLeft: `2px solid ${section === s.id ? 'var(--accent-blue)' : 'transparent'}`,
              }}
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Section content */}
      <div className="flex-1 glass-card p-5 overflow-auto">
        {section === 'appearance' && (
          <div className="space-y-6 max-w-lg">
            <SectionTitle>Appearance</SectionTitle>

            {/* Theme Selector */}
            <div>
              <label className="text-xs font-semibold mb-3 block" style={{ color: 'var(--text-secondary)' }}>
                COLOR THEME
              </label>
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map(t => (
                  <motion.button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className="p-4 rounded-xl text-left relative overflow-hidden"
                    style={{
                      border: `2px solid ${theme === t.id ? 'var(--accent-blue)' : 'var(--border)'}`,
                      background: theme === t.id ? 'rgba(59,130,246,0.08)' : 'var(--glass-bg)',
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Mini preview */}
                    <div className="flex gap-1 mb-3">
                      {t.preview.map((c, i) => (
                        <div key={i} className="h-6 rounded flex-1" style={{ background: c, border: '1px solid rgba(0,0,0,0.1)' }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span style={{ color: theme === t.id ? 'var(--accent-blue)' : 'var(--text-secondary)' }}>{t.icon}</span>
                      <span className="text-sm font-semibold" style={{ color: theme === t.id ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                        {t.label}
                      </span>
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{t.desc}</div>
                    {theme === t.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--accent-blue)' }}>
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Accent Color */}
            <div>
              <label className="text-xs font-semibold mb-3 block" style={{ color: 'var(--text-secondary)' }}>
                ACCENT COLOR
              </label>
              <div className="flex gap-2 flex-wrap">
                {ACCENT_COLORS.map(c => (
                  <motion.button
                    key={c.id}
                    onClick={() => setAccentColor(c.color)}
                    className="flex flex-col items-center gap-1"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <div
                      className="w-8 h-8 rounded-full"
                      style={{
                        background: c.color,
                        border: accentColor === c.color ? '3px solid var(--text-primary)' : '3px solid transparent',
                        boxShadow: accentColor === c.color ? `0 0 12px ${c.color}60` : 'none',
                      }}
                    />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            <SettingRow label="Compact Mode" description="Reduce UI spacing for more data density">
              <Toggle />
            </SettingRow>
            <SettingRow label="Animations" description="Enable smooth transitions and animations">
              <Toggle defaultOn />
            </SettingRow>
            <SettingRow label="Show System Tray" description="Minimize to system tray">
              <Toggle defaultOn />
            </SettingRow>
          </div>
        )}

        {section === 'monitoring' && (
          <div className="space-y-5 max-w-md">
            <SectionTitle>Monitoring</SectionTitle>
            <div>
              <label className="text-xs font-semibold mb-2 block" style={{ color: 'var(--text-secondary)' }}>REFRESH RATE</label>
              <div className="flex gap-2">
                {[{ label: '500ms', v: 500 }, { label: '1s', v: 1000 }, { label: '2s', v: 2000 }, { label: '5s', v: 5000 }].map(r => (
                  <button key={r.v} onClick={() => setRefreshRate(r.v)}
                    className="px-3 py-1.5 rounded-lg text-xs"
                    style={{
                      background: refreshRate === r.v ? 'rgba(59,130,246,0.2)' : 'var(--input-bg)',
                      color: refreshRate === r.v ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      border: `1px solid ${refreshRate === r.v ? 'rgba(59,130,246,0.3)' : 'var(--border)'}`,
                    }}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <SettingRow label="GPU Monitoring" description="Monitor GPU usage"><Toggle /></SettingRow>
            <SettingRow label="Temperature Sensors" description="Show CPU/GPU temperatures"><Toggle /></SettingRow>
            <SettingRow label="History Length" description="Seconds of history to retain">
              <select className="text-xs rounded-lg px-2 py-1"
                style={{ background: 'var(--input-bg)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                <option>60s</option><option>5 min</option><option>15 min</option><option>1 hour</option>
              </select>
            </SettingRow>
          </div>
        )}

        {section === 'alerts' && (
          <div className="space-y-5 max-w-md">
            <SectionTitle>Alerts Configuration</SectionTitle>
            <SettingRow label="Enable Alerts" description="Get notified about resource spikes">
              <Toggle value={localAlertConfig.enabled}
                onChange={v => setLocalAlertConfig(c => ({ ...c, enabled: v }))}
                defaultOn={localAlertConfig.enabled} />
            </SettingRow>
            <div className="space-y-4">
              <ThresholdSlider label="CPU Alert Threshold" value={localAlertConfig.cpu_threshold}
                onChange={v => setLocalAlertConfig(c => ({ ...c, cpu_threshold: v }))} color="var(--accent-blue)" />
              <ThresholdSlider label="RAM Alert Threshold" value={localAlertConfig.ram_threshold}
                onChange={v => setLocalAlertConfig(c => ({ ...c, ram_threshold: v }))} color="var(--accent-purple)" />
              <ThresholdSlider label="Disk Alert Threshold" value={localAlertConfig.disk_threshold}
                onChange={v => setLocalAlertConfig(c => ({ ...c, disk_threshold: v }))} color="var(--accent-orange)" />
            </div>
            <button onClick={saveAlerts} className="px-5 py-2 rounded-lg text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', color: 'white' }}>
              Save Alert Settings
            </button>
          </div>
        )}

        {section === 'about' && (
          <div className="space-y-5 max-w-md">
            <SectionTitle>About CoreSentinel</SectionTitle>
            <div className="flex items-center gap-4 p-4 rounded-xl"
              style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1))', border: '1px solid var(--border)' }}>
              <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
                style={{ border: '1px solid var(--border)' }}>
                <img src="/applogo.ico" alt="CoreSentinel" className="w-full h-full object-contain" onError={e => { e.target.style.display='none'; e.target.parentElement.innerHTML='<span style="font-size:2rem;display:flex;align-items:center;justify-content:center;height:100%">⚡</span>'; }} />
              </div>
              <div>
                <div className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>CoreSentinel</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Advanced System Monitor · v0.1.0</div>
                <div className="text-xs mt-1 font-semibold" style={{ color: 'var(--accent-blue)' }}>Developer: Abhishek Kumar</div>
                <a href="mailto:prajapatiabhishek02@gmail.com" className="text-xs block mt-0.5" style={{ color: 'var(--text-muted)' }}>prajapatiabhishek02@gmail.com</a>
              </div>
            </div>
            {/* System info */}
            {systemInfo && (
              <div className="space-y-1">
                <h4 className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>SYSTEM INFORMATION</h4>
                {[
                  ['Hostname', systemInfo.hostname],
                  ['OS', `${systemInfo.os_name} ${systemInfo.os_version}`],
                  ['Kernel', systemInfo.kernel_version],
                  ['CPU', systemInfo.cpu_brand],
                  ['Cores', `${systemInfo.cpu_cores} Physical / ${systemInfo.cpu_logical} Logical`],
                  ['Memory', `${(systemInfo.total_memory / 1024 / 1024 / 1024).toFixed(1)} GB`],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between items-center text-xs py-1.5 border-b"
                    style={{ borderColor: 'var(--border)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                    <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return <h2 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{children}</h2>;
}

function SettingRow({ label, description, children }) {
  return (
    <div className="flex items-center justify-between py-3 border-b" style={{ borderColor: 'var(--border)' }}>
      <div>
        <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{label}</div>
        {description && <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</div>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, defaultOn = false }) {
  const [on, setOn] = useState(defaultOn);
  const isOn = value !== undefined ? value : on;
  return (
    <div className="w-9 h-5 rounded-full relative cursor-pointer flex-shrink-0"
      style={{ background: isOn ? 'var(--accent-blue)' : 'var(--border-strong)' }}
      onClick={() => { const n = !isOn; setOn(n); onChange?.(n); }}>
      <motion.div className="absolute top-0.5 w-4 h-4 rounded-full" style={{ background: 'white' }}
        animate={{ left: isOn ? '19px' : '2px' }} transition={{ duration: 0.15 }} />
    </div>
  );
}

function ThresholdSlider({ label, value, onChange, color }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="font-mono font-semibold" style={{ color }}>{value}%</span>
      </div>
      <input type="range" min={0} max={100} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full" style={{ accentColor: color }} />
    </div>
  );
}
