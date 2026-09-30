import { Component, computed } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';

@Component({
  selector: 'app-button-widget',
  templateUrl: './button-widget.html',
  styleUrl: './button-widget.scss',
})
export class ButtonWidget extends BaseWidget {
  readonly label = computed(() => this.text('label') ?? 'Button');
  readonly color = computed(() => this.text('color') ?? '#3b82f6');
}
