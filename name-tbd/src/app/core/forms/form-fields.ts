import { FieldKind } from './field-validation';

// The widget types that are fields: what's entered into them can be checked (field-validation)
// and saved into a data source column by a form. A new field type is added here.

export const FIELD_KINDS: Record<string, FieldKind> = {
  input: 'text',
  textarea: 'text',
  number: 'number',
  date: 'date',
  checkbox: 'check',
  toggle: 'check',
  select: 'choice',
  file: 'file',
};

/** How a widget type's value is checked, or undefined when it isn't a field. */
export const fieldKind = (type: string | undefined): FieldKind | undefined => FIELD_KINDS[type ?? ''];
