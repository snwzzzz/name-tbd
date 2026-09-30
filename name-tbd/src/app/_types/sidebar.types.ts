import { Type } from '@angular/core';
import { LucideIcon } from '@lucide/angular';

/** A tab of the left sidebar: its button in the icon bar and the panel it opens. */
export interface SidebarTabDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  component: Type<unknown>;
  /** Width (px) the sidebar grows to when this tab is opened, for panels that need more room. */
  preferredWidth?: number;
}
