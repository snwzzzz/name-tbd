import {
  LucideComponent, LucideMousePointerClick, LucideTextCursorInput, LucideType,
} from '@lucide/angular';
import { PaletteItem, WidgetDefinition } from '../_types/widget.types';
import { ButtonWidget } from '../widgets/button-widget/button-widget';
import { ButtonSettings } from '../widgets/button-settings/button-settings';
import { DefaultWidget } from '../widgets/default-widget/default-widget';
import { FormWidget } from '../widgets/form-widget/form-widget';
import { LabelWidget } from '../widgets/label-widget/label-widget';
import { LabelSettings } from '../widgets/label-settings/label-settings';

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

/** What the component list offers to drag onto the canvas, with the size it's dropped at. */
export const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'button', label: 'Button', w: 2, h: 1, minW: 1, minH: 1 },
  { type: 'label', label: 'Text Label', w: 2, h: 1, minW: 1, minH: 1 },
  { type: 'detail-section', label: 'Detail Section', w: 4, h: 2, resizable: false },
  { type: 'chart', label: 'Chart', w: 6, h: 3, resizable: false },
  { type: 'text', label: 'Text Block', w: 3, h: 2, resizable: false },
  { type: 'image', label: 'Image', w: 3, h: 3, resizable: false },
  { type: 'form', label: 'Dynamic Form', w: 4, h: 3, minH: 3, resizable: false },
  { type: 'container', label: 'Container', w: 4, h: 3, minW: 2, minH: 2 },
];
