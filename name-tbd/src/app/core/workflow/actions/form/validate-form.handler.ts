import { Injectable, inject } from '@angular/core';
import { FormsService } from '../../../forms/forms.service';
import { ActionHandler, ActionResult, ActionRun, ValidateFormConfig } from '../../../../_types/workflow.types';

/** The ports of `validate_form`. */
export const VALID_PORT = 'valid';
export const INVALID_PORT = 'invalid';

/**
 * `validate_form`: checks a form's fields like submitting does (showing what's wrong under each),
 * without saving: the flow goes on through `valid` or `invalid`. E.g. check, then decide by an
 * expression whether to save or ask for approval.
 */
@Injectable({ providedIn: 'root' })
export class ValidateFormHandler implements ActionHandler {
  private readonly forms = inject(FormsService);

  async run(run: ActionRun): Promise<ActionResult> {
    const { formId } = run.node.config as Partial<ValidateFormConfig>;
    if (!formId) throw new Error('Choose the form to check');
    if (!run.isCurrent()) return { outcome: 'stop' };
    const valid = this.forms.validate(run.pageId, formId);
    return { port: valid ? VALID_PORT : INVALID_PORT, output: valid };
  }
}
