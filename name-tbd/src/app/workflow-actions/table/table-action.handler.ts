import { Injectable, Injector, inject } from '@angular/core';
import { ActionHandler, ActionOutcome, ActionRun, TableActionConfig } from '../../_types/workflow.types';
import { TABLE_OPERATIONS } from './table-operations';

/** `table`: runs the operation chosen in the node (see TABLE_OPERATIONS) on its table. */
@Injectable({ providedIn: 'root' })
export class TableActionHandler implements ActionHandler {
  private readonly injector = inject(Injector);

  run(run: ActionRun): Promise<ActionOutcome> {
    const { operation } = run.node.config as TableActionConfig;
    const op = TABLE_OPERATIONS.find((o) => o.id === operation);
    if (!op) {
      console.warn(`[workflow] Unknown table operation "${operation}"`);
      return Promise.resolve('continue');
    }
    return this.injector.get(op.handler).run(run);
  }
}
