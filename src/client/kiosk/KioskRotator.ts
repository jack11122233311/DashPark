export interface KioskRotatorOptions {
  getPageIds: () => string[];
  onPageChange: (pageId: string) => void;
  intervalSeconds?: number;
}

export class KioskRotator {
  private options: KioskRotatorOptions;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private timer: NodeJS.Timeout | null = null;
  private progressInterval: NodeJS.Timeout | null = null;
  private progressBar: HTMLElement | null = null;
  private progressFill: HTMLElement | null = null;
  private currentProgressMs: number = 0;
  private totalIntervalMs: number;
  private currentIndex: number = 0;

  constructor(options: KioskRotatorOptions) {
    this.options = options;
    this.totalIntervalMs = (options.intervalSeconds || 20) * 1000;
    this.initProgressBar();
    this.attachPauseListeners();
  }

  private initProgressBar(): void {
    let bar = document.getElementById('kiosk-progress-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'kiosk-progress-bar';
      bar.className = 'kiosk-progress-bar';
      bar.innerHTML = '<div class="kiosk-progress-fill" id="kiosk-progress-fill"></div>';
      document.body.appendChild(bar);
    }
    this.progressBar = bar;
    this.progressFill = bar.querySelector('#kiosk-progress-fill');
  }

  private attachPauseListeners(): void {
    let resumeTimeout: NodeJS.Timeout | null = null;

    const onUserActivity = () => {
      if (!this.isRunning) return;
      this.isPaused = true;
      if (this.progressBar) this.progressBar.style.opacity = '0.3';

      if (resumeTimeout) clearTimeout(resumeTimeout);
      resumeTimeout = setTimeout(() => {
        this.isPaused = false;
        if (this.progressBar) this.progressBar.style.opacity = '1';
      }, 8000);
    };

    window.addEventListener('mousemove', onUserActivity);
    window.addEventListener('keydown', onUserActivity);
    window.addEventListener('touchstart', onUserActivity);
  }

  public start(): void {
    const pageIds = this.options.getPageIds();
    if (pageIds.length <= 1) return;

    this.isRunning = true;
    this.isPaused = false;
    this.currentProgressMs = 0;
    this.progressBar?.classList.add('active');

    this.startProgressTicker();
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.progressBar?.classList.remove('active');
    if (this.progressInterval) clearInterval(this.progressInterval);
    if (this.timer) clearTimeout(this.timer);
    if (this.progressFill) this.progressFill.style.width = '0%';
  }

  public toggle(): boolean {
    if (this.isRunning) {
      this.stop();
      return false;
    } else {
      this.start();
      return true;
    }
  }

  public isActive(): boolean {
    return this.isRunning;
  }

  private startProgressTicker(): void {
    if (this.progressInterval) clearInterval(this.progressInterval);

    const stepMs = 100;
    this.progressInterval = setInterval(() => {
      if (!this.isRunning || this.isPaused) return;

      this.currentProgressMs += stepMs;
      const pct = Math.min(100, (this.currentProgressMs / this.totalIntervalMs) * 100);

      if (this.progressFill) {
        this.progressFill.style.width = `${pct}%`;
      }

      if (this.currentProgressMs >= this.totalIntervalMs) {
        this.currentProgressMs = 0;
        this.advanceToNextPage();
      }
    }, stepMs);
  }

  private advanceToNextPage(): void {
    const pageIds = this.options.getPageIds();
    if (pageIds.length === 0) return;

    this.currentIndex = (this.currentIndex + 1) % pageIds.length;
    const nextPageId = pageIds[this.currentIndex];
    this.options.onPageChange(nextPageId);
  }
}
