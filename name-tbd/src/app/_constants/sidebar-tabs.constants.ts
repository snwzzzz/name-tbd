import { LucideDatabase, LucideLayers, LucideLayoutList, LucideSettings } from '@lucide/angular';
import { SidebarTabDefinition } from '../_types/sidebar.types';
import { PROPERTIES_TAB_ID } from './sidebar.constants';
import { ComponentList } from '../editor/component-list/component-list';
import { DataSourcePanel } from '../editor/data-source-panel/data-source-panel';
import { PropertiesPanel } from '../editor/properties-panel/properties-panel';
import { LayersPanel } from '../editor/layers-panel/layers-panel';

/**
 * The tabs of the sidebars. Each starts in its default sidebar (in this order); the user can drag
 * tabs to reorder them or move them to the other sidebar. A new tab is added by adding an entry here.
 */
export const SIDEBAR_TABS: SidebarTabDefinition[] = [
  { id: 'components', label: 'Components', icon: LucideLayoutList, component: ComponentList, defaultSide: 'left' },
  { id: 'data', label: 'Data', icon: LucideDatabase, component: DataSourcePanel, defaultSide: 'left', preferredWidth: 420 },
  { id: PROPERTIES_TAB_ID, label: 'Properties', icon: LucideSettings, component: PropertiesPanel, defaultSide: 'right' },
  { id: 'layers', label: 'Layers', icon: LucideLayers, component: LayersPanel, defaultSide: 'right' },
];
