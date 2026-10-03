import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { UserMenu } from './user-menu';
import { AuthService } from '../../_services/auth.service';
import { UserDto } from '../../api/models';

describe('UserMenu', () => {
  const user = signal<UserDto | null>(null);
  let signedOut: number;

  const mount = () => {
    TestBed.configureTestingModule({
      imports: [UserMenu],
      providers: [{ provide: AuthService, useValue: { user, signOut: () => signedOut++ } }],
    });
    const fixture = TestBed.createComponent(UserMenu);
    fixture.detectChanges();
    return fixture;
  };

  beforeEach(() => {
    signedOut = 0;
    user.set({ id: 1, email: 'ada@example.com', firstName: 'Ada', lastName: 'Lovelace' });
  });

  it('shows initials without a picture', () => {
    const page = mount().nativeElement as HTMLElement;
    expect(page.querySelector('.initials')?.textContent?.trim()).toBe('AL');
  });

  it('opens a menu with the user and signs out from it', () => {
    const fixture = mount();
    const page = fixture.nativeElement as HTMLElement;

    page.querySelector<HTMLButtonElement>('.avatar-button')!.click();
    fixture.detectChanges();
    expect(page.querySelector('.who')?.textContent).toContain('ada@example.com');

    page.querySelector<HTMLButtonElement>('.item')!.click();
    fixture.detectChanges();
    expect(signedOut).toBe(1);
    expect(page.querySelector('.menu')).toBeNull();
  });

  it('shows nothing when nobody is signed in', () => {
    user.set(null);
    const page = mount().nativeElement as HTMLElement;
    expect(page.querySelector('button')).toBeNull();
  });
});
