import { FlowFixture } from './fixture';
import approval from './fixtures/approval.json';
import logic from './fixtures/logic.json';
import http from './fixtures/http.json';

/** Every conformance fixture (a new file in fixtures/ is added here). */
export const FLOW_FIXTURES = [...approval, ...logic, ...http] as unknown as FlowFixture[];
