import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { LayersPanel } from './layers-panel';
import { LayoutStateService } from '../../_services/layout-state.service';
import { SelectionService } from '../../_services/selection.service';
import { TabsService } from '../../_services/tabs.service';
import { SidebarStateService } from '../../_services/sidebar-state.service';
import { LayoutItem } from '../../_types/layout.types';

const LAYOUT: LayoutItem[] = [
  { id: 1, type: 'button', y: 1, props: { label: 'Save' } },
  {
    id: 2, type: 'container', y: 0,
    children: [{ id: 3, type: 'label', y: 0, props: { text: 'Hello' } }],
  },
];

describe('LayersPanel', () => {
  const selectedId = signal<string | null>(null);
  let opened: string[];

  const mount = () => {
    selectedId.set(null);
    opened = [];
    TestBed.configureTestingModule({
      providers: [
        { provide: LayoutStateService, useValue: { getLayout: () => LAYOUT } },
        { provide: SelectionService, useValue: { selectedId, select: (id: string) => selectedId.set(id) } },
        { provide: TabsService, useValue: { activeTabId: signal('1'), activeMode: signal('edit') } },
        { provide: SidebarStateService, useValue: { open: (id: string) => opened.push(id) } },
      ],
    });
    const fixture = TestBed.createComponent(LayersPanel);
    fixture.detectChanges();
    return fixture;
  };

  const names = (el: HTMLElement) =>
    [...el.querySelectorAll('.layer')].map((l) => l.querySelector('.layer-name')?.textContent?.trim());

  it('lists the widgets top to bottom, with containers holding their children', () => {
    const el: HTMLElement = mount().nativeElement;

    expect(names(el)).toEqual(['Container', 'Text Label', 'Button']);
    expect(el.textContent).toContain('Save');
    expect(el.querySelector('.count')?.textContent).toBe('3');
  });

  it('selects a widget on click and folds containers', () => {
    const fixture = mount();
    const el: HTMLElement = fixture.nativeElement;

    (el.querySelectorAll('.layer')[2] as HTMLElement).click();
    fixture.detectChanges();
    expect(selectedId()).toBe('1');
    expect(el.querySelector('.layer.selected .layer-name')?.textContent).toBe('Button');

    (el.querySelector('.toggle') as HTMLElement).click();
    fixture.detectChanges();
    expect(names(el)).toEqual(['Container', 'Button']);
    expect(selectedId()).toBe('1'); // folding doesn't select the container
  });

  it('opens the properties of a double-clicked widget', () => {
    const el: HTMLElement = mount().nativeElement;

    el.querySelectorAll('.layer')[1].dispatchEvent(new MouseEvent('dblclick'));
    expect(selectedId()).toBe('3');
    expect(opened).toEqual(['properties']);
  });
});
