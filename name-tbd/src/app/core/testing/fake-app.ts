import { Provider, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  APP_DATA, APP_LAYOUT, APP_NAVIGATION, APP_PAGES, APP_SESSION, APP_VARIABLES, AppLayout, AppNavigation, AppPages, AppSession,
  AppVariables, PageInfo, WORKFLOW_SOURCE, WorkflowSource,
} from '../ports/app-ports';
import { VariableDefinition } from '../../../flow-engine';
import { DataSourceSnapshot, MemoryAppData } from '../ports/memory-app-data';
import { LayoutItem, WidgetProps } from '../../_types/layout.types';
import { WorkflowGraph } from '../../_types/workflow.types';

// Test doubles for the runtime core's ports: an app held in memory, so widget and workflow
// specs run the core without the editor (or the exported app) around it.

export class FakeAppSession implements AppSession {
  readonly live = signal(false);
  readonly pageId = signal<string | null>(null);

  start(pageId: string): void {
    this.pageId.set(pageId);
    this.live.set(true);
  }

  stop(): void {
    this.live.set(false);
    this.pageId.set(null);
  }
}

export class FakeAppPages implements AppPages {
  readonly pages = signal<PageInfo[]>([]);

  page(pageId: number): PageInfo | undefined {
    return this.pages().find((p) => p.id === pageId);
  }
}

export class FakeAppNavigation implements AppNavigation {
  readonly currentPageId = signal<string | null>(null);
  readonly opened: number[] = [];

  openPage(pageId: number): void {
    this.opened.push(pageId);
    this.currentPageId.set(String(pageId));
  }
}

export class FakeAppLayout implements AppLayout {
  readonly layouts: Record<string, LayoutItem[]> = {};
  /** The props workflows put on widgets, by page and widget id. */
  readonly overrides: Record<string, Record<string, WidgetProps>> = {};

  items(pageId: string): LayoutItem[] {
    return this.layouts[pageId] ?? [];
  }

  overrideProps(pageId: string, componentId: string, props: WidgetProps | null): void {
    const page = (this.overrides[pageId] ??= {});
    if (props) page[componentId] = props;
    else delete page[componentId];
  }
}

export class FakeWorkflowSource implements WorkflowSource {
  readonly graphs: Record<string, WorkflowGraph> = {};

  async graph(pageId: string): Promise<WorkflowGraph> {
    return this.graphs[pageId] ?? { nodes: [], connections: [] };
  }
}

export class FakeAppVariables implements AppVariables {
  readonly app = signal<VariableDefinition[]>([]);
  readonly pages = signal<Record<string, VariableDefinition[]>>({});

  page(pageId: string): VariableDefinition[] {
    return this.pages()[pageId] ?? [];
  }
}

export interface FakeAppOptions {
  data?: DataSourceSnapshot[];
  pages?: PageInfo[];
  layouts?: Record<string, LayoutItem[]>;
  graphs?: Record<string, WorkflowGraph>;
  /** The app's variables, and each page's (by page id). */
  variables?: { app?: VariableDefinition[]; pages?: Record<string, VariableDefinition[]> };
}

/** Providers for every port, backed by the given app. */
export function provideFakeApp(options: FakeAppOptions = {}): Provider[] {
  const pages = new FakeAppPages();
  pages.pages.set(options.pages ?? []);
  const layout = new FakeAppLayout();
  Object.assign(layout.layouts, options.layouts);
  const workflows = new FakeWorkflowSource();
  Object.assign(workflows.graphs, options.graphs);
  const variables = new FakeAppVariables();
  variables.app.set(options.variables?.app ?? []);
  variables.pages.set(options.variables?.pages ?? {});

  return [
    { provide: APP_DATA, useValue: new MemoryAppData(options.data ?? []) },
    { provide: APP_PAGES, useValue: pages },
    { provide: APP_NAVIGATION, useValue: new FakeAppNavigation() },
    { provide: APP_SESSION, useValue: new FakeAppSession() },
    { provide: APP_LAYOUT, useValue: layout },
    { provide: WORKFLOW_SOURCE, useValue: workflows },
    { provide: APP_VARIABLES, useValue: variables },
  ];
}

/** The fake app provided to the current TestBed (see provideFakeApp). */
export function fakeApp() {
  return {
    data: TestBed.inject(APP_DATA) as MemoryAppData,
    pages: TestBed.inject(APP_PAGES) as FakeAppPages,
    navigation: TestBed.inject(APP_NAVIGATION) as FakeAppNavigation,
    session: TestBed.inject(APP_SESSION) as FakeAppSession,
    layout: TestBed.inject(APP_LAYOUT) as FakeAppLayout,
    workflows: TestBed.inject(WORKFLOW_SOURCE) as FakeWorkflowSource,
    variables: TestBed.inject(APP_VARIABLES) as FakeAppVariables,
  };
}
