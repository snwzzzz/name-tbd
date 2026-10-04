import { ComponentId, WidgetProps } from '../../_types/layout.types';
import { Command, CommandContext, resolveId } from './command';

/** Edits made this close together to the same widget's settings are one step (typing). */
export const TYPING_MS = 1000;

/** A widget's settings changed (the properties panel); undo sets them back as they were. */
export class SetWidgetProps implements Command {
  readonly label = 'Change settings';
  readonly mergeWindowMs = TYPING_MS;

  constructor(
    readonly pageId: string,
    readonly id: ComponentId,
    readonly before: WidgetProps,
    readonly after: WidgetProps,
  ) {}

  apply({ layout, registry }: CommandContext): void {
    layout.replaceItemProps(this.pageId, resolveId(registry, this.id), this.after);
  }

  invert(): Command {
    return new SetWidgetProps(this.pageId, this.id, this.after, this.before);
  }

  /** Typing into the same widget's settings: one step, from before the first key to after the last. */
  merge(next: Command): Command | null {
    if (!(next instanceof SetWidgetProps) || next.pageId !== this.pageId || String(next.id) !== String(this.id)) return null;
    return new SetWidgetProps(this.pageId, this.id, this.before, next.after);
  }
}
