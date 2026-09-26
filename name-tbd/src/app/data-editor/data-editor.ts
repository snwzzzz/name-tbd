import { Component } from '@angular/core';

@Component({
  selector: 'app-data-editor',
  standalone: true,
  template: `
    <div class="data-editor-container">
      <h2>Data Editor</h2>
      <p>This is the data editor view.</p>
    </div>
  `,
  styles: `
    .data-editor-container {
      padding: 2rem;
      height: 100%;
      background: var(--color-bg-canvas);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: var(--color-text-secondary);
    }
  `
})
export class DataEditor {}
