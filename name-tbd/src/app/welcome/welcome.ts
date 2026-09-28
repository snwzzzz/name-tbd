import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PageControllerService } from '../api/services/pageController.service';
import { WorkflowControllerService } from '../api/services/workflowController.service';
import { PageDto, WorkflowDto } from '../api/models';
import { TabsService } from '../services/tabs.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './welcome.html',
  styleUrls: ['./welcome.scss']
})
export class Welcome implements OnInit {
  private pageService = inject(PageControllerService);
  private workflowService = inject(WorkflowControllerService);
  private tabsService = inject(TabsService);
  private router = inject(Router);

  pages = signal<PageDto[]>([]);
  workflows = signal<WorkflowDto[]>([]);

  // Modal states
  showNewPageModal = false;
  showOpenPageModal = false;
  
  // Form bindings
  newPageName = '';
  newPagePath = '';

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
      error: (err) => console.error('Failed to load pages', err)
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
      error: (err) => console.error('Failed to load workflows', err)
    });
  }

  closeModals() {
    this.showNewPageModal = false;
    this.showOpenPageModal = false;
    this.newPageName = '';
    this.newPagePath = '';
  }

  createPage() {
    if (!this.newPageName || !this.newPagePath) return;

    this.pageService.createPage({
      branchId: -1,
      name: this.newPageName,
      path: this.newPagePath
    }).subscribe(page => {
      this.closeModals();
      this.openPage(page.id!);
    });
  }

  createWorkflow() {
    this.workflowService.createWorkflow({
      branchId: -1,
      name: 'New Workflow',
      status: 'DRAFT'
    }).subscribe(wf => {
      this.openWorkflow(wf.id!);
    });
  }

  openPage(id: number) {
    const tabId = this.tabsService.activeTabId();
    const existingTab = this.tabsService.tabs().find(t => t.id === id.toString());
    
    this.closeModals();
    if (existingTab) {
      if (tabId && tabId.startsWith('welcome-')) {
        this.tabsService.closeTab(tabId);
      }
      this.router.navigate(['/editor', id.toString(), 'edit']);
    } else if (tabId) {
      const page = this.pages().find(p => p.id === id);
      const title = page ? page.name : `Page ${id}`;
      this.tabsService.updateTabState(tabId, { id: id.toString(), title, mode: 'edit' });
      this.router.navigate(['/editor', id.toString(), 'edit']);
    }
  }

  openWorkflow(id: number) {
    const tabId = this.tabsService.activeTabId();
    const existingTab = this.tabsService.tabs().find(t => t.id === id.toString());
    
    this.closeModals();
    if (existingTab) {
      if (tabId && tabId.startsWith('welcome-')) {
        this.tabsService.closeTab(tabId);
      }
      this.router.navigate(['/editor', id.toString(), 'workflow']);
    } else if (tabId) {
      const wf = this.workflows().find(w => w.id === id);
      const title = wf ? wf.name : `Workflow ${id}`;
      this.tabsService.updateTabState(tabId, { id: id.toString(), title, mode: 'workflow' });
      this.router.navigate(['/editor', id.toString(), 'workflow']);
    }
  }
}
