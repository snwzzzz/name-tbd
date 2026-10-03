import { DOCUMENT, Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, of, shareReplay, switchMap, tap, throwError } from 'rxjs';
import { MeControllerService } from '../api/services/meController.service';
import { MeDto } from '../api/models';
import { API_BASE_URL } from '../_constants/api.constants';
import { ToastService } from './toast.service';

/** The identity providers users sign in with (backend: spring.security.oauth2.client.registration.*). */
export type SignInProvider = 'google' | 'microsoft';

/** Where to go after signing in; survives the trip to the identity provider and back. */
const RETURN_URL_KEY = 'auth.returnUrl';

/**
 * The signed-in user. Sign-in itself happens at the identity provider: the browser leaves the editor,
 * and the backend sends it back to /console with a session cookie.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(MeControllerService);
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly document = inject(DOCUMENT);

  /** undefined: not asked yet; null: nobody signed in. */
  private readonly me = signal<MeDto | null | undefined>(undefined);
  private loading?: Observable<MeDto | null>;

  readonly user = computed(() => this.me()?.user ?? null);
  readonly workspaces = computed(() => this.me()?.workspaces ?? []);

  /** The signed-in user and their workspaces, asked from the backend once (null: nobody signed in). */
  ensureLoaded(): Observable<MeDto | null> {
    const known = this.me();
    if (known !== undefined) return of(known);
    this.loading ??= this.api.getMe().pipe(
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 401 ? of(null) : throwError(() => error),
      ),
      tap((me) => this.me.set(me)),
      finalize(() => (this.loading = undefined)),
      shareReplay(1),
    );
    return this.loading;
  }

  /** Off to the identity provider; afterwards the editor continues at {@link returnUrl} (see takeReturnUrl). */
  signIn(provider: SignInProvider, returnUrl?: string | null): void {
    try {
      if (isAppUrl(returnUrl)) sessionStorage.setItem(RETURN_URL_KEY, returnUrl);
      else sessionStorage.removeItem(RETURN_URL_KEY);
    } catch {
      // No session storage: sign-in still works, it just lands on the console
    }
    this.document.location.assign(`${API_BASE_URL}/oauth2/authorization/${provider}`);
  }

  /**
   * Local development only: signs in as any email without an identity provider. The backend
   * offers it only with app.security.dev-sign-in (DevSignInController); elsewhere this fails with 401.
   */
  devSignIn(email: string): Observable<MeDto | null> {
    return this.http.post(`${API_BASE_URL}/api/dev/sign-in`, { email }).pipe(
      switchMap(() => {
        this.me.set(undefined);
        return this.ensureLoaded();
      }),
    );
  }

  /** The page the user wanted before signing in, once (null if none). */
  takeReturnUrl(): string | null {
    try {
      const url = sessionStorage.getItem(RETURN_URL_KEY);
      sessionStorage.removeItem(RETURN_URL_KEY);
      return isAppUrl(url) ? url : null;
    } catch {
      return null;
    }
  }

  signOut(): void {
    this.http
      .post(`${API_BASE_URL}/logout`, null)
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.signedOut();
        this.router.navigateByUrl('/login');
      });
  }

  /** The session is gone (signed out, or expired as a 401 showed). */
  signedOut(): void {
    this.me.set(null);
  }
}

/** A path inside the editor (never another site, which "//host" would be). */
function isAppUrl(url: string | null | undefined): url is string {
  return !!url && url.startsWith('/') && !url.startsWith('//') && !url.startsWith('/login');
}

/**
 * Reacts to API answers about the session: 401 (signed out or expired) goes to the login page, and
 * coming back returns to where the user was; 403 explains itself in a toast.
 */
export const authErrorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const toasts = inject(ToastService);
  return next(req).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && req.url.startsWith(`${API_BASE_URL}/api/`)) {
        // The guard handles /api/me itself (a 401 there just means "not signed in yet")
        if (error.status === 401 && !req.url.endsWith('/api/me') && !router.url.startsWith('/login')) {
          auth.signedOut();
          router.navigate(['/login'], { queryParams: { returnUrl: router.url } });
        } else if (error.status === 403) {
          toasts.show("You don't have permission to do that.", 'warning');
        }
      }
      return throwError(() => error);
    }),
  );
};
