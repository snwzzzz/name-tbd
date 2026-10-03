import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Sidebar } from './sidebar';
import { SidebarStateService } from '../../_services/sidebar-state.service';
import { provideTestEditorContext } from '../../_testing/editor-context.testing';

@Component({
  imports: [Sidebar],
  template: '<app-sidebar side="left" /><app-sidebar side="right" />',
})
class Host {}

describe('Sidebar', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideTestEditorContext()] });
  });

  const mount = () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    return fixture;
  };
  const icons = (el: HTMLElement, side: string) =>
    [...el.querySelectorAll(`app-sidebar.side-${side} app-icon-button`)].map((b) => b.getAttribute('title'));

  it('shows each sidebar its tabs, and follows moves between them', () => {
    const fixture = mount();
    const el: HTMLElement = fixture.nativeElement;
    expect(icons(el, 'left')).toEqual(['Components (drag to move)', 'Data (drag to move)']);
    expect(icons(el, 'right')).toEqual(['Properties (drag to move)', 'Layers (drag to move)']);

    TestBed.inject(SidebarStateService).move('layers', 'left', 0);
    fixture.detectChanges();
    expect(icons(el, 'left')[0]).toBe('Layers (drag to move)');
    expect(el.querySelector('app-sidebar.side-left app-layers-panel')).not.toBeNull();
  });

  it('collapses when the open tab is clicked again', () => {
    const fixture = mount();
    const el: HTMLElement = fixture.nativeElement;
    const aside = () => el.querySelector('app-sidebar.side-right aside')!;

    expect(aside().classList).toContain('expanded');
    (el.querySelector('app-sidebar.side-right app-icon-button') as HTMLElement).click();
    fixture.detectChanges();
    expect(aside().classList).not.toContain('expanded');
  });
});
