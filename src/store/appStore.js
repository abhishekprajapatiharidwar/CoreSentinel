import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Keys that are persisted to localStorage and survive app/system restarts.
// Runtime data (processes, stats, connections) is intentionally excluded.
const PERSISTED_KEYS = [
  'theme', 'compactMode', 'sidebarCollapsed',
  'alertConfig', 'monitoringConfig',
  'appliedRules',       // resource limiter rules by process name
  'startupToggles',     // which startup apps user has disabled
  'processSort',        // last used sort in process manager
];

export const useAppStore = create(
  persist(
    (set, get) => ({

      // ── Theme ───────────────────────────────────────────────────────────────
      theme: 'dark',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set(s => ({ theme: s.theme === 'dark' ? 'light' : 'dark' })),

      // ── System stats (runtime, not persisted) ───────────────────────────────
      systemStats: null,
      systemInfo: null,
      history: [],
      setSystemStats: (stats) => set({ systemStats: stats }),
      setSystemInfo: (info) => set({ systemInfo: info }),

      // ── Processes (runtime) ─────────────────────────────────────────────────
      processes: [],
      selectedProcess: null,
      processSearch: '',
      processSort: { field: 'cpu_usage', dir: 'desc' },
      setProcesses: (processes) => set({ processes }),
      setSelectedProcess: (proc) => set({ selectedProcess: proc }),
      setProcessSearch: (s) => set({ processSearch: s }),
      setProcessSort: (field, dir) => set({ processSort: { field, dir } }),
      // backward compat aliases kept for existing pages
      get processSortField() { return get().processSort.field; },
      get processSortDir()   { return get().processSort.dir; },

      // ── Ports (runtime) ─────────────────────────────────────────────────────
      connections: [],
      portSearch: '',
      setConnections: (connections) => set({ connections }),
      setPortSearch: (s) => set({ portSearch: s }),

      // ── Disks / Networks (runtime) ──────────────────────────────────────────
      disks: [],
      setDisks: (disks) => set({ disks }),
      networks: [],
      setNetworks: (networks) => set({ networks }),

      // ── Services / Startup (runtime) ────────────────────────────────────────
      services: [],
      setServices: (services) => set({ services }),
      startupEntries: [],
      setStartupEntries: (entries) => set({ startupEntries: entries }),

      // ── Startup app toggles (persisted) ─────────────────────────────────────
      startupToggles: {},   // { [name]: boolean }
      setStartupToggle: (name, enabled) =>
        set(s => ({ startupToggles: { ...s.startupToggles, [name]: enabled } })),

      // ── Alerts ──────────────────────────────────────────────────────────────
      alerts: [],
      alertConfig: {
        cpu_threshold: 90,
        ram_threshold: 85,
        disk_threshold: 90,
        enabled: true,
      },
      addAlert: (alert) => set(s => ({
        alerts: [{ ...alert, id: Date.now(), timestamp: new Date().toISOString() }, ...s.alerts].slice(0, 100)
      })),
      clearAlerts: () => set({ alerts: [] }),
      setAlertConfig: (config) => set({ alertConfig: config }),

      // ── Monitoring config (persisted) ───────────────────────────────────────
      monitoringConfig: {
        refreshRate: 1000,      // ms
        historyLength: 300,     // seconds
        enableGpu: false,
        enableTemp: false,
      },
      setMonitoringConfig: (cfg) => set(s => ({ monitoringConfig: { ...s.monitoringConfig, ...cfg } })),

      // ── Resource Limiter rules (persisted by process NAME) ──────────────────
      // Each rule: { processName, cores, priority, cpuThrottle, ramLimitMB, enabled }
      appliedRules: [],
      saveRule: (rule) => set(s => ({
        appliedRules: [
          ...s.appliedRules.filter(r => r.processName !== rule.processName),
          { ...rule, savedAt: new Date().toISOString() },
        ]
      })),
      removeRule: (processName) => set(s => ({
        appliedRules: s.appliedRules.filter(r => r.processName !== processName)
      })),
      toggleRule: (processName, enabled) => set(s => ({
        appliedRules: s.appliedRules.map(r =>
          r.processName === processName ? { ...r, enabled } : r
        )
      })),

      // ── UI state ────────────────────────────────────────────────────────────
      sidebarCollapsed: false,
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
      compactMode: false,
      setCompactMode: (v) => set({ compactMode: v }),
      toggleCompactMode: () => set(s => ({ compactMode: !s.compactMode })),

      // ── Context menu (runtime) ──────────────────────────────────────────────
      contextMenu: null,
      setContextMenu: (menu) => set({ contextMenu: menu }),
      closeContextMenu: () => set({ contextMenu: null }),

      // ── Notification (runtime) ──────────────────────────────────────────────
      notification: null,
      showNotification: (msg, type = 'info') => {
        set({ notification: { msg, type, id: Date.now() } });
        setTimeout(() => set({ notification: null }), 3500);
      },

      // ── Selected affinity process ────────────────────────────────────────────
      selectedAffinityProcess: null,
      setSelectedAffinityProcess: (proc) => set({ selectedAffinityProcess: proc }),
    }),
    {
      name: 'coresentinel-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist settings — never persist runtime data
      partialize: (state) => ({
        theme:            state.theme,
        compactMode:      state.compactMode,
        sidebarCollapsed: state.sidebarCollapsed,
        alertConfig:      state.alertConfig,
        monitoringConfig: state.monitoringConfig,
        appliedRules:     state.appliedRules,
        startupToggles:   state.startupToggles,
        processSort:      state.processSort,
      }),
    }
  )
);
