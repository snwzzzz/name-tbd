import { AfterViewInit, Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { Input } from '@app/components/input/input';
import { Button } from '@app/components/button/button';
import { KIND_LABELS, WizardStore } from '../wizard.store';

/** Step 2: the connection string (or, switched over, the separate fields), with what was read from it. */
@Component({
  selector: 'app-connection-step',
  imports: [Input, Button],
  template: `
    <div class="head">
      <h3>{{ labels[store.kind()!] }} connection</h3>
      <button type="button" class="link" (click)="store.setMode(store.mode() === 'string' ? 'fields' : 'string')">
        {{ store.mode() === 'string' ? 'Enter fields instead' : 'Use a connection string' }}
      </button>
    </div>

    @if (store.mode() === 'string') {
      <label for="conn-string">Connection string</label>
      <div class="row">
        <textarea id="conn-string" #first rows="3" autocomplete="off" spellcheck="false" autocapitalize="off"
                  [class.masked]="!reveal()" [value]="store.connectionString()"
                  [attr.aria-invalid]="store.visibleIssue() ? 'true' : null" aria-describedby="conn-issue"
                  placeholder="postgresql://user:password@host:5432/database"
                  (input)="store.connectionString.set($any($event.target).value)"></textarea>
        <button type="button" class="link" (click)="reveal.set(!reveal())">{{ reveal() ? 'Hide' : 'Show' }}</button>
      </div>
      @if (store.parsedPreview(); as p) {
        <dl class="preview" aria-label="Read from the connection string">
          <dt>Host</dt><dd>{{ p.host }}</dd><dt>Port</dt><dd>{{ p.port }}</dd>
          <dt>Database</dt><dd>{{ p.database }}</dd><dt>User</dt><dd>{{ p.user || '—' }}</dd>
          <dt>Password</dt><dd>{{ p.hasPassword ? '••••••••' : 'none' }}</dd>
          <dt>Encrypted</dt><dd>{{ p.ssl ? 'yes' : 'no' }}</dd>
          @if (p.schema) { <dt>Schema</dt><dd>{{ p.schema }}</dd> }
        </dl>
      }
    } @else {
      <div class="fields">
        <label>Host<app-input [value]="store.host()" (valueChange)="store.host.set($event)" placeholder="db.example.com" /></label>
        <label>Port<app-input [value]="store.port()" (valueChange)="store.port.set($event)" placeholder="default" /></label>
        <label>Database<app-input [value]="store.database()" (valueChange)="store.database.set($event)" /></label>
        <label>User<app-input [value]="store.user()" (valueChange)="store.user.set($event)" /></label>
        <label>Password<app-input type="password" [value]="store.password()" (valueChange)="store.password.set($event)" /></label>
        @if (store.kind() === 'postgres') {
          <label>Schema<app-input [value]="store.schema()" (valueChange)="store.schema.set($event)" placeholder="public" /></label>
        }
        <label class="check"><input type="checkbox" [checked]="store.ssl()" (change)="store.ssl.set($any($event.target).checked)" />
          Encrypted connection (SSL)</label>
      </div>
    }

    <div id="conn-issue" class="issue" role="alert">
      @if (store.visibleIssue(); as issue) {
        {{ issue }}
        @if (store.mismatchedKind(); as other) {
          <app-button size="sm" variant="outline" (click)="store.setKind(other)">Use {{ labels[other] }}</app-button>
        }
      }
    </div>
    @for (w of store.warnings(); track w) { <p class="warn">{{ w }}</p> }
    <p class="hint">Use a database user that can only reach the tables your apps need. The password is stored encrypted and never shown again.</p>
  `,
  styles: `
    .head { display: flex; justify-content: space-between; align-items: baseline; }
    h3 { margin: 0 0 0.5rem; font-size: var(--font-size-md); }
    .row { display: flex; gap: 0.5rem; align-items: flex-start; }
    textarea { flex: 1; font-family: var(--font-mono, monospace); font-size: var(--font-size-sm); padding: 0.5rem;
      background: var(--color-surface); color: var(--color-text-primary); border: 1px solid var(--color-border); border-radius: 6px; resize: vertical; }
    textarea.masked { -webkit-text-security: disc; }
    .link { background: none; border: 0; padding: 0; cursor: pointer; color: var(--color-primary, #2f89ff); font-size: var(--font-size-sm); }
    .preview { display: grid; grid-template-columns: max-content 1fr; gap: 0.15rem 1rem; margin: 0.75rem 0 0; font-size: var(--font-size-sm); }
    .preview dt { color: var(--color-text-secondary); } .preview dd { margin: 0; }
    .fields { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; }
    .fields label { display: flex; flex-direction: column; gap: 0.2rem; font-size: var(--font-size-sm); }
    .fields .check { flex-direction: row; align-items: center; grid-column: 1 / -1; }
    .issue { min-height: 1.25rem; margin-top: 0.5rem; display: flex; gap: 0.5rem; align-items: center; font-size: var(--font-size-sm); color: var(--color-error, #d33); }
    .warn { margin: 0; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
    .hint { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
  `,
})
export class ConnectionStep implements AfterViewInit {
  readonly store = inject(WizardStore);
  readonly labels = KIND_LABELS;
  readonly reveal = signal(false);
  private readonly first = viewChild<ElementRef<HTMLElement>>('first');

  ngAfterViewInit(): void {
    this.first()?.nativeElement.focus();
  }
}
