import { TestBed } from '@angular/core/testing';
import { DOCUMENT } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService, authErrorInterceptor } from './auth.service';
import { ToastService } from './toast.service';
import { MeDto } from '../api/models';
import { provideDefaultClient } from '../api';

const ME: MeDto = {
  user: { id: 5, email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' },
  workspaces: [{ id: 3, name: 'Personal', personal: true, role: 'OWNER' }],
};

describe('AuthService', () => {
  let http: HttpTestingController;
  let auth: AuthService;
  let assigned: string[];
  let navigated: unknown[][];
  let toasts: string[];

  beforeEach(() => {
    assigned = [];
    navigated = [];
    toasts = [];
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authErrorInterceptor])),
        provideHttpClientTesting(),
        provideDefaultClient({ basePath: '', interceptors: [] }),
        { provide: DOCUMENT, useValue: { location: { assign: (url: string) => assigned.push(url) } } },
        { provide: ToastService, useValue: { show: (message: string) => toasts.push(message) } },
      ],
    });
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockImplementation(async (...args: unknown[]) => {
      navigated.push(args);
      return true;
    });
    vi.spyOn(router, 'navigateByUrl').mockImplementation(async (url) => {
      navigated.push([url]);
      return true;
    });
    vi.spyOn(router, 'url', 'get').mockReturnValue('/editor/1/edit');
    http = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthService);
  });

  afterEach(() => http.verify());

  it('loads the signed-in user once', () => {
    const results: unknown[] = [];
    auth.ensureLoaded().subscribe((me) => results.push(me));
    auth.ensureLoaded().subscribe((me) => results.push(me));
    http.expectOne('/api/me').flush(ME);

    auth.ensureLoaded().subscribe((me) => results.push(me));

    expect(results).toEqual([ME, ME, ME]);
    expect(auth.user()?.email).toBe('ada@example.com');
    expect(auth.workspaces()).toHaveLength(1);
  });

  it('treats a 401 from /api/me as nobody signed in, without leaving the page', () => {
    let result: unknown = 'unset';
    auth.ensureLoaded().subscribe((me) => (result = me));
    http.expectOne('/api/me').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(result).toBeNull();
    expect(auth.user()).toBeNull();
    expect(navigated).toEqual([]);
  });

  it('passes other errors on', () => {
    let failed = false;
    auth.ensureLoaded().subscribe({ error: () => (failed = true) });
    http.expectOne('/api/me').flush(null, { status: 503, statusText: 'Unavailable' });

    expect(failed).toBe(true);
  });

  it('signs in at the identity provider and remembers where to come back to', () => {
    auth.signIn('google', '/editor/3/edit');

    expect(assigned).toEqual(['/oauth2/authorization/google']);
    expect(auth.takeReturnUrl()).toBe('/editor/3/edit');
    expect(auth.takeReturnUrl()).toBeNull();
  });

  it('only returns to pages inside the editor', () => {
    auth.signIn('microsoft', '//evil.example/x');
    expect(auth.takeReturnUrl()).toBeNull();

    auth.signIn('microsoft', 'https://evil.example');
    expect(auth.takeReturnUrl()).toBeNull();
  });

  it('signs out and goes to the login page', () => {
    auth.ensureLoaded().subscribe();
    http.expectOne('/api/me').flush(ME);

    auth.signOut();
    const logout = http.expectOne('/logout');
    expect(logout.request.method).toBe('POST');
    logout.flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.user()).toBeNull();
    expect(navigated).toEqual([['/login']]);
  });

  it('sends a lost session (401) to the login page, coming back to the current page', () => {
    TestBed.inject(HttpClient).get('/api/pages').subscribe({ error: () => {} });
    http.expectOne('/api/pages').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(navigated).toEqual([[['/login'], { queryParams: { returnUrl: '/editor/1/edit' } }]]);
  });

  it('explains a 403 in a toast', () => {
    TestBed.inject(HttpClient).delete('/api/pages/1').subscribe({ error: () => {} });
    http.expectOne('/api/pages/1').flush(null, { status: 403, statusText: 'Forbidden' });

    expect(toasts).toEqual(["You don't have permission to do that."]);
    expect(navigated).toEqual([]);
  });
});
