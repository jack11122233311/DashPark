export const DEFAULT_SAMPLE_YAML = `# ==============================================================================
# DashPark v0.3.0 Showcase Homelab Configuration
# Multi-Page Architecture & Bento Grid Tile Spans
# Documentation: https://github.com/jack11122233311/DashPark
# ==============================================================================

version: "0.3.0"

meta:
  title: "Homelab Central"
  subtitle: "Production Server Park & Media Array"
  theme: "dark" # dark | light | nord | dracula | catppuccin | cyberpunk | glass
  accentColor: "#6366f1"
  layout: "grid" # grid | bento | compact
  showClock: true
  clockFormat: "24h" # 12h | 24h
  searchEngine:
    enabled: true
    provider: "duckduckgo" # duckduckgo | google | brave | custom

pages:
  - id: "home"
    name: "Overview"
    icon: "home"
    description: "Core Services, Security & Telemetry Hub"
    categories:
      - id: "security"
        name: "Security & Network Defense"
        icon: "shield"
        columns: 4
        services:
          - id: "pihole"
            name: "Pi-hole DNS"
            url: "http://192.168.1.2:8080/admin"
            pingUrl: "http://192.168.1.2:8080/admin/api.php?summaryRaw"
            icon: "pihole"
            description: "Network-wide ad blocker & local DNS sinkhole"
            target: "_blank"
            bentoSpan: "2x1"
            tags: ["dns", "security", "adblock"]
            widget:
              enabled: true
              type: "stat"
              url: "http://192.168.1.2:8080/admin/api.php?summaryRaw"
              jsonPath: "ads_blocked_today"
              label: "Blocked"
              showGraph: true
            shortcuts:
              - name: "Query Log"
                url: "http://192.168.1.2:8080/admin/queries.php"
              - name: "Settings"
                url: "http://192.168.1.2:8080/admin/settings.php"

          - id: "adguard"
            name: "AdGuard Home"
            url: "http://192.168.1.3:3000"
            pingUrl: "http://192.168.1.3:3000/control/status"
            icon: "adguard-home"
            description: "Privacy protection & DNS-over-HTTPS resolver"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["dns", "security", "doh"]
            widget:
              enabled: true
              type: "stat"
              url: "http://192.168.1.3:3000/control/stats"
              jsonPath: "num_blocked_filtering"
              label: "Blocked"
              showGraph: true
            shortcuts:
              - name: "Query Log"
                url: "http://192.168.1.3:3000/#logs"
              - name: "Filters"
                url: "http://192.168.1.3:3000/#filters"

          - id: "vaultwarden"
            name: "Vaultwarden"
            url: "https://vault.homelab.local"
            pingUrl: "https://vault.homelab.local/alive"
            icon: "vaultwarden"
            description: "Self-hosted Bitwarden password vault"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["passwords", "security", "crypto"]

          - id: "npm"
            name: "Nginx Proxy Manager"
            url: "http://192.168.1.1:81"
            pingUrl: "http://192.168.1.1:81"
            icon: "nginx-proxy-manager"
            description: "SSL termination, reverse proxy & access lists"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["proxy", "ssl", "network"]
            shortcuts:
              - name: "Proxy Hosts"
                url: "http://192.168.1.1:81/nginx/proxy"
              - name: "SSL Certs"
                url: "http://192.168.1.1:81/nginx/certificates"

          - id: "wireguard"
            name: "WireGuard / WG-Easy"
            url: "http://192.168.1.1:51821"
            pingUrl: "http://192.168.1.1:51821"
            icon: "wireguard"
            description: "Encrypted mesh VPN client management"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["vpn", "tunnel", "security"]

      - id: "monitoring"
        name: "Monitoring & WAN"
        icon: "activity"
        columns: 4
        services:
          - id: "uptimekuma"
            name: "Uptime Kuma"
            url: "http://192.168.1.20:3001"
            pingUrl: "http://192.168.1.20:3001"
            icon: "uptime-kuma"
            description: "Self-hosted uptime monitoring & push alerts"
            target: "_blank"
            bentoSpan: "2x1"
            tags: ["monitoring", "uptime", "alerts"]
            widget:
              enabled: true
              type: "stat"
              url: "http://192.168.1.20:3001/api/status-page/heartbeat/default"
              jsonPath: "heartbeatList"
              label: "Uptime"
              showGraph: true
            shortcuts:
              - name: "Dashboard"
                url: "http://192.168.1.20:3001/dashboard"
              - name: "Status Page"
                url: "http://192.168.1.20:3001/status/default"

          - id: "grafana"
            name: "Grafana"
            url: "http://192.168.1.21:3000"
            pingUrl: "http://192.168.1.21:3000/api/health"
            icon: "grafana"
            description: "Interactive operational metrics dashboards"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["metrics", "dashboards", "telemetry"]
            shortcuts:
              - name: "Dashboards"
                url: "http://192.168.1.21:3000/dashboards"

          - id: "prometheus"
            name: "Prometheus"
            url: "http://192.168.1.21:9090"
            pingUrl: "http://192.168.1.21:9090/-/healthy"
            icon: "prometheus"
            description: "Time-series metrics scraper & TSDB storage"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["metrics", "timeseries"]
            shortcuts:
              - name: "Targets"
                url: "http://192.168.1.21:9090/targets"

          - id: "speedtest"
            name: "Speedtest Tracker"
            url: "http://192.168.1.20:8080"
            pingUrl: "http://192.168.1.20:8080/api/speedtest/latest"
            icon: "speedtest-tracker"
            description: "Automated internet WAN bandwidth auditor"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["wan", "speedtest", "bandwidth"]
            widget:
              enabled: true
              type: "stat"
              url: "http://192.168.1.20:8080/api/speedtest/latest"
              jsonPath: "data.download"
              label: "Download"
              unit: " Mbps"
              showGraph: true
            shortcuts:
              - name: "Results"
                url: "http://192.168.1.20:8080/results"
              - name: "Run Test"
                url: "http://192.168.1.20:8080/test"

  - id: "media-infra"
    name: "Media & Compute"
    icon: "server"
    description: "Streaming, Hypervisors, Storage & Smart Home"
    categories:
      - id: "media"
        name: "Media Servers & Streaming"
        icon: "film"
        columns: 4
        services:
          - id: "emby"
            name: "Emby Media Server"
            url: "http://host.docker.internal:8096"
            pingUrl: "http://host.docker.internal:8096/System/Info/Public"
            icon: "emby"
            description: "Personal media streaming & Live TV server"
            target: "_blank"
            bentoSpan: "2x2"
            tags: ["media", "streaming", "transcoding"]
            widget:
              enabled: true
              type: "stat"
              url: "http://host.docker.internal:8096/System/Info/Public"
              jsonPath: "ServerName"
              label: "Server"
              showGraph: true
            shortcuts:
              - name: "Dashboard"
                url: "http://host.docker.internal:8096/web/index.html#!/dashboard"
              - name: "Live TV"
                url: "http://host.docker.internal:8096/web/index.html#!/livetv"

          - id: "plex"
            name: "Plex Media Server"
            url: "http://192.168.1.100:32400/web"
            pingUrl: "http://192.168.1.100:32400/identity"
            icon: "plex"
            description: "4K HDR Movies, TV Shows & Music"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["media", "streaming", "4k"]
            shortcuts:
              - name: "Settings"
                url: "http://192.168.1.100:32400/web/index.html#!/settings/web/general"

          - id: "jellyfin"
            name: "Jellyfin"
            url: "http://192.168.1.100:8096"
            pingUrl: "http://192.168.1.100:8096/health"
            icon: "jellyfin"
            description: "Open-source privacy-focused media platform"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["media", "opensource"]

          - id: "sonarr"
            name: "Sonarr"
            url: "http://192.168.1.100:8989"
            pingUrl: "http://192.168.1.100:8989/api/v3/system/status"
            icon: "sonarr"
            description: "Automated TV series management & DVR"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["automation", "arr"]
            shortcuts:
              - name: "Calendar"
                url: "http://192.168.1.100:8989/calendar"

          - id: "radarr"
            name: "Radarr"
            url: "http://192.168.1.100:7878"
            pingUrl: "http://192.168.1.100:7878/api/v3/system/status"
            icon: "radarr"
            description: "Movie collection manager & grabber"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["automation", "arr"]

          - id: "overseerr"
            name: "Overseerr"
            url: "http://192.168.1.100:5055"
            pingUrl: "http://192.168.1.100:5055/api/v1/status"
            icon: "overseerr"
            description: "Media request & approval discovery portal"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["requests", "media"]

      - id: "infra"
        name: "Hypervisors & Containers"
        icon: "server"
        columns: 4
        services:
          - id: "proxmox"
            name: "Proxmox VE"
            url: "https://192.168.1.254:8006"
            pingUrl: "https://192.168.1.254:8006"
            icon: "proxmox"
            description: "Hypervisor cluster, KVM Virtual Machines & LXC"
            target: "_blank"
            bentoSpan: "2x1"
            tags: ["hypervisor", "virtualization", "cluster"]
            widget:
              enabled: true
              type: "stat"
              url: "https://192.168.1.254:8006/api2/json/version"
              jsonPath: "data.version"
              label: "PVE Ver"
              showGraph: true
            shortcuts:
              - name: "Console"
                url: "https://192.168.1.254:8006/#v1:0:=qemu"
              - name: "Shell"
                url: "https://192.168.1.254:8006/#v1:0:=shell"

          - id: "portainer"
            name: "Portainer CE"
            url: "https://192.168.1.10:9443"
            pingUrl: "https://192.168.1.10:9443/api/system/status"
            icon: "portainer"
            description: "Docker stack orchestration & container engine"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["docker", "containers", "orchestration"]

          - id: "truenas"
            name: "TrueNAS SCALE"
            url: "https://192.168.1.200"
            pingUrl: "https://192.168.1.200/api/v2.0/system/info"
            icon: "truenas"
            description: "ZFS RAID storage pool & NFS/SMB file shares"
            target: "_blank"
            bentoSpan: "1x1"
            tags: ["storage", "zfs", "nas"]
            shortcuts:
              - name: "Pools"
                url: "https://192.168.1.200/storage"

          - id: "dockge"
            name: "Dockge"
            url: "http://192.168.1.10:5001"
            pingUrl: "http://192.168.1.10:5001"
            icon: "dockge"
            description: "Visual compose.yaml stack manager"
            target: "_blank"
            tags: ["docker", "compose"]

      - id: "smarthome"
        name: "Smart Home & Automation"
        icon: "cpu"
        columns: 4
        services:
          - id: "homeassistant"
            name: "Home Assistant"
            url: "http://192.168.1.5:8123"
            pingUrl: "http://192.168.1.5:8123/manifest.json"
            icon: "home-assistant"
            description: "Local smart home hub & IoT automation engine"
            target: "_blank"
            bentoSpan: "2x1"
            tags: ["iot", "smarthome", "zigbee"]
            shortcuts:
              - name: "Overview"
                url: "http://192.168.1.5:8123/lovelace/0"
              - name: "Devices"
                url: "http://192.168.1.5:8123/config/devices/dashboard"

          - id: "nodered"
            name: "Node-RED"
            url: "http://192.168.1.5:1880"
            pingUrl: "http://192.168.1.5:1880"
            icon: "node-red"
            description: "Flow-based low-code visual event programming"
            target: "_blank"
            tags: ["automation", "flow", "iot"]

          - id: "zigbee2mqtt"
            name: "Zigbee2MQTT"
            url: "http://192.168.1.5:8080"
            pingUrl: "http://192.168.1.5:8080"
            icon: "zigbee2mqtt"
            description: "Zigbee coordinator bridge & device mapper"
            target: "_blank"
            tags: ["zigbee", "mqtt", "iot"]
`;
