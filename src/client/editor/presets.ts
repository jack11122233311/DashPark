import type { ServiceWidget, ServiceShortcut } from '../../shared/types.js';

export interface ServicePreset {
  id: string;
  name: string;
  category: string;
  icon: string;
  urlPlaceholder: string;
  defaultPingUrl: string;
  description: string;
  tags: string[];
  widget?: ServiceWidget;
  shortcuts?: ServiceShortcut[];
  guide: {
    title: string;
    authType: 'none' | 'api-key' | 'bearer' | 'basic';
    tokenInstructions: string;
    sampleJsonPath: string;
    endpointTips: string;
  };
}

export const HOMELAB_PRESETS: ServicePreset[] = [
  {
    id: 'emby',
    name: 'Emby Media Server',
    category: 'Media & Streaming',
    icon: 'emby',
    urlPlaceholder: 'http://host.docker.internal:8096',
    defaultPingUrl: 'http://host.docker.internal:8096/System/Info/Public',
    description: 'Personal media streaming & Live TV server',
    tags: ['media', 'streaming', 'transcoding'],
    widget: {
      enabled: true,
      type: 'stat',
      url: 'http://host.docker.internal:8096/System/Info/Public',
      jsonPath: 'ServerName',
      label: 'Server',
      showGraph: true,
      refreshIntervalSeconds: 30,
    },
    shortcuts: [
      { name: 'Dashboard', url: 'http://host.docker.internal:8096/web/index.html#!/dashboard' },
      { name: 'Live TV', url: 'http://host.docker.internal:8096/web/index.html#!/livetv' },
    ],
    guide: {
      title: 'Emby Connection & API Guide',
      authType: 'none',
      tokenInstructions: 'Public system endpoints (/System/Info/Public) require no authentication. For authenticated admin stats, generate an API key in Emby Dashboard ➔ Advanced ➔ API Keys.',
      sampleJsonPath: 'ServerName (or Version, OperatingSystem)',
      endpointTips: 'In Docker, use http://host.docker.internal:8096 or your host LAN IP (http://192.168.1.X:8096).',
    },
  },
  {
    id: 'jellyfin',
    name: 'Jellyfin',
    category: 'Media & Streaming',
    icon: 'jellyfin',
    urlPlaceholder: 'http://192.168.1.100:8096',
    defaultPingUrl: 'http://192.168.1.100:8096/health',
    description: 'Free software media system',
    tags: ['media', 'opensource'],
    widget: {
      enabled: true,
      type: 'stat',
      url: 'http://192.168.1.100:8096/Sessions',
      jsonPath: 'length',
      label: 'Streams',
      showGraph: true,
      refreshIntervalSeconds: 30,
    },
    shortcuts: [
      { name: 'Dashboard', url: 'http://192.168.1.100:8096/web/index.html#!/dashboard.html' },
      { name: 'Activity', url: 'http://192.168.1.100:8096/web/index.html#!/activitylog.html' },
    ],
    guide: {
      title: 'Jellyfin Streams & Health Setup',
      authType: 'api-key',
      tokenInstructions: 'Generate an API token in Jellyfin Dashboard ➔ Advanced ➔ API Keys. Pass it as header: Authorization: MediaBrowser Token="YOUR_TOKEN"',
      sampleJsonPath: 'length (active session count) or [0].DeviceName',
      endpointTips: 'Use /health for zero-auth ping and /System/Info for server telemetry.',
    },
  },
  {
    id: 'plex',
    name: 'Plex Media Server',
    category: 'Media & Streaming',
    icon: 'plex',
    urlPlaceholder: 'http://192.168.1.100:32400/web',
    defaultPingUrl: 'http://192.168.1.100:32400/identity',
    description: '4K HDR Movies, TV Shows & Music',
    tags: ['media', 'streaming', '4k'],
    shortcuts: [
      { name: 'Settings', url: 'http://192.168.1.100:32400/web/index.html#!/settings/web/general' },
      { name: 'Activity', url: 'http://192.168.1.100:32400/web/index.html#!/status/pms/activity' },
    ],
    guide: {
      title: 'Plex Connection Guide',
      authType: 'api-key',
      tokenInstructions: 'Plex /identity endpoint is public. For library counts, append ?X-Plex-Token=YOUR_TOKEN to your URL.',
      sampleJsonPath: 'MediaContainer.version or MediaContainer.size',
      endpointTips: 'Find your Plex Token by viewing XML on any media item in Plex Web (Click "..." ➔ Get Info ➔ View XML).',
    },
  },
  {
    id: 'pihole',
    name: 'Pi-hole DNS',
    category: 'Security & Network Defense',
    icon: 'pihole',
    urlPlaceholder: 'http://192.168.1.2/admin',
    defaultPingUrl: 'http://192.168.1.2/admin/api.php?summaryRaw',
    description: 'Network-wide ad blocker & local DNS sinkhole',
    tags: ['dns', 'security', 'adblock'],
    widget: {
      enabled: true,
      type: 'stat',
      url: 'http://192.168.1.2/admin/api.php?summaryRaw',
      jsonPath: 'ads_blocked_today',
      label: 'Blocked',
      showGraph: true,
      refreshIntervalSeconds: 30,
    },
    shortcuts: [
      { name: 'Query Log', url: 'http://192.168.1.2/admin/queries.php' },
      { name: 'Settings', url: 'http://192.168.1.2/admin/settings.php' },
      { name: 'Disable 5m', url: 'http://192.168.1.2/admin/api.php?disable=300' },
    ],
    guide: {
      title: 'Pi-hole Live Telemetry Guide',
      authType: 'none',
      tokenInstructions: 'Pi-hole summary stats (/admin/api.php?summaryRaw) are public by default. For blocking toggles, copy the API token from Settings ➔ API / Web interface ➔ Show API token.',
      sampleJsonPath: 'ads_blocked_today, dns_queries_today, or ads_percentage_today',
      endpointTips: 'Format: http://<pihole-ip>/admin/api.php?summaryRaw',
    },
  },
  {
    id: 'adguard',
    name: 'AdGuard Home',
    category: 'Security & Network Defense',
    icon: 'adguard-home',
    urlPlaceholder: 'http://192.168.1.3:3000',
    defaultPingUrl: 'http://192.168.1.3:3000/control/status',
    description: 'Privacy protection & DNS-over-HTTPS resolver',
    tags: ['dns', 'security', 'doh'],
    widget: {
      enabled: true,
      type: 'stat',
      url: 'http://192.168.1.3:3000/control/stats',
      jsonPath: 'num_blocked_filtering',
      label: 'Blocked',
      showGraph: true,
      refreshIntervalSeconds: 30,
    },
    shortcuts: [
      { name: 'Query Log', url: 'http://192.168.1.3:3000/#logs' },
      { name: 'Filters', url: 'http://192.168.1.3:3000/#filters' },
      { name: 'DNS Settings', url: 'http://192.168.1.3:3000/#dns' },
    ],
    guide: {
      title: 'AdGuard Home Stats Setup',
      authType: 'basic',
      tokenInstructions: 'AdGuard Home uses HTTP Basic Auth for /control/stats. Pass base64 encoded username/password in headers: Authorization: Basic <base64_user:pass>.',
      sampleJsonPath: 'num_blocked_filtering or num_dns_queries',
      endpointTips: 'Endpoint: http://<adguard-ip>:3000/control/stats',
    },
  },
  {
    id: 'sonarr',
    name: 'Sonarr',
    category: 'Media & Streaming',
    icon: 'sonarr',
    urlPlaceholder: 'http://192.168.1.100:8989',
    defaultPingUrl: 'http://192.168.1.100:8989/api/v3/system/status',
    description: 'Automated TV series management & DVR',
    tags: ['automation', 'arr'],
    widget: {
      enabled: true,
      type: 'stat',
      url: 'http://192.168.1.100:8989/api/v3/queue',
      jsonPath: 'totalRecords',
      label: 'Queue',
      showGraph: true,
      refreshIntervalSeconds: 30,
      headers: {
        'X-Api-Key': 'YOUR_API_KEY_HERE',
      },
    },
    shortcuts: [
      { name: 'Calendar', url: 'http://192.168.1.100:8989/calendar' },
      { name: 'Queue', url: 'http://192.168.1.100:8989/activity/queue' },
      { name: 'Wanted', url: 'http://192.168.1.100:8989/wanted/missing' },
    ],
    guide: {
      title: 'Sonarr Queue & Health Guide',
      authType: 'api-key',
      tokenInstructions: 'Locate your API Key in Sonarr: Settings ➔ General ➔ Security ➔ API Key. Enter it in the headers section: X-Api-Key: <your_key>.',
      sampleJsonPath: 'totalRecords (items downloading in queue)',
      endpointTips: 'Queue endpoint: /api/v3/queue, System status: /api/v3/system/status',
    },
  },
  {
    id: 'radarr',
    name: 'Radarr',
    category: 'Media & Streaming',
    icon: 'radarr',
    urlPlaceholder: 'http://192.168.1.100:7878',
    defaultPingUrl: 'http://192.168.1.100:7878/api/v3/system/status',
    description: 'Movie collection manager & grabber',
    tags: ['automation', 'arr'],
    widget: {
      enabled: true,
      type: 'stat',
      url: 'http://192.168.1.100:7878/api/v3/queue',
      jsonPath: 'totalRecords',
      label: 'Queue',
      showGraph: true,
      refreshIntervalSeconds: 30,
      headers: {
        'X-Api-Key': 'YOUR_API_KEY_HERE',
      },
    },
    shortcuts: [
      { name: 'Queue', url: 'http://192.168.1.100:7878/activity/queue' },
      { name: 'Movies', url: 'http://192.168.1.100:7878/movies' },
    ],
    guide: {
      title: 'Radarr Queue & Activity Guide',
      authType: 'api-key',
      tokenInstructions: 'Locate your API Key in Radarr: Settings ➔ General ➔ Security ➔ API Key. Pass header: X-Api-Key: <your_key>.',
      sampleJsonPath: 'totalRecords',
      endpointTips: 'Queue endpoint: /api/v3/queue',
    },
  },
  {
    id: 'homeassistant',
    name: 'Home Assistant',
    category: 'Smart Home & Automation',
    icon: 'home-assistant',
    urlPlaceholder: 'http://192.168.1.5:8123',
    defaultPingUrl: 'http://192.168.1.5:8123/manifest.json',
    description: 'Local smart home hub & IoT automation engine',
    tags: ['iot', 'smarthome', 'zigbee'],
    widget: {
      enabled: true,
      type: 'stat',
      url: 'http://192.168.1.5:8123/api/states/sensor.temperature',
      jsonPath: 'state',
      label: 'Temp',
      unit: '°C',
      showGraph: true,
      refreshIntervalSeconds: 30,
      headers: {
        Authorization: 'Bearer YOUR_LONG_LIVED_ACCESS_TOKEN',
      },
    },
    shortcuts: [
      { name: 'Dashboard', url: 'http://192.168.1.5:8123/lovelace/0' },
      { name: 'Devices', url: 'http://192.168.1.5:8123/config/devices/dashboard' },
      { name: 'Automations', url: 'http://192.168.1.5:8123/config/automation/dashboard' },
    ],
    guide: {
      title: 'Home Assistant Entity State Guide',
      authType: 'bearer',
      tokenInstructions: 'In Home Assistant, click your Profile (bottom left) ➔ Security ➔ Long-Lived Access Tokens ➔ Create Token. Pass header: Authorization: Bearer <your_token>.',
      sampleJsonPath: 'state (or attributes.friendly_name, attributes.battery_level)',
      endpointTips: 'Query any entity: http://<ha-ip>:8123/api/states/<entity_id>',
    },
  },
  {
    id: 'proxmox',
    name: 'Proxmox VE',
    category: 'Infrastructure & Virtualization',
    icon: 'proxmox',
    urlPlaceholder: 'https://192.168.1.254:8006',
    defaultPingUrl: 'https://192.168.1.254:8006',
    description: 'Hypervisor cluster, KVM Virtual Machines & LXC',
    tags: ['hypervisor', 'virtualization', 'cluster'],
    widget: {
      enabled: true,
      type: 'stat',
      url: 'https://192.168.1.254:8006/api2/json/version',
      jsonPath: 'data.version',
      label: 'PVE Ver',
      showGraph: true,
      refreshIntervalSeconds: 60,
    },
    shortcuts: [
      { name: 'Console', url: 'https://192.168.1.254:8006/#v1:0:=qemu' },
      { name: 'Shell', url: 'https://192.168.1.254:8006/#v1:0:=shell' },
      { name: 'Cluster', url: 'https://192.168.1.254:8006/#v1:0:=cluster' },
    ],
    guide: {
      title: 'Proxmox VE Connection & Nodes Guide',
      authType: 'none',
      tokenInstructions: 'Proxmox version endpoint (/api2/json/version) is open. For node metrics (/api2/json/nodes), create an API token in Datacenter ➔ Permissions ➔ API Tokens.',
      sampleJsonPath: 'data.version or data.release',
      endpointTips: 'Self-signed HTTPS certificates on port 8006 are automatically accepted by DashPark.',
    },
  },
  {
    id: 'truenas',
    name: 'TrueNAS SCALE',
    category: 'Infrastructure & Virtualization',
    icon: 'truenas',
    urlPlaceholder: 'https://192.168.1.200',
    defaultPingUrl: 'https://192.168.1.200/api/v2.0/system/info',
    description: 'ZFS RAID storage pool & NFS/SMB file shares',
    tags: ['storage', 'zfs', 'nas'],
    widget: {
      enabled: true,
      type: 'stat',
      url: 'https://192.168.1.200/api/v2.0/system/info',
      jsonPath: 'version',
      label: 'TrueNAS',
      showGraph: true,
      refreshIntervalSeconds: 60,
    },
    shortcuts: [
      { name: 'Pools', url: 'https://192.168.1.200/storage' },
      { name: 'Shares', url: 'https://192.168.1.200/sharing' },
      { name: 'Apps', url: 'https://192.168.1.200/apps' },
    ],
    guide: {
      title: 'TrueNAS SCALE Telemetry Setup',
      authType: 'bearer',
      tokenInstructions: 'In TrueNAS web UI: Settings (top right) ➔ API Keys ➔ Add API Key. Pass header: Authorization: Bearer <your_api_key>.',
      sampleJsonPath: 'version, hostname, uptime_seconds, or system_memory.total',
      endpointTips: 'Endpoint: https://<truenas-ip>/api/v2.0/system/info',
    },
  },
  {
    id: 'uptimekuma',
    name: 'Uptime Kuma',
    category: 'Monitoring & Telemetry',
    icon: 'uptime-kuma',
    urlPlaceholder: 'http://192.168.1.20:3001',
    defaultPingUrl: 'http://192.168.1.20:3001',
    description: 'Self-hosted uptime monitoring & push alerts',
    tags: ['monitoring', 'uptime', 'alerts'],
    widget: {
      enabled: true,
      type: 'stat',
      url: 'http://192.168.1.20:3001/api/status-page/heartbeat/default',
      jsonPath: 'heartbeatList',
      label: 'Uptime',
      showGraph: true,
      refreshIntervalSeconds: 30,
    },
    shortcuts: [
      { name: 'Dashboard', url: 'http://192.168.1.20:3001/dashboard' },
      { name: 'Status Page', url: 'http://192.168.1.20:3001/status/default' },
    ],
    guide: {
      title: 'Uptime Kuma Heartbeat Guide',
      authType: 'none',
      tokenInstructions: 'Create a Status Page in Uptime Kuma with slug "default" (or your custom slug) and enable public metrics.',
      sampleJsonPath: 'heartbeatList',
      endpointTips: 'Endpoint: http://<uptime-kuma-ip>:3001/api/status-page/heartbeat/<slug>',
    },
  },
  {
    id: 'speedtest',
    name: 'Speedtest Tracker',
    category: 'Monitoring & Telemetry',
    icon: 'speedtest-tracker',
    urlPlaceholder: 'http://192.168.1.20:8080',
    defaultPingUrl: 'http://192.168.1.20:8080/api/speedtest/latest',
    description: 'Automated internet WAN bandwidth & ping auditor',
    tags: ['wan', 'speedtest', 'bandwidth'],
    widget: {
      enabled: true,
      type: 'stat',
      url: 'http://192.168.1.20:8080/api/speedtest/latest',
      jsonPath: 'data.download',
      label: 'Download',
      unit: ' Mbps',
      showGraph: true,
      refreshIntervalSeconds: 60,
    },
    shortcuts: [
      { name: 'Results', url: 'http://192.168.1.20:8080/results' },
      { name: 'Run Test', url: 'http://192.168.1.20:8080/test' },
    ],
    guide: {
      title: 'Speedtest Tracker Bandwidth Telemetry',
      authType: 'none',
      tokenInstructions: 'Speedtest Tracker exposes /api/speedtest/latest returning download, upload, and ping metrics.',
      sampleJsonPath: 'data.download, data.upload, or data.ping',
      endpointTips: 'Endpoint: http://<speedtest-ip>:8080/api/speedtest/latest',
    },
  },
];

/**
 * Intelligent Homelab URL Matcher:
 * Automatically matches IP:port, domain names, or endpoint paths to known homelab presets.
 */
export function detectServiceFromUrl(url: string): ServicePreset | null {
  if (!url || typeof url !== 'string') return null;
  const raw = url.toLowerCase().trim();

  // 1. Check direct ID/name matches in hostname or URL
  for (const preset of HOMELAB_PRESETS) {
    if (raw.includes(preset.id) || raw.includes(preset.name.toLowerCase())) {
      return preset;
    }
  }

  // 2. Check known standard homelab port signatures
  const portMatch = raw.match(/:(\d+)/);
  if (portMatch) {
    const port = portMatch[1];
    switch (port) {
      case '8096':
        return raw.includes('jellyfin')
          ? HOMELAB_PRESETS.find((p) => p.id === 'jellyfin') || null
          : HOMELAB_PRESETS.find((p) => p.id === 'emby') || null;
      case '32400':
        return HOMELAB_PRESETS.find((p) => p.id === 'plex') || null;
      case '8989':
        return HOMELAB_PRESETS.find((p) => p.id === 'sonarr') || null;
      case '7878':
        return HOMELAB_PRESETS.find((p) => p.id === 'radarr') || null;
      case '8123':
        return HOMELAB_PRESETS.find((p) => p.id === 'homeassistant') || null;
      case '8006':
        return HOMELAB_PRESETS.find((p) => p.id === 'proxmox') || null;
      case '3001':
        return HOMELAB_PRESETS.find((p) => p.id === 'uptimekuma') || null;
      case '9443':
      case '9000':
        return HOMELAB_PRESETS.find((p) => p.id === 'portainer') || null;
      case '5055':
        return HOMELAB_PRESETS.find((p) => p.id === 'overseerr') || null;
      case '1880':
        return HOMELAB_PRESETS.find((p) => p.id === 'nodered') || null;
    }
  }

  // 3. Pathname keywords
  if (raw.includes('/admin') || raw.includes('pi.hole')) {
    return HOMELAB_PRESETS.find((p) => p.id === 'pihole') || null;
  }
  if (raw.includes('/control/')) {
    return HOMELAB_PRESETS.find((p) => p.id === 'adguard') || null;
  }

  return null;
}
