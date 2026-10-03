import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { Login } from './login';
import { AuthService } from '../../_services/auth.service';
import { MeDto } from '../../api/models';

describe('Login', () => {
  let signIns: unknown[][];
  let navigated: unknown[];
  let me: Observable<MeDto | null>;
  let devSignIn: Observable<MeDto | null>;
  let devEmails: string[];

  const mount = (params: Record<string, string>) => {
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: new BehaviorSubject(convertToParamMap(params)) } },
        {
          provide: AuthService,
          useValue: {
            ensureLoaded: () => me,
            signIn: (...args: unknown[]) => signIns.push(args),
            devSignIn: (email: string) => {
              devEmails.push(email);
              return devSignIn;
            },
          },
        },
      ],
    });
    vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockImplementation(async (url) => {
      navigated.push(url);
      return true;
    });
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  beforeEach(() => {
    signIns = [];
    navigated = [];
    me = of(null);
    devEmails = [];
    devSignIn = of({ user: { id: 1 } });
  });

  it('signs in with the chosen provider, keeping the page to return to', () => {
    const page = mount({ returnUrl: '/editor/2/edit' });
    const buttons = page.querySelectorAll<HTMLButtonElement>('button.provider');

    buttons[0].click();
    buttons[1].click();

    expect(signIns).toEqual([
      ['google', '/editor/2/edit'],
      ['microsoft', '/editor/2/edit'],
    ]);
  });

  it('explains why signing in failed', () => {
    const page = mount({ error: 'email_in_use' });
    expect(page.querySelector('[role=alert]')?.textContent).toContain('already belongs to an account');
  });

  it('has a general message for errors it does not know', () => {
    const page = mount({ error: 'something_else' });
    expect(page.querySelector('[role=alert]')?.textContent).toContain("Signing in didn't work");
  });

  it('shows no error without one', () => {
    const page = mount({});
    expect(page.querySelector('[role=alert]')).toBeNull();
  });

  it('signs in for development as the typed email (dev builds)', () => {
    const page = mount({ returnUrl: '/editor/2/edit' });
    const input = page.querySelector<HTMLInputElement>('#dev-email')!;
    input.value = 'grace@example.com';
    input.dispatchEvent(new Event('input'));

    page.querySelector<HTMLFormElement>('form.dev')!.dispatchEvent(new Event('submit'));

    expect(devEmails).toEqual(['grace@example.com']);
    expect(navigated).toEqual(['/editor/2/edit']);
  });

  it('says when the backend has dev sign-in turned off', () => {
    devSignIn = throwError(() => new HttpErrorResponse({ status: 401 }));
    const page = mount({});

    page.querySelector<HTMLFormElement>('form.dev')!.dispatchEvent(new Event('submit'));
    TestBed.tick();

    expect(page.querySelector('form.dev [role=alert]')?.textContent).toContain('app.security.dev-sign-in');
  });

  it('goes straight on when already signed in', () => {
    me = of({ user: { id: 1 } });
    mount({ returnUrl: '/editor/2/edit' });
    expect(navigated).toEqual(['/editor/2/edit']);
  });
});
