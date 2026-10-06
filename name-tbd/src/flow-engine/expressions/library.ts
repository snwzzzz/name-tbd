import { displayText, fromCel, isEmptyValue, isPlainObject, toNumber } from './values';

// The standard library of expressions, on top of CEL's own functions and macros (size, contains,
// startsWith, matches, filter, map, exists, …). Each entry is registered with the CEL environment
// (its overloads) and offered by the editor's autocomplete (name, signature, description).

export type LibraryCategory = 'Text' | 'Math' | 'Dates' | 'Lists' | 'Other';

export interface LibraryFunction {
  name: string;
  /** As the editor shows it, e.g. `round(number, digits)`. */
  signature: string;
  description: string;
  category: LibraryCategory;
  /** CEL declarations (parameter and result types) with the code each one runs. */
  overloads: { declaration: string; handler: (...args: never[]) => unknown }[];
}

const TIMESTAMP = 'google.protobuf.Timestamp';

const num = (value: unknown): number => toNumber(fromCel(value)) ?? 0;
const list = (value: unknown): unknown[] => {
  if (!Array.isArray(value)) throw new Error('Expected a list');
  return value;
};
const numbers = (value: unknown): number[] => list(value).map(num);
const sameValue = (a: unknown, b: unknown) => displayText(fromCel(a)) === displayText(fromCel(b));

/** A date from a timestamp, `2026-10-05` (that day at midnight, local time), an ISO date-time or epoch ms. */
export function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (typeof value === 'number' || typeof value === 'bigint') return new Date(Number(value));
  if (typeof value === 'string') {
    const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
    const date = day ? new Date(Number(day[1]), Number(day[2]) - 1, Number(day[3])) : new Date(value.trim());
    if (!Number.isNaN(date.getTime())) return date;
  }
  throw new Error(`${displayText(fromCel(value)) || 'nothing'} is not a date`);
}

/** A date's parts, in a time zone (default: local time). */
function dateParts(date: Date, timeZone?: string) {
  if (!timeZone) {
    return {
      year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate(),
      hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds(),
    };
  }
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric', hourCycle: 'h23',
  }).formatToParts(date).map((p) => [p.type, Number(p.value)]));
  return { year: parts['year'], month: parts['month'], day: parts['day'], hour: parts['hour'], minute: parts['minute'], second: parts['second'] };
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number, width = 2) => String(n).padStart(width, '0');

/** Formats a date with yyyy, yy, MMM, MM, M, dd, d, HH, H, mm and ss (anything else stays as it is). */
export function formatDate(value: unknown, pattern: string, timeZone?: string): string {
  const p = dateParts(toDate(value), timeZone);
  const tokens: Record<string, string> = {
    yyyy: String(p.year), yy: pad(p.year % 100), MMM: MONTHS[p.month - 1], MM: pad(p.month), M: String(p.month),
    dd: pad(p.day), d: String(p.day), HH: pad(p.hour), H: String(p.hour), mm: pad(p.minute), ss: pad(p.second),
  };
  return pattern.replace(/yyyy|yy|MMM|MM|M|dd|d|HH|H|mm|ss/g, (token) => tokens[token]);
}

/** The local date as `yyyy-MM-dd` (what date fields hold). */
export const isoDay = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const DAY_MS = 24 * 60 * 60 * 1000;
const dayNumber = (date: Date) => Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS);

const sortKey = (value: unknown) => {
  const plain = fromCel(value);
  return typeof plain === 'number' ? plain : displayText(plain).toLowerCase();
};
const compare = (a: unknown, b: unknown) => {
  const x = sortKey(a), y = sortKey(b);
  if (typeof x === 'number' && typeof y === 'number') return x - y;
  return String(x).localeCompare(String(y));
};
const field = (item: unknown, key: string) =>
  item instanceof Map ? item.get(key) : isPlainObject(item) ? item[key] : null;

export const LIBRARY: LibraryFunction[] = [
  // ─── Text ──────────────────────────────────────────────────────────────────
  { name: 'text', signature: 'text(value)', category: 'Text', description: 'The value as text, as a label would show it.',
    overloads: [{ declaration: 'text(dyn): string', handler: (v: unknown) => displayText(fromCel(v)) }] },
  { name: 'upper', signature: 'upper(text)', category: 'Text', description: 'The text in capital letters.',
    overloads: [{ declaration: 'upper(dyn): string', handler: (v: unknown) => displayText(fromCel(v)).toUpperCase() }] },
  { name: 'lower', signature: 'lower(text)', category: 'Text', description: 'The text in small letters.',
    overloads: [{ declaration: 'lower(dyn): string', handler: (v: unknown) => displayText(fromCel(v)).toLowerCase() }] },
  { name: 'trim', signature: 'trim(text)', category: 'Text', description: 'The text without spaces at its start and end.',
    overloads: [{ declaration: 'trim(dyn): string', handler: (v: unknown) => displayText(fromCel(v)).trim() }] },
  { name: 'replace', signature: 'replace(text, find, with)', category: 'Text', description: 'Replaces every occurrence of find.',
    overloads: [{ declaration: 'replace(dyn, string, string): string',
      handler: (v: unknown, find: string, by: string) => displayText(fromCel(v)).split(find).join(by) }] },
  { name: 'split', signature: 'split(text, separator)', category: 'Text', description: 'A list of the parts between the separators.',
    overloads: [{ declaration: 'split(dyn, string): list', handler: (v: unknown, sep: string) => displayText(fromCel(v)).split(sep) }] },
  { name: 'isEmpty', signature: 'isEmpty(value)', category: 'Text', description: 'True for nothing, empty text, an empty list or object.',
    overloads: [{ declaration: 'isEmpty(dyn): bool', handler: (v: unknown) => isEmptyValue(v) }] },

  // ─── Math ──────────────────────────────────────────────────────────────────
  { name: 'number', signature: 'number(value)', category: 'Math', description: 'The value as a number (empty: 0).',
    overloads: [{ declaration: 'number(dyn): double', handler: (v: unknown) => num(v) }] },
  { name: 'round', signature: 'round(number, digits?)', category: 'Math', description: 'Rounded, to whole numbers or to some digits after the point.',
    overloads: [
      { declaration: 'round(dyn): double', handler: (v: unknown) => Math.round(num(v)) },
      { declaration: 'round(dyn, dyn): double', handler: (v: unknown, digits: unknown) => {
        const f = 10 ** num(digits);
        return Math.round(num(v) * f) / f;
      } },
    ] },
  { name: 'floor', signature: 'floor(number)', category: 'Math', description: 'Rounded down.',
    overloads: [{ declaration: 'floor(dyn): double', handler: (v: unknown) => Math.floor(num(v)) }] },
  { name: 'ceil', signature: 'ceil(number)', category: 'Math', description: 'Rounded up.',
    overloads: [{ declaration: 'ceil(dyn): double', handler: (v: unknown) => Math.ceil(num(v)) }] },
  { name: 'abs', signature: 'abs(number)', category: 'Math', description: 'The number without its sign.',
    overloads: [{ declaration: 'abs(dyn): double', handler: (v: unknown) => Math.abs(num(v)) }] },
  { name: 'min', signature: 'min(list) or min(a, b)', category: 'Math', description: 'The smallest number.',
    overloads: [
      { declaration: 'min(list): double', handler: (v: unknown) => Math.min(...numbers(v)) },
      { declaration: 'min(dyn, dyn): double', handler: (a: unknown, b: unknown) => Math.min(num(a), num(b)) },
    ] },
  { name: 'max', signature: 'max(list) or max(a, b)', category: 'Math', description: 'The largest number.',
    overloads: [
      { declaration: 'max(list): double', handler: (v: unknown) => Math.max(...numbers(v)) },
      { declaration: 'max(dyn, dyn): double', handler: (a: unknown, b: unknown) => Math.max(num(a), num(b)) },
    ] },
  { name: 'sum', signature: 'sum(list)', category: 'Math', description: 'All numbers of the list added up.',
    overloads: [{ declaration: 'sum(list): double', handler: (v: unknown) => numbers(v).reduce((a, b) => a + b, 0) }] },
  { name: 'avg', signature: 'avg(list)', category: 'Math', description: 'The average of the numbers (empty list: 0).',
    overloads: [{ declaration: 'avg(list): double', handler: (v: unknown) => {
      const all = numbers(v);
      return all.length ? all.reduce((a, b) => a + b, 0) / all.length : 0;
    } }] },

  // ─── Dates ─────────────────────────────────────────────────────────────────
  { name: 'now', signature: 'now()', category: 'Dates', description: 'The current date and time.',
    overloads: [{ declaration: `now(): ${TIMESTAMP}`, handler: () => new Date() }] },
  { name: 'today', signature: 'today()', category: 'Dates', description: "Today's date as yyyy-MM-dd, like a date field holds it.",
    overloads: [{ declaration: 'today(): string', handler: () => isoDay(new Date()) }] },
  { name: 'date', signature: 'date(text)', category: 'Dates', description: 'A date from yyyy-MM-dd or a date and time.',
    overloads: [{ declaration: `date(dyn): ${TIMESTAMP}`, handler: (v: unknown) => toDate(v) }] },
  { name: 'formatDate', signature: 'formatDate(date, pattern, timeZone?)', category: 'Dates',
    description: "The date as text, e.g. formatDate(now(), 'dd.MM.yyyy HH:mm'). Local time unless a time zone is given.",
    overloads: [
      { declaration: 'formatDate(dyn, string): string', handler: (v: unknown, p: string) => formatDate(v, p) },
      { declaration: 'formatDate(dyn, string, string): string', handler: (v: unknown, p: string, tz: string) => formatDate(v, p, tz) },
    ] },
  { name: 'addDays', signature: 'addDays(date, days)', category: 'Dates', description: 'The date that many days later (negative: earlier), as yyyy-MM-dd.',
    overloads: [{ declaration: 'addDays(dyn, dyn): string', handler: (v: unknown, days: unknown) => {
      const d = toDate(v);
      return isoDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() + num(days)));
    } }] },
  { name: 'daysBetween', signature: 'daysBetween(from, to)', category: 'Dates', description: 'Whole days from one date to the other.',
    overloads: [{ declaration: 'daysBetween(dyn, dyn): double', handler: (a: unknown, b: unknown) => dayNumber(toDate(b)) - dayNumber(toDate(a)) }] },

  // ─── Lists ─────────────────────────────────────────────────────────────────
  { name: 'first', signature: 'first(list)', category: 'Lists', description: 'The first item (empty list: null).',
    overloads: [{ declaration: 'first(list): dyn', handler: (v: unknown) => list(v)[0] ?? null }] },
  { name: 'last', signature: 'last(list)', category: 'Lists', description: 'The last item (empty list: null).',
    overloads: [{ declaration: 'last(list): dyn', handler: (v: unknown) => list(v).at(-1) ?? null }] },
  { name: 'unique', signature: 'unique(list)', category: 'Lists', description: 'The list without repeated items.',
    overloads: [{ declaration: 'unique(list): list', handler: (v: unknown) =>
      list(v).filter((item, i, all) => all.findIndex((other) => sameValue(other, item)) === i) }] },
  { name: 'sort', signature: 'sort(list)', category: 'Lists', description: 'The items in order (numbers by size, text alphabetically).',
    overloads: [{ declaration: 'sort(list): list', handler: (v: unknown) => [...list(v)].sort(compare) }] },
  { name: 'sortBy', signature: 'sortBy(list, key)', category: 'Lists', description: 'Rows or objects ordered by one of their fields.',
    overloads: [{ declaration: 'sortBy(list, string): list', handler: (v: unknown, key: string) =>
      [...list(v)].sort((a, b) => compare(field(a, key), field(b, key))) }] },
  { name: 'reverse', signature: 'reverse(list)', category: 'Lists', description: 'The items in reverse order.',
    overloads: [{ declaration: 'reverse(list): list', handler: (v: unknown) => [...list(v)].reverse() }] },
  { name: 'append', signature: 'append(list, item)', category: 'Lists', description: 'The list with the item added at its end.',
    overloads: [{ declaration: 'append(list, dyn): list', handler: (v: unknown, item: unknown) => [...list(v), item] }] },
  { name: 'remove', signature: 'remove(list, item)', category: 'Lists', description: 'The list without that item.',
    overloads: [{ declaration: 'remove(list, dyn): list', handler: (v: unknown, item: unknown) => list(v).filter((x) => !sameValue(x, item)) }] },
  { name: 'keys', signature: 'keys(object)', category: 'Lists', description: "An object's field names.",
    overloads: [{ declaration: 'keys(dyn): list', handler: (v: unknown) => (v instanceof Map ? [...v.keys()] : Object.keys(v as object)) }] },
  { name: 'values', signature: 'values(object)', category: 'Lists', description: "An object's field values.",
    overloads: [{ declaration: 'values(dyn): list', handler: (v: unknown) => (v instanceof Map ? [...v.values()] : Object.values(v as object)) }] },

  // ─── Other ─────────────────────────────────────────────────────────────────
  { name: 'default', signature: 'default(value, fallback)', category: 'Other', description: 'The value, or the fallback when the value is empty.',
    overloads: [{ declaration: 'default(dyn, dyn): dyn', handler: (v: unknown, fallback: unknown) => (isEmptyValue(v) ? fallback : v) }] },
  { name: 'json', signature: 'json(text)', category: 'Other', description: 'The value JSON text describes.',
    overloads: [{ declaration: 'json(dyn): dyn', handler: (v: unknown) => JSON.parse(displayText(fromCel(v))) }] },
  { name: 'toJson', signature: 'toJson(value)', category: 'Other', description: 'The value as JSON text.',
    overloads: [{ declaration: 'toJson(dyn): string', handler: (v: unknown) => JSON.stringify(fromCel(v)) }] },
];

/** CEL's own functions and macros, as the editor's autocomplete offers them. */
export const CEL_BUILTINS: Omit<LibraryFunction, 'overloads'>[] = [
  { name: 'size', signature: 'size(list or text)', category: 'Lists', description: 'How many items (or characters).' },
  { name: 'has', signature: 'has(object.field)', category: 'Other', description: 'Whether the object has the field.' },
  { name: 'string', signature: 'string(value)', category: 'Text', description: 'Converts a number or other value to text.' },
  { name: 'int', signature: 'int(value)', category: 'Math', description: 'A whole number (cuts off decimals).' },
  { name: 'double', signature: 'double(value)', category: 'Math', description: 'A decimal number.' },
];

/** CEL methods, offered after a dot (e.g. `name.contains("x")`, `rows.filter(r, r.open)`). */
export const CEL_METHODS: Omit<LibraryFunction, 'overloads'>[] = [
  { name: 'contains', signature: 'text.contains(part)', category: 'Text', description: 'Whether the text contains the part.' },
  { name: 'startsWith', signature: 'text.startsWith(part)', category: 'Text', description: 'Whether the text starts with the part.' },
  { name: 'endsWith', signature: 'text.endsWith(part)', category: 'Text', description: 'Whether the text ends with the part.' },
  { name: 'matches', signature: 'text.matches(pattern)', category: 'Text', description: 'Whether the text matches a regular expression.' },
  { name: 'filter', signature: 'list.filter(x, condition)', category: 'Lists', description: 'The items the condition is true for.' },
  { name: 'map', signature: 'list.map(x, value)', category: 'Lists', description: 'A value for each item.' },
  { name: 'exists', signature: 'list.exists(x, condition)', category: 'Lists', description: 'Whether the condition is true for any item.' },
  { name: 'all', signature: 'list.all(x, condition)', category: 'Lists', description: 'Whether the condition is true for every item.' },
  { name: 'join', signature: 'list.join(separator)', category: 'Lists', description: 'The items as one text.' },
  { name: 'size', signature: 'value.size()', category: 'Lists', description: 'How many items (or characters).' },
];
