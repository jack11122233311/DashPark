# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-09-02

### Added
- **Async Service Health Checker**:
  - Non-blocking background worker with concurrency limits (max 5 simultaneous requests) and jitter to avoid request bursts.
  - Endpoints `GET /api/v1/health/services` and `POST /api/v1/health/ping`.
  - Real-time latency badges (`XX ms`) and status indicators (`online`, `degraded`, `offline`, `pending`) on cards across all 3 layout modes.
- **System Telemetry Bar & Host Metrics**:
  - Live display of Host CPU load, Host RAM usage, DashPark process memory, and Uptime via `GET /api/v1/system/stats`.
- **In-App Visual & Raw YAML Configuration Editor (`Ctrl+E`)**:
  - Accessible modal dialog with Visual Form tab (add/edit/delete categories & services, live "Test Ping" button) and Raw YAML tab (real-time syntax error linting).
  - Atomic config saving with automated `dashpark.yaml.bak` backup creation and instant UI hot-reloading.
- **3 Dynamic Layout Modes**:
  - **Categorized Grid**: Traditional category columns with collapsible accordions.
  - **Bento Grid**: Modern modular card grid with featured hero cards and category badges.
  - **Compact List**: High-density table view with sortable columns for large homelabs (50+ services).
- **7 Theme Presets**:
  - `dark` (Obsidian), `nord` (Arctic Frost), `dracula` (Vampire Slate), `catppuccin` (Mocha), `cyberpunk` (Neon Cyan/Pink), `glass` (Translucent), and `light` (Alabaster).
- **Smart 6-Tier Icon Resolver**:
  - Multi-tier fallback cascade (Local icons -> Dashboard Icons -> Simple Icons -> Favicon Proxy -> Lucide Category Vectors -> Initials Badges) with zero layout shift and offline caching.
- **Backend Icon & Favicon Proxy**: Fastify route `/api/v1/icons/favicon` with in-memory caching and static `/icons/` mounting.
- **Tag Filtering Bar**: Interactive tag pills for one-click service filtering by tag.
- **Automated Test Suite**: 17 / 17 unit tests passing across config parser, saver, icon resolver, and health checker.
