import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ConnectionControllerService } from '@app/api/services/connectionController.service';
import { ConnectionCommand, ConnectionDto } from '@app/api/models';
import {
  DEFAULT_PORTS,
  DatabaseKind,
  DatabaseSettings,
  ParsedConnection,
  formatConnectionString,
  parseConnectionString,
} from '../connection-string/parse-connection-string';

export type StepId = 'type' | 'connection' | 'test' | 'name';
export type InputMode = 'string' | 'fields';
export type TestState = 'idle' | 'running' | 'ok' | 'failed';

export interface StepDefinition {
  id: StepId;
  label: string;
}

/** The steps in order; a step can be left out later by filtering this list (e.g. SSH tunnel for some types). */
export const STEPS: StepDefinition[] = [
  { id: 'type', label: 'Type' },
  { id: 'connection', label: 'Connection' },
  { id: 'test', label: 'Test' },
  { id: 'name', label: 'Name & save' },
];

export const KIND_LABELS: Record<DatabaseKind, string> = { postgres: 'PostgreSQL', mysql: 'MySQL / MariaDB' };

/**
 * The draft of one open wizard (provided on the wizard component, so every wizard starts empty). Steps read
 * and write it; only the wizard's footer moves between steps. The draft is never stored anywhere: it holds a password.
 */
@Injectable()
export class WizardStore {
  private readonly api = inject(ConnectionControllerService);
  private testRequest?: Subscription;
  private workspaceId = 0;

  readonly stepIndex = signal(0);
  readonly step = computed(() => STEPS[this.stepIndex()].id);

  readonly kind = signal<DatabaseKind | null>(null);
  readonly mode = signal<InputMode>('string');
  readonly connectionString = signal('');
  readonly host = signal('');
  readonly port = signal('');
  readonly database = signal('');
  readonly user = signal('');
  readonly password = signal('');
  readonly ssl = signal(true);
  readonly schema = signal('');
  readonly name = signal('');
  private nameEdited = false;
  /** Set once Next was tried on the connection step, so its errors show before fields are touched. */
  readonly attempted = signal(false);

  readonly test = signal<{ state: TestState; message?: string; fingerprint?: string }>({ state: 'idle' });
  readonly saving = signal(false);
  readonly saveError = signal<string | null>(null);
  readonly saved = signal<ConnectionDto | null>(null);
  /** The saved connection's tables, a preview for the done screen (null while loading, [] when none or failed). */
  readonly tables = signal<string[] | null>(null);

  /** What the connection step produced: the string's reading, or the fields' settings. */
  private readonly parsed = computed(() => (this.mode() === 'string' ? parseConnectionString(this.connectionString()) : null));

  /** What is wrong with the connection input right now (null: nothing). */
  readonly connectionIssue = computed<string | null>(() => {
    const kind = this.kind();
    if (this.mode() === 'string') {
      const parsed = this.parsed()!;
      if (!parsed.ok) return parsed.error;
      if (parsed.value.kind !== kind) return `This is a ${KIND_LABELS[parsed.value.kind]} connection string.`;
      return null;
    }
    const port = Number(this.port() || DEFAULT_PORTS[kind ?? 'postgres']);
    if (!this.host().trim()) return 'The host is missing.';
    if (!Number.isInteger(port) || port < 1 || port > 65535) return 'The port is not valid.';
    if (!this.database().trim()) return 'The database name is missing.';
    if (!this.user().trim()) return 'The user is missing.';
    return null;
  });

  /** The issue as shown: not before there is input (or Next was tried), so an empty form isn't an error. */
  readonly visibleIssue = computed(() => {
    const touched = this.attempted() || (this.mode() === 'string' && this.connectionString().trim() !== '');
    return touched ? this.connectionIssue() : null;
  });

  /** The kind a string seems to be for, when it isn't the chosen one (offered as a switch). */
  readonly mismatchedKind = computed<DatabaseKind | null>(() => {
    const parsed = this.parsed();
    return parsed?.ok && parsed.value.kind !== this.kind() ? parsed.value.kind : null;
  });

  /** What was read from the string, for the preview under it (never the password itself). */
  readonly parsedPreview = computed(() => {
    const parsed = this.parsed();
    if (!parsed?.ok) return null;
    return { ...parsed.value.settings, hasPassword: parsed.value.password !== '' };
  });

  readonly warnings = computed(() => {
    const parsed = this.parsed();
    return parsed?.ok ? parsed.value.warnings : [];
  });

  /** The settings and password the connection will be made with; null while the input is not valid. */
  readonly effective = computed<{ settings: DatabaseSettings; password: string } | null>(() => {
    if (this.connectionIssue() !== null || this.kind() === null) return null;
    if (this.mode() === 'string') {
      const value = (this.parsed() as { value: ParsedConnection }).value;
      return { settings: value.settings, password: value.password };
    }
    const schema = this.schema().trim();
    return {
      settings: {
        host: this.host().trim(),
        port: Number(this.port() || DEFAULT_PORTS[this.kind()!]),
        database: this.database().trim(),
        user: this.user().trim(),
        ssl: this.ssl(),
        ...(this.kind() === 'postgres' && schema ? { schema } : {}),
      },
      password: this.password(),
    };
  });

  /** Identifies exactly what a test or save is about; a test only counts for the fingerprint it ran with. */
  readonly fingerprint = computed(() => {
    const e = this.effective();
    return e ? JSON.stringify([this.kind(), e.settings, e.password]) : '';
  });

  readonly testPassed = computed(() => {
    const t = this.test();
    return t.state === 'ok' && t.fingerprint === this.fingerprint();
  });

  /** Whether the current step lets the user move on. */
  readonly canAdvance = computed(() => {
    switch (this.step()) {
      case 'type': return this.kind() !== null;
      case 'connection': return this.effective() !== null;
      case 'test': return this.testPassed();
      case 'name': return this.name().trim().length > 0 && !this.saving();
    }
  });

  /** Anything entered that closing would lose. */
  readonly dirty = computed(() =>
    this.saved() === null && (this.kind() !== null || !!this.connectionString() || !!this.host() || !!this.name()),
  );

  init(workspaceId: number): void {
    this.workspaceId = workspaceId;
  }

  setKind(kind: DatabaseKind): void {
    if (this.kind() !== kind && this.port() === String(DEFAULT_PORTS[this.kind() ?? kind])) this.port.set('');
    this.kind.set(kind);
  }

  setName(name: string): void {
    this.name.set(name);
    this.nameEdited = true;
  }

  /** Moves between string and fields, carrying over what has been entered. */
  setMode(mode: InputMode): void {
    if (mode === this.mode()) return;
    const kind = this.kind();
    if (mode === 'fields') {
      const parsed = this.parsed();
      if (parsed?.ok) {
        const { settings, password } = parsed.value;
        this.host.set(settings.host);
        this.port.set(String(settings.port));
        this.database.set(settings.database);
        this.user.set(settings.user);
        this.ssl.set(settings.ssl);
        this.schema.set(settings.schema ?? '');
        this.password.set(password);
      }
    } else if (kind && this.host().trim()) {
      const e = this.effective();
      const settings = e?.settings ?? {
        host: this.host().trim(),
        port: Number(this.port() || DEFAULT_PORTS[kind]),
        database: this.database().trim(),
        user: this.user().trim(),
        ssl: this.ssl(),
      };
      this.connectionString.set(formatConnectionString(kind, settings, this.password()));
    }
    this.mode.set(mode);
  }

  next(): void {
    if (this.step() === 'connection' && !this.canAdvance()) {
      this.attempted.set(true);
      return;
    }
    if (!this.canAdvance() || this.stepIndex() >= STEPS.length - 1) return;
    this.stepIndex.update((i) => i + 1);
    if (this.step() === 'test' && !this.testPassed()) this.runTest();
    if (this.step() === 'name' && !this.nameEdited) {
      const s = this.effective()!.settings;
      this.name.set(`${s.database} @ ${s.host}`);
    }
  }

  back(): void {
    if (this.stepIndex() === 0) return;
    this.testRequest?.unsubscribe();
    if (this.test().state === 'running') this.test.set({ state: 'idle' });
    this.saveError.set(null);
    this.stepIndex.update((i) => i - 1);
  }

  goTo(index: number): void {
    while (this.stepIndex() > index) this.back();
  }

  runTest(): void {
    const command = this.command();
    if (!command) return;
    const fingerprint = this.fingerprint();
    this.testRequest?.unsubscribe();
    this.test.set({ state: 'running', fingerprint });
    this.testRequest = this.api.testNewConnection(command).subscribe({
      next: () => this.test.set({ state: 'ok', fingerprint }),
      error: (e: HttpErrorResponse) => this.test.set({ state: 'failed', fingerprint, message: describe(e, 'The database could not be reached.') }),
    });
  }

  save(): void {
    const command = this.command(this.name().trim());
    if (!command || !this.canAdvance() || this.saving()) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.api.createConnection(command).subscribe({
      next: (connection) => {
        this.saving.set(false);
        this.saved.set(connection);
        this.loadTables(connection.id!);
      },
      error: (e: HttpErrorResponse) => {
        this.saving.set(false);
        this.saveError.set(describe(e, "The connection couldn't be saved."));
      },
    });
  }

  /** Stops what is still running (when the wizard closes). */
  dispose(): void {
    this.testRequest?.unsubscribe();
  }

  private loadTables(id: number): void {
    this.tables.set(null);
    this.api.getTargets(id, {}).subscribe({
      next: (tables) => this.tables.set(tables ?? []),
      error: () => this.tables.set([]),
    });
  }

  private command(name?: string): ConnectionCommand | null {
    const e = this.effective();
    if (!e || !this.kind()) return null;
    return {
      workspaceId: this.workspaceId,
      kind: this.kind()!,
      ...(name ? { name } : {}),
      settings: e.settings as unknown as ConnectionCommand['settings'],
      ...(e.password ? { secret: { password: e.password } as unknown as ConnectionCommand['secret'] } : {}),
    };
  }
}

function describe(e: HttpErrorResponse, fallback: string): string {
  if (e.status === 403) return 'You need editor access in this workspace to add connections.';
  const body = e.error as { message?: string; detail?: string } | string | null;
  const text = typeof body === 'string' ? body : body?.message ?? body?.detail;
  return text && text.length < 300 ? text : fallback;
}
