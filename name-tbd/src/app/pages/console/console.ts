import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApplicationCard } from './application-card/application-card';
import {
  ApplicationFormModal,
  ApplicationFormModalData,
  ApplicationFormValues,
} from './application-form-modal/application-form-modal';
import { UserMenu } from '../../components/user-menu/user-menu';
import { Button } from '../../components/button/button';
import { ToastHost } from '../../components/toast-host/toast-host';
import { ApplicationControllerService } from '../../api/services/applicationController.service';
import { ApplicationDto } from '../../api/models';
import { AuthService } from '../../_services/auth.service';
import { ModalService } from '../../_services/modal/modal.service';
import { ToastService } from '../../_services/toast.service';

/** The user's applications: open one in the editor, create, rename, duplicate or delete them. */
@Component({
  selector: 'app-application-console',
  imports: [ApplicationCard, UserMenu, Button, ToastHost],
  templateUrl: './console.html',
  styleUrl: './console.scss',
})
export class ApplicationConsole {
  private readonly api = inject(ApplicationControllerService);
  private readonly auth = inject(AuthService);
  private readonly modal = inject(ModalService);
  private readonly toasts = inject(ToastService);
  private readonly router = inject(Router);

  readonly applications = signal<ApplicationDto[]>([]);
  readonly loading = signal(true);
  readonly failed = signal(false);

  /** Where new applications go: the user's personal workspace (or else the first they may edit in). */
  private readonly targetWorkspace = computed(() => {
    const editable = this.auth.workspaces().filter((w) => w.role === 'OWNER' || w.role === 'EDITOR');
    return editable.find((w) => w.personal) ?? editable[0] ?? null;
  });
  readonly canCreate = computed(() => this.targetWorkspace() !== null);

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.failed.set(false);
    this.api.getApplications().subscribe({
      next: (apps) => {
        this.applications.set(apps ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loading.set(false);
      },
    });
  }

  async create(): Promise<void> {
    const workspace = this.targetWorkspace();
    if (!workspace?.id) return;
    const values = await this.askForValues({
      heading: 'New application',
      submitText: 'Create',
      values: { title: '', description: '' },
    });
    if (!values) return;
    this.api.createApplication({ workspaceId: workspace.id, ...values }).subscribe({
      next: (app) => this.router.navigate(['/apps', app.id, 'edit']),
      error: () => this.toasts.show("The application couldn't be created.", 'warning'),
    });
  }

  async rename(app: ApplicationDto): Promise<void> {
    const values = await this.askForValues({
      heading: 'Rename application',
      submitText: 'Save',
      values: { title: app.title ?? '', description: app.description ?? '' },
    });
    if (!values) return;
    this.api.updateApplication(app.id!, values).subscribe({
      next: (updated) => this.applications.update((apps) => apps.map((a) => (a.id === updated.id ? updated : a))),
      error: () => this.toasts.show("The application couldn't be renamed.", 'warning'),
    });
  }

  /** Copies the application (pages, widgets, workflows, data); the copy goes right after it. */
  duplicate(app: ApplicationDto): void {
    this.api.duplicateApplication(app.id!).subscribe({
      next: (copy) => {
        this.applications.update((apps) => {
          const at = apps.findIndex((a) => a.id === app.id) + 1;
          return [...apps.slice(0, at), copy, ...apps.slice(at)];
        });
        this.toasts.show(`Duplicated as "${copy.title}".`);
      },
      error: () => this.toasts.show("The application couldn't be duplicated.", 'warning'),
    });
  }

  async remove(app: ApplicationDto): Promise<void> {
    const confirmed = await this.modal.confirm({
      title: `Delete "${app.title}"?`,
      message: "This deletes the application with all its pages, workflows and data. It can't be undone.",
      confirmText: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    this.api.deleteApplication(app.id!).subscribe({
      next: () => this.applications.update((apps) => apps.filter((a) => a.id !== app.id)),
      error: () => this.toasts.show("The application couldn't be deleted.", 'warning'),
    });
  }

  private askForValues(data: ApplicationFormModalData): Promise<ApplicationFormValues | undefined> {
    const ref = this.modal.open<ApplicationFormModal, ApplicationFormModalData, ApplicationFormValues>(ApplicationFormModal, {
      data,
      width: '440px',
      ariaLabel: data.heading,
    });
    return firstValueFrom(ref.afterClosed());
  }
}
