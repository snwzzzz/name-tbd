import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LucideFolderOpen, LucideGitMerge, LucideLayoutTemplate, LucideWorkflow } from '@lucide/angular';
import { PageControllerService } from '../../api/services/pageController.service';
import { WorkflowControllerService } from '../../api/services/workflowController.service';
import { PageDto, WorkflowDto } from '../../api/models';
import { TabsService } from '../../_services/tabs.service';
import { ModalService } from '../../_services/modal/modal.service';
import { EditorMode } from '../../_types/tab.types';
import { CreatePageModal, CreatePageResult } from './create-page-modal/create-page-modal';
import { OpenPageModal, OpenPageModalData } from './open-page-modal/open-page-modal';

/** Pages and workflows are not split by branch yet; everything lives on this one. */
const DEFAULT_BRANCH_ID = -1;

/** Start screen of a new tab: create or open a page or workflow. */
@Component({
  selector: 'app-welcome',
  imports: [LucideLayoutTemplate, LucideGitMerge, LucideFolderOpen, LucideWorkflow],
  templateUrl: './welcome.html',
  styleUrl: './welcome.scss',
})
export class Welcome implements OnInit {
  private readonly pageService = inject(PageControllerService);
  private readonly workflowService = inject(WorkflowControllerService);
  private readonly tabs = inject(TabsService);
  private readonly modalService = inject(ModalService);
  private readonly router = inject(Router);

  readonly pages = signal<PageDto[]>([]);
  readonly workflows = signal<WorkflowDto[]>([]);

  ngOnInit(): void {
    this.pageService.getPages().subscribe({
      next: (pages) => this.pages.set(pages ?? []),
      error: (err) => console.error('Failed to load pages', err),
    });
    this.workflowService.getWorkflowsByBranch(DEFAULT_BRANCH_ID).subscribe({
      next: (workflows) => this.workflows.set(workflows ?? []),
      error: (err) => console.error('Failed to load workflows', err),
    });
  }

  openCreatePageModal(): void {
    this.modalService
      .open<CreatePageModal, undefined, CreatePageResult>(CreatePageModal, { width: '440px', ariaLabel: 'Create New Page' })
      .afterClosed()
      .subscribe((result) => {
        if (result) this.createPage(result);
      });
  }

  openOpenPageModal(): void {
    this.modalService
      .open<OpenPageModal, OpenPageModalData, number>(OpenPageModal, {
        data: { pages: this.pages() },
        width: '520px',
        ariaLabel: 'Open Page',
      })
      .afterClosed()
      .subscribe((pageId) => {
        if (pageId !== undefined) this.openPage(pageId);
      });
  }

  createWorkflow(): void {
    this.workflowService
      .createWorkflow({ branchId: DEFAULT_BRANCH_ID, name: 'New Workflow', status: 'DRAFT' })
      .subscribe((workflow) => {
        this.workflows.update((workflows) => [...workflows, workflow]);
        this.openWorkflow(workflow.id!, workflow.name);
      });
  }

  openPage(id: number, name?: string): void {
    const title = name ?? this.pages().find((p) => p.id === id)?.name ?? `Page ${id}`;
    this.openInTab(id.toString(), title, 'edit');
  }

  openWorkflow(id: number, name?: string): void {
    const title = name ?? this.workflows().find((w) => w.id === id)?.name ?? `Workflow ${id}`;
    this.openInTab(id.toString(), title, 'workflow');
  }

  private createPage({ name, path }: CreatePageResult): void {
    this.pageService.createPage({ branchId: DEFAULT_BRANCH_ID, name, path }).subscribe((page) => {
      this.pages.update((pages) => [...pages, page]);
      this.openPage(page.id!, page.name);
    });
  }

  /** Turn this welcome tab into the item's tab, or switch to the item's tab if it's already open. */
  private openInTab(id: string, title: string, mode: EditorMode): void {
    const currentTabId = this.tabs.activeTabId();
    const alreadyOpen = this.tabs.tabs().some((t) => t.id === id);

    if (alreadyOpen) {
      if (currentTabId?.startsWith('welcome-')) this.tabs.closeTab(currentTabId);
    } else if (currentTabId) {
      this.tabs.updateTabState(currentTabId, { id, title, mode });
    }
    this.router.navigate(['/editor', id, mode]);
  }
}
