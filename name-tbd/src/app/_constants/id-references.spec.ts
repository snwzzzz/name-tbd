import { WIDGET_CATALOG } from '../core/catalog/widget-catalog';
import { WIDGET_PROP_ID_KINDS, WORKFLOW_NODE_ID_KINDS, workflowKeysOf } from '../core/catalog/id-references';
import { ACTION_TYPES } from './workflow.constants';

/** Catalog prop types whose values are never ids (text, numbers, choices, column names). */
const PLAIN_PROP_TYPES = ['string', 'number', 'boolean', 'color', 'select', 'textarea', 'columns', 'column', 'field'];

describe('id references (shared/id-references.json)', () => {
  it('knows for every catalog prop type whether it holds an id', () => {
    const types = new Set(WIDGET_CATALOG.widgets.flatMap((w) => w.props.map((p) => p.type)));
    const unknown = [...types].filter((t) => !PLAIN_PROP_TYPES.includes(t) && !(t in WIDGET_PROP_ID_KINDS));
    // A new prop type: list it in shared/id-references.json if it holds an id, else in PLAIN_PROP_TYPES
    expect(unknown).toEqual([]);
  });

  it('lists every action setting that holds an id (named …Id)', () => {
    const idSettings = ACTION_TYPES.flatMap((action) => Object.keys(action.defaultConfig).filter((key) => key.endsWith('Id')));
    expect(idSettings.filter((key) => !(key in WORKFLOW_NODE_ID_KINDS))).toEqual([]);
  });

  it("lists a trigger's widget", () => {
    expect(workflowKeysOf('widget')).toContain('elementId');
  });
});
