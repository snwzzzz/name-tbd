import { Component } from '@angular/core';

@Component({
  selector: 'app-empty-app',
  template: `<p class="empty">This app has no pages yet.</p>`,
  styles: `.empty { margin: 0; padding: 2rem; color: var(--color-text-secondary); }`,
})
export class EmptyApp {}
