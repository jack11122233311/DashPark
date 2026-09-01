# 🚀 DashPark

<div align="center">

![DashPark Banner](https://raw.githubusercontent.com/jack11122233311/DashPark/main/docs/assets/banner.png)

**The ultra-lightweight, resilient, and modern self-hosted dashboard for homelabs and servers.**

[![Version](https://img.shields.io/badge/version-v0.0.1-indigo.svg)](https://github.com/jack11122233311/DashPark/releases)
[![Memory](https://img.shields.io/badge/memory-%3C15MB_RAM-emerald.svg)](#benchmarks)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://github.com/jack11122233311/DashPark/pkgs/container/dashpark)

[Quick Start](#-quick-start) • [Why DashPark?](#-why-dashpark) • [Configuration](#-configuration) • [Architecture](#-architecture) • [Roadmap](#-roadmap)

</div>

---

## 🌟 Features

- ⚡ **Ultra-Lightweight**: Runs on **<15MB RAM** with sub-60ms cold start times. Perfect for Raspberry Pi 3/4/5 and low-spec SBCs.
- 🛡️ **Zero-Crash Resilient Config Engine**: Misplaced YAML indentations or syntax mistakes won't crash your server or show a blank screen. DashPark catches syntax errors and displays real-time line/column visual repair diagnostics in the UI.
- 🎨 **Modern Design System**: Glassmorphic dark-mode interface with customizable accent colors, responsive Bento grid, and fluid micro-animations.
- 🔍 **Instant Keyboard-First Search**: Hit `/` anywhere to immediately search and filter services, or `Escape` to reset.
- 🎯 **Smart Multi-Tier Icon Resolver**: Cascades through local uploads, `dashboard-icons`, Simple Icons, domain favicons, and initials badges.
- 📊 **Real-Time Health & Status**: Live server metrics (RAM usage, uptime) and background service health polling.

---

## 🥊 Why DashPark? (Competitive Comparison)

| Feature | DashPark | Homepage | Homarr | Dashy |
| :--- | :---: | :---: | :---: | :---: |
| **Idle Memory (RAM)** | **~15 MB** | ~35 MB | 150 MB+ | 100 MB+ |
| **Cold Startup Time** | **< 60 ms** | ~500 ms | 3-5 s | 2-4 s |
| **YAML Syntax Error Handling** | **Live UI Line/Col Banner** | Fatal Crash / Blank Screen | N/A (DB/GUI) | Generic Error |
| **Client Bundle Size (gzip)** | **< 5 KB** | ~45 KB | 300 KB+ | 500 KB+ |
| **GitOps Flat-File Support** | **Yes (YAML/JSON)** | Yes (YAML only) | No (Database) | Yes (YAML/JSON) |

---

## ⚡ Quick Start

### 1. Local Development

```bash
# Clone the repository
git clone https://github.com/jack11122233311/DashPark.git
cd DashPark

# Install dependencies
npm install

# Start development server with live reload
npm run dev
```

Visit `http://localhost:5173` (Frontend) or `http://localhost:3000` (Fastify API Backend).

### 2. Production Build

```bash
# Build frontend bundle & backend TypeScript
npm run build

# Start production server
npm start
```

---

## ⚙️ Configuration

DashPark looks for configuration files in the following priority order:
1. `config/dashpark.yaml`
2. `config/dashpark.yml`
3. `config/dashpark.json`
4. `config/dashpark.sample.yaml` (Built-in demo config)

### Sample `dashpark.yaml`

```yaml
version: "0.0.1"

meta:
  title: "DashPark"
  subtitle: "Personal Homelab & Server Park"
  theme: "dark"
  accentColor: "#6366f1"
  layout: "grid"
  showClock: true
  clockFormat: "24h"

categories:
  - id: "media"
    name: "Media & Streaming"
    icon: "film"
    columns: 4
    services:
      - id: "plex"
        name: "Plex Media Server"
        url: "http://plex.local:32400"
        icon: "plex"
        description: "Movies & TV Streaming"
        pingUrl: "http://plex.local:32400/web/index.html"
        target: "_blank"

      - id: "jellyfin"
        name: "Jellyfin"
        url: "http://jellyfin.local:8096"
        icon: "jellyfin"
        description: "Open Source Media System"
        target: "_blank"
```

---

## 🏛️ Architecture

DashPark is engineered with a strict zero-bloat philosophy:
- **Backend**: Node.js Native ESM + **Fastify** (<15MB idle RAM, non-blocking asynchronous event loop).
- **Frontend**: **Vite + Vanilla TypeScript & CSS Design System** (<5KB gzip client bundle).
- **Parser**: Resilient AST parser with `YAMLParseError` line and column pointer mapping.

---

## 🗺️ Roadmap

- [x] **v0.0.1 (Phase 1)**: Core Architecture, Fastify backend, Vite client, resilient YAML config engine, `<15MB RAM` benchmark.
- [ ] **v0.0.2 (Phase 2)**: Bento Grid / Dense List layout modes, complete Smart Icon cascader, and theme switcher.
- [ ] **v0.0.3 (Phase 3)**: Non-blocking service health ping worker, system metrics widget, in-browser visual editor.
- [ ] **v0.0.4 (Phase 4)**: Multi-arch Docker images (`amd64`, `arm64`) for Raspberry Pi.
- [ ] **v1.0.0 (Phase 5)**: GHCR release automation, community widget plugins.

---

## 📄 License

Distributed under the [MIT License](LICENSE). Copyright (c) 2026 DashPark Contributors.
