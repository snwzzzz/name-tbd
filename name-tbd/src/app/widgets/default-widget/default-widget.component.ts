import { Component, Input } from '@angular/core';
import { BaseWidget } from '../../core/base-widget';

@Component({
  selector: 'app-default-widget',
  standalone: true,
  templateUrl: './default-widget.component.html',
  styleUrl: './default-widget.component.scss'
})
export class DefaultWidgetComponent extends BaseWidget {
  @Input() type: string = 'unknown';
}
