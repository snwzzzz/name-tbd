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
        let parsed = page as any;
        if (page instanceof Blob) {
          page.text().then(text => {
            parsed = JSON.parse(text);
            this.pages.update(pages => [...pages, parsed]);
            this.openPage(parsed.id!, parsed.name);
          });
        } else {
          this.pages.update(pages => [...pages, parsed]);
          this.openPage(parsed.id!, parsed.name);
        }
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
        
        let parsed = wf as any;
        if (wf instanceof Blob) {
          wf.text().then(text => {
            parsed = JSON.parse(text);
            this.workflows.update(wfs => [...wfs, parsed]);
            this.openWorkflow(parsed.id!, parsed.name);
          });
        } else {
          this.workflows.update(wfs => [...wfs, parsed]);
          this.openWorkflow(parsed.id!, parsed.name);
        }
      });
  }

  openPage(id: number, pageName?: string) {
    const tabId = this.tabsService.activeTabId();
    const existingTab = this.tabsService.tabs().find((t) => t.id === id.toString());

    if (existingTab) {
      if (tabId && tabId.startsWith('welcome-')) {
        this.tabsService.closeTab(tabId);
      }
      this.router.navigate(['/editor', id.toString(), 'edit']);
    } else {
      const page = this.pages().find((p) => p.id === id);
      const title = pageName || (page ? page.name : `Page ${id}`);
      if (tabId) this.tabsService.updateTabState(tabId, { id: id.toString(), title, mode: 'edit' });
      this.router.navigate(['/editor', id.toString(), 'edit']);
    }
  }

  openWorkflow(id: number, wfName?: string) {
    const tabId = this.tabsService.activeTabId();
    const existingTab = this.tabsService.tabs().find((t) => t.id === id.toString());

    if (existingTab) {
      if (tabId && tabId.startsWith('welcome-')) {
        this.tabsService.closeTab(tabId);
      }
      this.router.navigate(['/editor', id.toString(), 'workflow']);
    } else {
      const wf = this.workflows().find((w) => w.id === id);
      const title = wfName || (wf ? wf.name : `Workflow ${id}`);
      if (tabId) if (tabId) this.tabsService.updateTabState(tabId, { id: id.toString(), title, mode: 'workflow' });
      this.router.navigate(['/editor', id.toString(), 'workflow']);
    }
  }
}
