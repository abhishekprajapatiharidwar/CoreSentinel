use crate::models::PortConnection;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(windows)]
pub fn get_connections() -> Vec<PortConnection> {
    use std::os::windows::process::CommandExt;
    use std::process::Command;

    let mut connections = Vec::new();

    let output = Command::new("netstat")
        .args(["-ano"])
        .creation_flags(CREATE_NO_WINDOW)
        .output();

    match output {
        Ok(out) => {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines().skip(4) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 4 {
                    let protocol = parts[0].to_uppercase();
                    if protocol == "TCP" || protocol == "UDP" {
                        let local = parts[1];
                        let remote = if protocol == "TCP" && parts.len() >= 3 {
                            parts[2]
                        } else {
                            "*:*"
                        };
                        let state = if protocol == "TCP" && parts.len() >= 4 {
                            parts[3].to_string()
                        } else {
                            "N/A".to_string()
                        };
                        let pid_str = if protocol == "TCP" && parts.len() >= 5 {
                            parts[4]
                        } else if protocol == "UDP" && parts.len() >= 4 {
                            parts[3]
                        } else {
                            "0"
                        };

                        let pid: u32 = pid_str.parse().unwrap_or(0);
                        let (local_addr, local_port) = parse_addr(local);
                        let (remote_addr, remote_port) = parse_addr(remote);

                        connections.push(PortConnection {
                            pid,
                            process_name: String::new(), // filled below
                            protocol,
                            local_addr,
                            local_port,
                            remote_addr,
                            remote_port,
                            state,
                        });
                    }
                }
            }
        }
        Err(_) => {}
    }

    // Fill process names in one shot using sysinfo (no extra CMD windows)
    fill_process_names_sysinfo(&mut connections);
    connections
}

#[cfg(not(windows))]
pub fn get_connections() -> Vec<PortConnection> {
    use std::process::Command;

    let mut connections = Vec::new();

    let output = Command::new("ss")
        .args(["-tunap"])
        .output();

    match output {
        Ok(out) => {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines().skip(1) {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 5 {
                    let protocol = parts[0].to_uppercase();
                    let local = parts[4];
                    let remote = if parts.len() > 5 { parts[5] } else { "*:*" };
                    let state = parts[1].to_string();
                    let pid = extract_pid_from_ss(parts.get(6).unwrap_or(&""));
                    let (local_addr, local_port) = parse_addr(local);
                    let (remote_addr, remote_port) = parse_addr(remote);
                    connections.push(PortConnection {
                        pid,
                        process_name: format!("PID {}", pid),
                        protocol,
                        local_addr,
                        local_port,
                        remote_addr,
                        remote_port,
                        state,
                    });
                }
            }
        }
        Err(_) => {}
    }

    connections
}

// Use sysinfo to resolve PID→name in bulk (no CMD windows)
fn fill_process_names_sysinfo(connections: &mut Vec<PortConnection>) {
    use sysinfo::{System, ProcessesToUpdate};

    let mut sys = System::new();
    sys.refresh_processes(ProcessesToUpdate::All, false);

    for conn in connections.iter_mut() {
        if conn.pid == 0 {
            conn.process_name = "System".to_string();
        } else if let Some(proc) = sys.process(sysinfo::Pid::from_u32(conn.pid)) {
            conn.process_name = proc.name().to_string_lossy().to_string();
        } else {
            conn.process_name = format!("PID {}", conn.pid);
        }
    }
}

fn parse_addr(addr: &str) -> (String, u16) {
    if addr.starts_with('[') {
        if let Some(bracket_end) = addr.rfind(']') {
            let ip = addr[1..bracket_end].to_string();
            let port_str = &addr[bracket_end + 2..];
            let port = port_str.parse().unwrap_or(0);
            return (ip, port);
        }
    }
    if let Some(colon_pos) = addr.rfind(':') {
        let ip = addr[..colon_pos].to_string();
        let port_str = &addr[colon_pos + 1..];
        let port = port_str.parse().unwrap_or(0);
        (ip, port)
    } else {
        (addr.to_string(), 0)
    }
}

#[cfg(not(windows))]
fn extract_pid_from_ss(s: &str) -> u32 {
    if let Some(start) = s.find("pid=") {
        let rest = &s[start + 4..];
        if let Some(end) = rest.find(',').or_else(|| rest.find(')')) {
            return rest[..end].parse().unwrap_or(0);
        }
    }
    0
}
