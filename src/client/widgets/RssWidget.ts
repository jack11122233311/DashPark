export interface RssFeedSource {
  id: string;
  name: string;
  url: string;
  icon: string;
}

export const DEFAULT_RSS_FEEDS: RssFeedSource[] = [
  { id: 'hn', name: 'Hacker News', url: 'https://news.ycombinator.com/rss', icon: '🔶' },
  { id: 'homelab', name: 'r/homelab', url: 'https://www.reddit.com/r/homelab/.rss', icon: '🖥️' },
  { id: 'selfhosted', name: 'r/selfhosted', url: 'https://www.reddit.com/r/selfhosted/.rss', icon: '🏠' },
  { id: 'verge', name: 'The Verge', url: 'https://www.theverge.com/rss/index.xml', icon: '⚡' },
  { id: 'arstechnica', name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index', icon: '🔬' },
];

export interface RssArticle {
  title: string;
  link: string;
  pubDate?: string;
  snippet?: string;
  author?: string;
}

export class RssWidget {
  private containerId: string;
  private currentFeedId: string = 'hn';
  private customFeeds: RssFeedSource[] = [];
  private articles: RssArticle[] = [];
  private isLoading: boolean = false;
  private isCollapsed: boolean = false;

  constructor(containerId: string = 'rss-news-widget-container') {
    this.containerId = containerId;
    this.loadPreferences();
  }

  private loadPreferences(): void {
    try {
      const savedFeed = localStorage.getItem('dashpark_rss_feed_id');
      if (savedFeed) this.currentFeedId = savedFeed;
      const collapsed = localStorage.getItem('dashpark_rss_collapsed');
      if (collapsed === 'true') this.isCollapsed = true;
    } catch {
      // Ignore
    }
  }

  public init(): void {
    let container = document.getElementById(this.containerId);
    if (!container) {
      const categoriesEl = document.getElementById('categories-container');
      if (!categoriesEl) return;
      container = document.createElement('div');
      container.id = this.containerId;
      container.className = 'rss-news-widget-container';
      categoriesEl.parentElement?.insertBefore(container, categoriesEl);
    }

    this.render();
    this.fetchCurrentFeed();
  }

  public async fetchCurrentFeed(): Promise<void> {
    const allFeeds = [...DEFAULT_RSS_FEEDS, ...this.customFeeds];
    const feed = allFeeds.find((f) => f.id === this.currentFeedId) || DEFAULT_RSS_FEEDS[0];

    this.isLoading = true;
    this.renderLoading();

    try {
      const query = new URLSearchParams({ url: feed.url });
      const res = await fetch(`/api/v1/rss?${query.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.items)) {
        this.articles = data.items;
      } else {
        this.articles = [];
      }
    } catch {
      this.articles = [];
    } finally {
      this.isLoading = false;
      this.render();
    }
  }

  public render(): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    const allFeeds = [...DEFAULT_RSS_FEEDS, ...this.customFeeds];

    container.innerHTML = `
      <div class="rss-card ${this.isCollapsed ? 'collapsed' : ''}">
        <div class="rss-header">
          <div class="rss-header-left">
            <span class="rss-icon">📰</span>
            <h3 class="rss-title">Live News & Feeds</h3>
            <div class="rss-feed-tabs">
              ${allFeeds
                .map(
                  (f) => `
                    <button 
                      type="button" 
                      class="rss-tab-btn ${f.id === this.currentFeedId ? 'active' : ''}" 
                      data-rss-id="${f.id}"
                      title="${f.name}"
                    >
                      <span>${f.icon}</span>
                      <span>${f.name}</span>
                    </button>
                  `
                )
                .join('')}
            </div>
          </div>
          <div class="rss-header-actions">
            <button type="button" class="rss-action-btn" id="rss-refresh-btn" title="Refresh feed">🔄</button>
            <button type="button" class="rss-action-btn" id="rss-toggle-btn" title="${this.isCollapsed ? 'Expand' : 'Collapse'}">
              ${this.isCollapsed ? '▼' : '▲'}
            </button>
          </div>
        </div>

        <div class="rss-body ${this.isCollapsed ? 'hidden' : ''}">
          ${this.renderArticlesList()}
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  private renderArticlesList(): string {
    if (this.isLoading) {
      return `<div class="rss-loading"><div class="spinner" style="width: 24px; height: 24px;"></div><span>Fetching latest articles...</span></div>`;
    }

    if (this.articles.length === 0) {
      return `<div class="rss-empty">No articles currently available from this feed.</div>`;
    }

    return `
      <div class="rss-articles-grid">
        ${this.articles
          .slice(0, 10)
          .map((art) => {
            const timeAgo = art.pubDate ? this.formatRelativeTime(art.pubDate) : '';
            return `
              <a 
                href="${this.escapeHtml(art.link)}" 
                target="_blank" 
                rel="noopener noreferrer" 
                class="rss-article-item"
              >
                <div class="rss-article-header">
                  <span class="rss-article-title">${this.escapeHtml(art.title)}</span>
                  ${timeAgo ? `<span class="rss-article-date">${timeAgo}</span>` : ''}
                </div>
                ${art.snippet ? `<p class="rss-article-snippet">${this.escapeHtml(art.snippet)}</p>` : ''}
              </a>
            `;
          })
          .join('')}
      </div>
    `;
  }

  private renderLoading(): void {
    const body = document.querySelector('.rss-body');
    if (body) {
      body.innerHTML = `<div class="rss-loading"><div class="spinner" style="width: 24px; height: 24px;"></div><span>Fetching latest articles...</span></div>`;
    }
  }

  private attachEventListeners(): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;

    container.querySelectorAll<HTMLButtonElement>('.rss-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-rss-id');
        if (id && id !== this.currentFeedId) {
          this.currentFeedId = id;
          try {
            localStorage.setItem('dashpark_rss_feed_id', id);
          } catch {
            // Ignore
          }
          this.fetchCurrentFeed();
        }
      });
    });

    const refreshBtn = container.querySelector('#rss-refresh-btn');
    refreshBtn?.addEventListener('click', () => {
      this.fetchCurrentFeed();
    });

    const toggleBtn = container.querySelector('#rss-toggle-btn');
    toggleBtn?.addEventListener('click', () => {
      this.isCollapsed = !this.isCollapsed;
      try {
        localStorage.setItem('dashpark_rss_collapsed', String(this.isCollapsed));
      } catch {
        // Ignore
      }
      this.render();
    });
  }

  private formatRelativeTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      const diffMs = Date.now() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMin / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMin < 1) return 'just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return 'yesterday';
      return `${diffDays}d ago`;
    } catch {
      return '';
    }
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
