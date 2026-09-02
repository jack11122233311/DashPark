import { describe, it, expect } from 'vitest';
import { SearchEngineBar, SEARCH_ENGINES } from '../src/client/search/SearchEngineBar.js';

describe('SearchEngineBar & Bang Syntax', () => {
  it('contains essential default search engines with bangs', () => {
    const ids = SEARCH_ENGINES.map((e) => e.id);
    expect(ids).toContain('google');
    expect(ids).toContain('duckduckgo');
    expect(ids).toContain('youtube');
    expect(ids).toContain('reddit');
    expect(ids).toContain('github');

    const yt = SEARCH_ENGINES.find((e) => e.bang === '!yt');
    expect(yt).toBeDefined();
    expect(yt?.urlTemplate).toContain('youtube.com');
  });

  it('instantiates and allows switching active search engine', () => {
    (global as any).document = {
      querySelector: () => null,
      getElementById: () => null,
      querySelectorAll: () => [],
    };
    (global as any).localStorage = {
      getItem: () => null,
      setItem: () => {},
    };

    const bar = new SearchEngineBar();
    expect(bar.getActiveEngine().id).toBe('google');

    bar.setActiveEngine('duckduckgo');
    expect(bar.getActiveEngine().id).toBe('duckduckgo');

    bar.setActiveEngine('github');
    expect(bar.getActiveEngine().id).toBe('github');
  });
});
