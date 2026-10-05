import { ScopeEntry, checkExpression, checkTemplate, completions } from './analysis';

const SCOPE: ScopeEntry[] = [
  {
    name: 'orderForm', kind: 'widget', type: 'form',
    members: [{ name: 'amount', kind: 'field', type: 'number' }, { name: 'customer', kind: 'field', type: 'text' }],
  },
  { name: 'approvalLimit', kind: 'variable', type: 'number' },
  { name: 'settings', kind: 'variable', type: 'object' },
];

describe('checkExpression', () => {
  it('accepts expressions over the scope', () => {
    expect(checkExpression('orderForm.amount > approvalLimit', SCOPE)).toBeNull();
    expect(checkExpression('settings.anything == 1', SCOPE)).toBeNull();
    expect(checkExpression('round(orderForm.amount, 2)', SCOPE)).toBeNull();
  });

  it('finds unknown names and fields, with their place', () => {
    expect(checkExpression('orderForm.amount > limit', SCOPE)).toEqual({ message: 'Unknown name "limit"', start: 19, end: 24 });
    expect(checkExpression('orderForm.amout > 1', SCOPE)).toMatchObject({ message: 'orderForm has no "amout"', start: 0, end: 15 });
    expect(checkExpression('orderForm.amount >', SCOPE)?.message).toBe('The expression ends too early');
    expect(checkExpression('', SCOPE)?.message).toBe('Enter an expression');
  });

  it("doesn't mistake a macro's item for a widget", () => {
    const scope: ScopeEntry[] = [...SCOPE, { name: 'rows', kind: 'variable' }];
    expect(checkExpression('rows.filter(orderForm, orderForm.x > 1)', scope)).toBeNull();
  });

  it('checks the expressions of a template at their place in it', () => {
    expect(checkTemplate('Total {{ orderForm.amount }}', SCOPE)).toBeNull();
    expect(checkTemplate('Total {{ total }}', SCOPE)).toMatchObject({ start: 9, end: 14 });
    expect(checkTemplate('Total {{ total', SCOPE)?.message).toBe('Missing }} after {{');
  });
});

describe('completions', () => {
  const labels = (text: string, template = false, cursor = text.length) =>
    completions(text, cursor, SCOPE, template)?.items.map((i) => i.label) ?? null;

  it('offers names and functions, best matches first', () => {
    const items = labels('appr')!;
    expect(items[0]).toBe('approvalLimit');
    expect(labels('ro')).toContain('round');
  });

  it("offers a widget's fields after its name and a dot", () => {
    expect(labels('orderForm.')!.slice(0, 2)).toEqual(['amount', 'customer']);
    expect(labels('orderForm.cu')![0]).toBe('customer');
    expect(completions('orderForm.cu', 12, SCOPE, false)).toMatchObject({ from: 10, to: 12 });
  });

  it('only completes inside {{ }} in templates, and never inside quotes or after a number', () => {
    expect(labels('Hi orderF', true)).toBeNull();
    expect(labels('Hi {{ orderF', true)![0]).toBe('orderForm');
    expect(labels('{{ a }} orderF', true)).toBeNull();
    expect(labels('"orderF')).toBeNull();
    expect(labels('5')).toBeNull();
    expect(labels('5 > ')).not.toBeNull();
  });
});
