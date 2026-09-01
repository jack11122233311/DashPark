import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';

export class ChartWidget {
  private static instances: Map<string, uPlot> = new Map();

  /**
   * Renders a lightweight micro-sparkline inside a card container
   */
  public static renderSparkline(
    container: HTMLElement,
    timestamps: number[],
    values: number[],
    lineColor: string = '#6366f1',
    width: number = 100,
    height: number = 28
  ): uPlot | null {
    if (!container || values.length < 2) return null;

    const containerId = container.id || `spark_${Math.random().toString(36).substring(2, 9)}`;
    container.id = containerId;

    // Destroy existing instance in this container if present
    const existing = this.instances.get(containerId);
    if (existing) {
      existing.destroy();
      this.instances.delete(containerId);
    }

    container.innerHTML = '';

    // If timestamps not provided, generate sequential indices
    const xData = timestamps && timestamps.length === values.length 
      ? timestamps 
      : Array.from({ length: values.length }, (_, i) => i);

    const data: [number[], (number | null)[]] = [xData, values];

    const opts: uPlot.Options = {
      width,
      height,
      cursor: { show: false },
      legend: { show: false },
      scales: {
        x: { time: false },
      },
      axes: [
        { show: false },
        { show: false },
      ],
      series: [
        {},
        {
          stroke: lineColor,
          width: 2,
          fill: `${lineColor}22`,
          points: { show: false },
        },
      ],
    };

    try {
      const uplot = new uPlot(opts, data, container);
      this.instances.set(containerId, uplot);
      return uplot;
    } catch {
      return null;
    }
  }

  public static destroyAll(): void {
    this.instances.forEach((inst) => inst.destroy());
    this.instances.clear();
  }
}
