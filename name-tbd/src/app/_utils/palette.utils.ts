import { PaletteCategory, PaletteItem } from '../_types/widget.types';

/**
 * The items matching a search: every word of the query must appear in the item's label,
 * category or keywords (case-insensitive). An empty query matches everything.
 */
export function searchPalette(items: PaletteItem[], categories: PaletteCategory[], query: string): PaletteItem[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return items;
  return items.filter((item) => {
    const category = categories.find((c) => c.id === item.category)?.label ?? '';
    const haystack = [item.label, category, ...(item.keywords ?? [])].join(' ').toLowerCase();
    return words.every((word) => haystack.includes(word));
  });
}

/** The categories that have items, each with its items, in category order. */
export function groupPalette(items: PaletteItem[], categories: PaletteCategory[]): { category: PaletteCategory; items: PaletteItem[] }[] {
  return categories
    .map((category) => ({ category, items: items.filter((item) => item.category === category.id) }))
    .filter((group) => group.items.length > 0);
}
