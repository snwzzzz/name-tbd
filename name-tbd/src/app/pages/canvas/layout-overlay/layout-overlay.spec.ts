import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LayoutOverlay } from './layout-overlay';
import { LayoutStateService } from '../../../_services/layout-state.service';
import { PagesStateService } from '../../../_services/pages-state.service';
import { PreviewSessionService } from '../../../_services/preview-session.service';
import { TabsService } from '../../../_services/tabs.service';
import { LayoutItem } from '../../../_types/layout.types';

const LAYOUT: LayoutItem[] = [
  { id: 20, type: 'label', x: 0, y: 0, w: 4, h: 1, props: { text: 'Brand' } },
  { id: 21, type: 'container', x: 4, y: 0, w: 6, h: 1, children: [{ id: 22, type: 'label', x: 0, y: 0, w: 2, h: 1, props: { text: 'Inside' } }] },
];

describe('LayoutOverlay', () => {
  const activeTabId = signal('1');

  const mount = () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: LayoutStateService, useValue: { getLayout: (id: string) => (id === '9' ? LAYOUT : []), loadLayoutForTab: () => of(LAYOUT) } },
        { provide: PagesStateService, useValue: { ensureLoaded: () => {}, layoutPage: signal({ id: 9, layout: true }) } },
        { provide: PreviewSessionService, useValue: { active: signal(false) } },
        { provide: TabsService, useValue: { activeTabId } },
      ],
    });
    const fixture = TestBed.createComponent(LayoutOverlay);
    fixture.detectChanges();
    return fixture;
  };

  it("draws the layout page's widgets in their cells, containers included", () => {
    activeTabId.set('1');
    const el: HTMLElement = mount().nativeElement;

    expect(el.textContent).toContain('Brand');
    expect(el.textContent).toContain('Inside');
    const cell = el.querySelector('.root > .cell') as HTMLElement;
    expect(cell.style.gridColumn).toBe('1 / span 4');
  });

  it('is not shown on the layout page itself', () => {
    activeTabId.set('9');
    const fixture = mount();

    expect(fixture.nativeElement.textContent).not.toContain('Brand');
    expect((fixture.nativeElement as HTMLElement).classList).toContain('hidden');
  });
});
