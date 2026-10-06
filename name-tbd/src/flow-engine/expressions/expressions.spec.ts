import { ExpressionError, expressions } from './expressions';
import { coerceToType, displayText, initialValue, initialValueError } from './values';

const evaluate = (expression: string, scope: object = {}) => expressions.evaluate(expression, scope);

describe('expressions', () => {
  it('computes with whole and decimal numbers alike, and gives plain numbers back', () => {
    expect(evaluate('orderForm.amount > 500', { orderForm: { amount: 600 } })).toBe(true);
    expect(evaluate('amount * 2', { amount: 2.5 })).toBe(5);
    expect(evaluate('1 + amount', { amount: 0.5 })).toBe(1.5);
    expect(evaluate('size(items) + 1', { items: [1, 2] })).toBe(3);
    expect(evaluate('"Total: " + amount', { amount: 12.5 })).toBe('Total: 12.5');
  });

  it('has the standard library', () => {
    expect(evaluate('round(2.567, 2)')).toBe(2.57);
    expect(evaluate('sum(rows.map(r, r.amount))', { rows: [{ amount: 2 }, { amount: 3.5 }] })).toBe(5.5);
    expect(evaluate('avg([])')).toBe(0);
    expect(evaluate('upper(trim("  hi "))')).toBe('HI');
    expect(evaluate('replace("a-b-c", "-", "/")')).toBe('a/b/c');
    expect(evaluate('default(name, "nobody")', { name: '' })).toBe('nobody');
    expect(evaluate('first(sortBy(people, "age")).name', { people: [{ name: 'B', age: 40 }, { name: 'A', age: 30 }] })).toBe('A');
    expect(evaluate('addDays("2026-01-30", 3)')).toBe('2026-02-02');
    expect(evaluate('daysBetween("2026-01-01", "2026-03-01")')).toBe(59);
    expect(evaluate('formatDate("2026-10-05", "dd.MM.yyyy")')).toBe('05.10.2026');
    expect(evaluate('json("{\\"a\\": [1, 2]}").a')).toEqual([1, 2]);
    expect(evaluate('unique([1, 2, 1, "x", "x"])')).toEqual([1, 2, 'x']);
    expect(evaluate('people.filter(p, p.age > 35).map(p, p.name)', { people: [{ name: 'B', age: 40 }, { name: 'A', age: 30 }] })).toEqual(['B']);
  });

  it('says what is wrong, and where', () => {
    expect(() => evaluate('1 +')).toThrowError(ExpressionError);
    try {
      evaluate('a + missing', { a: 1 });
    } catch (err) {
      expect(err).toBeInstanceOf(ExpressionError);
      expect((err as ExpressionError).message).toBe('Unknown name "missing"');
      expect((err as ExpressionError).start).toBe(4);
    }
  });

  it('evaluates templates: one expression keeps its value, mixed text becomes text', () => {
    const scope = { amount: 600, name: 'Ada' };
    expect(expressions.template('{{ amount }}', scope)).toBe(600);
    expect(expressions.template(' {{ amount > 500 }} ', scope)).toBe(true);
    expect(expressions.template('Hi {{ name }}, {{ amount * 2 }}!', scope)).toBe('Hi Ada, 1200!');
    expect(expressions.template('plain', scope)).toBe('plain');
    expect(expressions.template('{{ "}}" }}', scope)).toBe('}}');
  });

  it('reports template errors at their place in the template', () => {
    try {
      expressions.template('Hi {{ nope }}', {});
      expect.unreachable();
    } catch (err) {
      expect((err as ExpressionError).start).toBe(6);
    }
    expect(() => expressions.template('Hi {{ name', {})).toThrowError('Missing }} after {{');
  });

  it('runs no code: only the scope given is reachable', () => {
    expect(() => evaluate('constructor')).toThrowError(ExpressionError);
    expect(() => evaluate('a.constructor', { a: {} })).toThrowError(ExpressionError);
  });
});

describe('values', () => {
  it('shows values as text without float noise', () => {
    expect(displayText(0.1 + 0.2)).toBe('0.3');
    expect(displayText(null)).toBe('');
    expect(displayText([1, 'a'])).toBe('[1,"a"]');
    expect(displayText(true)).toBe('true');
  });

  it('gives variables values of their type', () => {
    expect(coerceToType('42', 'number')).toBe(42);
    expect(coerceToType(7, 'text')).toBe('7');
    expect(coerceToType('true', 'boolean')).toBe(true);
    expect(() => coerceToType('abc', 'number')).toThrowError('"abc" is not a number');
    expect(() => coerceToType('x', 'list')).toThrowError();
  });

  it('reads initial values as JSON, plain text as text', () => {
    expect(initialValue({ name: 'a', type: 'number', initial: '500' })).toBe(500);
    expect(initialValue({ name: 'a', type: 'text', initial: 'hello' })).toBe('hello');
    expect(initialValue({ name: 'a', type: 'list', initial: '[1,2]' })).toEqual([1, 2]);
    expect(initialValue({ name: 'a', type: 'boolean' })).toBe(false);
    expect(initialValueError({ name: 'a', type: 'object', initial: '{oops' })).toBe('Not valid JSON');
    expect(initialValueError({ name: 'a', type: 'number', initial: '"x"' })).toBe('"x" is not a number');
  });
});
