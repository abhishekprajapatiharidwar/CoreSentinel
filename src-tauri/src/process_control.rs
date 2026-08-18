use std::process::Command;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

pub fn kill_process(pid: u32) -> Result<String, String> {
    #[cfg(windows)]
    {
        let output = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(format!("Process {} killed", pid))
        } else {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            let out = String::from_utf8_lossy(&output.stdout).to_string();
            Err(if err.is_empty() { out } else { err })
        }
    }

    #[cfg(not(windows))]
    {
        let output = Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(format!("Process {} killed", pid))
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}

pub fn kill_process_tree(pid: u32) -> Result<String, String> {
    #[cfg(windows)]
    {
        let output = Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F", "/T"])
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(format!("Process tree {} killed", pid))
        } else {
            let err = String::from_utf8_lossy(&output.stderr).to_string();
            let out = String::from_utf8_lossy(&output.stdout).to_string();
            Err(if err.is_empty() { out } else { err })
        }
    }

    #[cfg(not(windows))]
    {
        // Kill process group on Linux
        let output = Command::new("kill")
            .args(["-9", "-", &pid.to_string()])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(format!("Process tree {} killed", pid))
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}

pub fn suspend_process(pid: u32) -> Result<String, String> {
    #[cfg(windows)]
    {
        use windows::Win32::System::Threading::SuspendThread;
        use windows::Win32::System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Thread32First, Thread32Next, THREADENTRY32, TH32CS_SNAPTHREAD,
        };

        unsafe {
            let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0)
                .map_err(|e| e.to_string())?;

            let mut thread_entry = THREADENTRY32 {
                dwSize: std::mem::size_of::<THREADENTRY32>() as u32,
                ..Default::default()
            };

            if Thread32First(snapshot, &mut thread_entry).is_ok() {
                loop {
                    if thread_entry.th32OwnerProcessID == pid {
                        if let Ok(thread_handle) = windows::Win32::System::Threading::OpenThread(
                            windows::Win32::System::Threading::THREAD_SUSPEND_RESUME,
                            false,
                            thread_entry.th32ThreadID,
                        ) {
                            SuspendThread(thread_handle);
                        }
                    }

                    if Thread32Next(snapshot, &mut thread_entry).is_err() {
                        break;
                    }
                }
            }
        }
        Ok(format!("Process {} suspended", pid))
    }

    #[cfg(not(windows))]
    {
        let output = Command::new("kill")
            .args(["-STOP", &pid.to_string()])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(format!("Process {} suspended", pid))
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}

pub fn resume_process(pid: u32) -> Result<String, String> {
    #[cfg(windows)]
    {
        use windows::Win32::System::Diagnostics::ToolHelp::{
            CreateToolhelp32Snapshot, Thread32First, Thread32Next, THREADENTRY32, TH32CS_SNAPTHREAD,
        };

        unsafe {
            let snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPTHREAD, 0)
                .map_err(|e| e.to_string())?;

            let mut thread_entry = THREADENTRY32 {
                dwSize: std::mem::size_of::<THREADENTRY32>() as u32,
                ..Default::default()
            };

            if Thread32First(snapshot, &mut thread_entry).is_ok() {
                loop {
                    if thread_entry.th32OwnerProcessID == pid {
                        if let Ok(thread_handle) = windows::Win32::System::Threading::OpenThread(
                            windows::Win32::System::Threading::THREAD_SUSPEND_RESUME,
                            false,
                            thread_entry.th32ThreadID,
                        ) {
                            windows::Win32::System::Threading::ResumeThread(thread_handle);
                        }
                    }

                    if Thread32Next(snapshot, &mut thread_entry).is_err() {
                        break;
                    }
                }
            }
        }
        Ok(format!("Process {} resumed", pid))
    }

    #[cfg(not(windows))]
    {
        let output = Command::new("kill")
            .args(["-CONT", &pid.to_string()])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(format!("Process {} resumed", pid))
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}

pub fn set_process_priority(pid: u32, priority: i32) -> Result<String, String> {
    #[cfg(windows)]
    {
        use windows::Win32::System::Threading::{
            OpenProcess, SetPriorityClass, PROCESS_SET_INFORMATION,
            ABOVE_NORMAL_PRIORITY_CLASS, BELOW_NORMAL_PRIORITY_CLASS,
            HIGH_PRIORITY_CLASS, IDLE_PRIORITY_CLASS, NORMAL_PRIORITY_CLASS,
            REALTIME_PRIORITY_CLASS,
        };

        let priority_class = match priority {
            4 => REALTIME_PRIORITY_CLASS,
            3 => HIGH_PRIORITY_CLASS,
            2 => ABOVE_NORMAL_PRIORITY_CLASS,
            1 => NORMAL_PRIORITY_CLASS,
            0 => BELOW_NORMAL_PRIORITY_CLASS,
            _ => IDLE_PRIORITY_CLASS,
        };

        unsafe {
            let handle = OpenProcess(PROCESS_SET_INFORMATION, false, pid)
                .map_err(|e| e.to_string())?;
            SetPriorityClass(handle, priority_class)
                .map_err(|e| e.to_string())?;
        }
        Ok(format!("Priority set for process {}", pid))
    }

    #[cfg(not(windows))]
    {
        let nice_val = match priority {
            4 => -20,
            3 => -10,
            2 => -5,
            1 => 0,
            0 => 10,
            _ => 19,
        };

        let output = Command::new("renice")
            .args(["-n", &nice_val.to_string(), "-p", &pid.to_string()])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(format!("Priority set for process {}", pid))
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}

pub fn set_cpu_affinity(pid: u32, cores: Vec<usize>) -> Result<String, String> {
    #[cfg(windows)]
    {
        use windows::Win32::System::Threading::{
            OpenProcess, SetProcessAffinityMask, PROCESS_SET_INFORMATION, PROCESS_QUERY_INFORMATION,
        };

        let mut affinity_mask: usize = 0;
        for core in &cores {
            if *core < 64 {
                affinity_mask |= 1usize << core;
            }
        }

        unsafe {
            let handle = OpenProcess(
                PROCESS_SET_INFORMATION | PROCESS_QUERY_INFORMATION,
                false,
                pid,
            )
            .map_err(|e| e.to_string())?;

            SetProcessAffinityMask(handle, affinity_mask)
                .map_err(|e| e.to_string())?;
        }

        Ok(format!("CPU affinity set for process {} to cores {:?}", pid, cores))
    }

    #[cfg(not(windows))]
    {
        let cores_str: Vec<String> = cores.iter().map(|c| c.to_string()).collect();
        let output = Command::new("taskset")
            .args(["-cp", &cores_str.join(","), &pid.to_string()])
            .output()
            .map_err(|e| e.to_string())?;

        if output.status.success() {
            Ok(format!("CPU affinity set for process {}", pid))
        } else {
            Err(String::from_utf8_lossy(&output.stderr).to_string())
        }
    }
}

pub fn get_process_affinity(pid: u32) -> Result<Vec<usize>, String> {
    #[cfg(windows)]
    {
        use windows::Win32::System::Threading::{
            OpenProcess, GetProcessAffinityMask, PROCESS_QUERY_INFORMATION,
        };

        let mut process_mask: usize = 0;
        let mut system_mask: usize = 0;

        unsafe {
            let handle = OpenProcess(PROCESS_QUERY_INFORMATION, false, pid)
                .map_err(|e| e.to_string())?;

            GetProcessAffinityMask(handle, &mut process_mask, &mut system_mask)
                .map_err(|e| e.to_string())?;
        }

        let mut cores = Vec::new();
        for i in 0..64usize {
            if process_mask & (1usize << i) != 0 {
                cores.push(i);
            }
        }

        Ok(cores)
    }

    #[cfg(not(windows))]
    {
        let output = Command::new("taskset")
            .args(["-cp", &pid.to_string()])
            .output()
            .map_err(|e| e.to_string())?;

        let text = String::from_utf8_lossy(&output.stdout);
        // Parse "current affinity list: 0,1,2,3"
        if let Some(colon_pos) = text.rfind(": ") {
            let cores_str = &text[colon_pos + 2..].trim();
            let mut cores = Vec::new();
            for part in cores_str.split(',') {
                if let Some(dash_pos) = part.find('-') {
                    let start: usize = part[..dash_pos].trim().parse().unwrap_or(0);
                    let end: usize = part[dash_pos + 1..].trim().parse().unwrap_or(0);
                    for c in start..=end {
                        cores.push(c);
                    }
                } else if let Ok(c) = part.trim().parse() {
                    cores.push(c);
                }
            }
            return Ok(cores);
        }

        Ok(vec![])
    }
}

// ── CPU throttle via Windows Job Object ──────────────────────────────────────

/// `percent` 0 = suspend, 1-100 = CPU rate cap via Job Object.
pub fn throttle_process_cpu(pid: u32, percent: u32) -> Result<String, String> {
    if percent == 0 {
        return suspend_process(pid);
    }
    if percent >= 100 {
        // Resume if it was suspended, remove throttle
        let _ = resume_process(pid);
        return Ok(format!("CPU throttle removed for process {}", pid));
    }

    #[cfg(windows)]
    {
        use windows::Win32::System::JobObjects::{
            CreateJobObjectW, AssignProcessToJobObject, SetInformationJobObject,
            JOBOBJECT_CPU_RATE_CONTROL_INFORMATION, JobObjectCpuRateControlInformation,
            JOB_OBJECT_CPU_RATE_CONTROL_ENABLE, JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP,
            JOBOBJECT_CPU_RATE_CONTROL_INFORMATION_0,
        };
        use windows::Win32::System::Threading::{OpenProcess, PROCESS_ALL_ACCESS};

        unsafe {
            let proc_handle = OpenProcess(PROCESS_ALL_ACCESS, false, pid)
                .map_err(|e| e.to_string())?;
            let job = CreateJobObjectW(None, None)
                .map_err(|e| e.to_string())?;
            AssignProcessToJobObject(job, proc_handle)
                .map_err(|e| e.to_string())?;

            // CpuRate is in units of 1/10000 of a percent (so 5000 = 50%)
            let cpu_rate = (percent as u32).min(100) * 100;
            let rate_info = JOBOBJECT_CPU_RATE_CONTROL_INFORMATION {
                ControlFlags: JOB_OBJECT_CPU_RATE_CONTROL_ENABLE | JOB_OBJECT_CPU_RATE_CONTROL_HARD_CAP,
                Anonymous: JOBOBJECT_CPU_RATE_CONTROL_INFORMATION_0 { CpuRate: cpu_rate },
            };
            SetInformationJobObject(
                job,
                JobObjectCpuRateControlInformation,
                &rate_info as *const _ as *const _,
                std::mem::size_of::<JOBOBJECT_CPU_RATE_CONTROL_INFORMATION>() as u32,
            ).map_err(|e| e.to_string())?;
        }
        Ok(format!("CPU throttled to {}% for process {}", percent, pid))
    }

    #[cfg(not(windows))]
    {
        // Use cpulimit on Linux if available
        let output = Command::new("cpulimit")
            .args(["-p", &pid.to_string(), "-l", &percent.to_string(), "-b"])
            .output()
            .map_err(|e| e.to_string())?;
        if output.status.success() {
            Ok(format!("CPU limited to {}% for {}", percent, pid))
        } else {
            Err("cpulimit not available".to_string())
        }
    }
}

// ── Free process working set (trim RAM) ──────────────────────────────────────

pub fn free_process_memory(pid: u32) -> Result<String, String> {
    #[cfg(windows)]
    {
        use windows::Win32::System::ProcessStatus::K32EmptyWorkingSet;
        use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_INFORMATION, PROCESS_VM_WRITE};

        unsafe {
            let handle = OpenProcess(
                PROCESS_QUERY_INFORMATION | PROCESS_VM_WRITE,
                false,
                pid,
            ).map_err(|e| e.to_string())?;
            if K32EmptyWorkingSet(handle).as_bool() == false {
                return Err("Failed to empty working set".to_string());
            }
        }
        Ok(format!("Working set cleared for process {}", pid))
    }

    #[cfg(not(windows))]
    {
        Ok(format!("Memory trim not supported on this platform"))
    }
}

// ── Set soft RAM working-set limit ────────────────────────────────────────────

/// Sets a soft cap on the process working set via Job Object memory limit.
pub fn set_memory_limit(pid: u32, max_bytes: usize) -> Result<String, String> {
    #[cfg(windows)]
    {
        use windows::Win32::System::JobObjects::{
            CreateJobObjectW, AssignProcessToJobObject, SetInformationJobObject,
            JOBOBJECT_EXTENDED_LIMIT_INFORMATION, JobObjectExtendedLimitInformation,
            JOB_OBJECT_LIMIT_PROCESS_MEMORY,
        };
        use windows::Win32::System::Threading::{OpenProcess, PROCESS_ALL_ACCESS};

        unsafe {
            let proc_handle = OpenProcess(PROCESS_ALL_ACCESS, false, pid)
                .map_err(|e| e.to_string())?;
            let job = CreateJobObjectW(None, None)
                .map_err(|e| e.to_string())?;
            AssignProcessToJobObject(job, proc_handle)
                .map_err(|e| e.to_string())?;

            let mut ext_info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
            ext_info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_PROCESS_MEMORY;
            ext_info.ProcessMemoryLimit = max_bytes;

            SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                &ext_info as *const _ as *const _,
                std::mem::size_of::<JOBOBJECT_EXTENDED_LIMIT_INFORMATION>() as u32,
            ).map_err(|e| e.to_string())?;
        }
        Ok(format!("Memory limit set to {} bytes for process {}", max_bytes, pid))
    }

    #[cfg(not(windows))]
    {
        Ok("Memory limits not supported on this platform".to_string())
    }
}
