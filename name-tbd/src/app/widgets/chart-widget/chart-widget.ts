import { Component, DestroyRef, ElementRef, afterNextRender, computed, inject, signal } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { APP_SESSION } from '../../core/ports/app-ports';
import { ChartCombine, ChartPoint, chartPoints, foldSmallest, formatValue, niceScale } from '../../core/rendering/chart-data';
import { bindDataSource, columnIndex } from '../_shared/data-source-binding';

/** Shown in the editor until a data source is picked, so the chart's shape is visible. */
const SAMPLE: ChartPoint[] = [
  { label: 'Jan', value: 4 }, { label: 'Feb', value: 7 }, { label: 'Mar', value: 5 }, { label: 'Apr', value: 9 }, { label: 'May', value: 6 },
];
/** Bars and points at most (the rest is folded into "Other"); a pie has as many slices as palette colors. */
const MAX_POINTS = 60;
const MAX_SLICES = 8;
/** Room around the plot for the axis labels, in px. */
const PAD = { top: 8, right: 8, bottom: 22, left: 40 };
const BAR_MAX = 24;
const BAR_RADIUS = 4;

/**
 * A bar, line or pie chart of a data source: labels from one column, values from another (summed,
 * counted or averaged per label). Drawn as SVG by hand, so the exported app needs no chart library.
 * One series: bars and lines in the theme's color (or the chart's own); pie slices in the fixed
 * categorical palette (chart-widget.scss), in order, the smallest folded into "Other".
 * Hovering a mark shows its value; screen readers get the data as a table.
 */
@Component({
  selector: 'app-chart-widget',
  templateUrl: './chart-widget.html',
  styleUrl: './chart-widget.scss',
})
export class ChartWidget extends BaseWidget {
  private readonly session = inject(APP_SESSION);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly source = bindDataSource(this.props);

  readonly size = signal({ width: 600, height: 300 });
  readonly hovered = signal<number | null>(null);

  readonly kind = computed(() => (this.text('chartType') ?? 'Bar').toLowerCase() as 'bar' | 'line' | 'pie');
  readonly title = computed(() => this.text('title') ?? '');
  readonly color = computed(() => this.text('color') ?? null);
  readonly titleId = computed(() => `chart-${this.id()}-title`);

  /** The data's points, or null when there's no data to show. */
  private readonly data = computed<ChartPoint[] | null>(() => {
    const table = this.source.table();
    if (!table) return null;
    const label = columnIndex(table, this.props(), 'labelColumn');
    const value = columnIndex(table, this.props(), 'valueColumn');
    return chartPoints(table, label, value, (this.text('combine') ?? 'Sum') as ChartCombine);
  });
  /** Sample points while editing a chart without data. */
  readonly sample = computed(() => this.source.id() === null && !this.session.live());
  readonly points = computed(() => {
    const points = this.sample() ? SAMPLE : this.data() ?? [];
    return foldSmallest(points, this.kind() === 'pie' ? MAX_SLICES : MAX_POINTS);
  });
  readonly summary = computed(() =>
    `${this.kind()} chart${this.title() ? ': ' + this.title() : ''}. ` + this.points().map((p) => `${p.label}: ${formatValue(p.value)}`).join(', '),
  );

  // ─── Bars and lines ─────────────────────────────────────────────────────
  private readonly plot = computed(() => {
    const { width, height } = this.size();
    return { x: PAD.left, y: PAD.top, w: Math.max(10, width - PAD.left - PAD.right), h: Math.max(10, height - PAD.top - PAD.bottom) };
  });
  private readonly scale = computed(() => niceScale(Math.max(0, ...this.points().map((p) => p.value))));
  readonly gridlines = computed(() => {
    const { max, step } = this.scale();
    const plot = this.plot();
    const lines = [];
    for (let v = 0; v <= max + step / 2; v += step) lines.push({ y: plot.y + plot.h - (v / max) * plot.h, label: formatValue(v) });
    return lines;
  });
  /** Each point's place: its band's center, its top, and (for bars) the bar's outline. */
  readonly marks = computed(() => {
    const points = this.points();
    const plot = this.plot();
    const { max } = this.scale();
    const band = plot.w / Math.max(1, points.length);
    const width = Math.min(BAR_MAX, band * 0.6);
    const base = plot.y + plot.h;
    // Not every label fits under a narrow band: every n-th is shown
    const every = Math.max(1, Math.ceil((points.length * 56) / plot.w));
    return points.map((point, i) => {
      const cx = plot.x + band * i + band / 2;
      const top = base - (Math.max(0, point.value) / max) * plot.h;
      return { ...point, cx, top, bar: barPath(cx - width / 2, top, width, base - top), showLabel: i % every === 0, text: formatValue(point.value) };
    });
  });
  readonly linePath = computed(() => this.marks().map((m, i) => `${i ? 'L' : 'M'}${m.cx},${m.top}`).join(' '));
  /** The bar or point under the pointer, for its tooltip. */
  readonly hoveredMark = computed(() => {
    const i = this.hovered();
    return i === null || this.kind() === 'pie' ? null : this.marks()[i] ?? null;
  });
  readonly baseline = computed(() => this.plot().y + this.plot().h);
  readonly plotBox = this.plot;

  // ─── Pie ────────────────────────────────────────────────────────────────
  readonly slices = computed(() => {
    const points = this.points().filter((p) => p.value > 0);
    const total = points.reduce((sum, p) => sum + p.value, 0);
    const { width, height } = this.size();
    const r = Math.max(10, Math.min(width, height) / 2 - 8);
    const cx = width / 2, cy = height / 2;
    let angle = -Math.PI / 2;
    return points.map((point, i) => {
      const sweep = (point.value / total) * Math.PI * 2;
      const path = slicePath(cx, cy, r, angle, angle + sweep);
      angle += sweep;
      return { ...point, path, slot: i + 1, text: formatValue(point.value), percent: Math.round((point.value / total) * 100) };
    });
  });

  constructor() {
    super();
    const destroyRef = inject(DestroyRef);
    // Draw at the size the cells give it (no ResizeObserver: e.g. in tests, keep the default)
    afterNextRender(() => {
      if (typeof ResizeObserver === 'undefined') return;
      const observer = new ResizeObserver(([entry]) => {
        const svg = entry.contentRect;
        if (svg.width > 0 && svg.height > 0) this.size.set({ width: svg.width, height: svg.height });
      });
      const plotArea = this.host.querySelector('.plot');
      if (plotArea) observer.observe(plotArea);
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }
}

/** A bar with 4px rounded corners at its data end, square at the baseline. */
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return '';
  const r = Math.min(BAR_RADIUS, h, w / 2);
  return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
}

function slicePath(cx: number, cy: number, r: number, from: number, to: number): string {
  if (to - from >= Math.PI * 2 - 1e-6) return `M${cx - r},${cy} a${r},${r} 0 1,0 ${2 * r},0 a${r},${r} 0 1,0 ${-2 * r},0`;
  const x1 = cx + r * Math.cos(from), y1 = cy + r * Math.sin(from);
  const x2 = cx + r * Math.cos(to), y2 = cy + r * Math.sin(to);
  return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${to - from > Math.PI ? 1 : 0},1 ${x2},${y2} Z`;
}
