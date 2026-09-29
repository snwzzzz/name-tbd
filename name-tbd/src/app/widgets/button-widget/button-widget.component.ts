import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-button-widget',
  standalone: true,
  templateUrl: './button-widget.component.html',
  styleUrl: './button-widget.component.scss'
})
export class ButtonWidgetComponent {
  @Input() label: string = 'Angular Button';
}
