import { describe, it, expect } from 'vitest';
import { parseConfig } from '../src/server/config/parser.js';
import { stringify as stringifyYaml } from 'yaml';
import type { DashParkConfig } from '../src/shared/types.js';

describe('Config Persistence & Field Preservation Engine', () => {
  it('should parse and retain pages, widgets, shortcuts, and bentoSpans through parseConfig without field loss', () => {
    const originalYaml = `
version: "0.3.0"
meta:
  title: "Homelab Central"
pages:
  - id: "media"
    name: "Media Streaming"
    icon: "film"
    categories:
      - id: "streaming"
        name: "Streaming Servers"
        services:
          - id: "emby"
            name: "Emby Server"
            url: "http://192.168.1.100:8096"
            bentoSpan: "2x2"
            widget:
              enabled: true
              type: "stat"
              url: "http://192.168.1.100:8096/System/Info/Public"
              jsonPath: "ServerName"
              label: "Server"
              showGraph: true
            shortcuts:
              - name: "Dashboard"
                url: "http://192.168.1.100:8096/web"
`;

    const result = parseConfig(originalYaml);
    expect(result.valid).toBe(true);
    expect(result.config).toBeDefined();

    const config = result.config!;
    expect(config.pages).toHaveLength(1);
    expect(config.pages![0].id).toBe('media');

    const service = config.pages![0].categories[0].services[0];
    expect(service.id).toBe('emby');
    expect(service.bentoSpan).toBe('2x2');
    expect(service.widget).toBeDefined();
    expect(service.widget?.enabled).toBe(true);
    expect(service.widget?.showGraph).toBe(true);
    expect(service.widget?.jsonPath).toBe('ServerName');
    expect(service.shortcuts).toHaveLength(1);
    expect(service.shortcuts![0].name).toBe('Dashboard');
  });

  it('should simulate editing a service name, bentoSpan, and widget, serializing to YAML, and re-parsing', () => {
    const initialYaml = `
version: "0.3.0"
meta:
  title: "Homelab"
pages:
  - id: "home"
    name: "Home"
    categories:
      - id: "sec"
        name: "Security"
        services:
          - id: "pihole"
            name: "Pi-hole"
            url: "http://192.168.1.2:8080"
            bentoSpan: "1x1"
            widget:
              enabled: true
              type: "stat"
              showGraph: false
`;

    const firstParse = parseConfig(initialYaml);
    expect(firstParse.valid).toBe(true);
    const configToEdit: DashParkConfig = JSON.parse(JSON.stringify(firstParse.config!));

    // Simulate User Edit in Visual Editor
    configToEdit.pages![0].categories[0].services[0].name = 'Pi-hole AdBlock Primary';
    configToEdit.pages![0].categories[0].services[0].bentoSpan = '2x1';
    configToEdit.pages![0].categories[0].services[0].widget!.showGraph = true;

    // Simulate Save Serialization (cleaning root categories for multi-page)
    const configToSerialize = JSON.parse(JSON.stringify(configToEdit));
    if (configToSerialize.pages && configToSerialize.pages.length > 0) {
      delete configToSerialize.categories;
    }
    const serializedYaml = stringifyYaml(configToSerialize);

    // Simulate Server Parse on Save
    const secondParse = parseConfig(serializedYaml);
    expect(secondParse.valid).toBe(true);
    const savedConfig = secondParse.config!;

    const savedSvc = savedConfig.pages![0].categories[0].services[0];
    expect(savedSvc.name).toBe('Pi-hole AdBlock Primary');
    expect(savedSvc.bentoSpan).toBe('2x1');
    expect(savedSvc.widget?.showGraph).toBe(true);
  });
});
