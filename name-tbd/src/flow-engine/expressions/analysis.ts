import { expressions, toExpressionError } from './expressions';
import { ExpressionError } from './errors';
import { CEL_BUILTINS, CEL_METHODS, LIBRARY } from './library';
import { parseTemplate } from './template';

// What the editor needs to help write expressions: the problems in one (unknown names, a missing
// field, a syntax error, with where they are), and what may be typed at the cursor (autocomplete).
// Both work on a description of the scope (ScopeEntry), not on values: the editor knows the
// widgets, variables and fields, but not what someone will type into them.

export type ScopeEntryKind = 'widget' | 'variable' | 'field' | 'local' | 'param' | 'value';

/** A name an expression can use, and what can follow it after a dot. */
export interface ScopeEntry {
  name: string;
  kind: ScopeEntryKind;
  /** What it holds, as the autocomplete shows it, e.g. `number`, `form`, `row`. */
  type?: string;
  detail?: string;
  /** Its fields. Missing: anything may follow (e.g. an object variable, a row of unknown columns). */
  members?: ScopeEntry[];
}

/** Something wrong with an expression or template: what, and where (start…end in the text). */
export interface ExpressionProblem {
  message: string;
  start: number;
  end: number;
}

export type CompletionKind = ScopeEntryKind | 'function' | 'method' | 'keyword';

export interface Completion {
  label: string;
  kind: CompletionKind;
  detail?: string;
  /** What replaces the typed prefix (functions get their opening parenthesis). */
  insert: string;
}

export interface Completions {
  /** The part of the text the chosen completion replaces. */
  from: number;
  to: number;
  items: Completion[];
}

// Macros whose first argument names each item (`rows.filter(r, r.open)`)
const BINDING_MACROS = new Set(['filter', 'map', 'exists', 'all', 'exists_one', 'existsOne']);

interface AstNode {
  op: string;
  args: unknown;
  start: number;
  end: number;
}

const isNode = (value: unknown): value is AstNode =>
  !!value && typeof value === 'object' && typeof (value as AstNode).op === 'string';

/** The first problem in an expression, or null when it looks fine. */
export function checkExpression(expression: string, scope: ScopeEntry[]): ExpressionProblem | null {
  if (!expression.trim()) return { message: 'Enter an expression', start: 0, end: expression.length };
  let ast: AstNode;
  try {
    ast = expressions.parse(expression).ast as unknown as AstNode;
  } catch (err) {
    return problem(err, expression);
  }

  // Unknown names, and types that can never fit (CEL's checker; scope names may hold anything)
  const checker = expressions.environment.clone({ unlistedVariablesAreDyn: false });
  for (const entry of scope) {
    if (!checker.hasVariable(entry.name)) checker.registerVariable(entry.name, 'dyn');
  }
  const checked = checker.check(expression);
  if (!checked.valid && checked.error) return problem(checked.error, expression);

  return memberProblem(ast, scope, boundNames(ast));
}

/** The first problem in a template's expressions (positions in the template), or null. */
export function checkTemplate(text: string, scope: ScopeEntry[]): ExpressionProblem | null {
  let parts;
  try {
    parts = parseTemplate(text);
  } catch (err) {
    return problem(err, text);
  }
  for (const part of parts) {
    if (part.expression === undefined) continue;
    const found = checkExpression(part.expression, scope);
    if (found) return { message: found.message, start: found.start + part.start, end: found.end + part.start };
  }
  return null;
}

function problem(err: unknown, text: string): ExpressionProblem {
  const e = err instanceof ExpressionError ? err : toExpressionError(err, text);
  return { message: e.message, start: e.start, end: e.end };
}

/** Names the expression binds itself (macro items, cel.bind), whose fields can't be known. */
function boundNames(ast: AstNode): Set<string> {
  const names = new Set<string>();
  visit(ast, (node) => {
    if (node.op !== 'rcall' || !Array.isArray(node.args)) return;
    const [name, , args] = node.args as [string, unknown, unknown[]];
    const first = Array.isArray(args) ? args[0] : undefined;
    if ((BINDING_MACROS.has(name) || name === 'bind') && isNode(first) && first.op === 'id') names.add(String(first.args));
  });
  return names;
}

/** `orderForm.amout` where orderForm has no field amout. */
function memberProblem(ast: AstNode, scope: ScopeEntry[], bound: Set<string>): ExpressionProblem | null {
  let found: ExpressionProblem | null = null;
  visit(ast, (node) => {
    if (found || (node.op !== '.' && node.op !== '.?') || !Array.isArray(node.args)) return;
    const [base, field] = node.args as [unknown, string];
    const entry = resolve(base, scope, bound);
    if (entry?.members && !entry.members.some((m) => m.name === field)) {
      found = { message: `${entry.name} has no "${field}"`, start: node.start, end: node.end };
    }
  });
  return found;
}

/** The scope entry a member chain like `a.b` stands for, when every step is known. */
function resolve(node: unknown, scope: ScopeEntry[], bound: Set<string>): ScopeEntry | undefined {
  if (!isNode(node)) return undefined;
  if (node.op === 'id') return bound.has(String(node.args)) ? undefined : scope.find((e) => e.name === node.args);
  if ((node.op === '.' || node.op === '.?') && Array.isArray(node.args)) {
    const [base, field] = node.args as [unknown, string];
    return resolve(base, scope, bound)?.members?.find((m) => m.name === field);
  }
  return undefined;
}

function visit(value: unknown, fn: (node: AstNode) => void): void {
  if (Array.isArray(value)) {
    value.forEach((v) => visit(v, fn));
  } else if (isNode(value)) {
    fn(value);
    visit(value.args, fn);
  }
}

// ─── Autocomplete ────────────────────────────────────────────────────────────

const KEYWORDS: Completion[] = ['true', 'false', 'null'].map((k) => ({ label: k, kind: 'keyword', insert: k }));

const FUNCTIONS: Completion[] = [...LIBRARY, ...CEL_BUILTINS]
  .filter((fn, i, all) => all.findIndex((f) => f.name === fn.name) === i)
  .map((fn) => ({ label: fn.name, kind: 'function', detail: `${fn.signature}: ${fn.description}`, insert: `${fn.name}(` }));

const METHODS: Completion[] = CEL_METHODS.map((m) => ({
  label: m.name, kind: 'method', detail: `${m.signature}: ${m.description}`, insert: `${m.name}(`,
}));

/**
 * What may be typed at the cursor: the names of the scope (or the fields after `name.`),
 * functions and keywords, best matches first. `template`: only inside `{{ }}`.
 */
export function completions(text: string, cursor: number, scope: ScopeEntry[], template: boolean): Completions | null {
  const start = template ? expressionStart(text, cursor) : 0;
  if (start < 0) return null;
  const before = text.slice(start, cursor);
  if (insideString(before)) return null;

  const match = /((?:[A-Za-z_]\w*\s*\??\.\s*)*)([A-Za-z_]\w*)?$/.exec(before)!;
  const path = match[1].split('.').map((s) => s.replace('?', '').trim()).filter(Boolean);
  const prefix = match[2] ?? '';
  // Not right after a number, a closing bracket or the end of a quoted text
  if (!path.length && !prefix && /[\w)\]"']\s*$/.test(before)) return null;

  let items: Completion[];
  if (path.length) {
    let entries: ScopeEntry[] | undefined = scope;
    for (const name of path) entries = entries?.find((e) => e.name === name)?.members;
    items = [...(entries ?? []).map(entryCompletion), ...METHODS];
  } else {
    items = [...scope.map(entryCompletion), ...FUNCTIONS, ...KEYWORDS];
  }

  const lower = prefix.toLowerCase();
  const ranked = items
    .filter((item) => item.label.toLowerCase().includes(lower))
    .sort((a, b) => Number(!a.label.toLowerCase().startsWith(lower)) - Number(!b.label.toLowerCase().startsWith(lower)));
  return ranked.length ? { from: cursor - prefix.length, to: cursor, items: ranked } : null;
}

function entryCompletion(entry: ScopeEntry): Completion {
  return { label: entry.name, kind: entry.kind, detail: entry.detail ?? entry.type, insert: entry.name };
}

/** Where the expression the cursor is in starts (after its `{{`), or -1 outside of `{{ }}`. */
function expressionStart(text: string, cursor: number): number {
  const open = text.lastIndexOf('{{', cursor - 2);
  if (open < 0) return -1;
  const close = text.indexOf('}}', open + 2);
  return close >= 0 && close < cursor ? -1 : open + 2;
}

/** Whether the end of the text is inside quotes. */
function insideString(text: string): boolean {
  let quote: string | null = null;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quote) {
      if (c === '\\') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") {
      quote = c;
    }
  }
  return quote !== null;
}
