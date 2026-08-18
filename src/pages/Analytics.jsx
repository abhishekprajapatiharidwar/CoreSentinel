import { useMemo } from 'react';
import { useAppStore } from '../store/appStore';
import { formatBytes } from '../utils/formatters';
import LiveAreaChart from '../components/Charts/LiveAreaChart';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { TrendingUp, Activity, Cpu, MemoryStick } from 'lucide-react';

export default function Analytics() {
  const processes = useAppStore(s => s.processes);
  const history = useAppStore(s => s.history);
  const systemStats = useAppStore(s => s.systemStats);

  const topCpu = useMemo(() =>
    [...processes].sort((a, b) => b.cpu_usage - a.cpu_usage).slice(0, 10),
    [processes]
  );

  const topRam = useMemo(() =>
    [...processes].sort((a, b) => b.ram_usage - a.ram_usage).slice(0, 10),
    [processes]
  );

  const ramDistribution = useMemo(() => {
    const used = systemStats?.ram_used ?? 0;
    const total = systemStats?.ram_total ?? 1;
    return [
      { name: 'Used', value: used, color: '#8b5cf6' },
      { name: 'Free', value: total - used, color: 'rgba(255,255,255,0.08)' },
    ];
  }, [systemStats]);

  const avgCpu = useMemo(() => {
    if (!history.length) return 0;
    return history.reduce((s, h) => s + h.cpu_usage, 0) / history.length;
  }, [history]);

  const peakCpu = useMemo(() => Math.max(...history.map(h => h.cpu_usage), 0), [history]);

  const historySlice = history.slice(-120).map(h => ({
    ...h,
    ram_pct: (systemStats?.ram_total ?? 1) > 0 ? (h.ram_used / (systemStats?.ram_total ?? 1)) * 100 : 0,
  }));

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-3">
        <AnalyticCard label="Avg CPU (session)" value={`${avgCpu.toFixed(1)}%`} color="#3b82f6" icon={<Cpu size={15} />} />
        <AnalyticCard label="Peak CPU (session)" value={`${peakCpu.toFixed(1)}%`} color="#ef4444" icon={<TrendingUp size={15} />} />
        <AnalyticCard label="Processes Tracked" value={processes.length} color="#10b981" icon={<Activity size={15} />} />
        <AnalyticCard label="Total RAM" value={formatBytes(systemStats?.ram_total ?? 0)} color="#8b5cf6" icon={<MemoryStick size={15} />} />
      </div>

      {/* Full history chart */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-2 h-2 rounded-full" style={{ background: '#3b82f6' }} />
          <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>Resource History (last 2 min)</span>
        </div>
        <LiveAreaChart
          data={historySlice}
          series={[
            { key: 'cpu_usage', name: 'CPU %', color: '#3b82f6' },
            { key: 'ram_pct', name: 'RAM %', color: '#8b5cf6' },
          ]}
          height={180}
          yTickFormatter={v => `${v.toFixed(0)}%`}
          formatter={(v) => `${v.toFixed(1)}%`}
          showLegend
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Top CPU consumers */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cpu size={14} color="#3b82f6" />
            <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>Top CPU Consumers</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topCpu} layout="vertical" margin={{ left: 60, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={60} />
              <Tooltip
                contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                formatter={v => [`${v.toFixed(2)}%`, 'CPU']}
              />
              <Bar dataKey="cpu_usage" radius={[0, 3, 3, 0]}>
                {topCpu.map((_, i) => (
                  <Cell key={i} fill={`rgba(59,130,246,${1 - i * 0.08})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top RAM consumers */}
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <MemoryStick size={14} color="#8b5cf6" />
            <span className="text-xs font-semibold" style={{ color: '#e2e8f0' }}>Top Memory Consumers</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={topRam} layout="vertical" margin={{ left: 60, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis type="number" tickFormatter={v => formatBytes(v)} tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} width={60} />
              <Tooltip
                contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                formatter={v => [formatBytes(v), 'Memory']}
              />
              <Bar dataKey="ram_usage" radius={[0, 3, 3, 0]}>
                {topRam.map((_, i) => (
                  <Cell key={i} fill={`rgba(139,92,246,${1 - i * 0.08})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* RAM Pie */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4">
          <span className="text-xs font-semibold mb-3 block" style={{ color: '#e2e8f0' }}>Memory Distribution</span>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={ramDistribution}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                dataKey="value"
                strokeWidth={0}
              >
                {ramDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a1d2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                formatter={v => [formatBytes(v)]}
              />
              <Legend
                wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                formatter={(v) => v}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="col-span-2 glass-card p-4">
          <span className="text-xs font-semibold mb-3 block" style={{ color: '#e2e8f0' }}>Network I/O Timeline</span>
          <LiveAreaChart
            data={historySlice}
            series={[
              { key: 'net_upload', name: 'Upload', color: '#06b6d4' },
              { key: 'net_download', name: 'Download', color: '#3b82f6' },
            ]}
            height={130}
            yTickFormatter={v => formatBytes(v) + '/s'}
            formatter={(v) => formatBytes(v) + '/s'}
            showLegend
          />
        </div>
      </div>
    </div>
  );
}

function AnalyticCard({ label, value, color, icon }) {
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
