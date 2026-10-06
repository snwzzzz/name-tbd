import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, convertToParamMap } from '@angular/router';
import { Observable, firstValueFrom, isObservable, of, throwError } from 'rxjs';
import { editorAppGuard } from './editor-app.guard';
import { EditorContext } from '../_services/editor-context.service';
import { ApplicationControllerService } from '../api/services/applicationController.service';
import { ApplicationDto } from '../api/models';
import { ToastService } from '../_services/toast.service';

describe('editorAppGuard', () => {
  let response: Observable<ApplicationDto>;
  let assigned: string[];
  let toasts: string[];

  const run = async (appId: string, url = `/apps/${appId}/edit`) => {
    const result = TestBed.runInInjectionContext(() =>
      editorAppGuard({ paramMap: convertToParamMap({ appId }) } as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
    const value = isObservable(result) ? await firstValueFrom(result as Observable<boolean | UrlTree>) : result;
    return value instanceof UrlTree ? TestBed.inject(Router).serializeUrl(value) : value;
  };

  beforeEach(() => {
    assigned = [];
    toasts = [];
    response = of({ id: 5, title: 'Shop', defaultBranchId: 8 });
    TestBed.configureTestingModule({
      providers: [
        { provide: ApplicationControllerService, useValue: { getApplication: () => response } },
        { provide: ToastService, useValue: { show: (message: string) => toasts.push(message) } },
        { provide: DOCUMENT, useValue: { location: { assign: (url: string) => assigned.push(url) } } },
      ],
    });
  });

  it('loads the application before the editor opens', async () => {
    expect(await run('5')).toBe(true);
    expect(TestBed.inject(EditorContext).branchId()).toBe(8);
  });

  it('goes back to the console for an application that is not there', async () => {
    response = throwError(() => new HttpErrorResponse({ status: 404 }));
    expect(await run('5')).toBe('/console');
    expect(toasts).toHaveLength(1);
  });

  it('goes back to the console for a nonsense id', async () => {
    expect(await run('abc')).toBe('/console');
  });

  it('reloads the editor to open a different application', async () => {
    await run('5');
    expect(await run('6', '/apps/6/edit/welcome-0/welcome')).toBe(false);
    expect(assigned).toEqual(['/apps/6/edit/welcome-0/welcome']);
  });

  it('stays when it is the same application', async () => {
    await run('5');
    expect(await run('5')).toBe(true);
    expect(assigned).toEqual([]);
  });
});
