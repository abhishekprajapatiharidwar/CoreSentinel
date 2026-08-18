import { useEffect, useRef, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../store/appStore';
import { useShallow } from 'zustand/shallow';

const MOCK_MODE = false; // Using real Tauri backend

function generateMockStats(prev) {
  const prevCpu = prev?.cpu_usage ?? 30;
  const cpuUsage = Math.max(2, Math.min(99, prevCpu + (Math.random() - 0.5) * 15));
  const numCores = 16;
  const cpuPerCore = Array.from({ length: numCores }, (_, i) => {
    const base = cpuUsage * (0.5 + Math.random());
    return Math.max(0, Math.min(100, base));
  });

  const ramTotal = 32 * 1024 * 1024 * 1024;
  const ramUsed = Math.floor(ramTotal * (0.45 + Math.random() * 0.3));
  const netSpeed = Math.floor(Math.random() * 5000000);
  const diskRead = Math.floor(Math.random() * 10000000);
  const diskWrite = Math.floor(Math.random() * 8000000);

  return {
    cpu_usage: parseFloat(cpuUsage.toFixed(1)),
    cpu_per_core: cpuPerCore.map(c => parseFloat(c.toFixed(1))),
    cpu_physical_cores: 8,
    cpu_logical_cores: numCores,
    cpu_brand: "Intel Core i9-13900K",
    cpu_frequency: 5200,
    ram_used: ramUsed,
    ram_total: ramTotal,
    ram_available: ramTotal - ramUsed,
    swap_used: 512 * 1024 * 1024,
    swap_total: 8 * 1024 * 1024 * 1024,
    disk_read_bytes: diskRead,
    disk_write_bytes: diskWrite,
    net_upload: netSpeed,
    net_download: netSpeed * 3,
    process_count: 312 + Math.floor(Math.random() * 20),
    uptime: 3600 * 24 * 3 + Math.floor(Math.random() * 1000),
    load_avg: [2.1, 1.8, 1.5],
  };
}

function generateMockProcesses() {
  const processTemplates = [
    { name: 'chrome.exe', ram: 450, cpu: 5.2, exe: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' },
    { name: 'code.exe', ram: 380, cpu: 2.1, exe: 'C:\\Users\\Abhishek\\AppData\\Local\\Programs\\Microsoft VS Code\\Code.exe' },
    { name: 'node.exe', ram: 120, cpu: 8.5, exe: 'C:\\Program Files\\nodejs\\node.exe' },
    { name: 'Cursor.exe', ram: 550, cpu: 3.8, exe: 'C:\\Users\\Abhishek\\AppData\\Local\\cursor\\Cursor.exe' },
    { name: 'python.exe', ram: 80, cpu: 1.2, exe: 'C:\\Python311\\python.exe' },
    { name: 'explorer.exe', ram: 45, cpu: 0.5, exe: 'C:\\Windows\\explorer.exe' },
    { name: 'svchost.exe', ram: 25, cpu: 0.2, exe: 'C:\\Windows\\System32\\svchost.exe' },
    { name: 'dwm.exe', ram: 60, cpu: 1.8, exe: 'C:\\Windows\\System32\\dwm.exe' },
    { name: 'Teams.exe', ram: 780, cpu: 4.5, exe: 'C:\\Users\\Abhishek\\AppData\\Local\\Microsoft\\Teams\\current\\Teams.exe' },
    { name: 'Discord.exe', ram: 310, cpu: 1.5, exe: 'C:\\Users\\Abhishek\\AppData\\Local\\Discord\\app-1.0.9016\\Discord.exe' },
    { name: 'Spotify.exe', ram: 180, cpu: 0.8, exe: 'C:\\Users\\Abhishek\\AppData\\Roaming\\Spotify\\Spotify.exe' },
    { name: 'WindowsTerminal.exe', ram: 90, cpu: 0.3, exe: 'C:\\Program Files\\WindowsApps\\Microsoft.WindowsTerminal\\wt.exe' },
    { name: 'SearchHost.exe', ram: 55, cpu: 0.4, exe: 'C:\\Windows\\SystemApps\\Microsoft.Windows.Search_cw5n1h2txyewy\\SearchHost.exe' },
    { name: 'RuntimeBroker.exe', ram: 35, cpu: 0.1, exe: 'C:\\Windows\\System32\\RuntimeBroker.exe' },
    { name: 'antimalware.exe', ram: 220, cpu: 2.3, exe: 'C:\\ProgramData\\Microsoft\\Windows Defender\\Platform\\4.18\\MsMpEng.exe' },
    { name: 'OneDrive.exe', ram: 90, cpu: 0.2, exe: 'C:\\Users\\Abhishek\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe' },
    { name: 'taskhostw.exe', ram: 15, cpu: 0.1, exe: 'C:\\Windows\\System32\\taskhostw.exe' },
    { name: 'lsass.exe', ram: 20, cpu: 0.3, exe: 'C:\\Windows\\System32\\lsass.exe' },
    { name: 'cargo.exe', ram: 140, cpu: 35.2, exe: 'C:\\Users\\Abhishek\\.cargo\\bin\\cargo.exe' },
    { name: 'rustc.exe', ram: 480, cpu: 55.8, exe: 'C:\\Users\\Abhishek\\.rustup\\toolchains\\stable-x86_64-pc-windows-msvc\\bin\\rustc.exe' },
  ];

  return processTemplates.map((p, i) => ({
    pid: 1000 + i * 100 + Math.floor(Math.random() * 50),
    parent_pid: i > 0 ? 1000 + (i - 1) * 100 : null,
    name: p.name,
    exe: p.exe,
    cmd: [p.exe, '--type=renderer'],
    cpu_usage: parseFloat((p.cpu + (Math.random() - 0.5) * 2).toFixed(2)),
    ram_usage: (p.ram + Math.floor(Math.random() * 50)) * 1024 * 1024,
    virtual_memory: (p.ram * 4) * 1024 * 1024,
    disk_read: Math.floor(Math.random() * 1000000),
    disk_write: Math.floor(Math.random() * 500000),
    status: Math.random() > 0.05 ? 'Run' : 'Sleep',
    start_time: Math.floor(Date.now() / 1000) - Math.floor(Math.random() * 86400),
    run_time: Math.floor(Math.random() * 86400),
    user: i < 5 ? 'Abhishek' : (i < 15 ? 'SYSTEM' : 'LOCAL SERVICE'),
    thread_count: Math.floor(Math.random() * 50) + 1,
    priority: 8,
  }));
}

function generateMockConnections() {
  const templates = [
    { process: 'chrome.exe', pid: 1100, local_port: 49512, remote_addr: '142.250.182.46', remote_port: 443, state: 'ESTABLISHED' },
    { process: 'node.exe', pid: 1300, local_port: 3000, remote_addr: '0.0.0.0', remote_port: 0, state: 'LISTENING' },
    { process: 'node.exe', pid: 1300, local_port: 1420, remote_addr: '0.0.0.0', remote_port: 0, state: 'LISTENING' },
    { process: 'Teams.exe', pid: 1800, local_port: 50000, remote_addr: '52.114.128.10', remote_port: 443, state: 'ESTABLISHED' },
    { process: 'svchost.exe', pid: 1600, local_port: 135, remote_addr: '0.0.0.0', remote_port: 0, state: 'LISTENING' },
    { process: 'Discord.exe', pid: 1900, local_port: 443, remote_addr: '162.159.136.234', remote_port: 443, state: 'ESTABLISHED' },
    { process: 'python.exe', pid: 1500, local_port: 8080, remote_addr: '0.0.0.0', remote_port: 0, state: 'LISTENING' },
    { process: 'Spotify.exe', pid: 2000, local_port: 57621, remote_addr: '35.186.224.25', remote_port: 443, state: 'ESTABLISHED' },
    { process: 'lsass.exe', pid: 1700, local_port: 389, remote_addr: '0.0.0.0', remote_port: 0, state: 'LISTENING' },
    { process: 'cargo.exe', pid: 1850, local_port: 8443, remote_addr: '0.0.0.0', remote_port: 0, state: 'TIME_WAIT' },
  ];

  return templates.map((t, i) => ({
    pid: t.pid,
    process_name: t.process,
    protocol: 'TCP',
    local_addr: '127.0.0.1',
    local_port: t.local_port,
    remote_addr: t.remote_addr,
    remote_port: t.remote_port,
    state: t.state,
  }));
}

function generateMockDisks() {
  return [
    { name: 'C:', mount_point: 'C:\\', total_space: 500 * 1024 * 1024 * 1024, available_space: 180 * 1024 * 1024 * 1024, file_system: 'NTFS', is_removable: false, read_bytes: 1500000, write_bytes: 800000 },
    { name: 'D:', mount_point: 'D:\\', total_space: 2000 * 1024 * 1024 * 1024, available_space: 750 * 1024 * 1024 * 1024, file_system: 'NTFS', is_removable: false, read_bytes: 500000, write_bytes: 200000 },
  ];
}

function generateMockNetworks() {
  return [
    { interface: 'Ethernet', ip_address: '192.168.1.100', mac_address: 'A1:B2:C3:D4:E5:F6', upload_bytes: 1234567, download_bytes: 9876543, upload_speed: 125000, download_speed: 450000 },
    { interface: 'Wi-Fi', ip_address: '192.168.1.101', mac_address: 'F6:E5:D4:C3:B2:A1', upload_bytes: 456789, download_bytes: 2345678, upload_speed: 50000, download_speed: 150000 },
  ];
}

function generateMockServices() {
  const services = [
    { name: 'wuauserv', display_name: 'Windows Update', status: 'Running', start_type: 'Manual', pid: 2345 },
    { name: 'Spooler', display_name: 'Print Spooler', status: 'Running', start_type: 'Automatic', pid: 3456 },
    { name: 'WinDefend', display_name: 'Windows Defender Antivirus Service', status: 'Running', start_type: 'Automatic', pid: 4567 },
    { name: 'BITS', display_name: 'Background Intelligent Transfer Service', status: 'Stopped', start_type: 'Manual', pid: 0 },
    { name: 'MSSQLSERVER', display_name: 'SQL Server (MSSQLSERVER)', status: 'Stopped', start_type: 'Disabled', pid: 0 },
    { name: 'Dhcp', display_name: 'DHCP Client', status: 'Running', start_type: 'Automatic', pid: 5678 },
    { name: 'Dnscache', display_name: 'DNS Client', status: 'Running', start_type: 'Automatic', pid: 6789 },
    { name: 'EventLog', display_name: 'Windows Event Log', status: 'Running', start_type: 'Automatic', pid: 7890 },
    { name: 'LanmanServer', display_name: 'Server', status: 'Running', start_type: 'Automatic', pid: 8901 },
    { name: 'RpcSs', display_name: 'Remote Procedure Call (RPC)', status: 'Running', start_type: 'Automatic', pid: 9012 },
  ];
  return services.map(s => ({ ...s, description: '' }));
}

function generateMockStartup() {
  return [
    { name: 'Discord', command: '"C:\\Users\\Abhishek\\AppData\\Local\\Discord\\Update.exe" --processStart Discord.exe', location: 'HKCU:\\Run', enabled: true, publisher: 'Discord Inc.' },
    { name: 'Spotify', command: '"C:\\Users\\Abhishek\\AppData\\Roaming\\Spotify\\Spotify.exe" /uri spotify:autostart', location: 'HKCU:\\Run', enabled: true, publisher: 'Spotify AB' },
    { name: 'OneDrive', command: '"C:\\Users\\Abhishek\\AppData\\Local\\Microsoft\\OneDrive\\OneDrive.exe" /background', location: 'HKCU:\\Run', enabled: true, publisher: 'Microsoft Corporation' },
    { name: 'Teams', command: '"C:\\Users\\Abhishek\\AppData\\Local\\Microsoft\\Teams\\Update.exe" --processStart Teams.exe', location: 'HKCU:\\Run', enabled: false, publisher: 'Microsoft Corporation' },
    { name: 'Steam', command: '"C:\\Program Files (x86)\\Steam\\steam.exe" -silent', location: 'HKLM:\\Run', enabled: true, publisher: 'Valve Corporation' },
  ];
}

function generateMockSystemInfo() {
  return {
    hostname: 'ABHISHEK-PC',
    os_name: 'Windows',
    os_version: '11 Pro 24H2',
    kernel_version: '10.0.26100',
    cpu_brand: 'Intel(R) Core(TM) i9-13900K @ 5.20GHz',
    cpu_cores: 8,
    cpu_logical: 16,
    total_memory: 32 * 1024 * 1024 * 1024,
    boot_time: Math.floor(Date.now() / 1000) - 3600 * 24 * 3,
  };
}

export function useSystemData() {
  const {
    setSystemStats, setProcesses, setConnections,
    setDisks, setNetworks, setServices, setStartupEntries,
    setSystemInfo, addAlert,
  } = useAppStore(useShallow(s => ({
    setSystemStats: s.setSystemStats,
    setProcesses: s.setProcesses,
    setConnections: s.setConnections,
    setDisks: s.setDisks,
    setNetworks: s.setNetworks,
    setServices: s.setServices,
    setStartupEntries: s.setStartupEntries,
    setSystemInfo: s.setSystemInfo,
    addAlert: s.addAlert,
  })));

  // Use refs for alertConfig to avoid re-creating fetchData on every alert config change
  const alertConfigRef = useRef(useAppStore.getState().alertConfig);
  useEffect(() => {
    return useAppStore.subscribe(s => {
      alertConfigRef.current = s.alertConfig;
    });
  }, []);

  const prevStatsRef = useRef(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      if (MOCK_MODE) {
        const stats = generateMockStats(prevStatsRef.current);
        prevStatsRef.current = stats;
        setSystemStats(stats);

        // Check alerts using ref to avoid dependency loop
        const ac = alertConfigRef.current;
        if (ac.enabled) {
          if (stats.cpu_usage > ac.cpu_threshold) {
            addAlert({ type: 'warning', category: 'CPU', message: `CPU usage critical: ${stats.cpu_usage.toFixed(1)}%` });
          }
          const ramPct = (stats.ram_used / stats.ram_total) * 100;
          if (ramPct > ac.ram_threshold) {
            addAlert({ type: 'warning', category: 'RAM', message: `RAM usage high: ${ramPct.toFixed(1)}%` });
          }
        }

        // Update history
        const snap = {
          timestamp: Math.floor(Date.now() / 1000),
          cpu_usage: stats.cpu_usage,
          ram_used: stats.ram_used,
          net_upload: stats.net_upload,
          net_download: stats.net_download,
          disk_read: stats.disk_read_bytes,
          disk_write: stats.disk_write_bytes,
        };
        useAppStore.setState(s => ({
          history: [...s.history.slice(-299), snap]
        }));
      } else {
        const stats = await invoke('get_system_stats');
        setSystemStats(stats);

        // Check alerts
        const ac = alertConfigRef.current;
        if (ac.enabled) {
          if (stats.cpu_usage > ac.cpu_threshold) {
            addAlert({ type: 'warning', category: 'CPU', message: `CPU usage critical: ${stats.cpu_usage.toFixed(1)}%` });
          }
          const ramPct = (stats.ram_used / stats.ram_total) * 100;
          if (ramPct > ac.ram_threshold) {
            addAlert({ type: 'warning', category: 'RAM', message: `RAM usage high: ${ramPct.toFixed(1)}%` });
          }
        }

        // Update history
        const snap = {
          timestamp: Math.floor(Date.now() / 1000),
          cpu_usage: stats.cpu_usage,
          ram_used: stats.ram_used,
          net_upload: stats.net_upload,
          net_download: stats.net_download,
          disk_read: stats.disk_read_bytes,
          disk_write: stats.disk_write_bytes,
        };
        useAppStore.setState(s => ({
          history: [...s.history.slice(-299), snap]
        }));
      }
    } catch (err) {
      console.error('Failed to fetch system stats:', err);
    }
  }, [addAlert, setSystemStats]);

  const fetchProcesses = useCallback(async () => {
    try {
      if (MOCK_MODE) {
        setProcesses(generateMockProcesses());
      } else {
        const procs = await invoke('get_processes');
        setProcesses(procs);
      }
    } catch (err) {
      console.error('Failed to fetch processes:', err);
    }
  }, [setProcesses]);

  // Re-apply saved resource limiter rules after first process load
  const rulesAppliedRef = useRef(false);
  const reapplySavedRules = useCallback(async (procs) => {
    if (rulesAppliedRef.current) return;
    const { appliedRules } = useAppStore.getState();
    const enabledRules = appliedRules.filter(r => r.enabled !== false);
    if (enabledRules.length === 0) return;

    rulesAppliedRef.current = true;
    let reapplied = 0;

    for (const rule of enabledRules) {
      // Find all running processes matching this rule's process name
      const matches = procs.filter(p =>
        p.name.toLowerCase() === rule.processName.toLowerCase()
      );
      for (const proc of matches) {
        try {
          if (rule.cores?.length > 0) {
            await invoke('set_cpu_affinity', { pid: proc.pid, cores: rule.cores });
          }
          if (rule.priority != null) {
            await invoke('set_process_priority', { pid: proc.pid, priority: rule.priority });
          }
          if (rule.cpuThrottle != null && rule.cpuThrottle < 100) {
            await invoke('throttle_process_cpu', { pid: proc.pid, percent: rule.cpuThrottle });
          }
          if (rule.ramLimitMB != null && rule.ramLimitMB > 0) {
            await invoke('set_memory_limit', { pid: proc.pid, maxBytes: rule.ramLimitMB * 1024 * 1024 });
          }
          reapplied++;
        } catch (e) {
          console.warn(`Failed to reapply rule for ${rule.processName}:`, e);
        }
      }
    }
    if (reapplied > 0) {
      useAppStore.getState().showNotification(
        `✓ Restored ${reapplied} resource limit${reapplied > 1 ? 's' : ''} from saved rules`,
        'success'
      );
    }
  }, []);

  const fetchConnections = useCallback(async () => {
    try {
      if (MOCK_MODE) {
        setConnections(generateMockConnections());
      } else {
        const conns = await invoke('get_connections');
        setConnections(conns);
      }
    } catch (err) {
      console.error('Failed to fetch connections:', err);
    }
  }, [setConnections]);

  useEffect(() => {
    // Initial data load
    if (MOCK_MODE) {
      setSystemInfo(generateMockSystemInfo());
      setDisks(generateMockDisks());
      setNetworks(generateMockNetworks());
      setServices(generateMockServices());
      setStartupEntries(generateMockStartup());
    } else {
      invoke('get_system_info').then(setSystemInfo).catch(console.error);
      invoke('get_disks').then(setDisks).catch(console.error);
      invoke('get_networks').then(setNetworks).catch(console.error);
      invoke('get_services').then(setServices).catch(console.error);
      invoke('get_startup_entries').then(setStartupEntries).catch(console.error);
    }

    fetchData();
    // Load processes then immediately try to re-apply saved rules
    const initProcesses = async () => {
      try {
        const procs = MOCK_MODE ? generateMockProcesses() : await invoke('get_processes');
        setProcesses(procs);
        // Re-apply after a short delay to let backend stabilize
        setTimeout(() => reapplySavedRules(procs), 1500);
      } catch (e) {
        console.error('Failed to fetch processes:', e);
      }
    };
    initProcesses();
    fetchConnections();

    // ── Polling intervals — tuned for low CPU overhead ───────────────────────
    // Stats: every 2 s  (backend caches at 1.5 s — reads are instant)
    // Processes: every 5 s  (backend refreshes processes every 4 s)
    // Connections: every 15 s  (netstat is expensive)
    // Disks/networks: every 10 s
    // All timers pause automatically when the window is hidden (tray/minimized)

    const isPaused = () => document.hidden;

    const statsInterval = setInterval(() => {
      if (!isPaused()) fetchData();
    }, 2000);

    const processInterval = setInterval(() => {
      if (!isPaused()) fetchProcesses();
    }, 5000);

    const connInterval = setInterval(() => {
      if (!isPaused()) fetchConnections();
    }, 15000);

    const slowInterval = !MOCK_MODE ? setInterval(() => {
      if (!isPaused()) {
        invoke('get_disks').then(setDisks).catch(() => {});
        invoke('get_networks').then(setNetworks).catch(() => {});
      }
    }, 10000) : null;

    return () => {
      clearInterval(statsInterval);
      clearInterval(processInterval);
      clearInterval(connInterval);
      if (slowInterval) clearInterval(slowInterval);
    };
  }, [fetchData, fetchProcesses, fetchConnections, setDisks, setNetworks, reapplySavedRules]);
}
