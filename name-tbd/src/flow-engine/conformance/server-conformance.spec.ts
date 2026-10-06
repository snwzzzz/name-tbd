import { FLOW_FIXTURES } from './fixtures';
import { fixtureFetch, fixtureProblems, outcomeOf } from './fixture';
import { runRequest } from '../run-request';

// The server's engine: the conformance fixtures through runRequest, the code the Node sidecar runs
// for every request (flow-engine/server/sidecar.ts; `npm run test:sidecar` also runs them over HTTP).

describe('flow conformance: server (sidecar) host', () => {
  for (const fixture of FLOW_FIXTURES) {
    it(fixture.name, async () => {
      const response = await runRequest(fixture.request, fixtureFetch(fixture));
      expect(fixtureProblems(fixture, outcomeOf(response))).toEqual([]);
    });
  }
});
