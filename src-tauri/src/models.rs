use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemStats {
    pub cpu_usage: f32,
    pub cpu_per_core: Vec<f32>,
    pub cpu_physical_cores: usize,
    pub cpu_logical_cores: usize,
    pub cpu_brand: String,
    pub cpu_frequency: u64,
    pub ram_used: u64,
    pub ram_total: u64,
    pub ram_available: u64,
    pub swap_used: u64,
    pub swap_total: u64,
    pub disk_read_bytes: u64,
    pub disk_write_bytes: u64,
    pub net_upload: u64,
    pub net_download: u64,
    pub process_count: usize,
    pub uptime: u64,
    pub load_avg: [f64; 3],
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub parent_pid: Option<u32>,
    pub name: String,
    pub exe: String,
    pub cmd: Vec<String>,
    pub cpu_usage: f32,
    pub ram_usage: u64,
    pub virtual_memory: u64,
    pub disk_read: u64,
    pub disk_write: u64,
    pub status: String,
    pub start_time: u64,
    pub run_time: u64,
    pub user: String,
    pub thread_count: u32,
    pub priority: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiskInfo {
    pub name: String,
    pub mount_point: String,
    pub total_space: u64,
    pub available_space: u64,
    pub file_system: String,
    pub is_removable: bool,
    pub read_bytes: u64,
    pub write_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetworkInfo {
    pub interface: String,
    pub ip_address: String,
    pub mac_address: String,
    pub upload_bytes: u64,
    pub download_bytes: u64,
    pub upload_speed: u64,
    pub download_speed: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortConnection {
    pub pid: u32,
    pub process_name: String,
    pub protocol: String,
    pub local_addr: String,
    pub local_port: u16,
    pub remote_addr: String,
    pub remote_port: u16,
    pub state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemInfo {
    pub hostname: String,
    pub os_name: String,
    pub os_version: String,
    pub kernel_version: String,
    pub cpu_brand: String,
    pub cpu_cores: usize,
    pub cpu_logical: usize,
    pub total_memory: u64,
    pub boot_time: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AlertConfig {
    pub cpu_threshold: f32,
    pub ram_threshold: f32,
    pub disk_threshold: f32,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessAction {
    pub pid: u32,
    pub action: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CpuAffinityConfig {
    pub pid: u32,
    pub cores: Vec<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoricalSnapshot {
    pub timestamp: u64,
    pub cpu_usage: f32,
    pub ram_used: u64,
    pub net_upload: u64,
    pub net_download: u64,
    pub disk_read: u64,
    pub disk_write: u64,
}
