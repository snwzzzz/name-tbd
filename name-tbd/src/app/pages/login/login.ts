import { Component, OnInit, computed, inject, isDevMode, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { AuthService, SignInProvider } from '../../_services/auth.service';

/** What went wrong, by the ?error= code the backend (SecurityConfig) or the auth guard sends. */
const ERROR_MESSAGES: Record<string, string> = {
  email_in_use: 'This email already belongs to an account. Sign in the way you did before.',
  email_missing: "Your sign-in provider didn't share an email address with us.",
  email_invalid: "Your sign-in provider shared an email address we can't use.",
  unavailable: "The server can't be reached right now. Try again in a moment.",
};
const DEFAULT_ERROR = "Signing in didn't work. Please try again.";

/** Sign in with Google or Microsoft. */
@Component({
  selector: 'app-login',
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly params = toSignal(inject(ActivatedRoute).queryParamMap, { requireSync: true });

  readonly returnUrl = computed(() => this.params().get('returnUrl'));
  readonly error = computed(() => {
    const code = this.params().get('error');
    return code === null ? null : (ERROR_MESSAGES[code] ?? DEFAULT_ERROR);
  });

  /** Dev builds also offer signing in as any email (needs app.security.dev-sign-in on the backend). */
  readonly devMode = isDevMode();
  readonly devEmail = signal('dev@example.com');
  readonly devError = signal<string | null>(null);

  ngOnInit(): void {
    // Already signed in (e.g. the back button): straight on
    this.auth
      .ensureLoaded()
      .pipe(map((me) => !!me))
      .subscribe({
        next: (signedIn) => {
          if (signedIn) this.router.navigateByUrl(this.returnUrl() ?? '/tools');
        },
        error: () => {},
      });
  }

  signIn(provider: SignInProvider): void {
    this.auth.signIn(provider, this.returnUrl());
  }

  devSignIn(): void {
    this.devError.set(null);
    this.auth.devSignIn(this.devEmail()).subscribe({
      next: () => this.router.navigateByUrl(this.returnUrl() ?? '/tools'),
      error: (error: unknown) =>
        this.devError.set(
          error instanceof HttpErrorResponse && error.status === 400
            ? (error.error?.message ?? "That email doesn't work.")
            : 'Dev sign-in is off on the backend (app.security.dev-sign-in).',
        ),
    });
  }
}
