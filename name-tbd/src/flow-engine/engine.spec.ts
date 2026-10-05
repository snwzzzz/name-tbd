import { ActionExecutor, FlowEngine, FlowFetch, RunLogEntry } from './engine';
import { StoredWorkflow, TriggerNode, WorkflowGraph, graphOf } from './graph';
import { MemoryData, MemoryVariables, memoryHost } from './memory-host';

type Node = StoredWorkflow['nodes'][number];

const trigger = (id: number, y = 0): Node => ({ id, type: 'Trigger', y, props: { triggerType: 'page_load' } });
const condition = (id: number, expression: string, y = 0): Node => ({ id, type: 'Condition', y, props: { expression } });
const action = (id: number, actionType: string, config: object = {}, y = 0): Node => ({ id, type: 'Action', y, props: { actionType, config } });

/** A graph from nodes and edges written as [from, to] or [from, to, port]. */
function graph(nodes: Node[], edges: [number, number, string?][]): WorkflowGraph {
  return graphOf({ nodes, edges: edges.map(([from, to, port], i) => ({ id: i + 1, sourceNodeId: from, targetNodeId: to, sourcePort: port ?? 'out' })) });
}

const steps = (entries: RunLogEntry[]) => entries.map((e) => `${e.nodeId}:${e.port ?? e.status}`);

/** An action that records that it ran (and with which loop item). */
function recorder(ran: string[]): ActionExecutor {
  return { run: async (run) => { ran.push(`${run.node.id}${run.locals['item'] !== undefined ? `=${run.locals['item']}` : ''}`); } };
}

describe('FlowEngine', () => {
  const run = (engine: FlowEngine, g: WorkflowGraph) => engine.run(g, g.nodes[0] as TriggerNode, { pageId: '1' });

  it('follows a condition through true or false', async () => {
    const variables = new MemoryVariables([{ name: 'amount', type: 'number', initial: '750' }, { name: 'status', type: 'text' }]);
    const engine = new FlowEngine(memoryHost({ variables }));
    const g = graph([
      trigger(1),
      condition(2, 'amount > 500'),
      action(3, 'set_variable', { variable: 'status', value: 'needs approval' }),
      action(4, 'set_variable', { variable: 'status', value: 'saved' }),
    ], [[1, 2], [2, 3, 'true'], [2, 4, 'false']]);

    expect(steps((await run(engine, g)).entries)).toEqual(['1:out', '2:true', '3:out']);
    expect(variables.get('1', 'status')).toBe('needs approval');

    variables.set('1', 'amount', 100);
    expect(steps((await run(engine, g)).entries)).toEqual(['1:out', '2:false', '4:out']);
    expect(variables.get('1', 'status')).toBe('saved');
  });

  it('reads conditions stored before expressions', async () => {
    const variables = new MemoryVariables([{ name: 'amount', type: 'number', initial: '7' }]);
    const engine = new FlowEngine(memoryHost({ variables }));
    const g = graph([trigger(1), { id: 2, type: 'Condition', props: { condition: { field: 'amount', operator: 'greaterThan', value: '5' } } }], [[1, 2]]);
    expect(steps((await run(engine, g)).entries)).toEqual(['1:out', '2:true']);
  });

  it('stops a branch on a condition that fails or is not true or false', async () => {
    const engine = new FlowEngine(memoryHost());
    const log = (await run(engine, graph([trigger(1), condition(2, '"yes"')], [[1, 2]]))).entries;
    expect(log[1]).toMatchObject({ status: 'error', error: 'The condition must be true or false, but is yes' });
    const unknown = (await run(engine, graph([trigger(1), condition(2, 'nope')], [[1, 2]]))).entries;
    expect(unknown[1]).toMatchObject({ status: 'error', error: 'Unknown name "nope"' });
  });

  it('loops over a list, one item after another, then goes on', async () => {
    const ran: string[] = [];
    const variables = new MemoryVariables([{ name: 'total', type: 'number' }]);
    const engine = new FlowEngine(memoryHost({ variables, actions: { record: recorder(ran) } }));
    const g = graph([
      trigger(1),
      action(2, 'loop', { items: '[2, 3.5, 4]', as: '' }),
      action(3, 'set_variable', { variable: 'total', value: '{{ total + item }}' }),
      action(4, 'record'),
      action(5, 'record'),
    ], [[1, 2], [2, 3, 'each'], [3, 4], [2, 5]]);

    const log = (await run(engine, g)).entries;
    expect(variables.get('1', 'total')).toBe(9.5);
    expect(ran).toEqual(['4=2', '4=3.5', '4=4', '5']);
    expect(steps(log)).toEqual(['1:out', '2:each', '3:out', '4:out', '3:out', '4:out', '3:out', '4:out', '2:out', '5:out']);
    expect(log.filter((e) => e.nodeId === '3').map((e) => e.iteration)).toEqual([0, 1, 2]);
  });

  it('refuses to loop over something that is not a list, or too many items', async () => {
    const engine = new FlowEngine(memoryHost(), { maxLoopItems: 2 });
    const notAList = (await run(engine, graph([trigger(1), action(2, 'loop', { items: '5' })], [[1, 2]]))).entries;
    expect(notAList[1]).toMatchObject({ status: 'error', error: 'Loop over a list, not 5' });
    const tooMany = (await run(engine, graph([trigger(1), action(2, 'loop', { items: '[1, 2, 3]' })], [[1, 2]]))).entries;
    expect(tooMany[1].error).toBe('A loop runs for at most 2 items');
  });

  it('goes on through `error` when an action fails and something is connected to it', async () => {
    const ran: string[] = [];
    const failing: ActionExecutor = { run: async () => { throw new Error('boom'); } };
    const engine = new FlowEngine(memoryHost({ actions: { fail: failing, record: recorder(ran) } }));

    const recovered = await run(engine, graph([trigger(1), action(2, 'fail'), action(3, 'record'), action(4, 'record')], [[1, 2], [2, 3, 'error'], [2, 4]]));
    expect(steps(recovered.entries)).toEqual(['1:out', '2:error', '3:out']);
    expect(ran).toEqual(['3']);

    const stopped = await run(engine, graph([trigger(1), action(2, 'fail'), action(3, 'record')], [[1, 2], [2, 3]]));
    expect(steps(stopped.entries)).toEqual(['1:out', '2:error']);
  });

  it("doesn't go on after an action stops the flow, or once the run was cancelled", async () => {
    const ran: string[] = [];
    let current = true;
    const stop: ActionExecutor = { run: async () => 'stop' };
    const cancel: ActionExecutor = { run: async () => { current = false; } };
    const engine = new FlowEngine(memoryHost({ actions: { stop, cancel, record: recorder(ran) } }));

    const g1 = graph([trigger(1), action(2, 'stop'), action(3, 'record')], [[1, 2], [2, 3]]);
    expect(steps((await run(engine, g1)).entries)).toEqual(['1:out', '2:stopped']);

    const g2 = graph([trigger(1), action(2, 'cancel'), action(3, 'record')], [[1, 2], [2, 3]]);
    const log = (await engine.run(g2, g2.nodes[0] as TriggerNode, { pageId: '1', isCurrent: () => current })).entries;
    expect(steps(log)).toEqual(['1:out', '2:stopped']);
    expect(ran).toEqual([]);
  });

  it('runs branches side by side, top to bottom, and a node joined by two branches once', async () => {
    const ran: string[] = [];
    const engine = new FlowEngine(memoryHost({ actions: { record: recorder(ran) } }));
    const g = graph([trigger(1), action(2, 'record', {}, 200), action(3, 'record', {}, 100), action(4, 'record')], [[1, 2], [1, 3], [2, 4], [3, 4]]);
    await run(engine, g);
    expect(ran).toEqual(['3', '2', '4']);
  });

  it('logs what each step got and gave', async () => {
    const variables = new MemoryVariables([{ name: 'n', type: 'number' }]);
    const logged: RunLogEntry[] = [];
    const engine = new FlowEngine(memoryHost({ variables }), { onLog: (e) => logged.push(e) });
    const g = graph([trigger(1), action(2, 'set_variable', { variable: 'n', value: '{{ 40 + 2 }}' })], [[1, 2]]);
    const result = await engine.run(g, g.nodes[0] as TriggerNode, { pageId: '1', locals: { event: { value: 'x' } } });

    expect(logged).toEqual(result.entries);
    expect(result.entries[0]).toMatchObject({ nodeType: 'Trigger', label: 'page_load', inputs: { event: { value: 'x' } } });
    expect(result.entries[1]).toMatchObject({
      nodeType: 'Action', label: 'set_variable', status: 'ok', port: 'out', inputs: { variable: 'n', value: 42 }, output: 42,
    });
  });

  it('refuses values a variable’s type can’t take', async () => {
    const variables = new MemoryVariables([{ name: 'n', type: 'number' }]);
    const engine = new FlowEngine(memoryHost({ variables }));
    const log = (await run(engine, graph([trigger(1), action(2, 'set_variable', { variable: 'n', value: 'abc' })], [[1, 2]]))).entries;
    expect(log[1].error).toBe('n can\'t take that value: "abc" is not a number');
  });
});

describe('row actions', () => {
  const orders = () => new MemoryData([{ id: 7, name: 'orders', columns: ['customer', 'amount', 'status'], rows: [['Ada', '750', 'open'], ['Bob', '20', 'open']] }]);

  it('create, update and delete rows with values from expressions', async () => {
    const data = orders();
    const variables = new MemoryVariables([{ name: 'who', type: 'text', initial: '"Cy"' }]);
    const engine = new FlowEngine(memoryHost({ data, variables }));
    const g = graph([
      trigger(1),
      action(2, 'create_row', { dataSourceId: '7', values: [{ column: 'customer', value: '{{ who }}' }, { column: 'amount', value: '{{ 10 * 3 }}' }] }),
      action(3, 'update_row', { dataSourceId: '7', row: '{{ first(data.orders.filter(o, o.amount > 500)) }}', values: [{ column: 'status', value: 'approved' }] }),
      action(4, 'delete_row', { dataSourceId: '7', row: '{{ data.orders.filter(o, o.amount < 25) }}' }),
    ], [[1, 2], [2, 3], [3, 4]]);

    const log = (await engine.run(g, g.nodes[0] as TriggerNode, { pageId: '1' })).entries;
    expect(log.map((e) => e.status)).toEqual(['ok', 'ok', 'ok', 'ok']);
    expect(data.snapshot()[0].rows).toEqual([['Ada', '750', 'approved'], ['Cy', '30', '']]);
  });

  it('says which column or row is missing', async () => {
    const engine = new FlowEngine(memoryHost({ data: orders() }));
    const bad = graph([trigger(1), action(2, 'create_row', { dataSourceId: '7', values: [{ column: 'nope', value: 'x' }] })], [[1, 2]]);
    expect((await engine.run(bad, bad.nodes[0] as TriggerNode, { pageId: '1' })).entries[1].error).toBe('The data source has no column "nope"');
    const missing = graph([trigger(1), action(2, 'update_row', { dataSourceId: '7', row: '99', values: [] })], [[1, 2]]);
    expect((await engine.run(missing, missing.nodes[0] as TriggerNode, { pageId: '1' })).entries[1].error).toBe('There is no row 99');
  });
});

describe('http_request', () => {
  function fakeFetch(status: number, body: string, contentType = 'application/json'): FlowFetch & { calls: unknown[][] } {
    const calls: unknown[][] = [];
    const fetch = async (url: string, init: unknown) => {
      calls.push([url, init]);
      return { status, ok: status < 400, headers: { get: () => contentType }, text: async () => body };
    };
    return Object.assign(fetch, { calls });
  }

  it('calls the URL, puts the answer into a variable and gives the next nodes `response`', async () => {
    const fetch = fakeFetch(200, '[{"name":"Leanne"},{"name":"Ervin"}]');
    const variables = new MemoryVariables([{ name: 'users', type: 'list' }, { name: 'count', type: 'number' }, { name: 'id', type: 'number', initial: '3' }]);
    const engine = new FlowEngine(memoryHost({ variables, fetch }));
    const g = graph([
      trigger(1),
      action(2, 'http_request', {
        method: 'POST', url: 'https://api.example.com/users/{{ id }}', headers: [{ name: 'X-Key', value: 'k{{ id }}' }],
        body: '{{ {"id": id} }}', resultVariable: 'users',
      }),
      action(3, 'set_variable', { variable: 'count', value: '{{ size(response.data) }}' }),
    ], [[1, 2], [2, 3]]);

    const log = (await engine.run(g, g.nodes[0] as TriggerNode, { pageId: '1' })).entries;
    expect(fetch.calls[0]).toEqual(['https://api.example.com/users/3', expect.objectContaining({
      method: 'POST', body: '{"id":3}', headers: { 'X-Key': 'k3', 'Content-Type': 'application/json' },
    })]);
    expect(variables.get('1', 'users')).toEqual([{ name: 'Leanne' }, { name: 'Ervin' }]);
    expect(variables.get('1', 'count')).toBe(2);
    expect(log[1].output).toMatchObject({ status: 200, ok: true });
  });

  it('fails on an answer that is not OK, going on through `error` with the message', async () => {
    const variables = new MemoryVariables([{ name: 'problem', type: 'text' }]);
    const engine = new FlowEngine(memoryHost({ variables, fetch: fakeFetch(404, 'Not found', 'text/plain') }));
    const g = graph([
      trigger(1),
      action(2, 'http_request', { method: 'GET', url: 'https://api.example.com/x', headers: [], body: '', resultVariable: '' }),
      action(3, 'set_variable', { variable: 'problem', value: '{{ error }}' }),
    ], [[1, 2], [2, 3, 'error']]);
    await engine.run(g, g.nodes[0] as TriggerNode, { pageId: '1' });
    expect(variables.get('1', 'problem')).toBe('The server answered 404: Not found');
  });

  it('only calls http and https URLs', async () => {
    const engine = new FlowEngine(memoryHost({ fetch: fakeFetch(200, '') }));
    const g = graph([trigger(1), action(2, 'http_request', { method: 'GET', url: 'file:///etc/passwd', headers: [], body: '' })], [[1, 2]]);
    expect((await engine.run(g, g.nodes[0] as TriggerNode, { pageId: '1' })).entries[1].error).toContain('starting with http');
  });
});
