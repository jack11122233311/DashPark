import type { ServiceItem, BentoTileSpan } from '../../shared/types.js';

export class BentoStudio {
  public isEditMode: boolean = false;
  private draggedIndex: number | null = null;
  private onLayoutChangedCallback: (services: ServiceItem[]) => void;
  private onSaveRequestedCallback: () => Promise<void>;

  constructor(
    onLayoutChanged: (services: ServiceItem[]) => void,
    onSaveRequested: () => Promise<void>
  ) {
    this.onLayoutChangedCallback = onLayoutChanged;
    this.onSaveRequestedCallback = onSaveRequested;
  }

  public toggleEditMode(): boolean {
    this.isEditMode = !this.isEditMode;
    return this.isEditMode;
  }

  public setEditMode(active: boolean): void {
    this.isEditMode = active;
  }

  public attachDragAndDrop(
    container: HTMLElement,
    servicesList: Array<{ service: ServiceItem; categoryName: string; categoryIcon?: string }>
  ): void {
    if (!this.isEditMode) return;

    const cards = container.querySelectorAll<HTMLElement>('.bento-card');

    cards.forEach((card, index) => {
      card.setAttribute('draggable', 'true');

      card.addEventListener('dragstart', (e) => {
        this.draggedIndex = index;
        card.classList.add('bento-dragging');
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(index));
        }
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('bento-dragging');
        cards.forEach((c) => c.classList.remove('bento-drop-target'));
      });

      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (e.dataTransfer) {
          e.dataTransfer.dropEffect = 'move';
        }
        card.classList.add('bento-drop-target');
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('bento-drop-target');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        card.classList.remove('bento-drop-target');

        if (this.draggedIndex !== null && this.draggedIndex !== index) {
          const itemToMove = servicesList[this.draggedIndex];
          servicesList.splice(this.draggedIndex, 1);
          servicesList.splice(index, 0, itemToMove);

          this.onLayoutChangedCallback(servicesList.map((item) => item.service));
        }
        this.draggedIndex = null;
      });
    });
  }

  public cycleTileSpan(service: ServiceItem): BentoTileSpan {
    const current = service.bentoSpan || '1x1';
    let next: BentoTileSpan = '1x1';

    if (current === '1x1') next = '2x1';
    else if (current === '2x1') next = '2x2';
    else if (current === '2x2') next = '1x1';
    else next = '1x1';

    service.bentoSpan = next;
    return next;
  }

  public cycleTelemetryMode(service: ServiceItem): string {
    if (!service.widget) {
      service.widget = { type: 'stat', enabled: true, showGraph: true };
      return 'Graph + Stat';
    }

    if (service.widget.enabled !== false && service.widget.showGraph !== false) {
      // Switch to Stat only
      service.widget.showGraph = false;
      service.widget.enabled = true;
      return 'Stat Only';
    } else if (service.widget.enabled !== false && service.widget.showGraph === false) {
      // Switch to disabled
      service.widget.enabled = false;
      return 'Disabled';
    } else {
      // Switch back to Graph + Stat
      service.widget.enabled = true;
      service.widget.showGraph = true;
      return 'Graph + Stat';
    }
  }

  public async saveLayout(): Promise<void> {
    await this.onSaveRequestedCallback();
  }
}
