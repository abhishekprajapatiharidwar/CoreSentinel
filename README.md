<div align="center">



# CoreSentinel

### Advanced Windows System Monitor & Process Manager

A next-generation, open-source alternative to Windows Task Manager — built for developers, power users, and system administrators.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Built with Tauri](https://img.shields.io/badge/Built%20with-Tauri%202-24C8D8?logo=tauri)](https://tauri.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Rust](https://img.shields.io/badge/Rust-1.77+-orange?logo=rust)](https://www.rust-lang.org)
[![Windows](https://img.shields.io/badge/Platform-Windows%2010%2F11-0078D4?logo=windows)](https://www.microsoft.com/windows)

</div>

---

## What is CoreSentinel?

CoreSentinel is a **desktop application** for Windows that gives you deep, real-time visibility into your system — far beyond what Task Manager offers. It is built with **Tauri (Rust)** for a lean native backend and **React + Tailwind CSS** for a beautiful, modern UI.

Designed for:
- Developers debugging resource-heavy apps
- Server admins monitoring background services
- Power users who want full control over their system
- Anyone who finds Task Manager too limited

---

## Features

### Dashboard
- Real-time CPU, RAM, Disk I/O, and Network usage
- Per-core CPU heatmap with adaptive grid layout
- Historical charts (last 5 minutes)
- System uptime, process count, and load average

### Process Manager
- Full process table with PID, CPU %, RAM, disk I/O, status
- Search, sort, and filter processes
- Right-click context menu: **Kill, Kill Tree, Suspend, Resume, Set Priority**
- Open file location, copy PID

### Port & Network Inspector
- View all active TCP/UDP connections
- See which process owns each port
- Protocol, local/remote address, connection state
- Suspicious connection highlighting

### Hardware Monitor
- Logical processor detail view with per-core usage bars
- CPU heatmap (auto-adapts grid to core count)
- RAM, Swap, Disk, and Network interface stats

### Resource Limiter
- **CPU Affinity** — pin processes to specific cores
- **CPU Throttle** — limit CPU usage (0% = suspend) via Windows Job Objects
- **RAM Limit** — set maximum memory a process can use
- **Free Working Set** — instantly reclaim memory from any process
- **Multi-process select** — apply rules to all Chrome/Node/etc. instances at once
- **Rules persist and auto-apply** on every app launch

### Services Manager
- View all Windows services and their status
- Start, Stop, Restart services directly

### Startup Apps
- See every program that launches at boot
- Enable/disable startup entries (persists across restarts)

### Intelligent Alerts
- Configurable CPU, RAM, and Disk thresholds
- Desktop notifications when limits are crossed
- Alert history log

### Analytics
- Historical CPU, RAM, and network trends
- Top resource-consuming applications

### Settings
- Dark / Light theme (persists across restarts)
- Compact mode for a minimal, Task Manager-style view
- Monitoring refresh rate configuration
- Alert threshold configuration

### System Tray
- Minimizes to system tray instead of quitting
- Monitoring continues in the background
- Single-click tray icon to restore

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Runtime | [Tauri 2](https://tauri.app) |
| Backend / System Access | [Rust](https://www.rust-lang.org) + [sysinfo](https://crates.io/crates/sysinfo) + [windows](https://crates.io/crates/windows) crate |
| Frontend | [React 18](https://react.dev) + [Vite](https://vitejs.dev) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Animations | [Framer Motion](https://www.framer.com/motion/) |
| Charts | [Recharts](https://recharts.org) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs) with persistence |
| Icons | [Lucide React](https://lucide.dev) |

---

## Getting Started

### Prerequisites

- **Windows 10 or 11** (x64)
- [Node.js](https://nodejs.org) v18 or later
- [Rust](https://www.rust-lang.org/tools/install) (latest stable)
- [Tauri CLI prerequisites](https://tauri.app/start/prerequisites/) (WebView2, Visual Studio Build Tools)

### Install from Installer

Download the latest release from the [Releases](../../releases) page:

- `CoreSentinel_x.x.x_x64_en-US.msi` — Windows Installer
- `CoreSentinel_x.x.x_x64-setup.exe` — NSIS Installer

> **Note:** Some features (process kill, CPU affinity, resource limiting) require **administrator privileges**. Right-click the app and choose "Run as administrator" for full functionality.

---

## Build from Source

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/CoreSentinel.git
cd CoreSentinel

# 2. Install Node.js dependencies
npm install

# 3. Run in development mode (hot-reload)
npm run tauri dev

# 4. Build production installer
npm run tauri build
```

The installer will be output to:
```
src-tauri/target/release/bundle/msi/
src-tauri/target/release/bundle/nsis/
```

---

## Project Structure

```
CoreSentinel/
├── src/                        # React frontend
│   ├── components/
│   │   ├── Layout/             # Sidebar, Titlebar, Layout
│   │   └── Charts/             # CpuHeatmap, SparkLine
│   ├── hooks/
│   │   └── useSystemData.js    # Real-time data polling hook
│   ├── pages/                  # Dashboard, Processes, Ports, etc.
│   ├── store/
│   │   └── appStore.js         # Zustand global state with persistence
│   └── utils/
│       └── formatters.js       # Byte/time formatting utilities
│
└── src-tauri/                  # Rust backend
    └── src/
        ├── lib.rs              # Tauri entry point + command handlers
        ├── models.rs           # Shared data structures
        ├── system_monitor.rs   # Background refresh thread + cache
        ├── process_control.rs  # Kill, suspend, affinity, Job Objects
        ├── port_inspector.rs   # Network connection scanner
        └── windows_services.rs # Services + startup entries
```

---

## Performance Design

CoreSentinel is built to have a **minimal footprint**:

- The Rust backend runs a **single background thread** that refreshes system data every 1.5 seconds using only specific `sysinfo` refresh kinds (not `refresh_all`)
- The frontend simply **reads from the cache** — no expensive scans on each poll
- All frontend polls **pause automatically** when the window is minimized to tray (`document.hidden`)
- `netstat` (expensive) runs only every 15 seconds
- Processes are refreshed every 4-5 seconds, not every second

---

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork** this repository
2. **Create** a feature branch: `git checkout -b feature/my-feature`
3. **Commit** your changes: `git commit -m 'Add my feature'`
4. **Push** to your branch: `git push origin feature/my-feature`
5. Open a **Pull Request**

### Ideas for contribution
- GPU monitoring (NVML / DXGI)
- Temperature sensors
- Dark/light theme improvements
- Linux / macOS port (sysinfo supports it)
- Process dependency graph
- Export reports (CSV/JSON)

---

## Known Limitations

- Windows-only (10/11 x64). Linux/macOS support is partial (no Job Objects, no netstat parsing)
- Some operations (process kill, resource limiting) require administrator rights
- CPU throttling uses Windows Job Objects — a process can only be in one job at a time

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Developer

Built with ❤️ by **Abhishek Kumar**

- Email: [prajapatiabhishek02@gmail.com](mailto:prajapatiabhishek02@gmail.com)
- GitHub: [@YOUR_USERNAME](https://github.com/YOUR_USERNAME)

---

<div align="center">
  <sub>If this project helped you, please consider giving it a ⭐ on GitHub!</sub>
</div>
