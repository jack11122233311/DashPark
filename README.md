# 🚀 DashPark

<div align="center">

**The ultra-lightweight, resilient, and modern self-hosted dashboard for homelabs and servers.**

[![Version](https://img.shields.io/badge/version-v0.3.0-indigo.svg)](https://github.com/jack11122233311/DashPark/releases)
[![Docker](https://img.shields.io/badge/docker-multi--arch-blue.svg)](https://github.com/jack11122233311/DashPark/pkgs/container/dashpark)
[![Architectures](https://img.shields.io/badge/arch-amd64%20%7C%20arm64-orange.svg)](#multi-arch-support)
[![Memory](https://img.shields.io/badge/memory-%3C18MB_RAM-emerald.svg)](#benchmarks)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[Docker Quickstart](#-docker-quickstart) • [Why DashPark?](#-why-dashpark) • [Configuration](#-configuration) • [Layouts & Features](#-layouts--features) • [Architecture](#-architecture)

</div>

---

## 🌟 Features

- ⚡ **Ultra-Lightweight**: Runs on **<18MB RAM** with sub-60ms cold start times. Optimized for Raspberry Pi 3/4/5 and low-spec SBCs.
- 🍱 **Bento Drag-and-Drop Studio**: Live visual customization mode (`✏️ Customize`) to drag, reorder, and resize tiles (`1x1`, `2x1 Wide`, `1x2 Tall`, `2x2 Hero`) with auto-persistence.
- 📑 **Multi-Page Dashboard Engine**: Tabbed page router (`#page=media`, `#page=infra`) supporting infinite dedicated pages for media, infrastructure, smart home, and security.
- 🐳 **Multi-Arch Docker Ready**: Pre-packaged for `linux/amd64` and `linux/arm64` (aarch64) with non-root security (`USER node`).
- 📊 **View-Adaptive & Toggle-able Stats**: Dynamic live telemetry adapts to the current view — large live uPlot charts in Bento/Tile view, compact sparklines in Grid view, and dense status pills in List view.
- ⚡ **1-Click Presets Library**: Built-in instant recipes for Emby, Jellyfin, Plex, Pi-hole, AdGuard, Sonarr, Radarr, Home Assistant, Proxmox, TrueNAS, and Uptime Kuma.
- 📖 **Interactive Service Connection Guides**: Step-by-step token and JSONPath extraction cheatsheet directly inside the Config Editor (`Ctrl+E`).
- 🔗 **Isolated Action Shortcuts**: Quick micro-action links (e.g. `[Dashboard]`, `[Live TV]`, `[Query Log]`, `[Console]`) on cards without triggering parent navigation.
- 🛡️ **Zero-Crash Resilient Config Engine**: Misplaced YAML indentations or syntax mistakes won't crash your server or show a blank screen. DashPark catches syntax errors and displays real-time line/column visual repair diagnostics in the UI.
- 🎨 **3 Switchable Layout Modes**:
  - **Categorized Grid (`Ctrl+1`)**: Traditional clean category columns with collapsible accordions.
  - **Bento Grid (`Ctrl+2`)**: Modern modular card grid with customizable tile dimensions and hero slots.
  - **Compact List (`Ctrl+3`)**: High-density table view with sortable columns for large homelabs (50+ services).
- 🎭 **7 Theme Presets**: Dark (Default), Nord, Dracula, Catppuccin, Cyberpunk, Glass, and Light with dynamic CSS variables.
- 🎯 **Smart 6-Tier Icon Resolver**: Cascades through Local `/icons/` ➔ `walkxcode/dashboard-icons` ➔ Simple Icons ➔ Backend Favicon Proxy ➔ Lucide Category Vectors ➔ Initials Badges with zero layout shift.
- 💓 **Async Health Monitor**: Non-blocking background worker with self-signed SSL tolerance that measures live latency (`ms`) and endpoint reachability.
- 🛠️ **In-App Config Editor (`Ctrl+E`)**: Visual form editor with Page Manager, Live "Test Ping", or raw YAML editing with real-time syntax linting and automatic `.bak` backups.

---

## 🥊 Why DashPark? (Competitive Comparison)

| Feature | DashPark | Homepage | Homarr | Dashy |
| :--- | :---: | :---: | :---: | :---: |
| **Idle Memory (RAM)** | **~15 - 18 MB** | ~35 MB | 150 MB+ | 100 MB+ |
| **Cold Startup Time** | **< 60 ms** | ~500 ms | 3-5 s | 2-4 s |
| **YAML Syntax Error Handling** | **Live UI Line/Col Banner** | Fatal Crash / Blank Screen | N/A (DB/GUI) | Generic Error |
| **In-App Visual Config Editor** | **Yes (Hybrid GUI + YAML)** | No (Text file only) | Yes (GUI only) | Complex UI |
| **Client Bundle Size (gzip)** | **< 52 KB** | ~45 KB | 300 KB+ | 500 KB+ |
| **Multi-Arch Support** | **amd64 & arm64 (RPi)** | amd64 & arm64 | amd64 & arm64 | amd64 & arm64 |

---

## 🐳 Docker Quickstart

### 1. Using Docker Compose (Recommended)

1. Create your local folders and assign permissions:
```bash
mkdir -p ./config ./icons && sudo chown -R 1000:1000 ./config ./icons
```

2. Create a `docker-compose.yml` file:

```yaml
services:
  dashpark:
    image: ghcr.io/jack11122233311/dashpark:latest
    container_name: dashpark
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./config:/app/config
      - ./icons:/app/icons
    extra_hosts:
      - "host.docker.internal:host-gateway"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - TZ=UTC
```

3. Start the container:

```bash
docker compose up -d
```

Access your dashboard at `http://<your-server-ip>:3000`.

### 2. Using `docker run`

```bash
docker run -d \
  --name dashpark \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/config:/app/config \
  -v $(pwd)/icons:/app/icons \
  ghcr.io/jack11122233311/dashpark:latest
```

---

## ⚙️ Configuration

DashPark checks configuration in the following priority order:
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
  theme: "dark" # dark, nord, dracula, catppuccin, cyberpunk, glass, light
  accentColor: "#6366f1"
  layout: "grid" # grid, bento, compact
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
        tags: ["media", "streaming"]

      - id: "sonarr"
        name: "Sonarr"
        url: "http://sonarr.local:8989"
        icon: "sonarr"
        description: "TV Series Collection Manager"
        target: "_blank"
        tags: ["media", "automation"]
```

---

## 🏛️ Architecture

DashPark is engineered with a strict zero-bloat philosophy:
- **Backend**: Node.js Native ESM + **Fastify** (<18MB idle RAM, non-blocking asynchronous event loop).
- **Frontend**: **Vite + Vanilla TypeScript & CSS Design System** (Zero runtime framework overhead).
- **Security**: Runs as non-root user `node` (UID: 1000) inside container.
- **Parser**: Resilient AST parser with `YAMLParseError` line and column pointer mapping.

---

## 📄 License

Distributed under the [MIT License](LICENSE). Copyright (c) 2026 DashPark Contributors.
