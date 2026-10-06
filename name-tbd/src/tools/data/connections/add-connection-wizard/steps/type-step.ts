import { Component, inject } from '@angular/core';
import { DatabaseKind } from '../../connection-string/parse-connection-string';
import { KIND_LABELS, WizardStore } from '../wizard.store';

/** Step 1: what kind of system. Only databases for now; the others are listed so the plan is visible. */
@Component({
  selector: 'app-type-step',
  template: `
    <h3>What do you want to connect?</h3>
    <div class="tiles" role="radiogroup" aria-label="Connection type">
      @for (kind of kinds; track kind) {
        <button type="button" class="tile" role="radio" [attr.aria-checked]="store.kind() === kind"
                [class.selected]="store.kind() === kind" (click)="store.setKind(kind)">
          <strong>{{ labels[kind] }}</strong>
          <span>Connect with a connection string</span>
        </button>
      }
      @for (soon of comingSoon; track soon) {
        <button type="button" class="tile" disabled><strong>{{ soon }}</strong><span>Coming soon</span></button>
      }
    </div>
  `,
  styles: `
    h3 { margin: 0 0 0.75rem; font-size: var(--font-size-md); }
    .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.5rem; }
    .tile { display: flex; flex-direction: column; gap: 0.25rem; padding: 0.75rem; text-align: left; cursor: pointer;
      background: var(--color-surface); color: var(--color-text-primary); border: 1px solid var(--color-border); border-radius: 6px; }
    .tile span { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
    .tile.selected { border-color: var(--color-primary, #2f89ff); box-shadow: 0 0 0 1px var(--color-primary, #2f89ff); }
    .tile:disabled { opacity: 0.5; cursor: not-allowed; }
  `,
})
export class TypeStep {
  readonly store = inject(WizardStore);
  readonly kinds: DatabaseKind[] = ['postgres', 'mysql'];
  readonly labels = KIND_LABELS;
  readonly comingSoon = ['REST API', 'Google Sheets', 'Microsoft 365'];
}
