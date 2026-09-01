# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-09-02

### Added
- **3 Dynamic Layout Modes**:
  - **Categorized Grid**: Traditional category columns with collapsible accordions.
  - **Bento Grid**: Modern modular card grid featuring prominent hero cards and category badges.
  - **Compact List**: High-density table view with sortable columns for large homelabs (50+ services).
  - Quick switch hotkeys (`Ctrl+1`, `Ctrl+2`, `Ctrl+3`) and persistent user preference.
- **7 Theme Presets**:
  - `dark` (Obsidian & Indigo), `nord` (Arctic Frost), `dracula` (Vampire Slate), `catppuccin` (Mocha & Mauve), `cyberpunk` (Neon Cyan/Pink), `glass` (Translucent Frosted), and `light` (Alabaster).
- **Smart 6-Tier Icon Resolver Engine**:
  - Automatic cascade: Local custom icons -> `walkxcode/dashboard-icons` (PNG/SVG) -> `Simple Icons` -> Backend Favicon Proxy -> Lucide Category Vectors -> High-contrast Initials Badges.
  - Zero layout shift with fixed aspect-ratio containers.
  - LocalStorage and in-memory cache to remember working icons and eliminate redundant failed requests.
- **Backend Favicon & Local Icons Proxy**: Fastify route `/api/v1/icons/favicon` with caching and static `/icons/` mounting.
- **Tag Filtering Bar**: Interactive tag pills for one-click service filtering by tag.
- **Test Suite Expansion**: Added unit tests for `IconResolver`, cascade hierarchies, and keyword fallbacks (11 / 11 tests passing).
- **Core Architecture & Scaffolding**: Fastify backend, Vite client, resilient YAML configuration engine, and `<15MB RAM` runtime benchmark.
