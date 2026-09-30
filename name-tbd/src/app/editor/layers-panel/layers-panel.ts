import { Component } from '@angular/core';

/** Placeholder for the layers of the current page. */
@Component({
  selector: 'app-layers-panel',
  template: '<div class="placeholder-panel">Layers Panel</div>',
  styles: `
    .placeholder-panel {
      padding: 1rem;
      color: var(--color-text-secondary);
    }
  `,
})
export class LayersPanel {}
