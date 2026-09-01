# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.1] - 2026-09-02

### Added
- **Core Architecture Scaffolding**: Ultra-lightweight Node.js (native ESM) + Fastify backend paired with Vite + TypeScript client.
- **Resilient Configuration Engine**: Declarative YAML and JSON parser with exact line/column error extraction and interactive visual repair diagnostics.
- **Zero-Runtime CSS Design System**: Glassmorphism dark-mode layout, responsive category grid, service cards with hover micro-animations.
- **Sample Config**: Built-in `dashpark.sample.yaml` showcasing 11+ common homelab services (Plex, Jellyfin, Sonarr, Proxmox, Portainer, Pi-hole, Vaultwarden, etc.).
- **Live Search**: Keyboard-first search filter with `/` shortcut to focus and `Escape` to reset.
- **Unit Test Suite**: Automated Vitest test suite validating YAML syntax parsing, error diagnostic mapping, and schema validation.
- **Architecture Decision Record**: Created `ADR.md` outlining design principles and competitive benchmarking.
