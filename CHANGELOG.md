# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-09-02

### Added
- **Lightweight Telemetry Graphs (`uplot`)**: Embedded time-series latency and performance graphs with zero-lag canvas rendering and automatic theme adaptation.
- **Universal JSON Metric Widgets**: Declarative stat badges for Pi-hole, Emby, Home Assistant, and Proxmox APIs supporting dot-notation JSONPath extraction (`data.streams.count`).
- **Backend Widget Proxy (`/api/v1/widgets/proxy`)**: CORS-free, cached (15s TTL) API proxy with secure header/auth support for homelab endpoints.
- **Enhanced Health Engine**: Self-signed SSL certificate tolerance, automatic HTTP 301/302 redirect following, and HTTP 401/403 reachability mapping.
- **Docker Host Gateway Mapping**: `host.docker.internal` mapping in `docker-compose.yml` for seamless same-machine container communication.
- **In-App Widget Editor**: Visual modal in Config Editor (`Ctrl+E`) for testing homelab API endpoints live and mapping JSON keys.
- **Showcase Homelab Example Dashboard**: Enriched 21-service dashboard featuring Emby, Pi-hole query stats, and live telemetry.

## [0.0.3] - 2026-09-02

### Fixed
- **Docker Empty Volume Auto-Seeding**: `ConfigLoader` now automatically detects when `/app/config` is mounted as an empty host volume and auto-seeds `dashpark.sample.yaml` from built-in templates, preventing "Configuration file not found" errors on fresh Docker setups.
- **CSS Spinner & Loading State Constraints**: Added explicit sizing and animation rules to `.loading-state` and `.spinner` in `style.css` to prevent oversized ring rendering during startup.
- **Centralized Version Synchronization**: Centralized `APP_VERSION` across server endpoints, system telemetry, and build scripts.

### Added
- **Embedded Fallback Configuration**: In-memory parsing fallback ensures DashPark boots into a rich homelab dashboard even on read-only filesystems.
- **Comprehensive 21-Service Example Homelab Dashboard**: Enriched `dashpark.sample.yaml` featuring 21 showcase services across 5 distinct categories (Media, Infrastructure, Security, Smart Home, Monitoring).
- **Auto-Seed Unit Test**: Added `tests/config-loader.test.ts` verifying automatic sample seeding in empty directory environments.

## [0.0.2] - 2026-09-02

### Added
- **Example Dashboard Configuration**: 21 popular homelab services across 5 distinct categories.
- **Enriched Metadata**: Health check ping URLs, tag taxonomies, and multi-tier icon identifiers.

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
