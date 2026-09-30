import { Component, input, output } from '@angular/core';
import { ZoomButton } from './zoom-button';

/**
 * Floating zoom bar of a zoomable view: −, the zoom level (resets to 100%), + and Fit.
 * Extra `button[app-zoom-button]`s can be projected after a divider.
 */
@Component({
  selector: 'app-zoom-controls',
  imports: [ZoomButton],
  templateUrl: './zoom-controls.html',
  styleUrl: './zoom-controls.scss',
})
export class ZoomControls {
  readonly zoomPercent = input.required<number>();

  readonly zoomIn = output<void>();
  readonly zoomOut = output<void>();
  readonly zoomReset = output<void>();
  readonly fit = output<void>();
}
