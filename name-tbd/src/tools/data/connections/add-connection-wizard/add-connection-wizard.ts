import { Component, OnDestroy, inject } from '@angular/core';
import { Button } from '@app/components/button/button';
import { ModalRef } from '@app/_services/modal/modal-ref';
import { MODAL_DATA, MODAL_REF } from '@app/_services/modal/modal.tokens';
import { ConnectionDto } from '@app/api/models';
import { ConnectionStep } from './steps/connection-step';
import { NameStep } from './steps/name-step';
import { TestStep } from './steps/test-step';
import { TypeStep } from './steps/type-step';
import { STEPS, WizardStore } from './wizard.store';

export interface AddConnectionWizardData {
  workspaceId: number;
  /** The opener's close guard asks the wizard whether there is anything to lose (filled in by the wizard). */
  guard: { dirty: () => boolean };
}

/**
 * Add a connection: type → connection string → test → name & save, then a done screen. The shell only
 * shows the steps and moves between them; what is entered lives in the WizardStore. Closes with the saved
 * connection, or nothing when cancelled.
 */
@Component({
  selector: 'app-add-connection-wizard',
  imports: [Button, TypeStep, ConnectionStep, TestStep, NameStep],
  providers: [WizardStore],
  template: `
    <div class="wizard" (keydown.enter)="onEnter($event)">
      <header>
        <h2>Add data source</h2>
        @if (!store.saved()) {
          <ol class="steps" aria-label="Steps">
            @for (step of steps; track step.id; let i = $index) {
              <li [attr.aria-current]="i === store.stepIndex() ? 'step' : null" [class.done]="i < store.stepIndex()">
                @if (i < store.stepIndex()) {
                  <button type="button" (click)="store.goTo(i)">{{ i + 1 }}. {{ step.label }}</button>
                } @else {
                  <span>{{ i + 1 }}. {{ step.label }}</span>
                }
              </li>
            }
          </ol>
        }
      </header>

      <section class="body">
        @if (store.saved(); as saved) {
          <div role="status">
            <h3>Connected</h3>
            <p>“{{ saved.name }}” is saved. Apps in this workspace can now use it.</p>
            @if (store.tables(); as tables) {
              @if (tables.length) {
                <p class="label">Tables found ({{ tables.length }})</p>
                <ul class="tables">@for (t of tables.slice(0, 12); track t) { <li>{{ t }}</li> }</ul>
                @if (tables.length > 12) { <p class="label">…and {{ tables.length - 12 }} more</p> }
              } @else {
                <p class="label">No tables were found for this user.</p>
              }
            } @else {
              <p class="label"><span class="ui-spinner"></span> Looking for tables…</p>
            }
          </div>
        } @else {
          @switch (store.step()) {
            @case ('type') { <app-type-step /> }
            @case ('connection') { <app-connection-step /> }
            @case ('test') { <app-test-step /> }
            @case ('name') { <app-name-step /> }
          }
        }
      </section>

      <footer>
        @if (store.saved(); as saved) {
          <app-button (click)="modalRef.close(saved)">Close</app-button>
        } @else {
          <app-button variant="ghost" color="neutral" (click)="modalRef.close()">Cancel</app-button>
          <span class="spacer"></span>
          @if (store.stepIndex() > 0) {
            <app-button variant="outline" (click)="store.back()">Back</app-button>
          }
          @if (store.step() === 'name') {
            <app-button [disabled]="!store.canAdvance()" (click)="store.save()">
              {{ store.saving() ? 'Saving…' : 'Save connection' }}
            </app-button>
          } @else {
            <app-button [disabled]="store.step() !== 'connection' && !store.canAdvance()" (click)="store.next()">Next</app-button>
          }
        }
      </footer>
    </div>
  `,
  styles: `
    .wizard { display: flex; flex-direction: column; min-height: 420px; background: var(--color-surface); color: var(--color-text-primary); }
    header { padding: 1rem 1.25rem 0.75rem; border-bottom: 1px solid var(--color-border); }
    h2 { margin: 0 0 0.5rem; font-size: var(--font-size-lg); }
    .steps { display: flex; gap: 1rem; margin: 0; padding: 0; list-style: none; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
    .steps li[aria-current='step'] { color: var(--color-text-primary); font-weight: 600; }
    .steps button { background: none; border: 0; padding: 0; cursor: pointer; color: var(--color-primary, #2f89ff); font: inherit; }
    .body { flex: 1; padding: 1.25rem; overflow: auto; }
    footer { display: flex; gap: 0.5rem; padding: 0.75rem 1.25rem; border-top: 1px solid var(--color-border); }
    .spacer { flex: 1; }
    .label { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
    .tables { columns: 2; margin: 0; padding-left: 1.1rem; font-size: var(--font-size-sm); }
  `,
})
export class AddConnectionWizard implements OnDestroy {
  readonly store = inject(WizardStore);
  readonly modalRef = inject<ModalRef<ConnectionDto>>(MODAL_REF);
  private readonly data = inject<AddConnectionWizardData>(MODAL_DATA);
  readonly steps = STEPS;

  constructor() {
    this.store.init(this.data.workspaceId);
    this.data.guard.dirty = () => this.store.dirty();
  }

  /** Enter does what the primary button does, except in the multi-line connection string or on a button. */
  onEnter(event: Event): void {
    const target = event.target as HTMLElement;
    if (target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON' || this.store.saved()) return;
    event.preventDefault();
    if (this.store.step() === 'name') this.store.save();
    else this.store.next();
  }

  ngOnDestroy(): void {
    this.store.dispose();
  }
}
