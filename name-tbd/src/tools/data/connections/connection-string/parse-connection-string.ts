/**
 * Reads a database connection string into the settings the backend's JdbcConnector takes
 * (host, port, database, user, ssl, schema) and the password (the connection's secret).
 *
 * Accepted: URIs (postgres://, postgresql://, mysql://, mariadb://), JDBC URLs (jdbc:postgresql://…,
 * jdbc:mysql://… with user and password as parameters) and libpq "key=value" strings (PostgreSQL).
 * The backend stays the authority (it validates names and refuses private addresses); this only
 * reads, and rejects what the server could never reach.
 */

export type DatabaseKind = 'postgres' | 'mysql';

export interface DatabaseSettings {
  host: string;
  port: number;
  database: string;
  user: string;
  ssl: boolean;
  /** PostgreSQL only. */
  schema?: string;
}

export interface ParsedConnection {
  kind: DatabaseKind;
  settings: DatabaseSettings;
  password: string;
  /** Things that were in the string but are ignored. */
  warnings: string[];
}

export type ParseResult = { ok: true; value: ParsedConnection } | { ok: false; error: string };

export const DEFAULT_PORTS: Record<DatabaseKind, number> = { postgres: 5432, mysql: 3306 };

const SCHEMES: Record<string, DatabaseKind> = {
  postgres: 'postgres',
  postgresql: 'postgres',
  mysql: 'mysql',
  mariadb: 'mysql',
};

const LOCAL_HOST = /^(localhost|0\.0\.0\.0|127(\.\d{1,3}){3}|::1|\[::1])$/i;

const fail = (error: string): ParseResult => ({ ok: false, error });

export function parseConnectionString(raw: string): ParseResult {
  let text = raw.trim();
  // Copied along with quotes, e.g. from a .env file
  if (/^(["']).*\1$/s.test(text)) text = text.slice(1, -1).trim();
  if (!text) return fail('Enter a connection string.');
  if (/^jdbc:/i.test(text)) text = text.slice(5);
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(text)) return parseUri(text);
  if (/^[a-z_]+\s*=/i.test(text)) return parseKeywords(text);
  return fail('This is not a connection string. Expected e.g. postgresql://user:password@host:5432/database');
}

function parseUri(text: string): ParseResult {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)(?:\/([^?#]*))?(?:\?([^#]*))?(?:#.*)?$/i.exec(text);
  if (!match) return fail('The connection string could not be read.');
  const scheme = match[1].toLowerCase();
  const kind = SCHEMES[scheme];
  if (!kind) return fail(`"${scheme}://" is not supported. Use postgresql:// or mysql://.`);

  const authority = match[2];
  const at = authority.lastIndexOf('@');
  const userInfo = at >= 0 ? authority.slice(0, at) : '';
  const hostPort = at >= 0 ? authority.slice(at + 1) : authority;
  const colon = userInfo.indexOf(':');

  let user: string;
  let password: string;
  let database: string;
  try {
    user = decodeURIComponent(colon >= 0 ? userInfo.slice(0, colon) : userInfo);
    password = colon >= 0 ? decodeURIComponent(userInfo.slice(colon + 1)) : '';
    database = decodeURIComponent((match[3] ?? '').replace(/\/+$/, ''));
  } catch {
    return fail('The user, password or database has a "%" that is not a valid escape (write a literal "%" as %25).');
  }

  const host = splitHostPort(hostPort);
  if ('error' in host) return fail(host.error);

  const warnings: string[] = [];
  const params = new URLSearchParams(match[4] ?? '');
  // JDBC URLs carry the login as parameters
  if (!user && params.has('user')) user = params.get('user')!;
  if (!password && params.has('password')) password = params.get('password')!;
  params.delete('user');
  params.delete('password');

  return build(kind, { host: host.host, port: host.port, database, user, password }, params, warnings);
}

function splitHostPort(hostPort: string): { host: string; port?: number } | { error: string } {
  if (hostPort.includes(',')) return { error: 'Only one host is supported, not a list of hosts.' };
  let host = hostPort;
  let portText = '';
  if (hostPort.startsWith('[')) {
    const end = hostPort.indexOf(']');
    if (end < 0) return { error: 'The IPv6 address is missing its closing "]".' };
    host = hostPort.slice(0, end + 1);
    const rest = hostPort.slice(end + 1);
    if (rest && !rest.startsWith(':')) return { error: 'The host could not be read.' };
    portText = rest.slice(1);
  } else {
    const colon = hostPort.lastIndexOf(':');
    if (colon >= 0) {
      host = hostPort.slice(0, colon);
      portText = hostPort.slice(colon + 1);
    }
  }
  if (!host) return { error: 'The host is missing.' };
  if (host.startsWith('/') || /%2f/i.test(host)) return { error: 'Unix sockets are not supported; the server needs a host name.' };
  let port: number | undefined;
  if (portText) {
    port = Number(portText);
    if (!/^\d+$/.test(portText) || port < 1 || port > 65535) return { error: `"${portText}" is not a valid port.` };
  }
  return { host, port };
}

/** libpq style: host=… port=… dbname=… user=… password='with spaces' sslmode=require */
function parseKeywords(text: string): ParseResult {
  const pairs = new URLSearchParams();
  const pattern = /([a-z_]+)\s*=\s*(?:'((?:[^'\\]|\\.)*)'|(\S*))/gi;
  let rest = text;
  for (const m of text.matchAll(pattern)) {
    pairs.set(m[1].toLowerCase(), (m[2] ?? m[3] ?? '').replace(/\\(.)/g, '$1'));
    rest = rest.replace(m[0], '');
  }
  if (rest.trim()) return fail(`"${rest.trim().split(/\s+/)[0]}" could not be read; expected key=value pairs.`);

  const host = splitHostPort(pairs.get('host') ?? '');
  if ('error' in host) return fail(host.error);
  const portText = pairs.get('port');
  let port = host.port;
  if (portText) {
    port = Number(portText);
    if (!/^\d+$/.test(portText) || port < 1 || port > 65535) return fail(`"${portText}" is not a valid port.`);
  }
  const database = pairs.get('dbname') ?? pairs.get('database') ?? '';
  const user = pairs.get('user') ?? '';
  const password = pairs.get('password') ?? '';
  for (const key of ['host', 'hostaddr', 'port', 'dbname', 'database', 'user', 'password']) pairs.delete(key);
  return build('postgres', { host: host.host, port, database, user, password }, pairs, []);
}

function build(
  kind: DatabaseKind,
  parts: { host: string; port?: number; database: string; user: string; password: string },
  params: URLSearchParams,
  warnings: string[],
): ParseResult {
  if (LOCAL_HOST.test(parts.host)) {
    return fail(`"${parts.host}" is this computer. The server can only reach databases with a public address.`);
  }
  if (!parts.database) return fail('The database name is missing (…/database).');

  let ssl = true;
  let schema: string | undefined;
  for (const [key, value] of params) {
    const name = key.toLowerCase();
    const lower = value.toLowerCase();
    if (name === 'sslmode' || name === 'ssl-mode') {
      ssl = !['disable', 'disabled', 'allow'].includes(lower);
    } else if (name === 'ssl' || name === 'usessl') {
      ssl = !['false', '0', 'no', 'off'].includes(lower);
    } else if (name === 'currentschema' && kind === 'postgres') {
      schema = value;
    } else if (name === 'options' && kind === 'postgres' && /search_path=/.test(value)) {
      schema = /search_path=([^\s,]+)/.exec(value)?.[1];
    } else {
      warnings.push(`Ignored: ${key}`);
    }
  }

  return {
    ok: true,
    value: {
      kind,
      settings: {
        host: parts.host,
        port: parts.port ?? DEFAULT_PORTS[kind],
        database: parts.database,
        user: parts.user,
        ssl,
        ...(schema ? { schema } : {}),
      },
      password: parts.password,
      warnings,
    },
  };
}

/** The string for settings; the password only when asked for (it never goes into previews or logs). */
export function formatConnectionString(kind: DatabaseKind, s: DatabaseSettings, password?: string): string {
  const scheme = kind === 'postgres' ? 'postgresql' : 'mysql';
  const login = s.user ? encodeURIComponent(s.user) + (password ? ':' + encodeURIComponent(password) : '') + '@' : '';
  const host = s.host.includes(':') && !s.host.startsWith('[') ? `[${s.host}]` : s.host;
  const params: string[] = [];
  if (!s.ssl) params.push(kind === 'postgres' ? 'sslmode=disable' : 'ssl-mode=DISABLED');
  if (kind === 'postgres' && s.schema && s.schema !== 'public') params.push('currentSchema=' + encodeURIComponent(s.schema));
  return `${scheme}://${login}${host}:${s.port}/${encodeURIComponent(s.database)}${params.length ? '?' + params.join('&') : ''}`;
}
