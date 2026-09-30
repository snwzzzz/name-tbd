import { TestBed } from '@angular/core/testing';
import { ComponentList } from './component-list';

describe('ComponentList', () => {
  beforeEach(() => localStorage.clear());

  const mount = () => {
    const fixture = TestBed.createComponent(ComponentList);
    fixture.detectChanges();
    return fixture;
  };
  const labels = (el: HTMLElement) => [...el.querySelectorAll('.item-label')].map((e) => e.textContent?.trim());
  const sections = (el: HTMLElement) => [...el.querySelectorAll('.section-label')].map((e) => e.textContent?.trim());

  it('lists the widgets by category, without the retired ones', () => {
    const el: HTMLElement = mount().nativeElement;

    expect(sections(el)).toEqual(['Basic', 'Actions', 'Navigation', 'Data', 'Layout']);
    expect(labels(el)).toEqual(['Text Label', 'Button', 'Link', 'Nav Menu', 'Data Table', 'Container']);
    expect(el.textContent).not.toContain('Dynamic Form');
  });

  it('searches across all categories', () => {
    const fixture = mount();
    const el: HTMLElement = fixture.nativeElement;

    fixture.componentInstance.query.set('href');
    fixture.detectChanges();
    expect(labels(el)).toEqual(['Link']);
    expect(sections(el)).toEqual([]);

    fixture.componentInstance.query.set('nothing like this');
    fixture.detectChanges();
    expect(el.querySelector('.empty-state')?.textContent).toContain('No components match');
  });

  it('folds categories and remembers it', () => {
    const fixture = mount();
    (fixture.nativeElement.querySelectorAll('.section-header')[2] as HTMLElement).click();
    fixture.detectChanges();
    expect(labels(fixture.nativeElement)).not.toContain('Link');

    TestBed.tick();
    TestBed.resetTestingModule();
    expect(labels(mount().nativeElement)).not.toContain('Nav Menu');
  });
});
