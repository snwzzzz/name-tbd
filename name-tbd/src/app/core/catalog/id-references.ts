// Where an app stores ids inside its settings, and of what (shared/id-references.json at the
// repository root, which the backend reads too). Copying things (pasting widgets, duplicating an
// app, restoring a version) rewrites these values to point at the copies.
import referencesJson from '../../../../../shared/id-references.json';

/** What an id points at; `pageList` is a JSON array of page ids. */
export type IdKind = 'widget' | 'page' | 'pageList' | 'dataSource';

interface IdReferencesFile {
  widgetPropTypes: Record<string, IdKind>;
  workflowNodeKeys: Record<string, IdKind>;
}

const REFERENCES = referencesJson as IdReferencesFile;

/** Widget prop types (catalog `type`) whose values are ids, by what they point at. */
export const WIDGET_PROP_ID_KINDS: Readonly<Record<string, IdKind>> = REFERENCES.widgetPropTypes;

/** Workflow node settings (a node's own, or an action's `config`) whose values are ids, by what they point at. */
export const WORKFLOW_NODE_ID_KINDS: Readonly<Record<string, IdKind>> = REFERENCES.workflowNodeKeys;

/** The workflow node settings that hold ids of this kind. */
export const workflowKeysOf = (kind: IdKind): string[] =>
  Object.entries(WORKFLOW_NODE_ID_KINDS)
    .filter(([, k]) => k === kind)
    .map(([key]) => key);
