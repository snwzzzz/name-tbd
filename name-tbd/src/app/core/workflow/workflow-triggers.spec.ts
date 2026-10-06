import { TestBed } from '@angular/core/testing';
import { WorkflowRuntimeService } from './workflow-runtime.service';
import { RunLogService } from './run-log.service';
import { VariablesService } from '../variables/variables.service';
import { fakeApp, provideFakeApp } from '../testing/fake-app';
import { WorkflowGraph } from '../../_types/workflow.types';
import { graphOf } from '../../../flow-engine';

// Triggers besides widget events: a timer while the page is open, and a variable's new value.

const graph = (trigger: Record<string, unknown>, then: { variable: string; value: string }): WorkflowGraph =>
  graphOf({
    nodes: [
      { id: 1, type: 'Trigger', props: trigger },
      { id: 2, type: 'Action', props: { actionType: 'set_variable', config: then } },
    ],
    edges: [{ id: 1, sourceNodeId: 1, sourcePort: 'out', targetNodeId: 2 }],
  }) as WorkflowGraph;

describe('workflow triggers', () => {
  afterEach(() => vi.useRealTimers());

  it('runs a timer flow every few seconds while the page is open, and no more once it stops', async () => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: provideFakeApp({
        variables: { app: [{ name: 'ticks', type: 'number' }] },
        graphs: { p: graph({ triggerType: 'timer', intervalSeconds: 2 }, { variable: 'ticks', value: '{{ ticks + 1 }}' }) },
      }),
    });
    fakeApp().session.start('p');
    const runtime = TestBed.inject(WorkflowRuntimeService);
    const variables = TestBed.inject(VariablesService);

    await runtime.handlePageLoad('p');
    await vi.advanceTimersByTimeAsync(6100);
    expect(variables.get('p', 'ticks')).toBe(3);

    runtime.reset('p');
    await vi.advanceTimersByTimeAsync(10000);
    expect(variables.get('p', 'ticks')).toBe(3);
  });

  it("runs the flows waiting for a variable when it changes, with its new value as event.value", async () => {
    TestBed.configureTestingModule({
      providers: provideFakeApp({
        variables: { app: [{ name: 'amount', type: 'number' }, { name: 'doubled', type: 'number' }] },
        graphs: { p: graph({ triggerType: 'variable_change', variable: 'amount' }, { variable: 'doubled', value: '{{ event.value * 2 }}' }) },
      }),
    });
    fakeApp().session.start('p');
    TestBed.inject(WorkflowRuntimeService);
    const variables = TestBed.inject(VariablesService);

    variables.set('p', 'amount', 21);
    await new Promise((resolve) => setTimeout(resolve));
    expect(variables.get('p', 'doubled')).toBe(42);
    // Setting the same value again is no change
    variables.set('p', 'amount', 21);
    await new Promise((resolve) => setTimeout(resolve));
    expect(TestBed.inject(RunLogService).runs()).toHaveLength(1);
  });

  it('starts a page’s own variables afresh when the page opens', async () => {
    TestBed.configureTestingModule({
      providers: provideFakeApp({ variables: { app: [{ name: 'kept', type: 'text' }], pages: { p: [{ name: 'own', type: 'text', initial: 'start' }] } } }),
    });
    const runtime = TestBed.inject(WorkflowRuntimeService);
    const variables = TestBed.inject(VariablesService);
    variables.set('p', 'own', 'changed');
    variables.set('p', 'kept', 'changed');

    await runtime.handlePageLoad('p');
    expect(variables.get('p', 'own')).toBe('start');
    expect(variables.get('p', 'kept')).toBe('changed');
  });
});
