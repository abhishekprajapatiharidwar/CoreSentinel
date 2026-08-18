use serde::{Deserialize, Serialize};
use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ServiceInfo {
    pub name: String,
    pub display_name: String,
    pub status: String,
    pub start_type: String,
    pub pid: u32,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StartupEntry {
    pub name: String,
    pub command: String,
    pub location: String,
    pub enabled: bool,
    pub publisher: String,
}

pub fn get_services() -> Vec<ServiceInfo> {
    let mut services = Vec::new();

    #[cfg(windows)]
    {
        // Use PowerShell for complete service info
        let ps_output = Command::new("powershell")
            .args([
                "-NonInteractive",
                "-WindowStyle", "Hidden",
                "-Command",
                "Get-Service | Select-Object Name,DisplayName,Status,StartType | ConvertTo-Csv -NoTypeInformation"
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        if let Ok(out) = ps_output {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines().skip(1) {
                // CSV: "Name","DisplayName","Status","StartType"
                let parts: Vec<&str> = line.split(',').collect();
                if parts.len() >= 4 {
                    let status_raw = parts[2].trim_matches('"');
                    let status = match status_raw {
                        "Running" => "Running",
                        "Stopped" => "Stopped",
                        "Paused"  => "Paused",
                        _         => status_raw,
                    }.to_string();
                    services.push(ServiceInfo {
                        name: parts[0].trim_matches('"').to_string(),
                        display_name: parts[1].trim_matches('"').to_string(),
                        status,
                        start_type: parts[3].trim_matches('"').trim().to_string(),
                        pid: 0,
                        description: String::new(),
                    });
                }
            }
        }

        // Fallback: sc query (no window)
        if services.is_empty() {
            let output = Command::new("sc")
                .args(["query", "type=", "all", "state=", "all", "bufsize=", "50000"])
                .creation_flags(CREATE_NO_WINDOW)
                .output();

            if let Ok(out) = output {
                let text = String::from_utf8_lossy(&out.stdout);
                let mut current = ServiceInfo {
                    name: String::new(), display_name: String::new(),
                    status: String::new(), start_type: String::new(),
                    pid: 0, description: String::new(),
                };
                for line in text.lines() {
                    let line = line.trim();
                    if line.starts_with("SERVICE_NAME:") {
                        if !current.name.is_empty() { services.push(current.clone()); }
                        current = ServiceInfo {
                            name: line.trim_start_matches("SERVICE_NAME:").trim().to_string(),
                            display_name: String::new(),
                            status: String::new(),
                            start_type: String::new(),
                            pid: 0,
                            description: String::new(),
                        };
                    } else if line.starts_with("DISPLAY_NAME:") {
                        current.display_name = line.trim_start_matches("DISPLAY_NAME:").trim().to_string();
                    } else if line.contains("STATE") && line.contains(':') {
                        current.status = if line.contains("RUNNING") { "Running" }
                            else if line.contains("STOPPED") { "Stopped" }
                            else if line.contains("PAUSED") { "Paused" }
                            else { "Unknown" }.to_string();
                    } else if line.starts_with("PID") {
                        if let Some(pid_str) = line.split(':').nth(1) {
                            current.pid = pid_str.trim().parse().unwrap_or(0);
                        }
                    }
                }
                if !current.name.is_empty() { services.push(current); }
            }
        }
    }

    #[cfg(not(windows))]
    {
        let output = Command::new("systemctl")
            .args(["list-units", "--type=service", "--no-pager", "--plain"])
            .output();
        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines().skip(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 4 {
                    services.push(ServiceInfo {
                        name: parts[0].to_string(),
                        display_name: parts[0].to_string(),
                        status: parts[3].to_string(),
                        start_type: String::new(),
                        pid: 0,
                        description: parts[4..].join(" "),
                    });
                }
            }
        }
    }

    services
}

pub fn get_startup_entries() -> Vec<StartupEntry> {
    let mut entries = Vec::new();

    #[cfg(windows)]
    {
        // Output as CSV for reliable parsing; bypass execution policy
        let ps_script = r#"
$locs = @(
    @{Path='HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run'; Label='HKLM\Run'},
    @{Path='HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run'; Label='HKCU\Run'},
    @{Path='HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce'; Label='HKLM\RunOnce'},
    @{Path='HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce'; Label='HKCU\RunOnce'}
)
foreach ($loc in $locs) {
    try {
        $key = Get-Item -Path $loc.Path -ErrorAction Stop
        $key.GetValueNames() | ForEach-Object {
            $n = $_; $v = $key.GetValue($n)
            Write-Output ("ENTRY_START|" + $n + "|" + $v + "|" + $loc.Label)
        }
    } catch {}
}
"#;

        let output = Command::new("powershell")
            .args([
                "-ExecutionPolicy", "Bypass",
                "-NonInteractive",
                "-WindowStyle", "Hidden",
                "-Command", ps_script,
            ])
            .creation_flags(CREATE_NO_WINDOW)
            .output();

        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                let line = line.trim();
                if line.starts_with("ENTRY_START|") {
                    let parts: Vec<&str> = line.splitn(4, '|').collect();
                    if parts.len() == 4 {
                        let name = parts[1].to_string();
                        let command = parts[2].to_string();
                        let location = parts[3].to_string();
                        if !name.is_empty() {
                            let publisher = extract_publisher(&command);
                            entries.push(StartupEntry { name, command, location, enabled: true, publisher });
                        }
                    }
                }
            }
        }
    }

    entries
}

fn extract_publisher(command: &str) -> String {
    let path = command.trim_matches('"').split_whitespace().next().unwrap_or("").to_string();
    if path.ends_with(".exe") {
        if let Some(dir) = std::path::Path::new(&path).parent() {
            return dir.to_string_lossy().to_string();
        }
    }
    "Unknown".to_string()
}

pub fn control_service(name: &str, action: &str) -> Result<String, String> {
    #[cfg(windows)]
    {
        let output = Command::new("sc")
            .args([action, name])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(format!("Service {} {}d successfully", name, action))
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }

    #[cfg(not(windows))]
    {
        let output = Command::new("systemctl")
            .args([action, name])
            .output()
            .map_err(|e| e.to_string())?;
        if output.status.success() {
            Ok(format!("Service {} {}d", name, action))
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}
