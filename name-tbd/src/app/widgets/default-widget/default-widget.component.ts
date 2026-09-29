import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-default-widget',
  standalone: true,
  templateUrl: './default-widget.component.html',
  styleUrl: './default-widget.component.scss'
})
export class DefaultWidgetComponent {
  @Input() type: string = 'unknown';
}
