import { WidgetProps } from '../../_types/layout.types';
import { propBool, propNumber, propText } from '../../_utils/widget-props.utils';

// Checking what's entered into a field against its "Validation" settings from the catalog
// (required, min, max, pattern). What min and max mean depends on the kind of field.

/**
 * How a field's value is checked:
 * - text: min/max are a length, pattern a regular expression the whole value must match;
 * - number: min/max are the smallest and largest number;
 * - date: min/max are the earliest and latest date (YYYY-MM-DD);
 * - check: a checkbox; required means it must be checked;
 * - choice, file: only required.
 */
export type FieldKind = 'text' | 'number' | 'date' | 'check' | 'choice' | 'file';

/** What's wrong with a value (a message to show under the field), or null when it's fine. */
export function validateField(kind: FieldKind, props: WidgetProps, value: string): string | null {
  const required = propBool(props, 'required', false);
  if (kind === 'check') return required && value !== 'true' ? 'Please check this box.' : null;

  const empty = value.trim() === '';
  if (empty) return required ? (kind === 'choice' || kind === 'file' ? 'Please choose one.' : 'This field is required.') : null;

  switch (kind) {
    case 'text': return checkText(props, value);
    case 'number': return checkNumber(props, value);
    case 'date': return checkDate(props, value);
    default: return null;
  }
}

function checkText(props: WidgetProps, value: string): string | null {
  const min = propNumber(props, 'min', NaN);
  const max = propNumber(props, 'max', NaN);
  if (Number.isFinite(min) && value.length < min) return `Enter at least ${min} characters.`;
  if (Number.isFinite(max) && value.length > max) return `Enter at most ${max} characters.`;
  const pattern = propText(props, 'pattern');
  if (pattern && !matchesWhole(pattern, value)) return propText(props, 'patternMessage') ?? "This doesn't have the expected format.";
  return null;
}

function checkNumber(props: WidgetProps, value: string): string | null {
  const number = Number(value);
  if (!Number.isFinite(number)) return 'Enter a number.';
  const min = propNumber(props, 'min', NaN);
  const max = propNumber(props, 'max', NaN);
  if (Number.isFinite(min) && number < min) return `Enter ${min} or more.`;
  if (Number.isFinite(max) && number > max) return `Enter ${max} or less.`;
  return null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function checkDate(props: WidgetProps, value: string): string | null {
  if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) return 'Enter a valid date.';
  // ISO dates compare correctly as text
  const min = propText(props, 'min');
  const max = propText(props, 'max');
  if (min && ISO_DATE.test(min) && value < min) return `Pick ${min} or later.`;
  if (max && ISO_DATE.test(max) && value > max) return `Pick ${max} or earlier.`;
  return null;
}

/** Whether the whole value matches a pattern; a pattern that isn't a valid regular expression matches anything. */
function matchesWhole(pattern: string, value: string): boolean {
  try {
    return new RegExp(`^(?:${pattern})$`, 'u').test(value);
  } catch {
    return true;
  }
}
