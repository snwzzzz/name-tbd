import { Directive, input } from '@angular/core';
import { LayoutItem } from '../_types/layout.types';
import type { ActionConfig } from '../_types/workflow.types';

/**
 * Base of an action type's settings, shown inside its workflow node (see ACTION_TYPES).
 * Edits go through `update`, which saves the node with the patched config.
 */
@Directive()
export abstract class BaseActionEditor<C extends ActionConfig = ActionConfig> {
  readonly config = input.required<C>();
  /** The page's widgets, for pickers. */
  readonly pageItems = input.required<LayoutItem[]>();
  readonly update = input.required<(patch: Partial<C>) => void>();
}
