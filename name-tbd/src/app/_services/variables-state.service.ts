import { Injectable, inject, signal } from '@angular/core';
import { BranchControllerService } from '../api/services/branchController.service';
import { PageControllerService } from '../api/services/pageController.service';
import { VariableDefinition as ApiVariable } from '../api/models';
import { AppVariables } from '../core/ports/app-ports';
import { VariableDefinition, VariableType } from '../../flow-engine';
import { EditorContext } from './editor-context.service';
import { PagesStateService } from './pages-state.service';
import { ToastService } from './toast.service';

const fromApi = (variables: ApiVariable[] | undefined): VariableDefinition[] =>
  (variables ?? []).map((v) => ({ name: v.name ?? '', type: (v.type ?? 'text') as VariableType, initial: v.initial ?? '' }));

/**
 * The variables of the app (its branch's) and of each page, as the Variables panel edits them.
 * Saved right away (not undoable, like pages); a save the backend refuses is taken back.
 * Also the editor's APP_VARIABLES adapter, so the preview runs with them.
 */
@Injectable({ providedIn: 'root' })
export class VariablesStateService implements AppVariables {
  private readonly branches = inject(BranchControllerService);
  private readonly pagesApi = inject(PageControllerService);
  private readonly context = inject(EditorContext);
  private readonly pages = inject(PagesStateService);
  private readonly toasts = inject(ToastService);

  private readonly appVariables = signal<VariableDefinition[]>([]);
  readonly app = this.appVariables.asReadonly();
  private requested = false;

  ensureLoaded(): void {
    this.pages.ensureLoaded();
    if (this.requested) return;
    this.requested = true;
    this.branches.getAppVariables(this.context.requireBranchId()).subscribe({
      next: (variables) => this.appVariables.set(fromApi(variables)),
      error: (err) => {
        this.requested = false;
        console.error('Failed to load the variables', err);
      },
    });
  }

  page(pageId: string): VariableDefinition[] {
    return fromApi(this.pages.page(Number(pageId))?.variables);
  }

  saveApp(variables: VariableDefinition[]): void {
    const before = this.appVariables();
    this.appVariables.set(variables);
    this.branches.setAppVariables(this.context.requireBranchId(), variables).subscribe({
      next: (saved) => this.appVariables.set(fromApi(saved)),
      error: (err) => {
        this.appVariables.set(before);
        this.refused(err);
      },
    });
  }

  savePage(pageId: string, variables: VariableDefinition[]): void {
    const id = Number(pageId);
    const before = this.pages.page(id)?.variables;
    const put = (list: ApiVariable[] | undefined) =>
      this.pages.pages.update((pages) => pages.map((p) => (p.id === id ? { ...p, variables: list } : p)));
    put(variables);
    this.pagesApi.setPageVariables(id, variables).subscribe({
      next: (saved) => put(saved),
      error: (err) => {
        put(before);
        this.refused(err);
      },
    });
  }

  private refused(err: unknown): void {
    const message = (err as { error?: { message?: string } })?.error?.message;
    this.toasts.show(message ? `Couldn't save the variables: ${message}` : "Couldn't save the variables.", 'warning');
  }
}
