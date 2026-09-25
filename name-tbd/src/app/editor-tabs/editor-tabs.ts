import { Component, signal, inject, OnInit, effect } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { NgComponentOutlet } from '@angular/common';
import { CdkDrag, CdkDropList, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-editor-tabs',
  imports: [NgComponentOutlet, CdkDrag, CdkDropList],
  templateUrl: './editor-tabs.html',
  styleUrl: './editor-tabs.scss',
})
export class EditorTabs implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private nextId = 4;
  
  // Define type for tabs
  tabs = signal<{id: string, title: string, active: boolean}[]>([]);

  constructor() {
    // 1. Load tabs from localStorage
    const savedTabs = localStorage.getItem('ide-tabs');
    if (savedTabs) {
      try {
        const parsed = JSON.parse(savedTabs);
        this.tabs.set(parsed);
        // Calculate the next ID based on existing tabs to prevent collisions
        const maxId = Math.max(...parsed.map((t: any) => parseInt(t.id, 10) || 0), 0);
        this.nextId = maxId + 1;
      } catch (e) {
        console.error('Failed to parse tabs from local storage', e);
        this.loadDefaultTabs();
      }
    } else {
      this.loadDefaultTabs();
    }

    // 2. Automatically save tabs to localStorage whenever the signal changes
    effect(() => {
      localStorage.setItem('ide-tabs', JSON.stringify(this.tabs()));
    });
  }

  private loadDefaultTabs() {
    this.tabs.set([
      { id: '1', title: 'main.ts', active: true },
      { id: '2', title: 'styles.css', active: false },
      { id: '3', title: 'index.html', active: false },
    ]);
  }
  ngOnInit() {
    // Listen to query params and update the active tab
    this.route.queryParams.subscribe((params) => {
      const activeId = params['file'];
      if (activeId) {
        this.tabs.update((tabs) => tabs.map((t) => ({ ...t, active: t.id === activeId })));
      }
    });
  }

  selectTab(id: string) {
    // Navigate via URL instead of just updating state
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { file: id },
      queryParamsHandling: 'merge',
    });
  }

  closeTab(id: string, event: Event) {
    event.stopPropagation();

    let newActiveId: string | null = null;

    this.tabs.update((tabs) => {
      const remaining = tabs.filter((t) => t.id !== id);
      const closedTabWasActive = tabs.find((t) => t.id === id)?.active;

      if (closedTabWasActive && remaining.length > 0) {
        remaining[0].active = true;
        newActiveId = remaining[0].id;
      }
      return remaining;
    });

    if (newActiveId) {
      this.selectTab(newActiveId);
    } else if (this.tabs().length === 0) {
      // Clear query params if all tabs are closed
      this.router.navigate([], { relativeTo: this.route });
    }
  }

  addTab() {
    const newId = (this.nextId++).toString();
    const newTab = { id: newId, title: `new-file-${newId}.ts`, active: false };

    this.tabs.update((tabs) => [...tabs, newTab]);

    this.selectTab(newId);
  }

  // --- CDK Drag & Drop ---
  onDropCdk(event: CdkDragDrop<any[]>) {
    this.tabs.update(tabs => {
      const newTabs = [...tabs];
      moveItemInArray(newTabs, event.previousIndex, event.currentIndex);
      return newTabs;
    });
  }
}
