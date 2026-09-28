import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { PageControllerService } from '../api/services/pageController.service';
import { WorkflowControllerService } from '../api/services/workflowController.service';
import { PageDto, WorkflowDto } from '../api/models';
import { TabsService } from '../services/tabs.service';
import { ModalService } from '../components/modal';
import {
  CreatePageModalComponent,
  CreatePageResult,
} from './create-page-modal/create-page-modal.component';
import {
  OpenPageModalComponent,
  OpenPageModalData,
} from './open-page-modal/open-page-modal.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.html',
  styleUrls: ['./welcome.scss'],
})
export class Welcome implements OnInit {
  private pageService = inject(PageControllerService);
  private workflowService = inject(WorkflowControllerService);
  private tabsService = inject(TabsService);
  private modalService = inject(ModalService);
  private router = inject(Router);

  pages = signal<PageDto[]>([]);
  workflows = signal<WorkflowDto[]>([]);

  ngOnInit() {
    this.loadRecent();
  }

  loadRecent() {
    this.pageService.getPages().subscribe({
      next: async (data: any) => {
        let parsed = data;
        if (data instanceof Blob) {
          const text = await data.text();
          parsed = JSON.parse(text);
        }
        this.pages.set(Array.isArray(parsed) ? parsed : []);
      },
      error: (err) => console.error('Failed to load pages', err),
    });

    // Hardcoded branchId = -1 for now
    this.workflowService.getWorkflowsByBranch(-1).subscribe({
      next: async (data: any) => {
        let parsed = data;
        if (data instanceof Blob) {
          const text = await data.text();
          parsed = JSON.parse(text);
        }
        this.workflows.set(Array.isArray(parsed) ? parsed : []);
      },
      error: (err) => console.error('Failed to load workflows', err),
    });
  }

  openCreatePageModal(): void {
    const modalRef = this.modalService.open<CreatePageModalComponent, undefined, CreatePageResult>(
      CreatePageModalComponent,
      {
        width: '440px',
        ariaLabel: 'Create New Page',
      }
    );

    modalRef.afterClosed().subscribe((result) => {
      if (result) {
        this.createPage(result.name, result.path);
      }
    });
  }

  openOpenPageModal(): void {
    const modalRef = this.modalService.open<OpenPageModalComponent, OpenPageModalData, number>(
      OpenPageModalComponent,
      {
        data: { pages: this.pages() },
        width: '520px',
        ariaLabel: 'Open Page',
      }
    );

    modalRef.afterClosed().subscribe((selectedPageId) => {
      if (selectedPageId !== undefined) {
        this.openPage(selectedPageId);
      }
    });
  }

  createPage(name: string, path: string) {
    this.pageService
      .createPage({
        branchId: -1,
        name,
        path,
      })
      .subscribe((page) => {
        this.openPage(page.id!);
      });
  }

  createWorkflow() {
    this.workflowService
      .createWorkflow({
        branchId: -1,
        name: 'New Workflow',
        status: 'DRAFT',
      })
      .subscribe((wf) => {
        this.openWorkflow(wf.id!);
      });
  }

  openPage(id: number) {
    const tabId = this.tabsService.activeTabId();
    const existingTab = this.tabsService.tabs().find((t) => t.id === id.toString());

    if (existingTab) {
      if (tabId && tabId.startsWith('welcome-')) {
        this.tabsService.closeTab(tabId);
      }
      this.router.navigate(['/editor', id.toString(), 'edit']);
    } else if (tabId) {
      const page = this.pages().find((p) => p.id === id);
      const title = page ? page.name : `Page ${id}`;
      this.tabsService.updateTabState(tabId, { id: id.toString(), title, mode: 'edit' });
      this.router.navigate(['/editor', id.toString(), 'edit']);
    }
  }

  openWorkflow(id: number) {
    const tabId = this.tabsService.activeTabId();
    const existingTab = this.tabsService.tabs().find((t) => t.id === id.toString());

    if (existingTab) {
      if (tabId && tabId.startsWith('welcome-')) {
        this.tabsService.closeTab(tabId);
      }
      this.router.navigate(['/editor', id.toString(), 'workflow']);
    } else if (tabId) {
      const wf = this.workflows().find((w) => w.id === id);
      const title = wf ? wf.name : `Workflow ${id}`;
      this.tabsService.updateTabState(tabId, { id: id.toString(), title, mode: 'workflow' });
      this.router.navigate(['/editor', id.toString(), 'workflow']);
    }
  }
}
