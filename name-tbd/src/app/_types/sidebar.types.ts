import { Type } from '@angular/core';
import { LucideIcon } from '@lucide/angular';

export type SidebarSide = 'left' | 'right';

/** Which tabs each sidebar shows, in icon-bar order (by tab id). */
export type SidebarPlacement = Record<SidebarSide, string[]>;

/** A sidebar tab: its button in an icon bar and the panel it opens. */
export interface SidebarTabDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  component: Type<unknown>;
  /** The sidebar it's in until the user drags it elsewhere. */
  defaultSide: SidebarSide;
  /** Width (px) the sidebar grows to when this tab is opened, for panels that need more room. */
  preferredWidth?: number;
  /** Whether the panel can also be opened as a tab of its own (e.g. to manage data on a big screen). */
  openInTab?: boolean;
  /**
   * What its tab shows instead of the panel, when that has room for a different design. Loaded
   * when the tab is first opened, so it doesn't weigh on the editor's start.
   */
  loadTabComponent?: () => Promise<Type<unknown>>;
}
