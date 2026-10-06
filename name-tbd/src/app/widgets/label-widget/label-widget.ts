import { Component, computed } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';

/** A line of text in the chosen color (Auto: the theme's text color) and size. */
@Component({
  selector: 'app-label-widget',
  templateUrl: './label-widget.html',
  styleUrl: './label-widget.scss',
})
export class LabelWidget extends BaseWidget {
  readonly content = computed(() => this.text('text') ?? 'New Label');
  readonly color = computed(() => this.text('color') ?? 'var(--widget-fg)');
}
