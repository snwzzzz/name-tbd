import type { ActionExecutor, FlowRun } from '../engine';
import { SetVariableAction } from './set-variable.action';
import { HttpRequestAction } from './http-request.action';
import { CreateRowAction, DeleteRowAction, UpdateRowAction } from './row.actions';

/**
 * The actions the engine runs itself, by action type: they only need the scope, the variables,
 * the data and fetch, so the browser and the server run them alike. A host's own action of the
 * same type takes precedence (FlowHost.action).
 */
export const BUILTIN_ACTIONS: Record<string, ActionExecutor> = {
  set_variable: new SetVariableAction(),
  http_request: new HttpRequestAction(),
  create_row: new CreateRowAction(),
  update_row: new UpdateRowAction(),
  delete_row: new DeleteRowAction(),
};

/** A run's config, typed by the action. */
export const configOf = <C>(run: FlowRun): Partial<C> => (run.node.config ?? {}) as Partial<C>;
