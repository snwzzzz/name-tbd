import { createSidecar } from './sidecar-server';
import { publicFetch } from './public-fetch';

// Starts the flow sidecar (npm run build:sidecar, then node dist/flow-sidecar/sidecar.mjs).
//   FLOW_SIDECAR_PORT          port (default 8090)
//   FLOW_SIDECAR_TOKEN         the secret the backend sends (app.flows.sidecar-token)
//   FLOW_ALLOW_PRIVATE_URLS    true: flows may call private addresses (local development only)

const port = Number(process.env['FLOW_SIDECAR_PORT'] ?? 8090);
const server = createSidecar({
  fetch: publicFetch(process.env['FLOW_ALLOW_PRIVATE_URLS'] === 'true'),
  token: process.env['FLOW_SIDECAR_TOKEN'] || undefined,
});
server.listen(port, () => console.log(`Flow sidecar listening on ${port}`));

const stop = () => server.close(() => process.exit(0));
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
