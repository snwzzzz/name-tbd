import { Injectable, signal } from '@angular/core';
import { RunLogEntry } from '../../../flow-engine';

/** One run of a flow: its steps as they happened. */
export interface FlowRunRecord {
  runId: number;
  pageId: string;
  startedAt: number;
  entries: RunLogEntry[];
}

/** How many runs are kept (the oldest go first). */
const MAX_RUNS = 50;

/**
 * The run log: every step of the flows that ran (each node, what it got and gave, the branch it
 * took), newest run first. The editor shows it while previewing, to see why a flow did what it did.
 */
@Injectable({ providedIn: 'root' })
export class RunLogService {
  private readonly all = signal<FlowRunRecord[]>([]);
  readonly runs = this.all.asReadonly();

  add(entry: RunLogEntry): void {
    this.all.update((runs) => {
      const index = runs.findIndex((r) => r.runId === entry.runId);
      if (index < 0) {
        return [{ runId: entry.runId, pageId: entry.pageId, startedAt: entry.at, entries: [entry] }, ...runs].slice(0, MAX_RUNS);
      }
      const run = runs[index];
      return runs.map((r, i) => (i === index ? { ...run, entries: [...run.entries, entry] } : r));
    });
  }

  clear(): void {
    this.all.set([]);
  }
}
