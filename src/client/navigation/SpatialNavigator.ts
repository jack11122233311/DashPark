export class SpatialNavigator {
  private focusedIndex: number = -1;
  private cheatsheetDialog: HTMLDialogElement | null = null;

  constructor() {
    this.initCheatsheet();
    this.attachKeyboardListener();
  }

  private initCheatsheet(): void {
    let dialog = document.getElementById('cheatsheet-dialog') as HTMLDialogElement | null;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'cheatsheet-dialog';
      dialog.className = 'shortcut-cheatsheet-dialog';
      dialog.innerHTML = `
        <div class="cheatsheet-modal">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <h3 style="font-weight: 700;">⌨️ Keyboard Navigation Cheatsheet</h3>
            <button type="button" class="toast-close" id="cheatsheet-close-btn">&times;</button>
          </div>
          <div class="cheatsheet-grid">
            <div class="cheatsheet-item">
              <span>Spotlight Search</span>
              <kbd>⌘K / Ctrl+K</kbd>
            </div>
            <div class="cheatsheet-item">
              <span>Search Services</span>
              <kbd>/</kbd>
            </div>
            <div class="cheatsheet-item">
              <span>Card Navigation</span>
              <kbd>↑ ↓ ← → / H J K L</kbd>
            </div>
            <div class="cheatsheet-item">
              <span>Open Focused Service</span>
              <kbd>Enter / O</kbd>
            </div>
            <div class="cheatsheet-item">
              <span>Copy Service URL</span>
              <kbd>S</kbd>
            </div>
            <div class="cheatsheet-item">
              <span>Grid / Bento / List</span>
              <kbd>Ctrl+1 / 2 / 3</kbd>
            </div>
            <div class="cheatsheet-item">
              <span>Settings Hub</span>
              <kbd>Ctrl+E</kbd>
            </div>
            <div class="cheatsheet-item">
              <span>Cheatsheet Help</span>
              <kbd>?</kbd>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(dialog);
    }
    this.cheatsheetDialog = dialog;
    dialog.querySelector('#cheatsheet-close-btn')?.addEventListener('click', () => dialog.close());
  }

  private attachKeyboardListener(): void {
    window.addEventListener('keydown', (e) => {
      // Ignore if user is typing in an input/textarea or if dialogs are open (except cheatsheet)
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement?.tagName || ''))) {
        return;
      }

      if (e.key === '?' && !document.querySelector('dialog[open]')) {
        e.preventDefault();
        this.cheatsheetDialog?.showModal();
        return;
      }

      if (document.querySelector('dialog[open]')) {
        return;
      }

      const cards = this.getVisibleCards();
      if (cards.length === 0) return;

      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'l') {
        e.preventDefault();
        this.navigate(1, cards);
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'h') {
        e.preventDefault();
        this.navigate(-1, cards);
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'j') {
        e.preventDefault();
        this.navigateVertical(1, cards);
      } else if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'k') {
        e.preventDefault();
        this.navigateVertical(-1, cards);
      } else if (e.key === 'Enter' || e.key.toLowerCase() === 'o') {
        if (this.focusedIndex >= 0 && this.focusedIndex < cards.length) {
          e.preventDefault();
          const card = cards[this.focusedIndex];
          const href = card.getAttribute('href') || card.querySelector('a')?.getAttribute('href');
          if (href && !href.startsWith('javascript')) {
            window.open(href, card.getAttribute('target') || '_blank');
          }
        }
      } else if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.metaKey) {
        if (this.focusedIndex >= 0 && this.focusedIndex < cards.length) {
          e.preventDefault();
          const card = cards[this.focusedIndex];
          const href = card.getAttribute('href') || card.querySelector('a')?.getAttribute('href');
          if (href) {
            navigator.clipboard?.writeText(href);
          }
        }
      } else if (e.key === 'Escape') {
        this.clearFocus(cards);
      }
    });
  }

  private getVisibleCards(): HTMLElement[] {
    const list = Array.from(document.querySelectorAll<HTMLElement>('.service-card, .bento-card, .compact-row'));
    return list.filter((el) => {
      const isVisible = el.offsetParent !== null || el.style.display !== 'none';
      return isVisible;
    });
  }

  private navigate(delta: number, cards: HTMLElement[]): void {
    if (this.focusedIndex === -1) {
      this.focusedIndex = 0;
    } else {
      this.focusedIndex = (this.focusedIndex + delta + cards.length) % cards.length;
    }
    this.applyFocus(cards);
  }

  private navigateVertical(direction: number, cards: HTMLElement[]): void {
    if (this.focusedIndex === -1) {
      this.focusedIndex = 0;
    } else {
      // Approximate grid column step
      const step = 3;
      this.focusedIndex = (this.focusedIndex + (direction * step) + cards.length) % cards.length;
    }
    this.applyFocus(cards);
  }

  private applyFocus(cards: HTMLElement[]): void {
    cards.forEach((c, idx) => {
      c.classList.toggle('keyboard-focused', idx === this.focusedIndex);
    });

    const target = cards[this.focusedIndex];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  public clearFocus(cards?: HTMLElement[]): void {
    this.focusedIndex = -1;
    (cards || this.getVisibleCards()).forEach((c) => c.classList.remove('keyboard-focused'));
  }
}
