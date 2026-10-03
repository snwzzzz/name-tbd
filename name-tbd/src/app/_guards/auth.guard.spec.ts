import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable, firstValueFrom, of, throwError } from 'rxjs';
import { authGuard } from './auth.guard';
import { AuthService } from '../_services/auth.service';
import { MeDto } from '../api/models';

describe('authGuard', () => {
  let me: Observable<MeDto | null>;
  let returnUrl: string | null;

  const run = async (url: string) => {
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { ensureLoaded: () => me, takeReturnUrl: () => returnUrl } }],
    });
    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
    const value = await firstValueFrom(result as Observable<boolean | UrlTree>);
    return value instanceof UrlTree ? TestBed.inject(Router).serializeUrl(value) : value;
  };

  beforeEach(() => {
    returnUrl = null;
  });

  it('lets signed-in users through', async () => {
    me = of({ user: { id: 1 } });
    expect(await run('/console')).toBe(true);
  });

  it('sends everyone else to the login page, to come back afterwards', async () => {
    me = of(null);
    expect(await run('/editor/1/edit')).toBe('/login?returnUrl=%2Feditor%2F1%2Fedit');
  });

  it('continues to the page wanted before signing in', async () => {
    me = of({ user: { id: 1 } });
    returnUrl = '/editor/1/edit';
    expect(await run('/console')).toBe('/editor/1/edit');
  });

  it('says so on the login page when the server is unreachable', async () => {
    me = throwError(() => new Error('down'));
    expect(await run('/console')).toBe('/login?returnUrl=%2Fconsole&error=unavailable');
  });
});
