import { TestBed } from '@angular/core/testing';
import { TableSelectionService } from './table-selection.service';

describe('TableSelectionService', () => {
  let selection: TableSelectionService;
  beforeEach(() => (selection = TestBed.inject(TableSelectionService)));

  it('keeps one row selected without multi-select, deselecting it on a second click', () => {
    selection.toggle('t', 'a', false);
    selection.toggle('t', 'b', false);
    expect(selection.selected('t')).toEqual(['b']);

    selection.toggle('t', 'b', false);
    expect(selection.selected('t')).toEqual([]);
  });

  it('adds and removes rows with multi-select, per table', () => {
    selection.toggle('t', 'a', true);
    selection.toggle('t', 'b', true);
    selection.toggle('t', 'a', true);
    selection.toggle('other', 'x', true);

    expect(selection.selected('t')).toEqual(['b']);
    expect(selection.selected('other')).toEqual(['x']);
  });

  it('forgets deleted rows, and everything on reset', () => {
    selection.toggle('t', 'a', true);
    selection.toggle('t', 'b', true);
    selection.deselect('t', ['a']);
    expect(selection.selected('t')).toEqual(['b']);

    selection.reset();
    expect(selection.selected('t')).toEqual([]);
  });

  it('keeps a double-clicked row selected, whatever its two clicks did', () => {
    selection.toggle('t', 'a', false);
    selection.toggle('t', 'a', false); // the second click of the double-click deselected it
    selection.ensureSelected('t', 'a', false);
    expect(selection.selected('t')).toEqual(['a']);

    selection.toggle('m', 'x', true);
    selection.ensureSelected('m', 'y', true);
    selection.ensureSelected('m', 'y', true);
    expect(selection.selected('m')).toEqual(['x', 'y']);
  });
});
