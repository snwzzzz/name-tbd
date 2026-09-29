import { Component } from '@angular/core';
import { BaseWidget } from '../../core/base-widget';

@Component({
  selector: 'app-button-widget',
  standalone: true,
  templateUrl: './button-widget.component.html',
  styleUrl: './button-widget.component.scss'
})
export class ButtonWidgetComponent extends BaseWidget {
  // label is now read from props().label
}
