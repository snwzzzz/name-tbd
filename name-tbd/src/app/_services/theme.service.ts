import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'theme';

/** Light/dark mode: saved in localStorage, applied as `data-theme` on <html>. */
@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(this.initialIsDark());

  constructor() {
    this.apply();
  }

  toggle(): void {
    this.isDark.update((dark) => !dark);
    this.apply();
  }

  private initialIsDark(): boolean {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? saved === 'dark' : (window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false);
  }

  private apply(): void {
    const dark = this.isDark();
    if (dark) document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light');
  }
}
