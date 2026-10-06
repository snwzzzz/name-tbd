import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Button } from '@app/components/button/button';
import { ToastHost } from '@app/components/toast-host/toast-host';
import { UserMenu } from '@app/components/user-menu/user-menu';
import { ConnectionControllerService } from '@app/api/services/connectionController.service';
import { ConnectionDto } from '@app/api/models';
import { AuthService } from '@app/_services/auth.service';
import { ModalService } from '@app/_services/modal/modal.service';
import { ToastService } from '@app/_services/toast.service';
import { AddConnectionWizard, AddConnectionWizardData } from '../connections/add-connection-wizard/add-connection-wizard';
import { KIND_LABELS } from '../connections/add-connection-wizard/wizard.store';

/** The data tool: a workspace's connections to databases, and the wizard that adds one. */
@Component({
  selector: 'app-data-dashboard',
  imports: [RouterLink, Button, UserMenu, ToastHost],
  template: `
    <header class="bar">
      <a routerLink="/tools" class="back">← Tools</a>
      <h1>Data</h1>
      <div class="actions">
        @if (workspaces().length > 1) {
          <select aria-label="Workspace" [value]="workspaceId()" (change)="selectWorkspace(+$any($event.target).value)">
            @for (w of workspaces(); track w.id) { <option [value]="w.id">{{ w.name }}</option> }
          </select>
        }
        @if (canEdit()) { <app-button size="sm" (click)="add()">Add data source</app-button> }
        <app-user-menu />
      </div>
    </header>

    <main>
      @if (loading()) {
        <p class="state" role="status"><span class="ui-spinner"></span> Loading connections…</p>
      } @else if (failed()) {
        <div class="state" role="alert">
          <p>The connections couldn't be loaded.</p>
          <app-button size="sm" variant="outline" (click)="load()">Try again</app-button>
        </div>
      } @else if (connections().length === 0) {
        <div class="state">
          <h2>No data sources yet</h2>
          <p>Connect a database to use its tables in your apps.</p>
          @if (canEdit()) { <app-button (click)="add()">Add data source</app-button> }
        </div>
      } @else {
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Database</th><th></th></tr></thead>
          <tbody>
            @for (c of connections(); track c.id) {
              <tr>
                <td>{{ c.name }}</td>
                <td>{{ label(c) }}</td>
                <td>{{ target(c) }}</td>
                <td class="row-actions">
                  @if (canEdit()) {
                    <app-button size="sm" variant="ghost" (click)="test(c)">Test</app-button>
                    <app-button size="sm" variant="ghost" color="error" (click)="remove(c)">Delete</app-button>
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      }
    </main>
    <app-toast-host />
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--color-bg-subtle); }
    .bar { display: flex; align-items: center; gap: 1rem; height: 48px; padding: 0 1rem; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
    h1 { margin: 0; flex: 1; font-size: var(--font-size-lg); color: var(--color-text-primary); }
    .back { color: var(--color-text-secondary); text-decoration: none; font-size: var(--font-size-sm); }
    .actions { display: flex; align-items: center; gap: 0.75rem; }
    main { padding: 1rem; }
    table { width: 100%; border-collapse: collapse; background: var(--color-surface); border: 1px solid var(--color-border); font-size: var(--font-size-sm); color: var(--color-text-primary); }
    th, td { padding: 0.6rem 0.75rem; text-align: left; border-bottom: 1px solid var(--color-border); }
    th { color: var(--color-text-secondary); font-weight: 500; }
    .row-actions { text-align: right; white-space: nowrap; }
    .state { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; margin: 4rem auto 0; max-width: 360px; text-align: center; font-size: var(--font-size-sm); color: var(--color-text-secondary); }
    .state p { margin: 0; } .state h2 { margin: 0; font-size: var(--font-size-lg); color: var(--color-text-primary); }
  `,
})
export class DataDashboard {
  private readonly api = inject(ConnectionControllerService);
  private readonly auth = inject(AuthService);
  private readonly modal = inject(ModalService);
  private readonly toasts = inject(ToastService);

  readonly connections = signal<ConnectionDto[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);

  readonly workspaces = this.auth.workspaces;
  private readonly chosen = signal<number | null>(null);
  readonly workspace = computed(() => {
    const all = this.workspaces();
    return all.find((w) => w.id === this.chosen()) ?? all.find((w) => w.personal) ?? all[0] ?? null;
  });
  readonly workspaceId = computed(() => this.workspace()?.id ?? 0);
  readonly canEdit = computed(() => ['OWNER', 'EDITOR'].includes(this.workspace()?.role ?? ''));

  constructor() {
    this.auth.ensureLoaded().subscribe(() => this.load());
  }

  selectWorkspace(id: number): void {
    this.chosen.set(id);
    this.load();
  }

  load(): void {
    const id = this.workspace()?.id;
    if (id === undefined) {
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.failed.set(false);
    this.api.getConnections(id).subscribe({
      next: (list) => {
        this.connections.set(list ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  add(): void {
    const data: AddConnectionWizardData = { workspaceId: this.workspaceId(), guard: { dirty: () => false } };
    this.modal
      .open<AddConnectionWizard, AddConnectionWizardData, ConnectionDto>(AddConnectionWizard, {
        data,
        width: '640px',
        maxWidth: '95vw',
        ariaLabel: 'Add data source',
        // Escape and the backdrop ask first when something was entered
        canClose: () => !data.guard.dirty() || this.modal.confirm({
          title: 'Discard this connection?',
          message: "What you entered won't be saved.",
          confirmText: 'Discard',
          destructive: true,
        }),
      })
      .afterClosed()
      // Whether it was closed with the result or by the backdrop after saving: the list is the truth
      .subscribe(() => this.load());
  }

  test(connection: ConnectionDto): void {
    this.api.testConnection(connection.id!).subscribe({
      next: () => this.toasts.show(`"${connection.name}" works.`),
      error: () => this.toasts.show(`"${connection.name}" could not be reached.`, 'warning'),
    });
  }

  async remove(connection: ConnectionDto): Promise<void> {
    const confirmed = await this.modal.confirm({
      title: `Delete "${connection.name}"?`,
      message: 'Data sources that use it stay, but have no connection until another one is chosen.',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    this.api.deleteConnection(connection.id!).subscribe({
      next: () => this.connections.update((list) => list.filter((c) => c.id !== connection.id)),
      error: () => this.toasts.show("The connection couldn't be deleted.", 'warning'),
    });
  }

  label(c: ConnectionDto): string {
    return KIND_LABELS[c.kind as keyof typeof KIND_LABELS] ?? c.kind ?? '';
  }

  target(c: ConnectionDto): string {
    const s = (c.settings ?? {}) as Record<string, unknown>;
    return s['host'] ? `${s['database'] ?? ''} @ ${s['host']}` : '—';
  }
}
