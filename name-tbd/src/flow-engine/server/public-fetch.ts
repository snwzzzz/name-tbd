import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { FlowFetch } from '../engine';

// Flows on the server call URLs the app's author typed: they must not reach what's only reachable
// from inside (the backend, the database, a cloud's metadata service). So only public addresses,
// checked after the name is resolved, and no redirects (a public URL could redirect inward).

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split('.').map(Number);
  return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('::ffff:')) return isPrivateIPv4(lower.slice(7));
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(lower);
}

export const isPrivateAddress = (ip: string): boolean => (isIP(ip) === 6 ? isPrivateIPv6(ip) : isPrivateIPv4(ip));

/** Node's fetch for public addresses only (unless `allowPrivate`, for local development). */
export function publicFetch(allowPrivate = false): FlowFetch {
  return async (url, init) => {
    const { hostname } = new URL(url);
    if (!allowPrivate) {
      const host = hostname.replace(/^\[|\]$/g, '');
      const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
      if (!addresses.length || addresses.some(isPrivateAddress)) {
        throw new Error(`${hostname} is not a public address`);
      }
    }
    const response = await fetch(url, { ...init, redirect: 'manual' });
    return response;
  };
}
