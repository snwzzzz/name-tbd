// Values crossing into and out of expressions. Expressions (CEL) have integers (BigInt), decimals,
// text, true/false, null, lists, maps and timestamps; the rest of the app has plain JSON-like
// values. A typed variable holds one of VARIABLE_TYPES.

export type VariableType = 'text' | 'number' | 'boolean' | 'list' | 'object';

export const VARIABLE_TYPES: { id: VariableType; label: string }[] = [
  { id: 'text', label: 'Text' },
  { id: 'number', label: 'Number' },
  { id: 'boolean', label: 'True / false' },
  { id: 'list', label: 'List' },
  { id: 'object', label: 'Object' },
];

/** A variable of an app or a page: its type and the value it starts with. */
export interface VariableDefinition {
  name: string;
  type: VariableType;
  /** The starting value, as JSON (text: a JSON string; number: a JSON number; …). Empty: the type's empty value. */
  initial?: string;
}

/** A value as the app keeps it: integers come back as numbers, maps as objects. */
export function fromCel(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value);
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(fromCel);
  if (value instanceof Map) return Object.fromEntries([...value].map(([k, v]) => [String(k), fromCel(v)]));
  if (value instanceof Date) return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, fromCel(v)]));
  return value;
}

/**
 * A value expressions can read: CEL has no undefined, so it becomes null (also inside lists and
 * objects). Objects with getters (the scope) are left as they are, so their getters run lazily.
 */
export function toCel(value: unknown): unknown {
  if (value === undefined) return null;
  if (Array.isArray(value)) return value.map(toCel);
  if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toCel(v)]));
  return value;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

/** A value shown as text (on a label, in a message, in a URL): no quotes, numbers without float noise. */
export function displayText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'number') return formatNumber(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  return JSON.stringify(fromCel(value), (_, v) => (typeof v === 'bigint' ? Number(v) : v));
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value);
  if (Number.isInteger(value)) return String(value);
  // 0.1 + 0.2 shows as 0.3
  return String(Number(value.toPrecision(12)));
}

/** Whether a value counts as empty: null, '', an empty list or object. */
export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (value instanceof Map) return value.size === 0;
  if (isPlainObject(value)) return Object.keys(value).length === 0;
  return false;
}

/** A number from a number, an integer or text ('' and null: null). Throws for anything else. */
export function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string') {
    if (value.trim() === '') return null;
    const n = Number(value.trim());
    if (!Number.isNaN(n)) return n;
  }
  throw new Error(`${describe(value)} is not a number`);
}

/** The value as the variable's type, or an error saying why it can't be. */
export function coerceToType(value: unknown, type: VariableType): unknown {
  const plain = fromCel(value);
  switch (type) {
    case 'text':
      return displayText(plain);
    case 'number':
      return toNumber(plain);
    case 'boolean':
      if (typeof plain === 'boolean' || plain === null) return plain;
      if (plain === 'true' || plain === 'false') return plain === 'true';
      throw new Error(`${describe(plain)} is not true or false`);
    case 'list':
      if (Array.isArray(plain) || plain === null) return plain ?? [];
      throw new Error(`${describe(plain)} is not a list`);
    case 'object':
      if (isPlainObject(plain) || plain === null) return plain ?? {};
      throw new Error(`${describe(plain)} is not an object`);
  }
}

/** A variable's starting value: its initial JSON as its type, or the type's empty value. */
export function initialValue(definition: VariableDefinition): unknown {
  const raw = definition.initial?.trim() ?? '';
  if (raw === '') return emptyValue(definition.type);
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Plain text (e.g. hello without quotes) is meant as text
  }
  try {
    return coerceToType(parsed, definition.type);
  } catch {
    return emptyValue(definition.type);
  }
}

export function emptyValue(type: VariableType): unknown {
  switch (type) {
    case 'text': return '';
    case 'number': return 0;
    case 'boolean': return false;
    case 'list': return [];
    case 'object': return {};
  }
}

/** Why a variable definition's initial value isn't valid for its type, or null. */
export function initialValueError(definition: VariableDefinition): string | null {
  const raw = definition.initial?.trim() ?? '';
  if (raw === '') return null;
  let parsed: unknown = raw;
  try {
    parsed = JSON.parse(raw);
  } catch {
    if (definition.type === 'list' || definition.type === 'object') return 'Not valid JSON';
  }
  try {
    coerceToType(parsed, definition.type);
    return null;
  } catch (err) {
    return (err as Error).message;
  }
}

/** A short description of a value for messages, e.g. `"abc"` or `a list`. */
export function describe(value: unknown): string {
  if (value === null || value === undefined) return 'nothing';
  if (typeof value === 'string') return JSON.stringify(value.length > 40 ? `${value.slice(0, 40)}…` : value);
  if (Array.isArray(value)) return 'a list';
  if (typeof value === 'object' && !(value instanceof Date)) return 'an object';
  return displayText(value);
}
