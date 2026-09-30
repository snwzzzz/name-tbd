import { Component, afterRenderEffect, computed, signal } from '@angular/core';
import { NgComponentOutlet, NgTemplateOutlet } from '@angular/common';
import { GridStack } from 'gridstack';
import { LucideChevronDown, LucideChevronRight, LucideGripVertical, LucideSearch } from '@lucide/angular';
import { PALETTE_CATEGORIES, PALETTE_ITEMS, widgetDefinition } from '../../_constants/widget-registry.constants';
import { PaletteItem } from '../../_types/widget.types';
import { groupPalette, searchPalette } from '../../_utils/palette.utils';
import { persistedSignal } from '../../_utils/storage.utils';

const isIdList = (value: unknown): value is string[] => Array.isArray(value) && value.every((v) => typeof v === 'string');

/**
 * The widgets that can be dragged onto the canvas: in collapsible categories, or, while
 * searching, every match across all categories.
 */
@Component({
  selector: 'app-component-list',
  imports: [NgComponentOutlet, NgTemplateOutlet, LucideChevronDown, LucideChevronRight, LucideGripVertical, LucideSearch],
  templateUrl: './component-list.html',
  styleUrl: './component-list.scss',
})
export class ComponentList {
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

  isCollapsed(categoryId: string): boolean {
    return this.collapsed().includes(categoryId);
  }

  toggle(categoryId: string): void {
    this.collapsed.update((ids) => (ids.includes(categoryId) ? ids.filter((id) => id !== categoryId) : [...ids, categoryId]));
  }
}
