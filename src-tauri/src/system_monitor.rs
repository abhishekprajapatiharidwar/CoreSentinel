use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use sysinfo::{System, Disks, Networks, ProcessesToUpdate, RefreshKind, CpuRefreshKind, MemoryRefreshKind};
use crate::models::*;

// ─── Cached snapshots updated by background thread ───────────────────────────

#[derive(Default, Clone)]
pub struct CachedData {
    pub stats:     Option<SystemStats>,
    pub processes: Vec<ProcessInfo>,
    pub disks:     Vec<DiskInfo>,
    pub networks:  Vec<NetworkInfo>,
    pub history:   Vec<HistoricalSnapshot>,
}

pub struct SystemMonitor {
    cache:   Arc<RwLock<CachedData>>,
    sysinfo: Arc<RwLock<SystemInfo>>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        // One-time: collect static system info
        let sys_static = {
            let s = System::new_all();
            SystemInfo {
                hostname:       System::host_name().unwrap_or_else(|| "Unknown".into()),
                os_name:        System::name().unwrap_or_else(|| "Unknown".into()),
                os_version:     System::os_version().unwrap_or_else(|| "Unknown".into()),
                kernel_version: System::kernel_version().unwrap_or_else(|| "Unknown".into()),
                cpu_brand:      s.cpus().first().map(|c| c.brand().to_string()).unwrap_or_default(),
                cpu_cores:      s.physical_core_count().unwrap_or(1),
                cpu_logical:    s.cpus().len(),
                total_memory:   s.total_memory(),
                boot_time:      System::boot_time(),
            }
        };

        let cache    = Arc::new(RwLock::new(CachedData::default()));
        let sysinfo  = Arc::new(RwLock::new(sys_static));

        // ── Background refresh thread ─────────────────────────────────────────
        // Refreshes system data on a fixed cadence so the Tauri invoke handlers
        // just do a cheap read-lock instead of a blocking sysinfo refresh.
        let cache_bg = Arc::clone(&cache);
        std::thread::spawn(move || {
            // Use only specific refresh kinds — much cheaper than refresh_all()
            let refresh_kind = RefreshKind::nothing()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything());

            let mut sys      = System::new_with_specifics(refresh_kind);
            let mut disks    = Disks::new_with_refreshed_list();
            let mut networks = Networks::new_with_refreshed_list();

            // Warm up CPU percentages (needs two readings)
            sys.refresh_cpu_all();
            std::thread::sleep(Duration::from_millis(300));
            sys.refresh_cpu_all();
            sys.refresh_memory();

            let mut prev_net_up:   u64 = 0;
            let mut prev_net_down: u64 = 0;
            let mut proc_tick:  Instant = Instant::now();

            loop {
                // ── CPU + Memory (every tick ~1.5 s) ─────────────────────────
                sys.refresh_cpu_all();
                sys.refresh_memory();

                // ── Disk + Network (every tick) ──────────────────────────────
                disks.refresh(true);
                networks.refresh(true);

                let cpu_usage      = sys.global_cpu_usage();
                let cpu_per_core: Vec<f32> = sys.cpus().iter().map(|c| c.cpu_usage()).collect();
                let cpu_physical   = sys.physical_core_count().unwrap_or(1);
                let cpu_logical    = sys.cpus().len();
                let cpu_brand      = sys.cpus().first().map(|c| c.brand().to_string()).unwrap_or_default();
                let cpu_frequency  = sys.cpus().first().map(|c| c.frequency()).unwrap_or(0);

                let ram_used      = sys.used_memory();
                let ram_total     = sys.total_memory();
                let ram_available = sys.available_memory();
                let swap_used     = sys.used_swap();
                let swap_total    = sys.total_swap();

                let mut disk_read:  u64 = 0;
                let mut disk_write: u64 = 0;
                for d in disks.list() {
                    disk_read  += d.usage().read_bytes;
                    disk_write += d.usage().written_bytes;
                }

                let mut net_up:   u64 = 0;
                let mut net_down: u64 = 0;
                for (_, data) in networks.iter() {
                    net_up   += data.transmitted();
                    net_down += data.received();
                }
                let upload_speed   = net_up.saturating_sub(prev_net_up);
                let download_speed = net_down.saturating_sub(prev_net_down);
                prev_net_up   = net_up;
                prev_net_down = net_down;

                let stats = SystemStats {
                    cpu_usage,
                    cpu_per_core,
                    cpu_physical_cores: cpu_physical,
                    cpu_logical_cores: cpu_logical,
                    cpu_brand,
                    cpu_frequency,
                    ram_used,
                    ram_total,
                    ram_available,
                    swap_used,
                    swap_total,
                    disk_read_bytes: disk_read,
                    disk_write_bytes: disk_write,
                    net_upload: upload_speed,
                    net_download: download_speed,
                    process_count: sys.processes().len(),                    uptime: System::uptime(),
                    load_avg: {
                        let la = System::load_average();
                        [la.one, la.five, la.fifteen]
                    },
                };

                let snap = HistoricalSnapshot {
                    timestamp: std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_secs(),
                    cpu_usage,
                    ram_used,
                    net_upload: upload_speed,
                    net_download: download_speed,
                    disk_read,
                    disk_write,
                };

                // ── Process list (every 4 s — much less frequent) ────────────
                let procs_changed = proc_tick.elapsed() >= Duration::from_secs(4);
                let new_procs = if procs_changed {
                    proc_tick = Instant::now();
                    // Only refresh CPU/mem for processes, skip env/paths (false)
                    sys.refresh_processes(ProcessesToUpdate::All, false);
                    let list: Vec<ProcessInfo> = sys.processes().iter().map(|(pid, p)| {
                        ProcessInfo {
                            pid:            pid.as_u32(),
                            parent_pid:     p.parent().map(|pp| pp.as_u32()),
                            name:           p.name().to_string_lossy().into(),
                            exe:            p.exe().map(|e| e.to_string_lossy().into()).unwrap_or_default(),
                            cmd:            p.cmd().iter().map(|s| s.to_string_lossy().into()).collect(),
                            cpu_usage:      p.cpu_usage(),
                            ram_usage:      p.memory(),
                            virtual_memory: p.virtual_memory(),
                            disk_read:      p.disk_usage().read_bytes,
                            disk_write:     p.disk_usage().written_bytes,
                            status:         format!("{:?}", p.status()),
                            start_time:     p.start_time(),
                            run_time:       p.run_time(),
                            user:           p.user_id().map(|u| u.to_string()).unwrap_or_else(|| "System".into()),
                            thread_count:   1,
                            priority:       0,
                        }
                    }).collect();
                    Some(list)
                } else {
                    None
                };

                // Disk info list
                let disk_list: Vec<DiskInfo> = disks.list().iter().map(|d| DiskInfo {
                    name:            d.name().to_string_lossy().into(),
                    mount_point:     d.mount_point().to_string_lossy().into(),
                    total_space:     d.total_space(),
                    available_space: d.available_space(),
                    file_system:     d.file_system().to_string_lossy().into(),
                    is_removable:    d.is_removable(),
                    read_bytes:      d.usage().read_bytes,
                    write_bytes:     d.usage().written_bytes,
                }).collect();

                // Network interface list
                let net_list: Vec<NetworkInfo> = networks.iter().map(|(iface, data)| NetworkInfo {
                    interface:      iface.clone(),
                    ip_address:     String::new(),
                    mac_address:    data.mac_address().to_string(),
                    upload_bytes:   data.transmitted(),
                    download_bytes: data.received(),
                    upload_speed:   data.transmitted(),
                    download_speed: data.received(),
                }).collect();

                // ── Write to cache ───────────────────────────────────────────
                if let Ok(mut c) = cache_bg.write() {
                    c.stats = Some(stats);
                    if let Some(p) = new_procs {
                        c.processes = p;
                    }
                    c.disks    = disk_list;
                    c.networks = net_list;

                    // History (keep last 300 = 7.5 min @ 1.5 s)
                    c.history.push(snap);
                    if c.history.len() > 300 {
                        c.history.remove(0);
                    }
                }

                // ── Sleep: 1.5 s is plenty for a monitoring app ──────────────
                std::thread::sleep(Duration::from_millis(1500));
            }
        });

        SystemMonitor { cache, sysinfo }
    }

    // ── Public read-only accessors (instant — just read the cache) ────────────

    pub fn get_stats(&self) -> SystemStats {
        self.cache.read().unwrap()
            .stats.clone()
            .unwrap_or_else(|| SystemStats {
                cpu_usage: 0.0,
                cpu_per_core: vec![],
                cpu_physical_cores: 0,
                cpu_logical_cores: 0,
                cpu_brand: "Initializing…".into(),
                cpu_frequency: 0,
                ram_used: 0, ram_total: 1, ram_available: 0,
                swap_used: 0, swap_total: 0,
                disk_read_bytes: 0, disk_write_bytes: 0,
                net_upload: 0, net_download: 0,
                process_count: 0,
                uptime: 0,
                load_avg: [0.0, 0.0, 0.0],
            })
    }

    pub fn get_processes(&self) -> Vec<ProcessInfo> {
        self.cache.read().unwrap().processes.clone()
    }

    pub fn get_disks(&self) -> Vec<DiskInfo> {
        self.cache.read().unwrap().disks.clone()
    }

    pub fn get_networks(&self) -> Vec<NetworkInfo> {
        self.cache.read().unwrap().networks.clone()
    }

    pub fn get_history(&self) -> Vec<HistoricalSnapshot> {
        self.cache.read().unwrap().history.clone()
    }

    pub fn get_system_info(&self) -> SystemInfo {
        self.sysinfo.read().unwrap().clone()
    }
}
