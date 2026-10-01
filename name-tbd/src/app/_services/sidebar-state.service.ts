import { Injectable, Signal, WritableSignal } from '@angular/core';
import { SidebarPlacement, SidebarSide } from '../_types/sidebar.types';
import { persistedSignal } from '../_utils/storage.utils';

const SIDES: SidebarSide[] = ['left', 'right'];
/** No tab chosen yet (first visit): the sidebar opens its first tab. */
const NOT_CHOSEN = '';

const isIdList = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === 'string');
const isPlacement = (value: unknown): value is SidebarPlacement =>
  typeof value === 'object' && value !== null && SIDES.every((side) => isIdList((value as SidebarPlacement)[side]));
const isTabOrNull = (value: unknown): value is string | null => value === null || typeof value === 'string';

/**
 * Which tabs each sidebar shows (and in what order), and which one is open per sidebar. Kept
 * across reloads. Works with tab ids only, so panels can use it without importing SIDEBAR_TABS.
 */
@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  private readonly placement = persistedSignal<SidebarPlacement>('sidebar-placement', { left: [], right: [] }, isPlacement);
  // The open tab per sidebar (null: collapsed)
  private readonly active: Record<SidebarSide, WritableSignal<string | null>> = {
    left: persistedSignal<string | null>('sidebar-left-tab', NOT_CHOSEN, isTabOrNull),
    right: persistedSignal<string | null>('sidebar-right-tab', NOT_CHOSEN, isTabOrNull),
  };

  /**
   * Brings the saved placement in line with the tabs that exist: unknown or duplicate ids are
   * dropped, and tabs missing from it (e.g. new ones) are added to their default sidebar.
   */
  sync(tabs: { id: string; defaultSide: SidebarSide }[]): void {
    const known = new Set(tabs.map((tab) => tab.id));
    const placed = new Set<string>();
    const keep = (ids: string[]) => ids.filter((id) => known.has(id) && !placed.has(id) && placed.add(id));

    const current = this.placement();
    const next: SidebarPlacement = { left: keep(current.left), right: keep(current.right) };
    for (const tab of tabs) {
      if (!placed.has(tab.id)) next[tab.defaultSide].push(tab.id);
    }
    if (JSON.stringify(next) !== JSON.stringify(current)) this.placement.set(next);

    // An open tab that isn't in its sidebar (any more) falls back to the sidebar's first tab
    for (const side of SIDES) {
      const open = this.active[side]();
      if (open !== null && !next[side].includes(open)) this.active[side].set(next[side][0] ?? null);
    }
  }

  tabIds(side: SidebarSide): string[] {
    return this.placement()[side];
  }

  activeTab(side: SidebarSide): Signal<string | null> {
    return this.active[side].asReadonly();
  }

  /** Clicking a tab opens it; clicking the open one collapses its sidebar. */
  select(side: SidebarSide, tabId: string): void {
    this.active[side].set(this.active[side]() === tabId ? null : tabId);
  }

  /** Opens a tab in whichever sidebar it's in. */
  open(tabId: string): void {
    const side = this.sideOf(tabId);
    if (side) this.active[side].set(tabId);
  }

  /** Moves a tab to a position in a sidebar (the same or the other one), where it's then open. */
  move(tabId: string, to: SidebarSide, index: number): void {
    const from = this.sideOf(tabId);
    if (!from) return;

    const current = this.placement();
    const next: SidebarPlacement = { left: current.left.filter((id) => id !== tabId), right: current.right.filter((id) => id !== tabId) };
    next[to].splice(Math.max(0, Math.min(index, next[to].length)), 0, tabId);
    this.placement.set(next);

    if (from !== to) {
      if (this.active[from]() === tabId) this.active[from].set(next[from][0] ?? null);
      this.active[to].set(tabId);
    }
  }

  private sideOf(tabId: string): SidebarSide | undefined {
    return SIDES.find((side) => this.placement()[side].includes(tabId));
  }
}
