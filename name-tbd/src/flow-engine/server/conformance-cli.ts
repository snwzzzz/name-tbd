import { AddressInfo } from 'node:net';
import { createSidecar } from './sidecar-server';
import { FLOW_FIXTURES } from '../conformance/fixtures';
import { fixtureFetch, fixtureProblems, outcomeOf } from '../conformance/fixture';
import { FlowFetch } from '../engine';
import { RunResponse } from '../run-request';

// `npm run test:sidecar`: starts the sidecar's HTTP server and sends it every conformance fixture
// over HTTP, as the backend does, checking each answer (the browser runs the same fixtures in its
// specs). The fixtures' HTTP answers stand in for the network.

const fetchByUrl: FlowFetch = (url, init) => {
  const fixture = FLOW_FIXTURES.find((f) => f.http?.[url]) ?? { name: '', request: { workflow: { nodes: [], edges: [] } }, expect: { steps: [] } };
  return fixtureFetch(fixture)(url, init);
};

const server = createSidecar({ fetch: fetchByUrl, token: 'test' });
server.listen(0, async () => {
  const { port } = server.address() as AddressInfo;
  let failed = 0;
  for (const fixture of FLOW_FIXTURES) {
    const answer = await fetch(`http://127.0.0.1:${port}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test' },
      body: JSON.stringify(fixture.request),
    });
    const problems = answer.ok
      ? fixtureProblems(fixture, outcomeOf((await answer.json()) as RunResponse))
      : [`HTTP ${answer.status}: ${await answer.text()}`];
    failed += problems.length ? 1 : 0;
    console.log(`${problems.length ? '✗' : '✓'} ${fixture.name}${problems.map((p) => `\n    ${p}`).join('')}`);
  }
  console.log(`\n${FLOW_FIXTURES.length - failed} of ${FLOW_FIXTURES.length} fixtures pass on the sidecar`);
  server.close();
  process.exitCode = failed ? 1 : 0;
});
