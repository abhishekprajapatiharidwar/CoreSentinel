export function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatUptime(seconds) {
  if (!seconds) return '0s';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export function formatDuration(seconds) {
  if (!seconds) return '0s';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatTimestamp(unixSeconds) {
  if (!unixSeconds) return 'N/A';
  return new Date(unixSeconds * 1000).toLocaleString();
}

export function cpuColor(pct) {
  if (pct >= 80) return '#ef4444';
  if (pct >= 60) return '#f59e0b';
  if (pct >= 40) return '#3b82f6';
  return '#10b981';
}

export function ramColor(pct) {
  if (pct >= 85) return '#ef4444';
  if (pct >= 70) return '#f59e0b';
  return '#8b5cf6';
}

export function getStatusColor(status) {
  const s = (status || '').toLowerCase();
  if (s === 'run' || s === 'running') return '#10b981';
  if (s === 'sleep' || s === 'sleeping') return '#94a3b8';
  if (s === 'stopped') return '#ef4444';
  if (s === 'zombie') return '#f59e0b';
  return '#94a3b8';
}

export function getPriorityLabel(priority) {
  const labels = {
    4: 'Realtime',
    3: 'High',
    2: 'Above Normal',
    1: 'Normal',
    0: 'Below Normal',
    '-1': 'Idle',
  };
  return labels[priority] ?? 'Normal';
}

export function getConnectionStateColor(state) {
  const colors = {
    'ESTABLISHED': '#10b981',
    'LISTENING': '#3b82f6',
    'TIME_WAIT': '#f59e0b',
    'CLOSE_WAIT': '#ef4444',
    'SYN_SENT': '#8b5cf6',
    'SYN_RECEIVED': '#06b6d4',
    'FIN_WAIT1': '#f59e0b',
    'FIN_WAIT2': '#f59e0b',
    'CLOSED': '#64748b',
  };
  return colors[state] || '#94a3b8';
}
