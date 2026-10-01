import { Component, computed } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';

@Component({
  selector: 'app-label-widget',
  templateUrl: './label-widget.html',
  styleUrl: './label-widget.scss',
})
export class LabelWidget extends BaseWidget {
  readonly content = computed(() => this.text('text') ?? 'New Label');
  readonly color = computed(() => this.text('color') ?? 'var(--widget-fg)');
}
