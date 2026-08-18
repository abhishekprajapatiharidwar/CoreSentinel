import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { formatBytes } from '../utils/formatters';
import LiveAreaChart from '../components/Charts/LiveAreaChart';
import CpuHeatmap from '../components/Charts/CpuHeatmap';
import { Cpu, HardDrive, Wifi, MemoryStick, Grid3x3, List } from 'lucide-react';

function cpuColor(pct) {
  if (pct >= 90) return '#ef4444';
  if (pct >= 70) return '#f59e0b';
  if (pct >= 40) return '#3b82f6';
  return '#10b981';
}

export default function HardwareMonitor() {
  const systemStats = useAppStore(s => s.systemStats);
  const systemInfo = useAppStore(s => s.systemInfo);
  const disks = useAppStore(s => s.disks);
  const networks = useAppStore(s => s.networks);
  const history = useAppStore(s => s.history);
  const [cpuView, setCpuView] = useState('heatmap'); // 'heatmap' | 'table'

  if (!systemStats) return null;

  const ramPct = (systemStats.ram_used / systemStats.ram_total) * 100;
  const historySlice = history.slice(-60).map(h => ({
    ...h,
    ram_pct: systemStats.ram_total > 0 ? (h.ram_used / systemStats.ram_total) * 100 : 0,
  }));

  const cores = systemStats.cpu_per_core || [];
  const avgUsage = cores.length ? cores.reduce((a, b) => a + b, 0) / cores.length : 0;
  const maxCore = cores.length ? Math.max(...cores) : 0;
  const minCore = cores.length ? Math.min(...cores) : 0;

  return (
    <div className="space-y-4 overflow-auto h-full">
      {/* ── CPU ───────────────────────────────────────── */}
      <section className="glass-card p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Cpu size={16} color="var(--accent-blue)" />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>CPU</span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{systemInfo?.cpu_brand}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {systemInfo?.cpu_cores}C / {systemInfo?.cpu_logical}T · {systemStats.cpu_frequency} MHz
            </span>
            {/* View toggle */}
            <div className="flex gap-1 p-0.5 rounded-lg" style={{ background: 'var(--input-bg)' }}>
              <button onClick={() => setCpuView('heatmap')}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{ background: cpuView === 'heatmap' ? 'var(--accent-blue)' : 'transparent', color: cpuView === 'heatmap' ? 'white' : 'var(--text-muted)' }}>
                <Grid3x3 size={11} /> Heatmap
              </button>
              <button onClick={() => setCpuView('table')}
                className="flex items-center gap-1 px-2 py-1 rounded text-xs"
                style={{ background: cpuView === 'table' ? 'var(--accent-blue)' : 'transparent', color: cpuView === 'table' ? 'white' : 'var(--text-muted)' }}>
                <List size={11} /> Detail
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Left: chart + stats */}
          <div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Overall Usage</div>
                <div className="text-3xl font-bold font-mono" style={{ color: 'var(--accent-blue)' }}>
                  {systemStats.cpu_usage.toFixed(1)}%
                </div>
              </div>
              <div className="text-right text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                <div>Avg: <span className="font-mono" style={{ color: 'var(--text-primary)' }}>{avgUsage.toFixed(1)}%</span></div>
                <div>Peak: <span className="font-mono" style={{ color: '#ef4444' }}>{maxCore.toFixed(1)}%</span></div>
                <div>Min: <span className="font-mono" style={{ color: '#10b981' }}>{minCore.toFixed(1)}%</span></div>
              </div>
            </div>
            <LiveAreaChart
              data={historySlice}
              series={[{ key: 'cpu_usage', name: 'CPU', color: 'var(--accent-blue)' || '#3b82f6' }]}
              height={130}
              yTickFormatter={v => `${v.toFixed(0)}%`}
            />
          </div>

          {/* Right: heatmap or detail table */}
          <div>
            {cpuView === 'heatmap' ? (
              <>
                <div className="text-xs mb-2 flex items-center justify-between" style={{ color: 'var(--text-muted)' }}>
                  <span>Per-Core Utilization ({cores.length} Logical Processors)</span>
                </div>
                <CpuHeatmap cores={cores} />
              </>
            ) : (
              <LogicalProcessorTable cores={cores} />
            )}
          </div>
        </div>
      </section>

      {/* ── Memory ──────────────────────────────────────── */}
      <section className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <MemoryStick size={16} color="var(--accent-purple)" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Memory</span>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <LiveAreaChart
              data={historySlice}
              series={[{ key: 'ram_pct', name: 'RAM %', color: '#8b5cf6' }]}
              height={110}
              yTickFormatter={v => `${v.toFixed(0)}%`}
            />
          </div>
          <div className="space-y-2.5">
            {[
              { label: 'Total', value: formatBytes(systemStats.ram_total), color: 'var(--text-secondary)' },
              { label: 'Used', value: formatBytes(systemStats.ram_used), color: 'var(--accent-purple)' },
              { label: 'Available', value: formatBytes(systemStats.ram_available), color: 'var(--accent-green)' },
              { label: 'Usage', value: `${ramPct.toFixed(1)}%`, color: ramPct > 85 ? '#ef4444' : 'var(--accent-purple)' },
              { label: 'Swap Used', value: formatBytes(systemStats.swap_used), color: 'var(--accent-orange)' },
              { label: 'Swap Total', value: formatBytes(systemStats.swap_total), color: 'var(--text-muted)' },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between text-xs">
                <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                <span className="font-mono font-semibold" style={{ color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--text-muted)' }}>
            <span>Memory Usage</span><span>{ramPct.toFixed(1)}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: 'var(--input-bg)' }}>
            <motion.div className="h-full rounded-full"
              style={{ background: 'linear-gradient(90deg, #6d28d9, #8b5cf6, #a78bfa)' }}
              animate={{ width: `${ramPct}%` }} transition={{ duration: 0.3 }} />
          </div>
        </div>
      </section>

      {/* ── Disks ──────────────────────────────────────── */}
      <section className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <HardDrive size={16} color="var(--accent-orange)" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Storage</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {disks.map((disk, i) => {
            const usedPct = disk.total_space > 0
              ? ((disk.total_space - disk.available_space) / disk.total_space) * 100 : 0;
            const barColor = usedPct > 85 ? '#ef4444' : usedPct > 70 ? '#f59e0b' : '#10b981';
            return (
              <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{disk.name}</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--text-muted)' }}>{disk.mount_point}</span>
                  </div>
                  <span className="badge badge-gray">{disk.file_system}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                  <div><div style={{ color: 'var(--text-muted)' }}>Total</div><div className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{formatBytes(disk.total_space)}</div></div>
                  <div><div style={{ color: 'var(--text-muted)' }}>Used</div><div className="font-mono font-semibold" style={{ color: barColor }}>{formatBytes(disk.total_space - disk.available_space)}</div></div>
                  <div><div style={{ color: 'var(--text-muted)' }}>Free</div><div className="font-mono font-semibold" style={{ color: '#10b981' }}>{formatBytes(disk.available_space)}</div></div>
                </div>
                <div className="h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--border)' }}>
                  <motion.div className="h-full rounded-full" style={{ background: barColor, width: `${usedPct}%` }} />
                </div>
                <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{usedPct.toFixed(1)}% used</span>
                  <span>R: {formatBytes(disk.read_bytes)}/s · W: {formatBytes(disk.write_bytes)}/s</span>
                </div>
              </div>
            );
          })}
        </div>
        <LiveAreaChart
          data={historySlice}
          series={[{ key: 'disk_read', name: 'Read', color: '#10b981' }, { key: 'disk_write', name: 'Write', color: '#f59e0b' }]}
          height={80} yTickFormatter={v => formatBytes(v) + '/s'}
          formatter={v => formatBytes(v) + '/s'} showLegend />
      </section>

      {/* ── Network ──────────────────────────────────────── */}
      <section className="glass-card p-4">
        <div className="flex items-center gap-2 mb-4">
          <Wifi size={16} color="var(--accent-cyan)" />
          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Network</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          {networks.map((net, i) => (
            <div key={i} className="p-3 rounded-lg" style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{net.interface}</span>
                <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{net.mac_address}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><div style={{ color: 'var(--text-muted)' }}>IP</div><div className="font-mono" style={{ color: 'var(--text-primary)' }}>{net.ip_address || 'N/A'}</div></div>
                <div>
                  <div style={{ color: '#06b6d4' }}>↑ {formatBytes(net.upload_speed)}/s</div>
                  <div style={{ color: '#3b82f6' }}>↓ {formatBytes(net.download_speed)}/s</div>
                </div>
                <div><div style={{ color: 'var(--text-muted)' }}>Total Sent</div><div className="font-mono" style={{ color: 'var(--text-primary)' }}>{formatBytes(net.upload_bytes)}</div></div>
                <div><div style={{ color: 'var(--text-muted)' }}>Total Recv</div><div className="font-mono" style={{ color: 'var(--text-primary)' }}>{formatBytes(net.download_bytes)}</div></div>
              </div>
            </div>
          ))}
        </div>
        <LiveAreaChart
          data={historySlice}
          series={[{ key: 'net_upload', name: 'Upload', color: '#06b6d4' }, { key: 'net_download', name: 'Download', color: '#3b82f6' }]}
          height={100} yTickFormatter={v => formatBytes(v) + '/s'}
          formatter={v => formatBytes(v) + '/s'} showLegend />
      </section>
    </div>
  );
}

function LogicalProcessorTable({ cores }) {
  return (
    <div className="overflow-auto" style={{ maxHeight: '260px' }}>
      <table className="data-table w-full">
        <thead className="sticky top-0" style={{ background: 'var(--table-header-bg)' }}>
          <tr>
            <th style={{ width: 60 }}>Core</th>
            <th style={{ width: 80 }}>Usage %</th>
            <th>Bar</th>
            <th style={{ width: 70 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {cores.map((usage, i) => {
            const color = cpuColor(usage);
            const status = usage >= 90 ? 'Critical' : usage >= 70 ? 'High' : usage >= 40 ? 'Moderate' : 'Normal';
            return (
              <tr key={i}>
                <td className="font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
                  LP {i}
                </td>
                <td className="font-mono font-bold" style={{ color }}>
                  {usage.toFixed(1)}%
                </td>
                <td>
                  <div className="usage-bar">
                    <motion.div className="usage-bar-fill" style={{ background: color }}
                      animate={{ width: `${Math.min(100, usage)}%` }} transition={{ duration: 0.3 }} />
                  </div>
                </td>
                <td>
                  <span className="badge" style={{
                    background: `${color}20`, color, border: `1px solid ${color}30`, fontSize: '10px'
                  }}>
                    {status}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
