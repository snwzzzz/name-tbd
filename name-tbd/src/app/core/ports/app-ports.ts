import { InjectionToken, Signal } from '@angular/core';
import { LayoutItem, WidgetProps } from '../../_types/layout.types';
import { TableData } from '../../_types/data-source.types';
import { WorkflowGraph } from '../../_types/workflow.types';
import type { VariableDefinition } from '../../../flow-engine';

// The ports of the runtime core: what widgets and workflow actions need from the app around
// them. The editor (its preview) and the exported app each provide their own implementation
// (adapters), so the same widgets and actions run in both. Core code injects these tokens only.

/** A data source as listed (its rows are loaded separately). */
export interface DataSourceInfo {
  id: number;
  name: string;
  columns: string[];
  rowCount: number;
  /** Its rows are where the customer keeps them (read and written through the server), not in the app. */
  live?: boolean;
  /** The app may read it but not change it. */
  readOnly?: boolean;
}

/** A change made on data someone else had changed meanwhile: it was saved anyway (last write wins). */
export interface DataConflict {
  dataSourceId: number;
  rowId: string;
  /** The values that were overwritten, by column. */
  overwritten: Record<string, string>;
  at: number;
}

/** How live data is doing: reachable, changes waiting to be sent, changes that overwrote someone else's. */
export interface DataSync {
  online: boolean;
  /** Changes made while offline, not sent yet. */
  pending: number;
  conflicts: DataConflict[];
  /** The last failure to read or save (null: none). */
  error: string | null;
}

/**
 * The app's data: data sources, their rows, and changes to them. Changes are async: a live data source
 * saves them on the server (or queues them while offline); a failed change rejects with a message for the
 * user, and the rows go back to how they were.
 */
export interface AppData {
  readonly sources: Signal<DataSourceInfo[]>;
  /** Whether `sources` is known (so a data source missing from it doesn't exist). */
  readonly loaded: Signal<boolean>;
  /** A data source's rows; null until loaded. Reading it is reactive. */
  table(dataSourceId: number): TableData | null;
  /** Starts loading a data source's rows (if they aren't yet). */
  ensureTable(dataSourceId: number): void;
  /** A data source's rows, loading them first if needed. */
  loadTable(dataSourceId: number): Promise<TableData>;
  addRow(dataSourceId: number, values: string[]): Promise<void>;
  updateRow(dataSourceId: number, rowId: string, values: string[]): Promise<void>;
  deleteRows(dataSourceId: number, rowIds: string[]): Promise<void>;
  /** Live data's state (absent: the data is all in memory, always in sync). */
  readonly sync?: Signal<DataSync>;
  /** Reads a data source's rows again (live data; others need not). */
  refresh?(dataSourceId: number): Promise<void>;
  /** Forgets the conflicts shown so far. */
  dismissConflicts?(): void;
}

/** A page of the app. */
export interface PageInfo {
  id: number;
  name: string;
  path: string;
  layout?: boolean;
}

export interface AppPages {
  readonly pages: Signal<PageInfo[]>;
  page(pageId: number): PageInfo | undefined;
}

export interface AppNavigation {
  /** The page being shown (as a string id), or null. */
  readonly currentPageId: Signal<string | null>;
  openPage(pageId: number): void;
}

/** Whether the app is running (widgets react to clicks, workflows run) and on which page. */
export interface AppSession {
  readonly live: Signal<boolean>;
  readonly pageId: Signal<string | null>;
}

/** The widgets of each page, and temporary changes workflows make to them (e.g. set_text). */
export interface AppLayout {
  items(pageId: string): LayoutItem[];
  /** Shows other props on a widget for now (null: back to its own). */
  overrideProps(pageId: string, componentId: string, props: WidgetProps | null): void;
}

/** The workflow (graph) of each page. */
export interface WorkflowSource {
  graph(pageId: string): Promise<WorkflowGraph>;
}

/** The app's variables as defined (not their values): the app's own and each page's. */
export interface AppVariables {
  readonly app: Signal<VariableDefinition[]>;
  /** A page's own variables (reading it is reactive). */
  page(pageId: string): VariableDefinition[];
}

export const APP_DATA = new InjectionToken<AppData>('APP_DATA');
export const APP_PAGES = new InjectionToken<AppPages>('APP_PAGES');
export const APP_NAVIGATION = new InjectionToken<AppNavigation>('APP_NAVIGATION');
export const APP_SESSION = new InjectionToken<AppSession>('APP_SESSION');
export const APP_LAYOUT = new InjectionToken<AppLayout>('APP_LAYOUT');
export const WORKFLOW_SOURCE = new InjectionToken<WorkflowSource>('WORKFLOW_SOURCE');
export const APP_VARIABLES = new InjectionToken<AppVariables>('APP_VARIABLES');
