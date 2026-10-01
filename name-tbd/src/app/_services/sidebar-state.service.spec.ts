import { TestBed } from '@angular/core/testing';
import { SidebarStateService } from './sidebar-state.service';
import { SidebarSide } from '../_types/sidebar.types';

const TABS: { id: string; defaultSide: SidebarSide }[] = [
  { id: 'a', defaultSide: 'left' },
  { id: 'b', defaultSide: 'left' },
  { id: 'p', defaultSide: 'right' },
  { id: 'l', defaultSide: 'right' },
];

describe('SidebarStateService', () => {
  const create = () => {
    const state = TestBed.inject(SidebarStateService);
    state.sync(TABS);
    TestBed.tick();
    return state;
  };

  beforeEach(() => localStorage.clear());

  it('places tabs in their default sidebar and opens each first tab', () => {
    const state = create();

    expect(state.tabIds('left')).toEqual(['a', 'b']);
    expect(state.tabIds('right')).toEqual(['p', 'l']);
    expect(state.activeTab('left')()).toBe('a');
    expect(state.activeTab('right')()).toBe('p');
  });

  it('reorders within a sidebar and moves tabs across, opening the moved one', () => {
    const state = create();

    state.move('b', 'left', 0);
    expect(state.tabIds('left')).toEqual(['b', 'a']);
    expect(state.activeTab('left')()).toBe('a');

    state.move('p', 'left', 1);
    expect(state.tabIds('left')).toEqual(['b', 'p', 'a']);
    expect(state.tabIds('right')).toEqual(['l']);
    expect(state.activeTab('left')()).toBe('p');
    expect(state.activeTab('right')()).toBe('l'); // p was open there
  });

  it('opens a tab wherever it is, toggles on select, and keeps it all across reloads', () => {
    const state = create();
    state.move('l', 'left', 0);
    state.select('right', 'p'); // open one clicked again: collapse
    expect(state.activeTab('right')()).toBeNull();

    state.open('p');
    expect(state.activeTab('right')()).toBe('p');
    TestBed.tick();

    TestBed.resetTestingModule();
    const reloaded = create();
    expect(reloaded.tabIds('left')).toEqual(['l', 'a', 'b']);
    expect(reloaded.activeTab('left')()).toBe('l');
  });

  it('drops tabs that no longer exist and adds new ones', () => {
    localStorage.setItem('sidebar-placement', JSON.stringify({ left: ['gone', 'b'], right: ['p', 'p'] }));
    localStorage.setItem('sidebar-right-tab', JSON.stringify('edit'));
    const state = create();

    expect(state.tabIds('left')).toEqual(['b', 'a']);
    expect(state.tabIds('right')).toEqual(['p', 'l']);
    expect(state.activeTab('right')()).toBe('p');
  });
});
