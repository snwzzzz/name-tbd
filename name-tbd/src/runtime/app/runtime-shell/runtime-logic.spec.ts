import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RuntimeShell } from './runtime-shell';
import { runtimeConfig } from '../runtime.config';
import { APP_DEFINITION_VERSION, AppDefinition, DefinitionWorkflow } from '../../../app/core/definition/app-definition';
import { APP_DATA } from '../../../app/core/ports/app-ports';
import { CLICK_EVENT } from '../../../app/_constants/widget-events.constants';
import { LayoutItem } from '../../../app/_types/layout.types';
import { FLOW_FETCH } from '../../../app/core/workflow/workflow-runtime.service';
import { RunLogService } from '../../../app/core/workflow/run-log.service';
import { FlowFetch } from '../../../flow-engine';

// Real logic in the exported app, end to end: variables, bound widgets, conditions, the new
// actions. "If the amount is over the limit, it needs approval; otherwise save it and say so."

const flush = () => new Promise((resolve) => setTimeout(resolve));

type Node = DefinitionWorkflow['nodes'][number];
const trigger = (id: number, elementId: string): Node =>
  ({ id, type: 'Trigger', props: { triggerType: 'element_click', elementId, eventName: CLICK_EVENT } });
const action = (id: number, actionType: string, config: object, y = 0): Node => ({ id, type: 'Action', y, props: { actionType, config } });
const edges = (...list: [number, number, string?][]): DefinitionWorkflow['edges'] =>
  list.map(([from, to, port], i) => ({ id: 900 + i, sourceNodeId: from, targetNodeId: to, sourcePort: port ?? 'out' }));

/** The approval form: customer and amount, a button that checks, decides and saves. */
function approvalApp(): AppDefinition {
  const components: LayoutItem[] = [
    {
      id: 30, type: 'form', x: 0, y: 0, w: 30, h: 20, props: { name: 'orderForm', dataSourceId: '5' },
      children: [
        { id: 31, parentId: 30, type: 'input', x: 0, y: 0, w: 20, h: 4, props: { name: 'customer', label: 'Customer', field: 'customer', required: 'true', searchIcon: 'false', debounceMs: '0' } },
        { id: 32, parentId: 30, type: 'number', x: 0, y: 5, w: 20, h: 4, props: { name: 'amount', label: 'Amount', field: 'amount' } },
        { id: 33, parentId: 30, type: 'button', x: 0, y: 10, w: 7, h: 3, props: { name: 'send', label: 'Send', formAction: 'Nothing' } },
      ],
    },
    { id: 40, type: 'label', x: 40, y: 0, w: 20, h: 3, props: { name: 'statusLabel', text: 'Status: {{ status }}' } },
    { id: 41, type: 'label', x: 40, y: 4, w: 20, h: 3, props: { name: 'doubled', text: 'Twice: {{ default(orderForm.amount, 0) * 2 }}' } },
  ];
  return {
    version: APP_DEFINITION_VERSION,
    app: { id: 72, name: 'Approvals' },
    dataRevision: 'r1',
    homePageId: 1,
    variables: [{ name: 'approvalLimit', type: 'number', initial: '500' }],
    pages: [{
      id: 1, name: 'Order', path: '/', layout: false, components,
      variables: [{ name: 'status', type: 'text', initial: 'Draft' }],
      workflow: {
        nodes: [
          trigger(100, '33'),
          action(101, 'validate_form', { formId: '30' }),
          { id: 102, type: 'Condition', props: { expression: 'orderForm.amount > approvalLimit' } },
          action(103, 'set_variable', { variable: 'status', value: 'Needs approval' }),
          action(104, 'show_message', { message: 'Sent {{ orderForm.customer }}’s order for approval', tone: 'info' }),
          action(105, 'create_row', { dataSourceId: '5', values: [
            { column: 'customer', value: '{{ orderForm.customer }}' },
            { column: 'amount', value: '{{ orderForm.amount }}' },
            { column: 'status', value: 'approved' },
          ] }),
          action(106, 'set_variable', { variable: 'status', value: 'Saved' }),
          action(107, 'show_message', { message: 'Saved {{ size(data.Orders) }} orders', tone: 'success' }),
        ],
        edges: edges([100, 101], [101, 102, 'valid'], [102, 103, 'true'], [103, 104], [102, 105, 'false'], [105, 106], [106, 107]),
      },
    }],
    dataSources: [{ id: 5, name: 'Orders', columns: ['customer', 'amount', 'status'], rows: [] }],
  };
}

describe('Logic in the exported app', () => {
  const start = async (def: AppDefinition, fetch?: FlowFetch) => {
    TestBed.configureTestingModule({
      providers: [...runtimeConfig(def).providers, ...(fetch ? [{ provide: FLOW_FETCH, useValue: fetch }] : [])],
    });
    const fixture = TestBed.createComponent(RuntimeShell);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
    const settle = async () => {
      for (let i = 0; i < 3; i++) await flush();
      await fixture.whenStable();
      fixture.detectChanges();
    };
    const type = (label: string, value: string) => {
      const input = [...el.querySelectorAll<HTMLInputElement>('input')].find((i) => el.querySelector(`label[for="${i.id}"]`)?.textContent?.includes(label))!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('change'));
    };
    const click = (label: string) => [...el.querySelectorAll<HTMLElement>('app-button-widget')].find((b) => b.textContent?.includes(label))!.click();
    const text = () => el.textContent ?? '';
    await settle();
    return { el, settle, type, click, text };
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => document.body.replaceChildren());

  it('shows bound values, and follows them as they change', async () => {
    const { settle, type, text } = await start(approvalApp());
    expect(text()).toContain('Status: Draft');
    expect(text()).toContain('Twice: 0');

    type('Amount', '21.5');
    await settle();
    expect(text()).toContain('Twice: 43');
  });

  it('sends an amount over the limit for approval, without saving it', async () => {
    const { settle, type, click, text } = await start(approvalApp());
    type('Customer', 'Ada');
    type('Amount', '750');
    await settle();
    click('Send');
    await settle();

    expect(text()).toContain('Status: Needs approval');
    expect(text()).toContain('Sent Ada’s order for approval');
    expect(TestBed.inject(APP_DATA).table(5)!.rows).toEqual([]);
  });

  it('saves an amount within the limit and confirms it', async () => {
    const { settle, type, click, text } = await start(approvalApp());
    type('Customer', 'Bob');
    type('Amount', '120');
    await settle();
    click('Send');
    await settle();

    expect(TestBed.inject(APP_DATA).table(5)!.rows.map((r) => r.values)).toEqual([['Bob', '120', 'approved']]);
    expect(text()).toContain('Status: Saved');
    expect(text()).toContain('Saved 1 orders');
  });

  it('stops at an invalid form, and the run log says why', async () => {
    const { settle, type, click, text } = await start(approvalApp());
    type('Amount', '120');
    click('Send');
    await settle();

    expect(text()).toContain('This field is required.');
    expect(text()).toContain('Status: Draft');
    const steps = TestBed.inject(RunLogService).runs()[0].entries.map((e) => `${e.label}:${e.port ?? e.status}`);
    expect(steps).toEqual(['element_click:out', 'validate_form:invalid']);
  });

  it('calls an API and shows the answer in a table', async () => {
    const calls: string[] = [];
    const fetch: FlowFetch = async (url) => {
      calls.push(url);
      return {
        status: 200, ok: true, headers: { get: () => 'application/json' },
        text: async () => JSON.stringify([{ id: 1, name: 'Leanne Graham', city: 'Gwenborough' }, { id: 2, name: 'Ervin Howell', city: 'Wisokyburgh' }]),
      };
    };
    const def: AppDefinition = {
      version: APP_DEFINITION_VERSION,
      app: { id: 73, name: 'Users' },
      dataRevision: 'r1',
      homePageId: 1,
      variables: [{ name: 'users', type: 'list', initial: '' }],
      pages: [{
        id: 1, name: 'Users', path: '/', layout: false,
        components: [
          { id: 10, type: 'button', x: 0, y: 0, w: 7, h: 3, props: { name: 'load', label: 'Load users' } },
          { id: 11, type: 'table', x: 0, y: 5, w: 40, h: 12, props: { name: 'people', items: '{{ users }}', columns: '[]' } },
        ],
        workflow: {
          nodes: [trigger(100, '10'), action(101, 'http_request', {
            method: 'GET', url: 'https://jsonplaceholder.typicode.com/users', headers: [], body: '', resultVariable: 'users',
          })],
          edges: edges([100, 101]),
        },
      }],
      dataSources: [],
    };
    const { el, settle, click } = await start(def, fetch);
    click('Load users');
    await settle();

    expect(calls).toEqual(['https://jsonplaceholder.typicode.com/users']);
    const table = el.querySelector('app-table-widget')!;
    expect([...table.querySelectorAll('th')].map((th) => th.textContent?.trim())).toEqual(['id', 'name', 'city']);
    expect(table.textContent).toContain('Ervin Howell');
  });

  it('opens a page with parameters, and loops over a list', async () => {
    const def: AppDefinition = {
      version: APP_DEFINITION_VERSION,
      app: { id: 74, name: 'Pages' },
      dataRevision: 'r1',
      homePageId: 1,
      variables: [{ name: 'total', type: 'number', initial: '0' }],
      pages: [
        {
          id: 1, name: 'Home', path: '/', layout: false,
          components: [{ id: 10, type: 'button', x: 0, y: 0, w: 7, h: 3, props: { name: 'go', label: 'Go' } }],
          workflow: {
            nodes: [
              trigger(100, '10'),
              action(101, 'loop', { items: '[10, 20, 12.5]', as: 'n' }),
              action(102, 'set_variable', { variable: 'total', value: '{{ total + n }}' }),
              action(103, 'navigate', { pageId: '2', params: [{ name: 'sum', value: '{{ total }}' }, { name: 'who', value: 'Ada' }] }),
            ],
            edges: edges([100, 101], [101, 102, 'each'], [101, 103]),
          },
        },
        {
          id: 2, name: 'Result', path: '/result', layout: false,
          components: [{ id: 20, type: 'label', x: 0, y: 0, w: 20, h: 3, props: { name: 'result', text: '{{ params.who }}: {{ params.sum }}' } }],
          workflow: { nodes: [], edges: [] },
        },
      ],
      dataSources: [],
    };
    const { settle, click, text } = await start(def);
    click('Go');
    await settle();
    await settle();

    expect(TestBed.inject(Router).url).toBe('/result');
    expect(text()).toContain('Ada: 42.5');
  });
});
