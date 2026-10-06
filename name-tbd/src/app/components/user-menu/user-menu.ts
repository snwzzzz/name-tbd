import { Component, ElementRef, HostListener, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../_services/auth.service';

/** The signed-in user's avatar; opens a menu with who they are and "Sign out". */
@Component({
  selector: 'app-user-menu',
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss',
})
export class UserMenu {
  private readonly auth = inject(AuthService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly user = this.auth.user;
  readonly open = signal(false);
  /** The picture failed to load (e.g. blocked): show initials instead. */
  readonly pictureFailed = signal(false);

  readonly name = computed(() => {
    const user = this.user();
    return [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.email || '';
  });
  readonly initials = computed(() =>
    this.name()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join(''),
  );

  toggle(): void {
    this.open.update((open) => !open);
  }

  signOut(): void {
    this.open.set(false);
    this.auth.signOut();
  }

  @HostListener('document:pointerdown', ['$event'])
  closeOnOutsideClick(event: PointerEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.open.set(false);
  }
}
