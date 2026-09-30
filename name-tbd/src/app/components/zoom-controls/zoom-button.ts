import { Component, booleanAttribute, input } from '@angular/core';

/** A button of the zoom bar: `<button app-zoom-button>…</button>`. */
@Component({
  selector: 'button[app-zoom-button]',
  templateUrl: './zoom-button.html',
  styleUrl: './zoom-button.scss',
  host: {
    type: 'button',
    '[class.active]': 'active()',
  },
})
export class ZoomButton {
  readonly active = input(false, { transform: booleanAttribute });
}
