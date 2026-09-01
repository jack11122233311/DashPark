export const DEFAULT_SAMPLE_YAML = `# ==============================================================================
# 🚀 DashPark Sample Configuration File
# Documentation: https://github.com/jack11122233311/DashPark
# ==============================================================================

version: "0.0.3"

meta:
  title: "DashPark"
  subtitle: "Personal Homelab & Server Park"
  logo: ""
  theme: "dark"
  accentColor: "#6366f1"
  layout: "grid"
  showClock: true
  clockFormat: "24h"
  searchEngine:
    enabled: true
    provider: "duckduckgo"
    customUrl: ""

categories:
  - id: "media"
    name: "Media & Streaming"
    icon: "film"
    columns: 4
    collapsed: false
    services:
      - id: "plex"
        name: "Plex Media Server"
        url: "http://plex.local:32400"
        icon: "plex"
        description: "Movies, TV Series & Music Library"
        pingUrl: "http://plex.local:32400/web/index.html"
        target: "_blank"
        tags: ["media", "streaming", "video"]

      - id: "jellyfin"
        name: "Jellyfin"
        url: "http://jellyfin.local:8096"
        icon: "jellyfin"
        description: "Open Source Media Streaming Server"
        pingUrl: "http://jellyfin.local:8096"
        target: "_blank"
        tags: ["media", "opensource", "streaming"]

      - id: "sonarr"
        name: "Sonarr"
        url: "http://sonarr.local:8989"
        icon: "sonarr"
        description: "Smart TV Series Collection Manager"
        pingUrl: "http://sonarr.local:8989/api/v3/system/status"
        target: "_blank"
        tags: ["media", "automation", "tv"]

      - id: "radarr"
        name: "Radarr"
        url: "http://radarr.local:7878"
        icon: "radarr"
        description: "Movie Collection & Download Manager"
        pingUrl: "http://radarr.local:7878/api/v3/system/status"
        target: "_blank"
        tags: ["media", "automation", "movies"]

      - id: "overseerr"
        name: "Overseerr"
        url: "http://overseerr.local:5055"
        icon: "overseerr"
        description: "Media Request & Discovery Manager"
        pingUrl: "http://overseerr.local:5055/api/v1/status"
        target: "_blank"
        tags: ["media", "requests"]

  - id: "infrastructure"
    name: "Infrastructure & Virtualization"
    icon: "server"
    columns: 4
    collapsed: false
    services:
      - id: "proxmox"
        name: "Proxmox VE"
        url: "https://proxmox.local:8006"
        icon: "proxmox"
        description: "Enterprise Hypervisor & VM Management"
        pingUrl: "https://proxmox.local:8006"
        target: "_blank"
        tags: ["virtualization", "cluster", "kvm"]

      - id: "portainer"
        name: "Portainer"
        url: "https://portainer.local:9443"
        icon: "portainer"
        description: "Container & Kubernetes Management"
        pingUrl: "https://portainer.local:9443/api/system/status"
        target: "_blank"
        tags: ["docker", "containers"]

      - id: "truenas"
        name: "TrueNAS Scale"
        url: "https://truenas.local"
        icon: "truenas"
        description: "ZFS Storage Pool & Network Shares"
        pingUrl: "https://truenas.local"
        target: "_blank"
        tags: ["storage", "zfs", "nas"]

      - id: "dockge"
        name: "Dockge"
        url: "http://dockge.local:5001"
        icon: "docker"
        description: "Reactive Docker Compose Manager"
        pingUrl: "http://dockge.local:5001"
        target: "_blank"
        tags: ["docker", "compose"]

  - id: "network-security"
    name: "Network & Security"
    icon: "shield-check"
    columns: 4
    collapsed: false
    services:
      - id: "pihole"
        name: "Pi-hole"
        url: "http://pihole.local/admin"
        icon: "pi-hole"
        description: "Network-wide Ad & Tracker Blocker"
        pingUrl: "http://pihole.local/admin/index.php"
        target: "_blank"
        tags: ["dns", "adblock", "security"]

      - id: "adguard"
        name: "AdGuard Home"
        url: "http://adguard.local:3000"
        icon: "adguard-home"
        description: "DNS Privacy & Content Filtering"
        pingUrl: "http://adguard.local:3000/control/status"
        target: "_blank"
        tags: ["dns", "adblock", "privacy"]

      - id: "vaultwarden"
        name: "Vaultwarden"
        url: "https://vault.local"
        icon: "vaultwarden"
        description: "Bitwarden-compatible Password Vault"
        pingUrl: "https://vault.local/alive"
        target: "_blank"
        tags: ["security", "passwords", "vault"]

      - id: "nginx-proxy-manager"
        name: "Nginx Proxy Manager"
        url: "http://npm.local:81"
        icon: "nginx-proxy-manager"
        description: "Reverse Proxy & SSL Certificate Portal"
        pingUrl: "http://npm.local:81"
        target: "_blank"
        tags: ["proxy", "ssl", "network"]

      - id: "cloudflare"
        name: "Cloudflare Zero Trust"
        url: "https://dash.cloudflare.com"
        icon: "cloudflare"
        description: "Tunnels, DNS & Edge Security"
        target: "_blank"
        tags: ["dns", "cloud", "security"]

  - id: "automation"
    name: "Smart Home & Automation"
    icon: "home"
    columns: 3
    collapsed: false
    services:
      - id: "homeassistant"
        name: "Home Assistant"
        url: "http://homeassistant.local:8123"
        icon: "home-assistant"
        description: "Open-source Home Automation Platform"
        pingUrl: "http://homeassistant.local:8123"
        target: "_blank"
        tags: ["iot", "automation", "smart-home"]

      - id: "zigbee2mqtt"
        name: "Zigbee2MQTT"
        url: "http://zigbee.local:8080"
        icon: "zigbee2mqtt"
        description: "Zigbee to MQTT Device Bridge"
        pingUrl: "http://zigbee.local:8080"
        target: "_blank"
        tags: ["iot", "zigbee", "mqtt"]

      - id: "nodered"
        name: "Node-RED"
        url: "http://nodered.local:1880"
        icon: "node-red"
        description: "Low-code Flow-based Automation Engine"
        pingUrl: "http://nodered.local:1880"
        target: "_blank"
        tags: ["automation", "flow"]

  - id: "monitoring-downloads"
    name: "Monitoring & Telemetry"
    icon: "activity"
    columns: 4
    collapsed: false
    services:
      - id: "grafana"
        name: "Grafana"
        url: "http://grafana.local:3000"
        icon: "grafana"
        description: "Real-time Metrics, Graphs & Dashboards"
        pingUrl: "http://grafana.local:3000/api/health"
        target: "_blank"
        tags: ["metrics", "monitoring", "telemetry"]

      - id: "prometheus"
        name: "Prometheus"
        url: "http://prometheus.local:9090"
        icon: "prometheus"
        description: "Time-series Monitoring Database"
        pingUrl: "http://prometheus.local:9090/-/healthy"
        target: "_blank"
        tags: ["metrics", "timeseries"]

      - id: "uptime-kuma"
        name: "Uptime Kuma"
        url: "http://uptime.local:3001"
        icon: "uptime-kuma"
        description: "Self-hosted Uptime Monitoring Service"
        pingUrl: "http://uptime.local:3001"
        target: "_blank"
        tags: ["monitoring", "uptime"]

      - id: "qbittorrent"
        name: "qBittorrent"
        url: "http://qbittorrent.local:8080"
        icon: "qbittorrent"
        description: "BitTorrent Download Client with Web UI"
        pingUrl: "http://qbittorrent.local:8080"
        target: "_blank"
        tags: ["downloads", "torrent"]
`;
