import { LucideDatabase, LucideFileChartColumn, LucideLayoutList } from '@lucide/angular';
import { SidebarTabDefinition } from '../_types/sidebar.types';
import { ComponentList } from '../editor/component-list/component-list';
import { LayersPanel } from '../editor/layers-panel/layers-panel';
import { DataSourcePanel } from '../editor/data-source-panel/data-source-panel';

/** The tabs of the left sidebar, in icon-bar order. A new tab is added by adding an entry here. */
export const SIDEBAR_TABS: SidebarTabDefinition[] = [
  { id: 'components', label: 'Components', icon: LucideLayoutList, component: ComponentList },
  { id: 'layers', label: 'Layers', icon: LucideFileChartColumn, component: LayersPanel },
  { id: 'data', label: 'Data', icon: LucideDatabase, component: DataSourcePanel, preferredWidth: 420 },
];

export const DEFAULT_SIDEBAR_TAB = 'components';
