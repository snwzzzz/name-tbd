import { Injectable, inject } from '@angular/core';
import { FormsService } from '../../../forms/forms.service';
import { ActionHandler, ActionOutcome, ActionRun, SubmitFormConfig } from '../../../../_types/workflow.types';

/**
 * `submit_form`: checks and saves a form, like its submit button does. The flow goes on only when
 * it was saved (e.g. then closes the dialog the form is in).
 */
@Injectable({ providedIn: 'root' })
export class SubmitFormHandler implements ActionHandler {
  private readonly forms = inject(FormsService);

  async run({ pageId, node, isCurrent }: ActionRun): Promise<ActionOutcome> {
    const { formId } = node.config as SubmitFormConfig;
    if (!formId || !isCurrent()) return 'stop';
    return (await this.forms.submit(pageId, formId)) ? 'continue' : 'stop';
  }
}
