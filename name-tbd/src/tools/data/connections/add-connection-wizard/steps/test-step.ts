import { Component, inject } from '@angular/core';
import { Button } from '@app/components/button/button';
import { WizardStore } from '../wizard.store';

/** Step 3: tries the connection (from the server) with exactly what was entered. */
@Component({
  selector: 'app-test-step',
  imports: [Button],
  template: `
    <h3>Testing the connection</h3>
    <div class="result" role="status" aria-live="polite">
      @switch (store.test().state) {
        @case ('running') { <p><span class="ui-spinner"></span> Connecting…</p> }
        @case ('ok') {
          @if (store.testPassed()) { <p class="ok">Connected successfully.</p> }
        }
        @case ('failed') {
          <p class="bad">The connection failed.</p>
          <p class="detail">{{ store.test().message }}</p>
          <div class="actions">
            <app-button size="sm" variant="outline" (click)="store.runTest()">Try again</app-button>
            <app-button size="sm" variant="ghost" (click)="store.back()">Edit connection</app-button>
          </div>
        }
      }
    </div>
  `,
  styles: `
    h3 { margin: 0 0 0.75rem; font-size: var(--font-size-md); }
    p { margin: 0 0 0.5rem; } .ok { color: var(--color-success, #1a8f4c); } .bad { color: var(--color-error, #d33); }
    .detail { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
    .actions { display: flex; gap: 0.5rem; }
  `,
})
export class TestStep {
  readonly store = inject(WizardStore);
}
