import { Injectable, inject } from '@angular/core';
import { LayoutStateService } from '../../_services/layout-state.service';
import { ActionHandler, ActionOutcome, ActionRun, SetTextConfig } from '../../_types/workflow.types';

/**
 * `set_text`: shows other text on a label, optionally going back to the label's own text after
 * a while. Changes are preview props, never saved.
 */
@Injectable({ providedIn: 'root' })
export class SetTextHandler implements ActionHandler {
  private readonly layoutState = inject(LayoutStateService);

  // Labels currently showing preview text, per page
  private readonly previewed = new Map<string, Set<string>>();
  // Changes to one label take turns: each waits until the one before it has finished (`${pageId}:${labelId}`)
  private readonly queues = new Map<string, Promise<void>>();

  /** Resolves once the text was set (and reset, if enabled). */
  run({ pageId, node, isCurrent }: ActionRun): Promise<ActionOutcome> {
    const config = node.config as SetTextConfig;
    if (!config.targetId) return Promise.resolve('continue');

    const key = `${pageId}:${config.targetId}`;
    const run = (this.queues.get(key) ?? Promise.resolve()).then(async () => {
      if (!isCurrent()) return;

      this.layoutState.previewItemProps(pageId, config.targetId, { text: config.text ?? '' });
      if (!this.previewed.has(pageId)) this.previewed.set(pageId, new Set());
      this.previewed.get(pageId)!.add(config.targetId);

      if (!config.resetEnabled) return;
      const seconds = Math.max(0, Number(config.resetAfterSeconds) || 0);
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      if (!isCurrent()) return;

      this.previewed.get(pageId)?.delete(config.targetId);
      // Back to the label's own text prop
      this.layoutState.previewItemProps(pageId, config.targetId, null);
    });

    this.queues.set(key, run);
    // Forget the queue once it has drained, so it doesn't grow forever
    run.then(() => { if (this.queues.get(key) === run) this.queues.delete(key); });
    return run.then(() => 'continue' as const);
  }

  reset(pageId: string): void {
    for (const key of [...this.queues.keys()]) {
      if (key.startsWith(`${pageId}:`)) this.queues.delete(key);
    }
    for (const id of this.previewed.get(pageId) ?? []) {
      this.layoutState.previewItemProps(pageId, id, null);
    }
    this.previewed.delete(pageId);
  }
}
