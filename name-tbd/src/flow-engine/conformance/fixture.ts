import { FlowFetch } from '../engine';
import { RunRequest, RunResponse } from '../run-request';
import { displayText } from '../expressions/values';

/**
 * A conformance fixture: a flow, what it starts with, and what must come out of running it.
 * Every engine host runs the same fixtures (the browser's in specs, the server's sidecar over HTTP),
 * so they can't drift apart. `request.scope` stands in for widget values.
 */
export interface FlowFixture {
  name: string;
  request: RunRequest;
  /** Answers to HTTP requests, by URL (anything else: 404). */
  http?: Record<string, { status: number; body: unknown; contentType?: string }>;
  expect: {
    /** Every step in order, `<node id>:<port taken, or status>`. */
    steps: string[];
    /** Variables (as the page sees them) after the run. */
    variables?: Record<string, unknown>;
    /** Data sources' rows after the run, by name. */
    data?: Record<string, (string | null)[][]>;
  };
}

/** What a host's run of a fixture gave, to compare with what's expected. */
export interface FixtureOutcome {
  steps: string[];
  /** Every variable's value as the page sees it. */
  variables: Record<string, unknown>;
  data: Record<string, (string | null)[][]>;
}

/** The fixture's HTTP answers as a fetch. */
export function fixtureFetch(fixture: FlowFixture): FlowFetch {
  return async (url) => {
    const answer = fixture.http?.[url];
    const status = answer?.status ?? 404;
    const contentType = answer?.contentType ?? (typeof answer?.body === 'string' ? 'text/plain' : 'application/json');
    const text = answer === undefined ? 'Not found' : typeof answer.body === 'string' ? answer.body : JSON.stringify(answer.body);
    return { status, ok: status < 400, headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) }, text: async () => text };
  };
}

/** A run response as an outcome (page variables hide app variables of the same name). */
export function outcomeOf(response: RunResponse): FixtureOutcome {
  return {
    steps: response.steps,
    variables: { ...response.variables.app, ...response.variables.page },
    data: Object.fromEntries(response.data.map((d) => [d.name, d.rows])),
  };
}

/** How the outcome differs from what the fixture expects (empty: it conforms). */
export function fixtureProblems(fixture: FlowFixture, outcome: FixtureOutcome): string[] {
  const problems: string[] = [];
  const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
  if (!same(outcome.steps, fixture.expect.steps)) {
    problems.push(`steps: expected ${JSON.stringify(fixture.expect.steps)}, got ${JSON.stringify(outcome.steps)}`);
  }
  for (const [name, value] of Object.entries(fixture.expect.variables ?? {})) {
    if (!same(outcome.variables[name], value)) problems.push(`variable ${name}: expected ${displayText(value)}, got ${displayText(outcome.variables[name])}`);
  }
  for (const [name, rows] of Object.entries(fixture.expect.data ?? {})) {
    if (!same(outcome.data[name], rows)) problems.push(`data ${name}: expected ${JSON.stringify(rows)}, got ${JSON.stringify(outcome.data[name])}`);
  }
  return problems;
}
