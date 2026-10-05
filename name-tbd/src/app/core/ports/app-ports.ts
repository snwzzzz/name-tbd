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
}

/** The app's data: data sources, their rows, and changes to them. */
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
  addRow(dataSourceId: number, values: string[]): void;
  updateRow(dataSourceId: number, rowId: string, values: string[]): void;
  deleteRows(dataSourceId: number, rowIds: string[]): void;
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
