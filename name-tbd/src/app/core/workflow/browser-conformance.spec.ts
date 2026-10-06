import { TestBed } from '@angular/core/testing';
import { FLOW_FETCH, WorkflowRuntimeService } from './workflow-runtime.service';
import { RunLogService } from './run-log.service';
import { EXPRESSION_SCOPE } from '../expressions/expression-scope.service';
import { VariablesService } from '../variables/variables.service';
import { APP_DATA } from '../ports/app-ports';
import { provideFakeApp } from '../testing/fake-app';
import { WorkflowGraph } from '../../_types/workflow.types';
import { FLOW_FIXTURES } from '../../../flow-engine/conformance/fixtures';
import { FlowFixture, fixtureFetch, fixtureProblems } from '../../../flow-engine/conformance/fixture';
import { TriggerNode, graphOf, stepOf } from '../../../flow-engine';

// The browser's engine (the editor's preview and the exported app): every conformance fixture
// through WorkflowRuntimeService, with the app's own variables, data, scope and fetch. The server
// runs the same fixtures (flow-engine/conformance/server-conformance.spec.ts).

const PAGE = 'page';

async function runInBrowser(fixture: FlowFixture) {
  const { request } = fixture;
  const graph = graphOf(request.workflow) as WorkflowGraph;
  TestBed.configureTestingModule({
    providers: [
      provideFakeApp({
        data: (request.data ?? []).map((d) => ({ ...d, rows: d.rows.map((r) => r.map((v) => v ?? '')) })),
        variables: { app: request.variables?.app ?? [], pages: { [PAGE]: request.variables?.page ?? [] } },
        graphs: { [PAGE]: graph },
      }),
      { provide: FLOW_FETCH, useValue: fixtureFetch(fixture) },
      // Stand-ins for widget values
      { provide: EXPRESSION_SCOPE, multi: true, useValue: () => ({ ...request.scope }) },
    ],
  });
  const runtime = TestBed.inject(WorkflowRuntimeService);
  const trigger = graph.nodes.find((n): n is TriggerNode => n.type === 'Trigger' && n.id === String(request.triggerNodeId));
  if (trigger?.elementId) await runtime.handleEvent(PAGE, trigger.elementId, trigger.eventName);
  else await runtime.handlePageLoad(PAGE);

  const variables = TestBed.inject(VariablesService);
  const data = TestBed.inject(APP_DATA);
  return {
    steps: TestBed.inject(RunLogService).runs().flatMap((run) => run.entries).map(stepOf),
    variables: Object.fromEntries(variables.visible(PAGE).map((v) => [v.name, variables.get(PAGE, v.name)])),
    data: Object.fromEntries((request.data ?? []).map((d) => [d.name, data.table(d.id)!.rows.map((r) => r.values)])),
  };
}

describe('flow conformance: browser host', () => {
  for (const fixture of FLOW_FIXTURES) {
    it(fixture.name, async () => {
      expect(fixtureProblems(fixture, await runInBrowser(fixture))).toEqual([]);
    });
  }
});
