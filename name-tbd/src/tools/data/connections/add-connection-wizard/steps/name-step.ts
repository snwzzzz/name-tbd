import { AfterViewInit, Component, ElementRef, inject, viewChild } from '@angular/core';
import { KIND_LABELS, WizardStore } from '../wizard.store';

/** Step 4: a name, and a last look at what is saved. */
@Component({
  selector: 'app-name-step',
  template: `
    <h3>Name this connection</h3>
    <label for="conn-name">Name</label>
    <input id="conn-name" #first type="text" maxlength="255" autocomplete="off" [value]="store.name()"
           (input)="store.setName($any($event.target).value)" />
    @if (store.effective(); as e) {
      <dl class="summary">
        <dt>Type</dt><dd>{{ labels[store.kind()!] }}</dd>
        <dt>Host</dt><dd>{{ e.settings.host }}:{{ e.settings.port }}</dd>
        <dt>Database</dt><dd>{{ e.settings.database }}</dd>
        <dt>User</dt><dd>{{ e.settings.user }}</dd>
        <dt>Password</dt><dd>{{ e.password ? '••••••••' : 'none' }}</dd>
      </dl>
    }
    @if (store.saveError(); as error) { <p class="bad" role="alert">{{ error }}</p> }
  `,
  styles: `
    h3 { margin: 0 0 0.75rem; font-size: var(--font-size-md); }
    input { display: block; width: 100%; box-sizing: border-box; padding: 0.4rem 0.5rem; background: var(--color-surface);
      color: var(--color-text-primary); border: 1px solid var(--color-border); border-radius: 6px; }
    .summary { display: grid; grid-template-columns: max-content 1fr; gap: 0.15rem 1rem; margin: 1rem 0 0; font-size: var(--font-size-sm); }
    .summary dt { color: var(--color-text-secondary); } .summary dd { margin: 0; }
    .bad { color: var(--color-error, #d33); font-size: var(--font-size-sm); }
  `,
})
export class NameStep implements AfterViewInit {
  readonly store = inject(WizardStore);
  readonly labels = KIND_LABELS;
  private readonly first = viewChild<ElementRef<HTMLInputElement>>('first');

  ngAfterViewInit(): void {
    const input = this.first()?.nativeElement;
    input?.focus();
    input?.select();
  }
}
