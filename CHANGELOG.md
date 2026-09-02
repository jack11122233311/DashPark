# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1] - 2026-09-02

### Fixed
- **Config Persistence Engine (`parser.ts`)**: Resolved critical field stripping bug in `parseConfig()` where manual object reconstruction omitted `pages`, `widget`, `shortcuts`, and `bentoSpan`, causing saved edits to revert.
- **Single Source of Truth Projection (`schema.ts`)**: Fixed `DashParkConfigSchema` transform so that `categories` is always cleanly derived from `pages`, eliminating stale root category overwrites.
- **File System Save Reliability (`routes/config.ts`)**: Replaced `fs.renameSync` with direct atomic `fs.writeFileSync` preceded by `.bak` backup, eliminating Windows file lock (`EPERM`) and Docker bind mount inode collisions.
- **Bidirectional Config Editor Sync (`ConfigEditor.ts`)**: Added real-time tab synchronization (Visual ↔ YAML) and live `input` change listeners.

### Added
- **In-Editor Category & Service Reordering**: Added `▲ Up` and `▼ Down` visual buttons for quick item ordering in the form editor.
- **Export & Revert Controls**: Added 1-click "⬇️ Export YAML" and "↩️ Revert" buttons to the Config Editor.
- **Automated Regression Suite**: Added `tests/config-persistence.test.ts` (36 total passing tests across 11 test suites).

## [0.3.0] - 2026-09-02

### Added
- **Bento Drag-and-Drop Studio (`BentoStudio.ts`)**:
  - Interactive "✏️ Customize" toggle button in the toolbar when in Bento Grid mode.
  - Native HTML5 drag-and-drop tile reordering with drop indicators and smooth transitions.
  - Live tile resizing controls directly on cards (`1x1 Tile`, `2x1 Wide Banner`, `1x2 Tall`, `2x2 Large Hero`).
  - Inline telemetry quick-toggles (`Graph + Stat` ➔ `Stat Only` ➔ `Disabled`).
  - Auto-saving and hot-reloading layout changes directly to `config/dashpark.yaml`.
- **Multi-Page Dashboard Architecture (`PageRouter.ts`)**:
  - Declarative `pages: DashboardPage[]` schema with URL hash routing (`#page=media`, `#page=infra`).
  - Dynamic top-bar tab navigation pills (`#page-tabs-bar`) with active states.
  - Visual Page Manager in Config Editor (`Ctrl+E`) to add new pages, switch active editing pages, and delete pages.
  - 100% backward compatibility for legacy single-page root `categories` configs with automatic bidirectional normalization.
- **Automated Tests**:
  - Added `tests/pages.test.ts` (multi-page normalization and serialization).
  - Added `tests/bento-studio.test.ts` (tile span and telemetry cycling).
  - Total test suite expanded to 34 passing assertions across 10 test files.

## [0.2.0] - 2026-09-02

### Added
- **View-Adaptive & Toggle-able Service Stats**:
  - Bento / Tile Mode: 120x34px real-time uPlot sparkline graph slot alongside prominent metric badges.
  - Categorized Grid Mode: 80x22px compact sparkline and metric counter.
  - Compact List Mode: High-density inline widget pills preserving 60fps scrolling performance.
  - Granular toggles (`widget.enabled`, `widget.showGraph`) per service.
- **1-Click Homelab Presets Catalog (`presets.ts`)**:
  - Built-in instant recipes for 11 popular homelab services (Emby, Jellyfin, Plex, Pi-hole, AdGuard Home, Sonarr, Radarr, Home Assistant, Proxmox VE, TrueNAS SCALE, Uptime Kuma, and Speedtest Tracker).
  - Auto-populates URLs, health check pings, JSONPath selectors, header templates, and action shortcuts.
- **In-App Service Connection & Token Guides**:
  - Dedicated "📖 Service Guides" tab in the Configuration Editor (`Ctrl+E`) detailing authentication types (Zero Auth, API Key, Bearer, Basic Auth) and token generation instructions.
- **Action Shortcuts (Anti-Collision Architecture)**:
  - Added micro-action quick links (e.g. `[Dashboard]`, `[Live TV]`, `[Console]`, `[Query Log]`) directly on cards with click isolation (`event.stopPropagation()`).
- **Showcase Sample Update**:
  - Upgraded `config/dashpark.sample.yaml` and embedded fallbacks showcasing shortcuts and widgets for all core services.
- **Automated Tests**:
  - Added `tests/shortcuts.test.ts` and `tests/presets.test.ts` bringing total test suite to 29 passing assertions.

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
