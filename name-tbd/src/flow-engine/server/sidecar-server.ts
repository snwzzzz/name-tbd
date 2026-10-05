import { IncomingMessage, Server, ServerResponse, createServer } from 'node:http';
import { FlowFetch } from '../engine';
import { RunRequest, runRequest } from '../run-request';

// The flow sidecar: the server runs flows (scheduled jobs, webhooks, POST /api/workflows/{id}/execute)
// with the same engine as the browser, in this small Node service next to the backend.
//
//   POST /run     a RunRequest (JSON) → a RunResponse: the run log, the variables and the data after it
//   GET  /health  200 "ok"
//
// With a token set, requests must carry it (`Authorization: Bearer <token>`); the backend has it.

const MAX_BODY_BYTES = 10 * 1024 * 1024;

export interface SidecarOptions {
  /** How flows call URLs (main.ts: Node's fetch, refusing private addresses). */
  fetch?: FlowFetch;
  /** The secret the backend sends; none: no check (only for local runs). */
  token?: string;
}

export function createSidecar(options: SidecarOptions = {}): Server {
  return createServer((req, res) => {
    handle(req, res, options).catch((err) => send(res, 500, { error: (err as Error).message }));
  });
}

async function handle(req: IncomingMessage, res: ServerResponse, options: SidecarOptions): Promise<void> {
  const path = (req.url ?? '').split('?')[0];
  if (req.method === 'GET' && path === '/health') return send(res, 200, 'ok');
  if (options.token && req.headers.authorization !== `Bearer ${options.token}`) return send(res, 401, { error: 'Unauthorized' });
  if (req.method !== 'POST' || path !== '/run') return send(res, 404, { error: 'Not found' });

  let request: RunRequest;
  try {
    request = JSON.parse(await body(req)) as RunRequest;
    if (!request?.workflow?.nodes || !request.workflow.edges) throw new Error('The request has no workflow');
  } catch (err) {
    return send(res, 400, { error: (err as Error).message });
  }
  try {
    send(res, 200, await runRequest(request, options.fetch));
  } catch (err) {
    send(res, 422, { error: (err as Error).message });
  }
}

function body(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error('The request is too big'));
        req.destroy();
      } else {
        chunks.push(chunk);
      }
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

function send(res: ServerResponse, status: number, payload: unknown): void {
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload, (_, v) => (typeof v === 'bigint' ? Number(v) : v));
  res.writeHead(status, { 'Content-Type': typeof payload === 'string' ? 'text/plain' : 'application/json' });
  res.end(text);
}
