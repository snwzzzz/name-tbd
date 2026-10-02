import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RuntimeShell } from './runtime-shell';
import { runtimeConfig } from '../runtime.config';
import { testDefinition } from '../test-definition';
import { APP_DATA } from '../../../app/core/ports/app-ports';
import { AppDefinition } from '../../../app/core/definition/app-definition';

const flush = () => new Promise((resolve) => setTimeout(resolve));

describe('RuntimeShell', () => {
  const start = async (definition: AppDefinition = testDefinition()) => {
    TestBed.configureTestingModule({ providers: runtimeConfig(definition).providers });
    const fixture = TestBed.createComponent(RuntimeShell);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    return fixture;
  };
  const settle = async (fixture: Awaited<ReturnType<typeof start>>) => {
    await flush();
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => localStorage.clear());

  it('shows the home page under the layout page, and runs its workflows', async () => {
    const fixture = await start();
    let el = await settle(fixture);

    expect([...el.querySelectorAll('.layout-layer nav a')].map((a) => a.textContent)).toEqual(['Home', 'About']);
    expect(el.querySelector('app-runtime-page')?.textContent).toContain('Hello');

    (el.querySelector('app-runtime-page button') as HTMLButtonElement).click();
    el = await settle(fixture);
    expect(el.querySelector('app-runtime-page')?.textContent).toContain('Clicked');
  });

  it('follows links to other pages, marking them in the menu', async () => {
    const fixture = await start();
    let el = await settle(fixture);

    (el.querySelector('app-runtime-page a') as HTMLAnchorElement).click();
    el = await settle(fixture);

    expect(TestBed.inject(Router).url).toBe('/about');
    expect(el.querySelector('app-runtime-page')?.textContent).toContain('Alice');
    expect(el.querySelector('.layout-layer nav a[aria-current="page"]')?.textContent).toBe('About');
    expect(el.querySelector('.layout-layer nav a')?.getAttribute('href')).toBe('#/');
  });

  it('keeps data changes in the browser for the next visit', async () => {
    await start();
    TestBed.inject(APP_DATA).addRow(5, ['Carol']);
    TestBed.resetTestingModule();

    await start();
    expect(TestBed.inject(APP_DATA).table(5)?.rows.map((r) => r.values[0])).toEqual(['Alice', 'Bob', 'Carol']);
  });
});
