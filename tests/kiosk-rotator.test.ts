import { describe, it, expect } from 'vitest';
import { KioskRotator } from '../src/client/kiosk/KioskRotator.js';

describe('KioskRotator Component', () => {
  it('handles start, stop, toggle, and auto-rotation state transitions', () => {
    (global as any).document = {
      getElementById: () => null,
      createElement: () => ({
        id: '',
        className: '',
        innerHTML: '',
        querySelector: () => ({ style: {} }),
        classList: { add: () => {}, remove: () => {} },
        style: {},
      }),
      body: { appendChild: () => {} },
    };
    (global as any).window = {
      addEventListener: () => {},
    };

    const pages = ['home', 'media', 'infra'];
    let currentPage = 'home';

    const rotator = new KioskRotator({
      getPageIds: () => pages,
      onPageChange: (id) => {
        currentPage = id;
      },
      intervalSeconds: 1,
    });

    expect(rotator.isActive()).toBe(false);

    const started = rotator.toggle();
    expect(started).toBe(true);
    expect(rotator.isActive()).toBe(true);

    const stopped = rotator.toggle();
    expect(stopped).toBe(false);
    expect(rotator.isActive()).toBe(false);
  });
});
