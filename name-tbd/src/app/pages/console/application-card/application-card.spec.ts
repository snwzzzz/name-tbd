import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApplicationCard } from './application-card';
import { ApplicationDto } from '../../../api/models';

describe('ApplicationCard', () => {
  const mount = (application: ApplicationDto) => {
    TestBed.configureTestingModule({ imports: [ApplicationCard], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(ApplicationCard);
    fixture.componentRef.setInput('application', application);
    fixture.detectChanges();
    return fixture;
  };

  it('links to the application in the editor and says who edited it last', () => {
    const page = mount({
      id: 5, title: 'Shop', description: 'Sells things',
      lastModified: '2026-10-01T09:30:00' as unknown as Date, lastModifiedBy: 'Ada Lovelace',
    }).nativeElement as HTMLElement;

    expect(page.querySelector('a.open')?.getAttribute('href')).toBe('/apps/5/edit');
    expect(page.querySelector('.title')?.textContent).toBe('Shop');
    expect(page.querySelector('.description')?.textContent).toBe('Sells things');
    expect(page.querySelector('.edited')?.textContent).toContain('by Ada Lovelace');
  });

  it('asks to rename, duplicate or delete', () => {
    const fixture = mount({ id: 5, title: 'Shop' });
    const events: string[] = [];
    fixture.componentInstance.rename.subscribe(() => events.push('rename'));
    fixture.componentInstance.duplicate.subscribe(() => events.push('duplicate'));
    fixture.componentInstance.remove.subscribe(() => events.push('remove'));

    const buttons = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLButtonElement>('button.action');
    buttons.forEach((button) => button.click());

    expect(events).toEqual(['rename', 'duplicate', 'remove']);
  });
});
