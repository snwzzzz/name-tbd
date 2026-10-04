import { Injectable, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { LayoutStateService } from '../../_services/layout-state.service';
import { WorkflowStateService } from '../../_services/workflow-state.service';
import { IdRegistry } from '../../_services/id-registry.service';
import { Command, CommandContext, CompositeCommand, MoveLike } from './command';

/** Steps recorded this close together are one step (one gesture: a drop and the container growing for it). */
export const GROUP_MS = 150;
/** Steps kept per page. */
export const HISTORY_LIMIT = 100;

interface Stacks {
  undo: Command[];
  redo: Command[];
}

/**
 * Undo and redo, per page (Ctrl+Z acts on the page that's open). Editing records what it did as
 * commands ({@link record}, when the change is already made, e.g. by a drag; or {@link execute});
 * undo applies a step's inverse, redo the step again. Both change the editor's state (and save
 * through the SaveQueue); {@link applied$} tells the page to show the result.
 */
@Injectable({ providedIn: 'root' })
export class HistoryService {
  private readonly context: CommandContext = {
    layout: inject(LayoutStateService),
    workflows: inject(WorkflowStateService),
    registry: inject(IdRegistry),
  };

  private readonly stacks = signal<Record<string, Stacks>>({});
  private lastRecorded: { pageId: string; at: number } | null = null;

  /** A page's state was changed by undo or redo: its view should show the state again. */
  readonly applied$ = new Subject<string>();

  /** Records a change that's already made. */
  record(command: Command): void {
    const stacks = this.stacksOf(command.pageId);
    const now = Date.now();
    const top = stacks.undo[stacks.undo.length - 1];
    const sameGesture = top && this.lastRecorded?.pageId === command.pageId && now - this.lastRecorded.at < GROUP_MS;
    const undo = sameGesture
      ? [...stacks.undo.slice(0, -1), top.merge?.(command) ?? new CompositeCommand(command.pageId, [top, command], nameOf(top, command))]
      : [...stacks.undo, command].slice(-HISTORY_LIMIT);
    this.set(command.pageId, { undo, redo: [] });
    this.lastRecorded = { pageId: command.pageId, at: now };
  }

  /** Makes a change and records it. */
  execute(command: Command): void {
    command.apply(this.context);
    this.record(command);
  }

  undo(pageId: string): void {
    const stacks = this.stacksOf(pageId);
    const step = stacks.undo[stacks.undo.length - 1];
    if (!step) return;
    step.invert().apply(this.context);
    this.set(pageId, { undo: stacks.undo.slice(0, -1), redo: [...stacks.redo, step] });
    this.lastRecorded = null;
    this.applied$.next(pageId);
  }

  redo(pageId: string): void {
    const stacks = this.stacksOf(pageId);
    const step = stacks.redo[stacks.redo.length - 1];
    if (!step) return;
    step.apply(this.context);
    this.set(pageId, { undo: [...stacks.undo, step], redo: stacks.redo.slice(0, -1) });
    this.lastRecorded = null;
    this.applied$.next(pageId);
  }

  /** What undo would take back on the page (null: nothing). */
  undoLabel(pageId: string | null): string | null {
    const undo = pageId ? this.stacks()[pageId]?.undo : undefined;
    return undo?.[undo.length - 1]?.label ?? null;
  }

  /** What redo would do again on the page (null: nothing). */
  redoLabel(pageId: string | null): string | null {
    const redo = pageId ? this.stacks()[pageId]?.redo : undefined;
    return redo?.[redo.length - 1]?.label ?? null;
  }

  /** Forgets a page's steps (e.g. its content was replaced). */
  clear(pageId: string): void {
    this.set(pageId, { undo: [], redo: [] });
  }

  private stacksOf(pageId: string): Stacks {
    return this.stacks()[pageId] ?? { undo: [], redo: [] };
  }

  private set(pageId: string, stacks: Stacks): void {
    this.stacks.update((all) => ({ ...all, [pageId]: stacks }));
  }
}

/** A step made of a move and something else is named after the something else. */
export function nameOf(first: Command, second: Command): string {
  return second instanceof MoveLike ? first.label : first instanceof MoveLike ? second.label : first.label;
}
