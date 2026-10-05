import { Injectable, inject } from '@angular/core';
import { ModalStateService } from '../../../services/modal-state.service';
import { ActionHandler, ActionOutcome, ActionRun, ModalConfig } from '../../../../_types/workflow.types';

/** `open_modal`: shows a modal dialog over the page (on top of any already open). */
@Injectable({ providedIn: 'root' })
export class OpenModalHandler implements ActionHandler {
  private readonly modals = inject(ModalStateService);

  async run({ node, isCurrent }: ActionRun): Promise<ActionOutcome> {
    const { modalId } = node.config as ModalConfig;
    if (modalId && isCurrent()) this.modals.show(modalId);
    return 'continue';
  }

  reset(): void {
    this.modals.reset();
  }
}

/** `close_modal`: closes a modal dialog (nothing happens when it isn't open). */
@Injectable({ providedIn: 'root' })
export class CloseModalHandler implements ActionHandler {
  private readonly modals = inject(ModalStateService);

  async run({ node, isCurrent }: ActionRun): Promise<ActionOutcome> {
    const { modalId } = node.config as ModalConfig;
    if (modalId && isCurrent()) this.modals.close(modalId);
    return 'continue';
  }
}
