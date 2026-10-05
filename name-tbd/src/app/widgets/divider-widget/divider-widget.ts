import { Component, computed } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { propNumber } from '../../_utils/widget-props.utils';

/** A line across its cells (or down them), centered; separates groups of widgets. */
@Component({
  selector: 'app-divider-widget',
  template: `
    <div
      class="divider"
      role="separator"
      [class.vertical]="vertical()"
      [attr.aria-orientation]="vertical() ? 'vertical' : 'horizontal'"
      [style.--line]="line()"></div>
  `,
  styleUrl: './divider-widget.scss',
})
export class DividerWidget extends BaseWidget {
  readonly vertical = computed(() => this.text('orientation') === 'Vertical');
  /** The line as a CSS border: thickness, style, color (Auto: the theme's stroke). */
  readonly line = computed(() => {
    const thickness = Math.min(16, Math.max(1, propNumber(this.props(), 'thickness', 1)));
    const style = (this.text('lineStyle') ?? 'Solid').toLowerCase();
    return `${thickness}px ${style} ${this.text('color') ?? 'var(--widget-stroke)'}`;
  });
}
