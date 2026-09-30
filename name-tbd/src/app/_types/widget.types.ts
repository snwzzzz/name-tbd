import { Type } from '@angular/core';
import { LucideIcon } from '@lucide/angular';
import { BaseWidget, BaseWidgetSettings } from '../_directives/base-widget.directive';
import { WidgetProps } from './layout.types';

export interface WidgetDefinition {
  type: string;
  name: string;
  icon: LucideIcon;
  defaultProps: WidgetProps;
  component: Type<BaseWidget>;
  settingsComponent?: Type<BaseWidgetSettings>;
}

export type WidgetPropType = 'string' | 'number' | 'color' | 'boolean' | 'select' | 'textarea';

/** One editable prop of a widget type, as defined in the backend. */
export interface WidgetPropDefinition {
  id: number;
  widgetType: string;
  propKey: string;
  propType: WidgetPropType;
  defaultValue: string;
  label?: string;
  group?: string;
  options?: string[];
}

/** A section of the component list. */
export interface PaletteCategory {
  id: string;
  label: string;
}

/** An entry of the component list (drag source for the canvas); its icon is its widget's. */
export interface PaletteItem {
  type: string;
  label: string;
  /** The id of its PaletteCategory. */
  category: string;
  /** More words the search finds it by (besides its label and category). */
  keywords?: string[];
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  resizable?: boolean;
}
