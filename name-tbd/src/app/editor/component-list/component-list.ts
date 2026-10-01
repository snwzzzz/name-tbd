import { Component, afterRenderEffect, computed, inject, signal } from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { GridStack } from 'gridstack';
import { LucideChevronDown, LucideChevronRight, LucideGripVertical, LucideInfo, LucideSearch } from '@lucide/angular';
import { PALETTE_CATEGORIES, PALETTE_ITEMS, widgetDefinition } from '../../_constants/widget-registry.constants';
import { PaletteItem } from '../../_types/widget.types';
import { groupPalette, searchPalette } from '../../_utils/palette.utils';
import { persistedSignal } from '../../_utils/storage.utils';
import { TabsService } from '../../_services/tabs.service';
import { isPageMode } from '../../_types/tab.types';
import { shortcutKeys } from '../../_constants/keyboard-shortcuts.constants';

const isIdList = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === 'string');

/**
 * The widgets that can be dragged onto the canvas: in collapsible categories, or, while
 * searching, every match across all categories.
 */
@Component({
  selector: 'app-component-list',
  imports: [NgComponentOutlet, NgTemplateOutlet, LucideChevronDown, LucideChevronRight, LucideGripVertical, LucideInfo, LucideSearch],
  templateUrl: './component-list.html',
  styleUrl: './component-list.scss',
})
export class ComponentList {
  private readonly tabs = inject(TabsService);

  /** Components can only be dropped onto a page's canvas, i.e. in Edit mode. */
  readonly canPlace = computed(() => this.tabs.activeMode() === 'edit');
  /** Why they can't be placed right now: no page open (Start or a panel tab), or another mode. */
  readonly onWelcome = computed(() => !isPageMode(this.tabs.activeMode()));
  readonly editModeKeys = shortcutKeys('mode-edit');

  readonly query = signal('');
  // Categories the user folded, kept across reloads
  private readonly collapsed = persistedSignal<string[]>('component-list-collapsed', [], isIdList);

  readonly results = computed(() => searchPalette(PALETTE_ITEMS, PALETTE_CATEGORIES, this.query()));
  readonly searching = computed(() => this.query().trim() !== '');
  readonly groups = computed(() => groupPalette(PALETTE_ITEMS, PALETTE_CATEGORIES));

  readonly icon = (item: PaletteItem) => widgetDefinition(item.type).icon;

  constructor() {
    // Cards are created as sections open and results change; each new one must become a drag
    // source for the canvas grid (existing ones are left alone). The dragged clone is appended to
    // <body> so it escapes the sidebar's overflow:hidden.
    afterRenderEffect(() => {
      this.results();
      this.collapsed();
      GridStack.setupDragIn('.gs-drag-item', { appendTo: 'body', helper: 'clone' });
    });
  }

  switchToEditMode(): void {
    this.tabs.setMode('edit');
  }

  isCollapsed(categoryId: string): boolean {
    return this.collapsed().includes(categoryId);
  }

  toggle(categoryId: string): void {
    this.collapsed.update((ids) => (ids.includes(categoryId) ? ids.filter((id) => id !== categoryId) : [...ids, categoryId]));
  }
}
