import type { ActionExecutor, ActionResult, FlowRun } from '../engine';
import type { HttpRequestConfig } from './configs';
import { HTTP_METHODS } from './configs';
import { displayText, fromCel, isPlainObject } from '../expressions/values';

const TIMEOUT_MS = 30_000;

/**
 * `http_request`: calls a URL. The answer's content (parsed when it's JSON) goes into the result
 * variable, and the nodes after it get `response` ({ status, ok, data }). An answer that isn't OK
 * (4xx, 5xx) or no answer at all fails the action: the flow goes on through `error` if anything is
 * connected to it.
 */
export class HttpRequestAction implements ActionExecutor {
  async run(run: FlowRun): Promise<ActionResult> {
    const config = run.node.config as Partial<HttpRequestConfig>;
    const fetch = run.host.fetch;
    if (!fetch) throw new Error('HTTP requests are not available here');

    const method = (config.method ?? 'GET').toUpperCase();
    if (!(HTTP_METHODS as readonly string[]).includes(method)) throw new Error(`Unknown method ${method}`);
    const url = run.text(config.url ?? '').trim();
    if (!/^https?:\/\//i.test(url)) throw new Error(`Enter a URL starting with http:// or https:// (got "${url}")`);

    const headers: Record<string, string> = {};
    for (const header of config.headers ?? []) {
      if (header.name?.trim()) headers[header.name.trim()] = run.text(header.value ?? '');
    }
    const body = this.body(run, config.body ?? '', headers, method);
    run.inputs({ method, url, ...(Object.keys(headers).length ? { headers } : {}), ...(body !== undefined ? { body } : {}) });
    if (!run.isCurrent()) return { outcome: 'stop' };

    const controller = typeof AbortController === 'function' ? new AbortController() : undefined;
    const timer = setTimeout(() => controller?.abort(), TIMEOUT_MS);
    let answer;
    try {
      answer = await fetch(url, { method, headers, body, signal: controller?.signal });
    } catch (err) {
      throw new Error(controller?.signal.aborted ? `No answer within ${TIMEOUT_MS / 1000} seconds` : `The request failed: ${(err as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
    const text = await answer.text();
    const data = parse(text, answer.headers.get('content-type'));
    const response = { status: answer.status, ok: answer.ok, data };
    if (!answer.ok) throw new Error(`The server answered ${answer.status}${text ? `: ${text.slice(0, 200)}` : ''}`);
    if (!run.isCurrent()) return { outcome: 'stop' };

    if (config.resultVariable) run.host.variables?.set(run.pageId, config.resultVariable, data);
    return { output: response, locals: { response } };
  }

  /** The body as text; a list or object is sent as JSON (with its content type, unless one is set). */
  private body(run: FlowRun, template: string, headers: Record<string, string>, method: string): string | undefined {
    if (!template.trim() || method === 'GET') return undefined;
    const value = fromCel(run.template(template));
    if (Array.isArray(value) || isPlainObject(value)) {
      if (!Object.keys(headers).some((h) => h.toLowerCase() === 'content-type')) headers['Content-Type'] = 'application/json';
      return JSON.stringify(value);
    }
    return displayText(value);
  }
}

/** JSON when the answer says it is (or looks like it), else the text. */
function parse(text: string, contentType: string | null): unknown {
  const looksJson = /^\s*[[{]/.test(text);
  if (contentType?.includes('json') || looksJson) {
    try {
      return JSON.parse(text);
    } catch {
      // Not JSON after all
    }
  }
  return text;
}
