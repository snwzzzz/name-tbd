import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RunLogService } from '../../core/workflow/run-log.service';
import { PagesStateService } from '../../_services/pages-state.service';
import { ACTION_TYPES, actionPorts } from '../../_constants/workflow.constants';
import { RunLogEntry } from '../../../flow-engine';

const TRIGGER_LABELS: Record<string, string> = {
  element_click: 'Widget event',
  page_load: 'Page loaded',
  timer: 'Timer',
  variable_change: 'Variable changed',
};

/** A value as the log shows it: JSON, shortened. */
function shown(value: unknown): string {
  const text = JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? Number(v) : v), 2) ?? '';
  return text.length > 2000 ? `${text.slice(0, 2000)}…` : text;
}

/**
 * The sidebar's Run log tab: every flow that ran in the preview, step by step: each node, what it
 * got (its settings with the expressions worked out) and gave, the branch it took and why a step
 * failed. Newest run first.
 */
@Component({
  selector: 'app-run-log-panel',
  imports: [DatePipe],
  templateUrl: './run-log-panel.html',
  styleUrl: './run-log-panel.scss',
})
export class RunLogPanel {
  private readonly log = inject(RunLogService);
  private readonly pages = inject(PagesStateService);
  readonly runs = this.log.runs;
  /** Steps whose details are open, by `${runId}:${step}`. */
  readonly open = signal<Set<string>>(new Set());

  clear(): void {
    this.log.clear();
  }

  toggle(entry: RunLogEntry): void {
    const key = `${entry.runId}:${entry.step}`;
    this.open.update((all) => {
      const next = new Set(all);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  isOpen(entry: RunLogEntry): boolean {
    return this.open().has(`${entry.runId}:${entry.step}`);
  }

  pageName(pageId: string): string {
    return this.pages.page(Number(pageId))?.name ?? `Page ${pageId}`;
  }

  label(entry: RunLogEntry): string {
    if (entry.nodeType === 'Trigger') return TRIGGER_LABELS[entry.label] ?? 'Trigger';
    if (entry.nodeType === 'Condition') return 'Condition';
    return ACTION_TYPES.find((a) => a.id === entry.label)?.label ?? entry.label;
  }

  /** The branch taken, as the node names it (e.g. "true", "For each", "Failed"). */
  branch(entry: RunLogEntry): string | null {
    if (!entry.port) return null;
    if (entry.nodeType !== 'Action') return entry.nodeType === 'Condition' ? entry.port : null;
    const ports = actionPorts(entry.label);
    if (entry.port === 'error') return 'Failed';
    return ports.length > 1 ? ports.find((p) => p.id === entry.port)?.label ?? entry.port : null;
  }

  details(entry: RunLogEntry): { label: string; text: string }[] {
    return [
      ...(entry.inputs !== undefined ? [{ label: entry.nodeType === 'Trigger' ? 'Started with' : 'Got', text: shown(entry.inputs) }] : []),
      ...(entry.output !== undefined ? [{ label: 'Gave', text: shown(entry.output) }] : []),
    ];
  }
}
