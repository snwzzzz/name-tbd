import { EnvironmentProviders, Injectable, computed, inject, makeEnvironmentProviders } from '@angular/core';
import { Observable, firstValueFrom } from 'rxjs';
import {
  APP_DATA, APP_LAYOUT, APP_NAVIGATION, APP_PAGES, APP_SESSION, APP_VARIABLES, AppData, AppLayout, AppNavigation, AppPages,
  AppSession, DataSourceInfo, PageInfo, WORKFLOW_SOURCE, WorkflowSource,
} from '../../core/ports/app-ports';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { PreviewDataService } from '../../_services/preview-data.service';
import { PreviewSessionService } from '../../_services/preview-session.service';
import { PagesStateService } from '../../_services/pages-state.service';
import { PageNavigationService } from '../../_services/page-navigation.service';
import { TabsService } from '../../_services/tabs.service';
import { LayoutStateService } from '../../_services/layout-state.service';
import { WorkflowStateService } from '../../_services/workflow-state.service';
import { VariablesStateService } from '../../_services/variables-state.service';
import { TableData } from '../../_types/data-source.types';
import { toTableData } from '../../_utils/table.utils';
import { DataApiControllerService } from '../../api/services/dataApiController.service';
import { HttpErrorResponse } from '@angular/common/http';

// The editor's adapters for the runtime core's ports: widgets and workflow actions run on the
// editor's own state, and while previewing on the preview's copy of the data.

/**
 * The backend's data sources; while previewing, the preview's copy (changes never reach the backend), or
 * with the preview's "write to real data" on, the real data (through the data API, like an exported app).
 */
@Injectable({ providedIn: 'root' })
class EditorAppData implements AppData {
  private readonly state = inject(DataSourceStateService);
  private readonly previewData = inject(PreviewDataService);
  private readonly session = inject(PreviewSessionService);
  private readonly dataApi = inject(DataApiControllerService);

  readonly loaded = this.state.loaded;
  readonly sources = computed<DataSourceInfo[]>(() =>
    this.state.sources().map((s) => ({
      id: s.id!,
      name: s.name ?? '',
      columns: s.columns ?? [],
      rowCount: s.rowCount ?? 0,
      live: !!s.kind && s.kind !== 'embedded',
      readOnly: !!s.readOnly,
    })),
  );

  constructor() {
    this.state.ensureLoaded();
  }

  table(id: number): TableData | null {
    if (this.session.active()) return this.previewData.table(id);
    const source = this.state.details()[id];
    return source ? toTableData(source) : null;
  }

  ensureTable(id: number): void {
    // Only data sources that exist (a deleted one would just fail to load)
    if (this.state.sources().some((s) => s.id === id)) this.state.ensureDetails(id);
  }

  async loadTable(id: number): Promise<TableData> {
    await this.state.loadDetails(id);
    return this.table(id)!;
  }

  async addRow(id: number, values: string[]): Promise<void> {
    if (!this.previewData.writeThrough()) return this.previewData.addRow(id, values);
    await this.real(id, () => this.dataApi.addRow(id, { values: this.byColumn(id, values) }));
  }

  async updateRow(id: number, rowId: string, values: string[]): Promise<void> {
    if (!this.previewData.writeThrough()) return this.previewData.updateRow(id, rowId, values);
    await this.real(id, () => this.dataApi.changeRow(id, { id: rowId, values: this.changed(id, rowId, values) }));
  }

  async deleteRows(id: number, rowIds: string[]): Promise<void> {
    if (!this.previewData.writeThrough()) return this.previewData.deleteRows(id, rowIds);
    await this.real(id, () => this.dataApi.deleteRows(id, { ids: rowIds }));
  }

  /** Changes the real data, then reads it again (others may have changed it too). */
  private async real(id: number, change: () => Observable<unknown>): Promise<void> {
    try {
      await firstValueFrom(change());
    } catch (err) {
      const message = err instanceof HttpErrorResponse ? err.error?.message ?? err.message : String(err);
      throw new Error(message);
    }
    await this.state.reload(id);
  }

  private byColumn(id: number, values: string[]): Record<string, string> {
    const columns = this.table(id)?.columns ?? [];
    return Object.fromEntries(columns.map((column, i) => [column, values[i] ?? '']));
  }

  /** Only the columns whose values changed, so changes others made to the rest stay. */
  private changed(id: number, rowId: string, values: string[]): Record<string, string> {
    const table = this.table(id);
    const before = table?.rows.find((r) => r.id === rowId)?.values ?? [];
    return Object.fromEntries((table?.columns ?? []).map((c, i) => [c, values[i] ?? '']).filter(([, v], i) => v !== (before[i] ?? '')));
  }
}

@Injectable({ providedIn: 'root' })
class EditorAppPages implements AppPages {
  private readonly state = inject(PagesStateService);

  readonly pages = computed<PageInfo[]>(() =>
    this.state.pages().map((p) => ({ id: p.id!, name: p.name ?? '', path: p.path ?? '', layout: p.layout })),
  );

  constructor() {
    this.state.ensureLoaded();
  }

  page(id: number): PageInfo | undefined {
    return this.pages().find((p) => p.id === id);
  }
}

/** Pages are the editor's tabs. */
@Injectable({ providedIn: 'root' })
class EditorAppNavigation implements AppNavigation {
  private readonly navigation = inject(PageNavigationService);
  readonly currentPageId = inject(TabsService).activeTabId;

  openPage(pageId: number): void {
    this.navigation.openPage(pageId);
  }
}

/** Live while the canvas previews a page. */
@Injectable({ providedIn: 'root' })
class EditorAppSession implements AppSession {
  private readonly preview = inject(PreviewSessionService);
  readonly live = this.preview.active;
  readonly pageId = this.preview.pageId;
}

@Injectable({ providedIn: 'root' })
class EditorAppLayout implements AppLayout {
  private readonly layoutState = inject(LayoutStateService);

  items(pageId: string) {
    return this.layoutState.getLayout(pageId);
  }

  overrideProps(pageId: string, componentId: string, props: Record<string, unknown> | null): void {
    this.layoutState.previewItemProps(pageId, componentId, props);
  }
}

@Injectable({ providedIn: 'root' })
class EditorWorkflowSource implements WorkflowSource {
  private readonly workflowState = inject(WorkflowStateService);

  graph(pageId: string) {
    return firstValueFrom(this.workflowState.ensureGraph(pageId));
  }
}

/** The runtime core's ports, run on the editor's state (see app.config.ts). */
export function provideEditorRuntime(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: APP_DATA, useExisting: EditorAppData },
    { provide: APP_PAGES, useExisting: EditorAppPages },
    { provide: APP_NAVIGATION, useExisting: EditorAppNavigation },
    { provide: APP_SESSION, useExisting: EditorAppSession },
    { provide: APP_LAYOUT, useExisting: EditorAppLayout },
    { provide: WORKFLOW_SOURCE, useExisting: EditorWorkflowSource },
    { provide: APP_VARIABLES, useFactory: () => {
      const variables = inject(VariablesStateService);
      variables.ensureLoaded();
      return variables;
    } },
  ]);
}
