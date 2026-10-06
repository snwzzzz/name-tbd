import type { ActionExecutor, ActionResult, FlowRun } from '../engine';
import type { SetVariableConfig } from './configs';

/** `set_variable`: gives a variable (the page's, or else the app's, of that name) a new value. */
export class SetVariableAction implements ActionExecutor {
  async run(run: FlowRun): Promise<ActionResult> {
    const { variable, value } = run.node.config as Partial<SetVariableConfig>;
    if (!variable) throw new Error('Choose the variable to set');
    if (!run.host.variables) throw new Error('Variables are not available here');
    const next = run.template(value ?? '');
    run.inputs({ variable, value: next });
    if (!run.isCurrent()) return { outcome: 'stop' };
    run.host.variables.set(run.pageId, variable, next);
    return { output: run.host.variables.get(run.pageId, variable) };
  }
}
