import { ErrorHandler, Injectable } from '@angular/core';

/**
 * Settings a deploy gives the editor at runtime (`/config.json`, served by the proxy; see
 * deploy/Caddyfile). Locally there's none, and nothing is reported.
 */
export interface RuntimeConfig {
  sentryDsn?: string;
  environment?: string;
}

type SentryModule = typeof import('@sentry/browser');

/** Sentry, once loaded (only when a DSN is configured, so the editor doesn't carry it otherwise). */
let sentry: SentryModule | null = null;

export async function loadRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetch('/config.json', { cache: 'no-store' });
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return {};
    return (await response.json()) as RuntimeConfig;
  } catch {
    return {};
  }
}

/** Starts reporting errors to Sentry if the config has a DSN. No personal data: only the user's id (see setErrorTrackingUser). */
export async function initErrorTracking(config: RuntimeConfig): Promise<void> {
  if (!config.sentryDsn) return;
  try {
    const module = await import('@sentry/browser');
    module.init({ dsn: config.sentryDsn, environment: config.environment || 'production', sendDefaultPii: false });
    sentry = module;
  } catch (error) {
    console.error('Error tracking could not start', error);
  }
}

/** Errors from now on name this user (by id only), or nobody. */
export function setErrorTrackingUser(userId: number | null | undefined): void {
  sentry?.setUser(userId == null ? null : { id: String(userId) });
}

/** Angular's error handler: logs to the console as before, and reports to Sentry when it's on. */
@Injectable()
export class ReportingErrorHandler implements ErrorHandler {
  handleError(error: unknown): void {
    sentry?.captureException(error);
    console.error(error);
  }
}
