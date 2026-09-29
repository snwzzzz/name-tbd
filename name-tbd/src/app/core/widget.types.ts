import { Type } from '@angular/core';

export interface ContextMenuItem {
  label: string;
  icon?: string;
  danger?: boolean;
  action: (id: string, currentProps: Record<string, any>) => void;
}

export interface WidgetDefinition {
  type: string;           
  name: string;           
  icon: string;           
  defaultProps: Record<string, any>;  
  component: Type<any>; 
  settingsComponent?: Type<any>; 
  contextMenu?: ContextMenuItem[];
}
