import { motion } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { formatBytes, formatUptime, cpuColor, ramColor } from '../utils/formatters';
import LiveAreaChart from '../components/Charts/LiveAreaChart';
import CpuHeatmap from '../components/Charts/CpuHeatmap';
import MiniSparkline from '../components/Charts/MiniSparkline';
import {
  Cpu, MemoryStick, HardDrive, Wifi, Activity,
  Server, Zap, TrendingUp, Clock, Users
} from 'lucide-react';

export default function Dashboard() {
  const systemStats = useAppStore(s => s.systemStats);
  const systemInfo = useAppStore(s => s.systemInfo);
  const history = useAppStore(s => s.history);

  if (!systemStats) return <LoadingState />;

  const ramPct = (systemStats.ram_used / systemStats.ram_total) * 100;
  const historySlice = history.slice(-60).map(h => ({
    ...h,
    ram_pct: systemStats.ram_total > 0 ? (h.ram_used / systemStats.ram_total) * 100 : 0,
  }));

  return (
    <div className="space-y-4 fade-in">
      {/* System Info Banner */}
      {systemInfo && (
        <div className="glass-card p-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Cpu size={14} color="#3b82f6" />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{systemInfo.cpu_brand}</span>
            </div>
            <div className="w-px h-4" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{systemInfo.os_name} {systemInfo.os_version}</span>
            <div className="w-px h-4" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{systemInfo.cpu_cores}C / {systemInfo.cpu_logical}T</span>
            <div className="w-px h-4" style={{ background: 'var(--border)' }} />
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{formatBytes(systemInfo.total_memory)} RAM</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={12} style={{ color: 'var(--text-muted)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              Uptime: {formatUptime(systemStats.uptime)}
            </span>
          </div>
        </div>
      )}

      {/* Main stat cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          title="CPU Usage"
          value={`${systemStats.cpu_usage.toFixed(1)}%`}
          subtitle={`${systemStats.cpu_frequency} MHz`}
          color={cpuColor(systemStats.cpu_usage)}
          icon={<Cpu size={18} />}
          pct={systemStats.cpu_usage}
          sparkData={historySlice.map(h => h.cpu_usage)}
        />
        <StatCard
          title="Memory"
          value={formatBytes(systemStats.ram_used)}
          subtitle={`of ${formatBytes(systemStats.ram_total)} • ${ramPct.toFixed(1)}%`}
          color={ramColor(ramPct)}
          icon={<MemoryStick size={18} />}
          pct={ramPct}
          sparkData={historySlice.map(h => (h.ram_used / systemStats.ram_total) * 100)}
        />
        <StatCard
          title="Net Upload"
          value={`${formatBytes(systemStats.net_upload)}/s`}
          subtitle={`↓ ${formatBytes(systemStats.net_download)}/s`}
          color="#06b6d4"
          icon={<Wifi size={18} />}
          pct={Math.min(100, (systemStats.net_upload / 10000000) * 100)}
          sparkData={historySlice.map(h => h.net_upload)}
        />
        <StatCard
          title="Disk I/O"
          value={`R: ${formatBytes(systemStats.disk_read_bytes)}/s`}
          subtitle={`W: ${formatBytes(systemStats.disk_write_bytes)}/s`}
          color="#f59e0b"
          icon={<HardDrive size={18} />}
          pct={Math.min(100, (systemStats.disk_read_bytes / 100000000) * 100)}
          sparkData={historySlice.map(h => h.disk_read)}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-4">
        {/* CPU Chart */}
        <div className="col-span-2 glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
              <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>CPU & Memory History</span>
            </div>
            <span className="text-xs" style={{ color: '#64748b' }}>Last 60s</span>
          </div>
          <LiveAreaChart
            data={historySlice}
            series={[
              { key: 'cpu_usage', name: 'CPU %', color: '#3b82f6' },
              { key: 'ram_pct', name: 'RAM %', color: '#8b5cf6' },
            ]}
            height={160}
            yTickFormatter={v => `${v.toFixed(0)}%`}
            formatter={(v, name) => `${v.toFixed(1)}%`}
            showLegend
          />
        </div>

        {/* Quick stats */}
        <div className="glass-card p-4 flex flex-col gap-3">
          <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>Quick Stats</span>
          <QuickStat icon={<Activity size={13} />} label="Processes" value={systemStats.process_count} color="#10b981" />
          <QuickStat icon={<Cpu size={13} />} label="Logical Cores" value={systemStats.cpu_logical_cores} color="#3b82f6" />
          <QuickStat icon={<Cpu size={13} />} label="Physical Cores" value={systemStats.cpu_physical_cores} color="#06b6d4" />
          <QuickStat icon={<MemoryStick size={13} />} label="Swap Used" value={formatBytes(systemStats.swap_used)} color="#8b5cf6" />
          <QuickStat icon={<TrendingUp size={13} />} label="Load (1m)" value={systemStats.load_avg?.[0]?.toFixed(2) ?? '—'} color="#f59e0b" />
          <QuickStat icon={<Zap size={13} />} label="CPU Freq" value={`${systemStats.cpu_frequency} MHz`} color="#ec4899" />
        </div>
      </div>

      {/* Network chart */}
      <div className="glass-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: '#06b6d4' }} />
            <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>Network Bandwidth</span>
          </div>
        </div>
        <LiveAreaChart
          data={historySlice}
          series={[
            { key: 'net_upload', name: 'Upload', color: '#06b6d4' },
            { key: 'net_download', name: 'Download', color: '#3b82f6' },
          ]}
          height={120}
          yTickFormatter={v => formatBytes(v) + '/s'}
          formatter={(v, name) => formatBytes(v) + '/s'}
          showLegend
        />
      </div>

      {/* CPU Core Heatmap */}
      {systemStats.cpu_per_core?.length > 0 && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: '#f59e0b' }} />
              <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>CPU Core Heatmap</span>
            </div>
            <div className="flex items-center gap-3 text-[10px]" style={{ color: '#64748b' }}>
              <LegendDot color="rgba(16,185,129,0.4)" label="Low" />
              <LegendDot color="rgba(59,130,246,0.5)" label="Medium" />
              <LegendDot color="rgba(245,158,11,0.6)" label="High" />
              <LegendDot color="rgba(239,68,68,0.8)" label="Critical" />
            </div>
          </div>
          <CpuHeatmap cores={systemStats.cpu_per_core} />
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, subtitle, color, icon, pct, sparkData }) {
  return (
    <motion.div
      className="glass-card p-4"
      whileHover={{ y: -1 }}
      transition={{ duration: 0.15 }}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-xs" style={{ color: '#64748b' }}>{title}</div>
          <div className="text-xl font-bold font-mono mt-1" style={{ color }}>{value}</div>
          <div className="text-xs mt-0.5" style={{ color: '#64748b' }}>{subtitle}</div>
        </div>
        <div className="p-2 rounded-lg" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
      </div>
      <div className="usage-bar mt-2">
        <motion.div
          className="usage-bar-fill"
          style={{ background: color, width: `${Math.min(100, pct)}%` }}
          animate={{ width: `${Math.min(100, pct)}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      {sparkData?.length > 1 && (
        <div className="mt-2">
          <MiniSparkline data={sparkData} color={color} height={35} />
        </div>
      )}
    </motion.div>
  );
}

function QuickStat({ icon, label, value, color }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2" style={{ color: '#94a3b8' }}>
        <span style={{ color }}>{icon}</span>
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xs font-mono font-semibold" style={{ color }}>{value}</span>
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <div className="flex items-center gap-1">
      <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-14 h-14">
          <div className="w-14 h-14 rounded-full border-2 animate-spin"
            style={{ borderColor: 'rgba(59,130,246,0.15)', borderTopColor: '#3b82f6' }} />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">⚡</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>SysPulse</div>
          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Collecting system data...</div>
        </div>
      </div>
    </div>
  );
}
