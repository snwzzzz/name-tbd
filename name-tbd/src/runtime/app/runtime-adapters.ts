import { EnvironmentProviders, Injectable, inject, makeEnvironmentProviders, signal } from '@angular/core';
import { Router } from '@angular/router';
import {
  APP_DATA, APP_LAYOUT, APP_NAVIGATION, APP_PAGES, APP_SESSION, APP_VARIABLES, AppLayout, AppNavigation, AppPages, AppSession,
  AppVariables, PageInfo, WORKFLOW_SOURCE, WorkflowSource,
} from '../../app/core/ports/app-ports';
import { VariableDefinition } from '../../flow-engine';
import { MemoryAppData } from '../../app/core/ports/memory-app-data';
import { AppDefinition, definitionGraph } from '../../app/core/definition/app-definition';
import { LayoutItem, WidgetProps } from '../../app/_types/layout.types';
import { WorkflowGraph } from '../../app/_types/workflow.types';
import { APP_DEFINITION } from './app-definition.token';
import { AppStorage } from './app-storage';
import { pagePaths } from './runtime-routes';
import { AppData } from '../../app/core/ports/app-ports';
import { AppMessagesService } from '../../app/core/services/app-messages.service';
import { LiveAppData } from './live-data/live-app-data';
import { DataApiClient } from './live-data/data-api-client';
import { openOfflineStore } from './live-data/offline-store';

// The exported app's adapters for the runtime core's ports: everything comes from the app
// definition, data changes are kept in the browser (or, in live exports, saved through the data API),
// and pages are routes.

/** The page being shown (set by RuntimePage). */
@Injectable({ providedIn: 'root' })
export class RuntimeLocation {
  readonly pageId = signal<string | null>(null);
}

/**
 * The app's data. Embedded exports: the data in the file, with the changes made on earlier visits (kept in
 * the browser). Live exports: the data where the customer keeps it, through the data API (LiveAppData),
 * kept in the browser for offline use if the export says so.
 */
function createAppData(): AppData {
  const definition = inject(APP_DEFINITION);
  const live = definition.liveData;
  if (live) {
    const messages = inject(AppMessagesService);
    return new LiveAppData({
      sources: definition.dataSources,
      client: new DataApiClient(live.apiUrl, live.key),
      store: live.offlineCache ? openOfflineStore(`ntbd-app-${definition.app.id}-live`) : null,
      notify: (text, tone) => messages.show(text, tone),
    });
  }
  return createEmbeddedData(definition);
}

function createEmbeddedData(definition: AppDefinition): MemoryAppData {
  const storage = new AppStorage(`ntbd-app-${definition.app.id}-data`, definition.dataRevision);
  const data = new MemoryAppData(definition.dataSources, (tables) => storage.save(tables));
  for (const [id, table] of Object.entries(storage.load())) data.restore(Number(id), table);
  return data;
}

@Injectable({ providedIn: 'root' })
class RuntimeAppPages implements AppPages {
  private readonly definition = inject(APP_DEFINITION);
  private readonly paths = pagePaths(this.definition);

  // A page's path is its address in the app (hash routing), so links also work as plain links
  readonly pages = signal<PageInfo[]>(
    this.definition.pages.map((p) => ({ id: p.id, name: p.name, path: `#/${this.paths.get(p.id) ?? ''}`, layout: p.layout })),
  ).asReadonly();

  page(id: number): PageInfo | undefined {
    return this.pages().find((p) => p.id === id);
  }
}

@Injectable({ providedIn: 'root' })
class RuntimeNavigation implements AppNavigation {
  private readonly router = inject(Router);
  private readonly paths = pagePaths(inject(APP_DEFINITION));
  readonly currentPageId = inject(RuntimeLocation).pageId.asReadonly();

  openPage(pageId: number): void {
    const path = this.paths.get(pageId);
    if (path !== undefined) this.router.navigateByUrl(`/${path}`);
  }
}

/** The exported app is always running. */
@Injectable({ providedIn: 'root' })
class RuntimeSession implements AppSession {
  readonly live = signal(true).asReadonly();
  readonly pageId = inject(RuntimeLocation).pageId.asReadonly();
}

/** The pages' widgets, with the props workflows put on them for now (e.g. set_text). */
@Injectable({ providedIn: 'root' })
export class RuntimeLayout implements AppLayout {
  private readonly definition = inject(APP_DEFINITION);
  private readonly overrides = signal<Record<string, Record<string, WidgetProps>>>({});

  items(pageId: string): LayoutItem[] {
    const components = this.definition.pages.find((p) => String(p.id) === pageId)?.components ?? [];
    const overrides = this.overrides()[pageId];
    return overrides ? withProps(components, overrides) : components;
  }

  overrideProps(pageId: string, componentId: string, props: WidgetProps | null): void {
    this.overrides.update((all) => {
      const page = { ...all[pageId] };
      if (props) page[componentId] = props;
      else delete page[componentId];
      return { ...all, [pageId]: page };
    });
  }
}

function withProps(items: LayoutItem[], overrides: Record<string, WidgetProps>): LayoutItem[] {
  return items.map((item) => {
    const own = overrides[String(item.id)];
    const children = item.children && withProps(item.children, overrides);
    return own || children !== item.children ? { ...item, props: own ? { ...item.props, ...own } : item.props, children } : item;
  });
}

@Injectable({ providedIn: 'root' })
class RuntimeWorkflows implements WorkflowSource {
  private readonly definition = inject(APP_DEFINITION);
  private readonly graphs = new Map<string, WorkflowGraph>();

  async graph(pageId: string): Promise<WorkflowGraph> {
    let graph = this.graphs.get(pageId);
    if (!graph) {
      const workflow = this.definition.pages.find((p) => String(p.id) === pageId)?.workflow;
      graph = workflow ? definitionGraph(workflow) : { nodes: [], connections: [] };
      this.graphs.set(pageId, graph);
    }
    return graph;
  }
}

/** The variables as the definition has them (the app's, and each page's). */
@Injectable({ providedIn: 'root' })
class RuntimeVariables implements AppVariables {
  private readonly definition = inject(APP_DEFINITION);
  readonly app = signal<VariableDefinition[]>(this.definition.variables ?? []).asReadonly();

  page(pageId: string): VariableDefinition[] {
    return this.definition.pages.find((p) => String(p.id) === pageId)?.variables ?? [];
  }
}

/** The runtime core's ports, run on the app definition (see runtime.config.ts). */
export function provideAppRuntime(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: APP_DATA, useFactory: createAppData },
    { provide: APP_PAGES, useExisting: RuntimeAppPages },
    { provide: APP_NAVIGATION, useExisting: RuntimeNavigation },
    { provide: APP_SESSION, useExisting: RuntimeSession },
    { provide: APP_LAYOUT, useExisting: RuntimeLayout },
    { provide: WORKFLOW_SOURCE, useExisting: RuntimeWorkflows },
    { provide: APP_VARIABLES, useExisting: RuntimeVariables },
  ]);
}
