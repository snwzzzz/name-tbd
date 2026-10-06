import { Environment } from '@marcbachmann/cel-js';
import { LIBRARY } from './library';
import { displayText, fromCel } from './values';
import { parseTemplate, wholeExpression } from './template';
import { ExpressionError } from './errors';

export { ExpressionError };

// Expressions are CEL (the Common Expression Language, github.com/google/cel-spec), evaluated by
// @marcbachmann/cel-js: an interpreter, so an expression can only compute a value from the scope
// it's given (no code runs, also not in exported files), and the server runs the same library.
//
// On top of CEL: the standard library (library.ts), and arithmetic between whole and decimal
// numbers (`amount * 2` where amount is 2.5), which plain CEL refuses.

type Parsed = ReturnType<Environment['parse']>;

const ARITHMETIC: Record<string, (a: number, b: number) => number> = {
  '+': (a, b) => a + b,
  '-': (a, b) => a - b,
  '*': (a, b) => a * b,
  '/': (a, b) => a / b,
  '%': (a, b) => a % b,
};

function createEnvironment(): Environment {
  const env = new Environment({
    // The scope decides what exists (widgets, variables, …); unknown names fail when evaluated
    unlistedVariablesAreDyn: true,
    homogeneousAggregateLiterals: false,
    enableOptionalTypes: true,
  });
  for (const [op, apply] of Object.entries(ARITHMETIC)) {
    env.registerOperator(`double ${op} int`, (a: number, b: bigint) => apply(a, Number(b)));
    env.registerOperator(`int ${op} double`, (a: bigint, b: number) => apply(Number(a), b));
  }
  env.registerOperator('double % double', (a: number, b: number) => a % b);
  // "Total: " + amount
  for (const type of ['int', 'double', 'bool']) {
    env.registerOperator(`string + ${type}`, (a: string, b: unknown) => a + displayText(fromCel(b)));
    env.registerOperator(`${type} + string`, (a: unknown, b: string) => displayText(fromCel(a)) + b);
  }
  for (const fn of LIBRARY) {
    for (const overload of fn.overloads) {
      env.registerFunction({ signature: overload.declaration, handler: overload.handler as never, description: fn.description });
    }
  }
  return env;
}

const MAX_CACHED = 1000;

/** Evaluates expressions and `{{ }}` templates against a scope (an object of the names they may use). */
export class Expressions {
  readonly environment = createEnvironment();
  private readonly cache = new Map<string, Parsed>();

  /** The expression's value (plain: integers as numbers, maps as objects). Throws an ExpressionError. */
  evaluate(expression: string, scope: object): unknown {
    const parsed = this.parse(expression);
    try {
      return fromCel(parsed(scope as Record<string, unknown>));
    } catch (err) {
      throw toExpressionError(err, expression);
    }
  }

  /**
   * A template's value: text with `{{ expression }}` parts. Just one `{{ }}` and nothing around it
   * gives the expression's own value (a number stays a number); otherwise the parts as text.
   * Throws an ExpressionError (positions in the template).
   */
  template(text: string, scope: object): unknown {
    const parts = parseTemplate(text);
    const whole = wholeExpression(parts);
    if (whole) return this.evaluateAt(whole.expression!, whole.start, scope);
    return parts.map((part) => (part.expression === undefined
      ? part.text
      : displayText(this.evaluateAt(part.expression, part.start, scope)))).join('');
  }

  /** A template as text. */
  text(text: string, scope: object): string {
    return displayText(this.template(text, scope));
  }

  /** Parses an expression (cached), throwing an ExpressionError for one that can't be read. */
  parse(expression: string): Parsed {
    let parsed = this.cache.get(expression);
    if (!parsed) {
      if (!expression.trim()) throw new ExpressionError('The expression is empty', 0, 0);
      try {
        parsed = this.environment.parse(expression);
      } catch (err) {
        throw toExpressionError(err, expression);
      }
      if (this.cache.size >= MAX_CACHED) this.cache.delete(this.cache.keys().next().value!);
      this.cache.set(expression, parsed);
    }
    return parsed;
  }

  private evaluateAt(expression: string, offset: number, scope: object): unknown {
    try {
      return this.evaluate(expression, scope);
    } catch (err) {
      const e = err as ExpressionError;
      throw new ExpressionError(e.message, e.start + offset, e.end + offset);
    }
  }
}

/** The one evaluator (it only caches parsed expressions, so sharing it is safe). */
export const expressions = new Expressions();

/** CEL's errors as ExpressionErrors: their first line, and the part of the expression they point at. */
export function toExpressionError(err: unknown, expression: string): ExpressionError {
  if (err instanceof ExpressionError) return err;
  const e = err as { message?: string; node?: { start?: number; end?: number; pos?: number } };
  const message = friendlyMessage(String(e.message ?? err).split('\n')[0].trim());
  const start = e.node?.start ?? e.node?.pos ?? 0;
  const end = Math.max(e.node?.end ?? start, start);
  return new ExpressionError(message, Math.min(start, expression.length), Math.min(end, expression.length));
}

/** CEL's wording, where a no-code user wouldn't follow it. */
function friendlyMessage(message: string): string {
  const unknown = /^Unknown variable: (.+)$/.exec(message);
  if (unknown) return `Unknown name "${unknown[1]}"`;
  const noKey = /^No such key: (.+)$/.exec(message);
  if (noKey) return `There is no "${noKey[1]}"`;
  if (message === 'Unexpected token: EOF') return 'The expression ends too early';
  return message.replace(/dyn<(\w+)>/g, '$1').replace(/\bdouble\b/g, 'number').replace(/\bint\b/g, 'number');
}
