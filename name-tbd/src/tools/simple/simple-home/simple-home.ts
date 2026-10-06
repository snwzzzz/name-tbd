import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Placeholder for the simple builder, until it is designed. */
@Component({
  selector: 'app-simple-home',
  imports: [RouterLink],
  template: `
    <main>
      <a routerLink="/tools">← Tools</a>
      <h1>Simple builder</h1>
      <p>Coming soon.</p>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--color-bg-subtle); color: var(--color-text-primary); }
    main { max-width: 720px; margin: 0 auto; padding: 2rem 1rem; }
    a { color: var(--color-text-secondary); text-decoration: none; font-size: var(--font-size-sm); }
  `,
})
export class SimpleHome {}
