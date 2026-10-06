import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from '../_services/auth.service';

/**
 * Only for signed-in users; everyone else goes to the login page, which brings them back here.
 * Right after sign-in it continues to the page the user had wanted.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toLogin = (extra: Record<string, string> = {}) =>
    router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url, ...extra } });

  return auth.ensureLoaded().pipe(
    map((me) => {
      if (!me) return toLogin();
      const returnUrl = auth.takeReturnUrl();
      return returnUrl && returnUrl !== state.url ? router.parseUrl(returnUrl) : true;
    }),
    catchError(() => of(toLogin({ error: 'unavailable' }))),
  );
};
