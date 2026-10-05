import { ExpressionError } from './errors';

// Templates: text with expressions in double braces, e.g. `Hello {{ customer.name }}!`. Widget
// settings bound to a value and action settings like a message or a URL are templates.

/** A piece of a template: plain text, or an expression with its place (start…end) in the template. */
export interface TemplatePart {
  text: string;
  expression?: string;
  start: number;
  end: number;
}

/** Whether a setting's value is a template (has an expression in it) rather than a fixed value. */
export const isTemplate = (value: unknown): value is string => typeof value === 'string' && value.includes('{{');

/** The template's parts. Throws an ExpressionError for `{{` without its `}}`. */
export function parseTemplate(text: string): TemplatePart[] {
  const parts: TemplatePart[] = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf('{{', i);
    if (open < 0) {
      parts.push({ text: text.slice(i), start: i, end: text.length });
      break;
    }
    if (open > i) parts.push({ text: text.slice(i, open), start: i, end: open });
    const close = closingBraces(text, open + 2);
    if (close < 0) throw new ExpressionError('Missing }} after {{', open, text.length);
    parts.push({ text: text.slice(open, close + 2), expression: text.slice(open + 2, close), start: open + 2, end: close });
    i = close + 2;
  }
  return parts;
}

/** The single expression a template consists of (spaces around it aside), or null. */
export function wholeExpression(parts: TemplatePart[]): TemplatePart | null {
  const expressions = parts.filter((p) => p.expression !== undefined);
  const text = parts.filter((p) => p.expression === undefined && p.text.trim() !== '');
  return expressions.length === 1 && text.length === 0 ? expressions[0] : null;
}

/** Where the `}}` closing an expression starts (skipping quoted text), or -1. */
function closingBraces(text: string, from: number): number {
  let quote: string | null = null;
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    } else if (c === '}' && text[i + 1] === '}') {
      return i;
    }
  }
  return -1;
}
