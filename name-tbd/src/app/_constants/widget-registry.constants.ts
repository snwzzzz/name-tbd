import {
  LucideComponent, LucideLink, LucideMousePointerClick, LucideNavigation, LucidePanelsTopLeft, LucideSheet, LucideSquareDashed,
  LucideTextCursorInput, LucideType,
} from '@lucide/angular';
import { PaletteCategory, PaletteItem, WidgetDefinition } from '../_types/widget.types';
import { ButtonWidget } from '../widgets/button-widget/button-widget';
import { ButtonSettings } from '../widgets/button-settings/button-settings';
import { DefaultWidget } from '../widgets/default-widget/default-widget';
import { FormWidget } from '../widgets/form-widget/form-widget';
import { LabelWidget } from '../widgets/label-widget/label-widget';
import { LabelSettings } from '../widgets/label-settings/label-settings';
import { TableWidget, TABLE_DEFAULT_MAX_ROWS } from '../widgets/table-widget/table-widget';
import { LinkWidget, LINK_DEFAULT_COLOR } from '../widgets/link-widget/link-widget';
import { NavWidget, NAV_DEFAULT_COLOR } from '../widgets/nav-widget/nav-widget';
import { DetailWidget, DETAIL_DEFAULT_EMPTY_TEXT } from '../widgets/detail-widget/detail-widget';

export const DEFAULT_WIDGET_TYPE = 'default';

export const WIDGET_REGISTRY: Record<string, WidgetDefinition> = {
  button: {
    type: 'button',
    name: 'Button',
    icon: LucideMousePointerClick,
    defaultProps: { label: 'Click Me', color: '#007bff' },
    component: ButtonWidget,
    settingsComponent: ButtonSettings,
  },
  label: {
    type: 'label',
    name: 'Text Label',
    icon: LucideType,
    defaultProps: { text: 'New Label', color: '#ffffff' },
    component: LabelWidget,
    settingsComponent: LabelSettings,
  },
  form: {
    type: 'form',
    name: 'Form Container',
    icon: LucideTextCursorInput,
    defaultProps: {},
    component: FormWidget,
  },
  table: {
    type: 'table',
    name: 'Data Table',
    icon: LucideSheet,
    // Props are stored as text; the settings come from the backend's prop definitions
    defaultProps: {
      dataSourceId: '',
      columns: '[]',
      title: '',
      maxRows: String(TABLE_DEFAULT_MAX_ROWS),
      showHeader: 'true',
      striped: 'false',
      multiSelect: 'false',
    },
    component: TableWidget,
  },
  link: {
    type: 'link',
    name: 'Link',
    icon: LucideLink,
    defaultProps: { text: 'Link', pageId: '', url: '', newTab: 'false', color: LINK_DEFAULT_COLOR },
    component: LinkWidget,
  },
  nav: {
    type: 'nav',
    name: 'Nav Menu',
    icon: LucideNavigation,
    defaultProps: { pages: '[]', vertical: 'false', highlightCurrent: 'true', color: NAV_DEFAULT_COLOR },
    component: NavWidget,
  },
  detail: {
    type: 'detail',
    name: 'Detail Section',
    icon: LucidePanelsTopLeft,
    defaultProps: { dataSourceId: '', columns: '[]', title: '', emptyText: DETAIL_DEFAULT_EMPTY_TEXT },
    component: DetailWidget,
  },
  // No widget component: the canvas turns it into a nested grid; listed for its name and icon
  container: {
    type: 'container',
    name: 'Container',
    icon: LucideSquareDashed,
    defaultProps: {},
    component: DefaultWidget,
  },
  [DEFAULT_WIDGET_TYPE]: {
    type: DEFAULT_WIDGET_TYPE,
    name: 'Unknown Widget',
    icon: LucideComponent,
    defaultProps: {},
    component: DefaultWidget,
  },
};

/** The registry entry of a widget type (the fallback widget for unknown types). */
export const widgetDefinition = (type: string | undefined): WidgetDefinition =>
  WIDGET_REGISTRY[type ?? ''] ?? WIDGET_REGISTRY[DEFAULT_WIDGET_TYPE];

/** The sections of the component list, in order. A new one is added by adding an entry here. */
export const PALETTE_CATEGORIES: PaletteCategory[] = [
  { id: 'basic', label: 'Basic' },
  { id: 'actions', label: 'Actions' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'data', label: 'Data' },
  { id: 'layout', label: 'Layout' },
];

/**
 * What the component list offers to drag onto the canvas, with the size it's dropped at.
 * Widgets that aren't offered (any more), like the form, stay in WIDGET_REGISTRY so saved pages
 * still show them.
 */
export const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'label', label: 'Text Label', category: 'basic', keywords: ['text', 'heading', 'paragraph'], w: 2, h: 1, minW: 1, minH: 1 },
  { type: 'button', label: 'Button', category: 'actions', keywords: ['click', 'trigger', 'workflow'], w: 2, h: 1, minW: 1, minH: 1 },
  { type: 'link', label: 'Link', category: 'navigation', keywords: ['a', 'href', 'url', 'hyperlink', 'anchor'], w: 2, h: 1 },
  { type: 'nav', label: 'Nav Menu', category: 'navigation', keywords: ['navbar', 'menu', 'navigation', 'header', 'sidebar'], w: 8, h: 1 },
  { type: 'table', label: 'Data Table', category: 'data', keywords: ['grid', 'rows', 'csv', 'list'], w: 6, h: 4, minW: 3, minH: 2 },
  { type: 'detail', label: 'Detail Section', category: 'data', keywords: ['record', 'row', 'details', 'fields', 'view'], w: 6, h: 4, minW: 3, minH: 2 },
  { type: 'container', label: 'Container', category: 'layout', keywords: ['group', 'box', 'section'], w: 4, h: 3, minW: 2, minH: 2 },
];
