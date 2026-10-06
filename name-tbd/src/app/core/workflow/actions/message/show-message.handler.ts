import { Injectable, inject } from '@angular/core';
import { AppMessagesService } from '../../../services/app-messages.service';
import { ActionHandler, ActionResult, ActionRun, MessageTone, ShowMessageConfig } from '../../../../_types/workflow.types';

const TONES: MessageTone[] = ['info', 'success', 'warning', 'error'];

/** `show_message`: a short message over the app (a toast); its text is a template. */
@Injectable({ providedIn: 'root' })
export class ShowMessageHandler implements ActionHandler {
  private readonly messages = inject(AppMessagesService);

  async run(run: ActionRun): Promise<ActionResult> {
    const config = run.node.config as Partial<ShowMessageConfig>;
    const text = run.text(config.message ?? '').trim();
    const tone = TONES.includes(config.tone as MessageTone) ? config.tone! : 'info';
    run.inputs({ message: text, tone });
    if (text && run.isCurrent()) this.messages.show(text, tone);
    return {};
  }

  reset(): void {
    this.messages.reset();
  }
}
