import { ACTION_TYPES, actionPorts } from './workflow.constants';
import { ACTION_HANDLERS } from '../core/workflow/action-handlers';
import { BUILTIN_ACTIONS, LOOP_ACTION } from '../../flow-engine';

// No workflow node may be drawable but do nothing: every action the editor offers runs.

describe('workflow actions', () => {
  it('has something that runs every action the editor offers', () => {
    const runs = (id: string) => id in ACTION_HANDLERS || id in BUILTIN_ACTIONS || id === LOOP_ACTION;
    expect(ACTION_TYPES.map((a) => a.id).filter((id) => !runs(id))).toEqual([]);
  });

  it('offers every action that runs', () => {
    const offered = new Set(ACTION_TYPES.map((a) => a.id));
    expect([...Object.keys(ACTION_HANDLERS), ...Object.keys(BUILTIN_ACTIONS), LOOP_ACTION].filter((id) => !offered.has(id))).toEqual([]);
  });

  it('gives actions with several outputs a label for each', () => {
    for (const action of ACTION_TYPES.filter((a) => a.ports)) {
      expect(actionPorts(action.id).every((p) => p.label)).toBe(true);
    }
  });
});
