# Architecture Decision Record (ADR 001)

## Status
**Accepted** (v0.0.1)

## Context
Self-hosted dashboard applications are an essential tool for homelabs and servers. However, existing options suffer from notable shortcomings:

1. **Homepage (gethomepage.dev)**:
   - *Strengths*: Highly configurable, good widget ecosystem, low memory.
   - *Pain Points*: YAML-only configuration is notoriously fragile. Indentation mistakes cause fatal parsing errors and blank screens without clear line/column visual feedback. No built-in in-browser visual editing.
2. **Homarr**:
   - *Strengths*: Excellent drag-and-drop visual interface.
   - *Pain Points*: Built on a heavy full-stack Next.js + database architecture. Idle RAM usage is high (150MB–300MB+), cold boot time is slow on Raspberry Pi / SBCs, and configuration is not easily versioned via simple GitOps flat files.
3. **Dashy**:
   - *Strengths*: Rich feature set and theming.
   - *Pain Points*: Bulky client bundle size, high DOM complexity, sluggish UI updates on low-powered client devices, and confusing configuration duplication.
4. **Heimdall / Flame**:
   - *Strengths*: Simple setup.
   - *Pain Points*: Outdated UI paradigms, lack of modern widget integrations, or abandoned maintenance.

## Decision

DashPark adopts a **hybrid, ultra-lightweight architecture** designed for sub-40MB RAM usage and zero-crash configuration handling:

### 1. Backend: Node.js (ESM) + Fastify
- **Why Fastify**: One of the fastest web frameworks in the Node ecosystem with minimal memory overhead (<25MB idle).
- **Non-blocking I/O**: High-concurrency health check pings and widget data proxies without blocking the dashboard render.
- **Dynamic Config Reload**: Uses native file watchers to hot-reload `dashpark.yaml` changes instantly without container restarts.

### 2. Frontend: Vite + TypeScript + Vanilla CSS Design System
- **Zero Framework Runtime Overhead**: No large runtime bundle (unlike React/Next.js/Vue). Static production build is <50KB gzipped.
- **Vanilla CSS Tokens**: Custom properties design system with dark mode, glassmorphism, responsive grid/bento layouts, and fluid micro-animations.
- **Blazing Fast Cold Start**: Near-instant load time on mobile devices and 4K displays.

### 3. Resilient Configuration Engine
- **Declarative Flat-File First**: Primary config is `config/dashpark.yaml` (with `.json` fallback), perfectly suited for GitOps and Docker bind mounts.
- **Line & Column Error Diagnostics**: If a user makes an indentation or syntax error in YAML, the parser extracts the exact line, column, and code snippet. The server responds with structured diagnostics and the UI displays an actionable syntax repair banner rather than crashing.

### 4. Smart Multi-Tier Icon Resolver
- Cascades from local custom icons (`/icons/`) -> `walkxcode/dashboard-icons` -> Simple Icons -> dynamic domain favicon -> Lucide category icons -> initial badge fallback.

## Resource Budget & Benchmarks

| Metric | Target Budget | DashPark v0.0.1 Expected |
| :--- | :--- | :--- |
| **Idle Memory (Docker)** | < 40 MB RAM | ~25 MB - 35 MB RAM |
| **Cold Startup Time** | < 1.0 s | ~180 ms |
| **Frontend Bundle Size (gzip)** | < 100 KB | < 45 KB |
| **Architectures** | amd64 / arm64 | x86_64, aarch64 (Raspberry Pi 3/4/5) |
