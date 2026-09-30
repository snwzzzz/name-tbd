import { isSavedId, newTemporaryId, toComponentId } from './component-id.utils';
import { splitPortId, inputPortId, outputPortId } from './port.utils';

describe('component ids', () => {
  it('turns numeric ids into numbers and keeps temporary ones', () => {
    expect(toComponentId('42')).toBe(42);
    expect(toComponentId('item-1-abc')).toBe('item-1-abc');
    expect(toComponentId('')).toBeUndefined();
    expect(toComponentId(null)).toBeUndefined();
  });

  it('only treats numeric ids as saved', () => {
    expect(isSavedId(7)).toBe(true);
    expect(isSavedId(newTemporaryId())).toBe(false);
  });
});

describe('port ids', () => {
  it('round-trips node and port', () => {
    expect(splitPortId(outputPortId('12', 'true'))).toEqual({ nodeId: '12', port: 'true' });
    expect(splitPortId(inputPortId('3'))).toEqual({ nodeId: '3', port: 'in' });
  });
});
