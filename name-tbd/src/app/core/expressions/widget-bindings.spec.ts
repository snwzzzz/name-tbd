import { TestBed } from '@angular/core/testing';
import { mountWidget } from '../testing/widget-testing';
import { fakeApp } from '../testing/fake-app';
import { LabelWidget } from '../../widgets/label-widget/label-widget';
import { ExpressionScopeService } from './expression-scope.service';
import { InputValuesService } from '../services/input-values.service';
import { TableSelectionService } from '../services/table-selection.service';
import { VariablesService } from '../variables/variables.service';
import { LayoutItem } from '../../_types/layout.types';

// Widgets bound to expressions, and what expressions see of a page.

const LAYOUT: LayoutItem[] = [
  {
    id: 30, type: 'form', props: { name: 'orderForm', dataSourceId: '5' }, children: [
      { id: 31, parentId: 30, type: 'input', props: { name: 'customer', field: 'customer' } },
      { id: 32, parentId: 30, type: 'number', props: { name: 'amount', field: 'amount' } },
      { id: 33, parentId: 30, type: 'checkbox', props: { name: 'rush', field: 'rush', checked: 'true' } },
    ],
  },
  { id: 40, type: 'table', props: { dataSourceId: '5' } },
];
const ORDERS = { id: 5, name: 'orders', columns: ['customer', 'amount', 'rush'], rows: [['Ada', '750', 'true'], ['Bob', '20', 'false']] };

describe('expression scope', () => {
  const setUp = () => {
    TestBed.configureTestingModule({});
    const mounted = mountWidget(LabelWidget, { text: 'Total: {{ default(orderForm.amount, 0) * 2 }} for {{ approvalLimit }}' }, {
      layouts: { page: LAYOUT }, data: [ORDERS], variables: { app: [{ name: 'approvalLimit', type: 'number', initial: '500' }] },
    });
    fakeApp().navigation.currentPageId.set('page');
    return mounted;
  };

  it('gives fields typed values, forms their columns, tables their rows', () => {
    setUp();
    TestBed.inject(InputValuesService).setMany({ 31: 'Ada', 32: '12.5' });
    TestBed.inject(TableSelectionService).toggle('40', '1', false);
    const scope = TestBed.inject(ExpressionScopeService).scope('page') as Record<string, Record<string, unknown>>;

    expect(scope['orderForm']).toEqual({ customer: 'Ada', amount: 12.5, rush: true });
    expect(scope['amount']).toEqual({ value: 12.5 });
    expect(scope['table40']['selectedRow']).toEqual({ _id: '1', customer: 'Bob', amount: 20, rush: false });
    expect((scope['data'] as Record<string, unknown[]>)['orders']).toHaveLength(2);
    expect(scope['approvalLimit']).toBe(500);
  });

  it('describes the scope for the editor, fields and columns included', () => {
    setUp();
    const entries = TestBed.inject(ExpressionScopeService).entries('page');
    expect(entries.find((e) => e.name === 'orderForm')?.members?.map((m) => m.name)).toEqual(['customer', 'amount', 'rush']);
    expect(entries.find((e) => e.name === 'table40')?.members?.[0].members?.map((m) => m.name)).toEqual(['_id', 'customer', 'amount', 'rush']);
    expect(entries.find((e) => e.name === 'approvalLimit')?.kind).toBe('variable');
  });

  it('shows a bound label’s value, and follows what it reads', () => {
    const { fixture, el } = setUp();
    fixture.detectChanges();
    expect(el.textContent).toContain('Total: 0 for 500');

    TestBed.inject(InputValuesService).set('32', '21');
    TestBed.inject(VariablesService).set('page', 'approvalLimit', 1000);
    fixture.detectChanges();
    expect(el.textContent).toContain('Total: 42 for 1000');
  });

  it('shows the expression as written while editing when it fails, and nothing while running', () => {
    TestBed.configureTestingModule({});
    const { fixture, el, goLive } = mountWidget(LabelWidget, { text: '{{ nope }}' }, { layouts: { page: [] } });
    fakeApp().navigation.currentPageId.set('page');
    fixture.detectChanges();
    expect(el.textContent).toContain('{{ nope }}');
    goLive();
    expect(el.textContent).not.toContain('nope');
  });
});
