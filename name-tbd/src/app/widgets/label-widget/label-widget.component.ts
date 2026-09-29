import { Component } from '@angular/core';
import { BaseWidget } from '../../core/base-widget';

@Component({
  selector: 'app-label-widget',
  standalone: true,
  template: `
    <div class="label-wrapper">
      <span class="dynamic-label" [style.color]="props()['color'] || '#ffffff'">
        {{ props()['text'] || 'New Label' }}
      </span>
    </div>
  `,
  styles: `
    *, *::before, *::after {
      box-sizing: border-box;
    }
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
    .label-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      overflow: hidden;
    }
    .dynamic-label {
      flex: 1;
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0.5rem;
      white-space: pre-wrap;
      word-break: break-word;
      pointer-events: none; /* Let GridStack handle clicks */
    }
  `
})
export class LabelWidgetComponent extends BaseWidget {
}
