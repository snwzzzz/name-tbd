import { TestBed } from '@angular/core/testing';
import { SelectionService } from './selection.service';
import { LayoutStateService } from './layout-state.service';
import { TabsService } from './tabs.service';
import { IdRegistry } from './id-registry.service';
import { signal } from '@angular/core';

describe('SelectionService', () => {
  let patched: [string, string, unknown][];

  beforeEach(() => {
    patched = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: LayoutStateService, useValue: { patchItemProps: (page: string, id: string, props: unknown) => patched.push([page, id, props]) } },
        { provide: TabsService, useValue: { activeTabId: signal('5') } },
      ],
    });
  });

  it('selects one widget, or several with toggle, the last one being the primary', () => {
    const selection = TestBed.inject(SelectionService);
    selection.select('1');
    selection.toggle('2');
    selection.toggle('3');
    expect(selection.selectedIds()).toEqual(['1', '2', '3']);
    expect(selection.selectedId()).toBe('3');

    selection.toggle('2');
    expect(selection.selectedIds()).toEqual(['1', '3']);
    expect(selection.isSelected('2')).toBe(false);

    selection.select('7');
    expect(selection.selectedIds()).toEqual(['7']);
    selection.selectMany(['8', '9', '8']);
    expect(selection.selectedIds()).toEqual(['8', '9']);
    selection.clear();
    expect(selection.selectedId()).toBeNull();
  });

  it('edits the props of a given widget, or of the primary one', () => {
    const selection = TestBed.inject(SelectionService);
    selection.selectMany(['1', '2']);
    selection.updateProps({ text: 'a' }, '1');
    selection.updateProps({ text: 'b' });
    expect(patched).toEqual([['5', '1', { text: 'a' }], ['5', '2', { text: 'b' }]]);
  });

  it('keeps a new widget selected once it is saved', () => {
    const selection = TestBed.inject(SelectionService);
    selection.selectMany(['3', 'new_a']);
    TestBed.inject(IdRegistry).record({ new_a: 12 });
    expect(selection.selectedIds()).toEqual(['3', '12']);
  });
});
