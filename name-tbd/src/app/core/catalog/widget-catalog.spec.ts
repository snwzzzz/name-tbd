import { WIDGET_CATALOG } from './widget-catalog';
import { WIDGET_COMPONENTS, WIDGET_ICONS } from '../../_constants/widget-registry.constants';
import { PROP_EDITORS } from '../../_constants/prop-editors.constants';

// The catalog is shared with the backend; these keep it and the frontend in step.
describe('widget catalog ↔ frontend', () => {
  const BUILT_IN_PROP_TYPES = ['string', 'number', 'color', 'boolean', 'select', 'textarea'];

  it('has a component for every widget type, and no component without a catalog entry', () => {
    const types = WIDGET_CATALOG.widgets.map((w) => w.type);
    expect(types.filter((t) => !WIDGET_COMPONENTS[t])).toEqual([]);
    expect(Object.keys(WIDGET_COMPONENTS).filter((t) => !types.includes(t))).toEqual([]);
  });

  it('only uses icons and prop types the frontend knows', () => {
    expect(WIDGET_CATALOG.widgets.filter((w) => w.icon && !WIDGET_ICONS[w.icon]).map((w) => w.type)).toEqual([]);
    const unknown = WIDGET_CATALOG.widgets
      .flatMap((w) => w.props.map((p) => p.type))
      .filter((t) => !BUILT_IN_PROP_TYPES.includes(t) && !PROP_EDITORS[t]);
    expect(unknown).toEqual([]);
  });

  it('puts every widget in a known category', () => {
    const categories = WIDGET_CATALOG.categories.map((c) => c.id);
    expect(WIDGET_CATALOG.widgets.filter((w) => !categories.includes(w.category ?? '')).map((w) => w.type)).toEqual([]);
  });
});
