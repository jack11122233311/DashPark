# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.0] - 2026-09-03

### Added
- **Advanced Search Target & Multi-Screen Window Management (`SearchEngineBar.ts`)**:
  - Configurable search open destination:
    - `New Tab` (`_blank` with `noopener,noreferrer`)
    - `Current Page` (`_self` / `window.location.assign`)
    - `New Window` (Centered popup window with custom width and height)
    - `Target External Monitor` (Multi-Screen Window Placement API targeting with cross-browser virtual monitor offset calculations)
  - Popup blocker safeguard: Non-intrusive fallback with toast notification if popups are restricted.
- **Settings Hub Search & Display Panel (`ConfigEditor.ts`)**:
  - Interactive controls in Panel 10 ("Clock & Search Bar") for Open Search In target, target monitor/display (Display 1, Display 2, Display 3), and popup window dimensions.
  - Bidirectional synchronization between visual form, `localStorage`, and `dashpark.yaml`.
- **Command Palette Web Search Integration (`CommandPalette.ts`)**:
  - Directly execute web searches from `Ctrl+K` command palette using the configured search target and display monitor options.

### Changed & Polished
- **Symmetrical Centering & Zero-Wrap Visual Overhaul (`style.css`)**:
  - Perfectly centered header structure (`1fr auto 1fr`) with balanced search box container.
  - Non-wrapping search engine chips strip with edge-fade mask and smooth horizontal touch scroll.
  - Zero-wrap guarantees for category headers, health rollup status pills (`🟢 3/3 Online`), latency badges, and compact table cells.
  - Truncation with ellipsis on service titles and descriptions preventing layout shifts and broken aspect ratios.

## [0.9.0] - 2026-09-02

### Added
- **Live RSS & News Feed Reader (`RssWidget.ts` & `/api/v1/rss`)**:
  - Ingestion proxy with 5-minute in-memory caching and timeout protection.
  - Multi-feed tab switching across Hacker News, r/homelab, r/selfhosted, The Verge, Ars Technica, and custom RSS URLs.
  - Responsive article previews with publication relative time and clean external linkouts.
- **Direct Multi-Engine Search Bar with Bang Syntax (`SearchEngineBar.ts`)**:
  - Interactive engine selector chips: Google, DuckDuckGo, Brave, YouTube, Reddit, GitHub, Wikipedia, SearXNG.
  - Instant bang prefix operator parsing (`!yt`, `!r`, `!gh`, `!w`, `!d`, `!b`, `!sx`).
- **Comprehensive Server Telemetry Stats Cards (`HostStatsCard.ts`)**:
  - Real-time gauge progress bars for CPU Load %, Memory RAM (Used/Free/Total GB), and Storage Disk Space (Mount point, Total/Free/Used GB).
  - Host server metadata displaying hostname, platform, CPU cores, load averages (1m/5m/15m), and uptime.
- **In-Dashboard Sticky Notes & Scratchpad (`ScratchpadWidget.ts`)**:
  - Auto-saving sticky notes with debounce for quick IP notes, terminal commands, and to-do lists.
- **Dynamic Time-of-Day Greeting**:
  - Automatic contextual greetings ("Good morning", "Good afternoon", "Good evening", "Good night") in the dashboard header.

## [0.8.0] - 2026-09-02

### Refactored & Optimized
- **Modular Client Architecture**:
  - Decoupled `src/client/main.ts` into single-responsibility submodules:
    - `src/client/state/PreferenceStore.ts`: Type-safe `localStorage` state management with fallback guarantees and private browsing safety.
    - `src/client/dom/DomRenderer.ts`: Pure HTML generator for Grid, Bento, and Compact modes with complete XSS protection.
    - `src/client/services/HealthPoller.ts`: Periodic health polling, latency history buffers, and outage detection.
    - `src/client/services/WidgetPoller.ts`: Custom REST widget telemetry polling with leak-free timer teardowns.
- **Memory & Event Hygiene**:
  - Eliminated memory leaks by cleaning up polling intervals and event listeners during layout shifts and page switches.
- **Test Suite Expansion**:
  - Added unit test suites for `PreferenceStore`, `DomRenderer`, `SpatialNavigator`, and `WidgetPoller`.
  - Expanded test suite to **78 passing tests across 29 test files (100% pass rate)**.

## [0.7.0] - 2026-09-02

### Added
- **Zero-Clip Responsive Engine & Viewport Bounds Optimizer**:
  - Bottom dock clearance padding preventing floating dock overlaps on any screen resolution.
  - Mobile Bento single-column clamp overriding multi-column tile presets on viewports `<640px`.
  - Flexbox `min-width: 0;` text ellipsis protection and touch-contained table scrolling.
- **Real-Time Outage Alert Ribbon & Toast Notifications (`ToastManager.ts`)**:
  - Non-intrusive floating toast alerts dispatched on service reachability transitions.
  - Top outage alert ribbon with 1-click outage filtering.
- **1-Click Quick-Add Service Modal (`QuickAddModal.ts`)**:
  - Rapid service creation modal with smart IP, port, and URL auto-detection.
- **Kiosk Multi-Page Auto-Rotation Wallboard (`KioskRotator.ts`)**:
  - Unattended slideshow cycling across dashboard pages with an animated gradient progress bar and smart pause on interaction.
- **Category Health Status Rollup Badges**:
  - Category header health rollup indicators (`🟢 Online`, `🟡 Degraded`, `🔴 Offline`) with persistent collapse state.
- **Public Shareable Status Endpoint (`/api/v1/status/public`)**:
  - Sanitized SLA uptime availability metrics without private network exposure.
- **Spatial Keyboard & Vim Navigation (`SpatialNavigator.ts`)**:
  - Card navigation via arrow keys and Vim keys (`h j k l`), hotkeys (`Enter`, `s`), and interactive cheatsheet modal (`?`).

## [0.6.0] - 2026-09-02

### Added
- **Apple-Style Floating Action Dock (`FloatingDock.ts`)**:
  - Uncluttered viewport with a sleek floating glass pill dock pinned to bottom center with auto-hiding smart opacity.
  - Smooth spring-animated segmented layout switcher (`Grid`, `Bento`, `List`) with sliding pill indicator.
  - Interactive Theme Flyout popover with live color swatches (Dark, Nord, Dracula, Catppuccin, Cyberpunk, Glass, Light).
  - Quick-action buttons for Spotlight Search (`⌘K`), Bento Tile Customizer (`✏️ Customize`), and Settings Hub (`⚙️ Edit`).
- **Universal Spotlight Command Palette (`CommandPalette.ts`)**:
  - Global `Ctrl+K` / `⌘K` / `/` / header search badge trigger opening a high-performance spotlight dialog.
  - Universal indexing and instant fuzzy search across all services, shortcuts, dashboard pages, theme palettes, layout modes, and system settings.
  - Full keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`) with instant action execution.
- **Ambient Glow Glassmorphism 2.0 & Breathing Beacons**:
  - Refined luminous border gradients (`rgba(255, 255, 255, 0.08)` to `rgba(255, 255, 255, 0.03)`).
  - Fluid elevation lift on card hover with dynamic multi-layer soft drop shadows.
  - Dynamic breathing pulse animations on latency status beacons (`@keyframes pulse-emerald` and `@keyframes pulse-amber`).
- **2-Column Split-Pane Master-Detail Settings Hub (`ConfigEditor.ts`)**:
  - Transformed the monolithic settings modal into a modern 2-column split-pane master-detail view.
  - Categorized sidebar navigation across 11 dedicated setting panels: Identity, Appearance, Wallpaper, Weather, Security & PIN, Outage Alerts, Migration Importer, Custom CSS & Icons, Snapshot History, Clock & Search, and Factory Reset.
- **Automated Test Coverage**:
  - Added unit test suites for `FloatingDock` and `CommandPalette`.
  - Expanded test suite to **67 passing tests across 21 test files (100% pass rate)**.

## [0.5.0] - 2026-09-02

### Added
- **Docker Socket Auto-Discovery & Power Controls (`/api/v1/docker/*`)**:
  - Direct UNIX socket (`/var/run/docker.sock`) & Windows Named Pipe (`//./pipe/docker_engine`) communication without third-party npm dependencies.
  - Auto-extracts container metadata via label taxonomy (`dashpark.enable`, `dashpark.name`, `dashpark.group`, `dashpark.icon`, `dashpark.url`, `dashpark.bentoSpan`).
  - Container power action endpoints (`POST /api/v1/docker/containers/:id/restart|start|stop`).
- **Zero-API-Key Weather Telemetry (`/api/v1/weather`)**:
  - Live environmental data powered by Open-Meteo with 15-minute in-memory caching.
  - WMO weather code mapping to condition descriptions and dynamic emoji icons.
  - Configurable units (Celsius/Fahrenheit), city name, and coordinate overrides.
- **PIN Kiosk Mode & Protection (`/api/v1/auth/*`)**:
  - SHA-256 master PIN protection for config editing and Bento customization.
  - Read-only Kiosk Mode hiding edit triggers on shared and public homelab displays.
- **1-Click Multi-Dashboard Migration Importer (`importers.ts`)**:
  - Seamless drag-and-drop parsing and instant conversion from **Homepage** (`services.yaml`), **Homarr** (`JSON`), **Dashy** (`conf.yml`), and **Heimdall** (`export.json`).
- **Outage Alert Dispatcher (`alert-dispatcher.ts`)**:
  - Instant webhook notifications on service state transitions with consecutive failure thresholds.
  - Rich embeds and payloads for **Discord**, **Telegram**, **Ntfy**, and **Gotify**.
- **Custom CSS Injection & Local Icon Uploader (`/api/v1/custom/*`)**:
  - Live CSS editor saving directly to `config/custom.css` with instant `<link>` reload.
  - PNG/SVG custom icon uploader persisting to `config/icons/` for volume survival.
- **Versioned Configuration Snapshots & 1-Click Rollback (`snapshot-manager.ts`)**:
  - Automatic timestamped snapshot creation before every save (`config/snapshots/`).
  - Rolling 5-snapshot retention and 1-click restore functionality from the Settings Hub.
- **Automated Test Coverage**:
  - Added test suites for Docker Socket, Weather, PIN Auth, Importers, Alert Dispatcher, and Snapshots.
  - Expanded total test suite to **62 passing tests across 19 test files (100% pass rate)**.

## [0.4.0] - 2026-09-02

### Added
- **Default 2-Page Homelab Architecture**: Factory sample and fallback configurations now default to 2 curated showcase pages:
  - **Overview & Hub**: Security, DNS & WAN Monitoring telemetry.
  - **Media & Compute**: Streaming Servers, Hypervisors, Storage Pools & Smart Home.
- **Rich Page Customization & Reordering**:
  - In-Editor controls for Page Name, Page Icon, and Page Subtitle/Description.
  - `◀ Move Left` and `▶ Move Right` controls to dynamically reorder dashboard pages.
- **Dedicated Visual Settings Hub (`⚙️ Settings` Tab)**:
  - Comprehensive form controls for Dashboard Title, Subtitle, Theme swatches, Accent Color Palette Picker (Indigo, Emerald, Violet, Amber, Cyan, Rose), Clock configuration (12h/24h, Seconds toggle, Date toggle), Search Engine Provider (DuckDuckGo, Google, Brave, SearXNG), and Default Layout.
  - **Reset to Example Dashboard**: 1-click factory restore button via `/api/v1/config/reset`.
- **Advancement 1: Homelab Smart URL Auto-Detector (`Quick Add`)**:
  - Pasting any IP, port, or domain into the Service URL field instantly detects services (Emby, Jellyfin, Plex, Pi-hole, AdGuard, Sonarr, Radarr, Proxmox, Portainer, Home Assistant, Uptime Kuma, Node-RED, etc.) and auto-configures names, SVG icons, ping URLs, telemetry widgets, and action shortcuts.
- **Advancement 2: Homelab Wallpaper Studio & Live Glassmorphism Engine**:
  - Support for custom background image wallpapers (`meta.backgroundUrl`) and 1-click curated homelab wallpaper presets (Minimal Dark, Cyber Grid, Server Rack, Deep Space).
  - Real-time sliders for live **Glass Blur (`backdrop-filter`)** and **Card Opacity / Transparency**.
- **Automated Tests**:
  - Added `tests/smart-detect.test.ts` (7 URL pattern matching tests).
  - Added `tests/settings-reset.test.ts` (Settings & Glassmorphism metadata validation).
  - Expanded total test suite to **45 passing tests across 13 test files**.

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
