# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.2] - 2026-09-02

### Added
- **Comprehensive Example Dashboard**: Enriched `dashpark.sample.yaml` showcasing 21 popular homelab services across 5 distinct categories:
  - 🎬 Media & Streaming (Plex, Jellyfin, Sonarr, Radarr, Overseerr)
  - 🖥️ Infrastructure & Virtualization (Proxmox VE, Portainer, TrueNAS, Dockge)
  - 🛡️ Network, DNS & Security (Pi-hole, AdGuard Home, Vaultwarden, Nginx Proxy Manager, Cloudflare)
  - 🏠 Smart Home & Automation (Home Assistant, Zigbee2MQTT, Node-RED)
  - 📊 Telemetry, Metrics & Downloads (Grafana, Prometheus, qBittorrent, Uptime Kuma)
- **Rich Metadata & Health Endpoints**: Configured health check ping URLs, tag taxonomies, and multi-tier icon identifiers for all example services.
- **Customization Guide Comments**: Inline documentation in `dashpark.sample.yaml` for themes, layouts, search engines, and column counts.
- **Automated Test Validation**: Updated test suite to verify full parsing and structure of the 5 showcase categories.

## [0.0.1] - 2026-09-02

### Added
- **Async Service Health Checker**: Non-blocking background worker with concurrency limits (max 5) and live latency badges.
- **System Telemetry Bar**: Real-time display of Host CPU load, Host RAM %, DashPark memory, and Uptime.
- **In-App Visual & Raw YAML Config Editor (`Ctrl+E`)**: Form editor with live "Test Ping" button + YAML syntax linting and atomic `.bak` backups.
- **3 Dynamic Layout Modes**: Categorized Grid (`Ctrl+1`), Bento Grid (`Ctrl+2`), and Compact List (`Ctrl+3`).
- **7 Theme Presets**: Dark (Default), Nord, Dracula, Catppuccin, Cyberpunk, Glass, and Light.
- **Smart 6-Tier Icon Resolver**: Automatic cascade (Local -> Dashboard-Icons -> Simple Icons -> Favicon Proxy -> Lucide Vectors -> Initials).
- **Multi-Stage Multi-Arch Docker Setup**: Dockerfile for `linux/amd64` and `linux/arm64` (Raspberry Pi 3/4/5) with non-root security.
- **GitHub Actions CI/CD Pipeline**: Automated testing, linting, and multi-arch GHCR publishing on tag push.
