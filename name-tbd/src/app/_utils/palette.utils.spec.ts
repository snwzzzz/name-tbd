import { groupPalette, searchPalette } from './palette.utils';
import { PaletteCategory, PaletteItem } from '../_types/widget.types';

const CATEGORIES: PaletteCategory[] = [
  { id: 'basic', label: 'Basic' },
  { id: 'navigation', label: 'Navigation' },
  { id: 'empty', label: 'Empty' },
];
const ITEMS: PaletteItem[] = [
  { type: 'link', label: 'Link', category: 'navigation', keywords: ['a', 'href', 'hyperlink'], w: 2, h: 1 },
  { type: 'nav', label: 'Nav Menu', category: 'navigation', keywords: ['navbar'], w: 8, h: 1 },
  { type: 'label', label: 'Text Label', category: 'basic', w: 2, h: 1 },
];

describe('palette utils', () => {
  it('finds items by label, category or keyword, across categories', () => {
    expect(searchPalette(ITEMS, CATEGORIES, 'hyper').map((i) => i.type)).toEqual(['link']);
    expect(searchPalette(ITEMS, CATEGORIES, 'NAVIGATION').map((i) => i.type)).toEqual(['link', 'nav']);
    expect(searchPalette(ITEMS, CATEGORIES, 'text basic').map((i) => i.type)).toEqual(['label']);
    expect(searchPalette(ITEMS, CATEGORIES, 'chart')).toEqual([]);
    expect(searchPalette(ITEMS, CATEGORIES, '  ')).toEqual(ITEMS);
  });

  it('groups items by category in category order, leaving out empty ones', () => {
    const groups = groupPalette(ITEMS, CATEGORIES);
    expect(groups.map((g) => g.category.id)).toEqual(['basic', 'navigation']);
    expect(groups[1].items.map((i) => i.type)).toEqual(['link', 'nav']);
  });
});
