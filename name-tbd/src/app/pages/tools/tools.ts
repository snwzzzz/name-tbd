import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LucideBlocks, LucideDatabase, LucideLayoutTemplate } from '@lucide/angular';
import { UserMenu } from '../../components/user-menu/user-menu';

interface Tool {
  title: string;
  description: string;
  link: string;
}

/** The start page: the tools, one card each. They are separate apps that only share sign-in and the workspace. */
@Component({
  selector: 'app-tools',
  imports: [RouterLink, UserMenu, LucideLayoutTemplate, LucideBlocks, LucideDatabase],
  template: `
    <header class="bar">
      <h1>Tools</h1>
      <app-user-menu />
    </header>
    <main>
      <p class="intro">What do you want to work on?</p>
      <div class="grid">
        @for (tool of tools; track tool.link) {
          <a class="card" [routerLink]="tool.link">
            @switch (tool.link) {
              @case ('/console') { <svg lucideLayoutTemplate aria-hidden="true"></svg> }
              @case ('/simple') { <svg lucideBlocks aria-hidden="true"></svg> }
              @case ('/data') { <svg lucideDatabase aria-hidden="true"></svg> }
            }
            <strong>{{ tool.title }}</strong>
            <span>{{ tool.description }}</span>
          </a>
        }
      </div>
    </main>
  `,
  styles: `
    :host { display: block; min-height: 100vh; background: var(--color-bg-subtle); }
    .bar { display: flex; align-items: center; justify-content: space-between; height: 48px; padding: 0 1rem; background: var(--color-surface); border-bottom: 1px solid var(--color-border); }
    h1 { margin: 0; font-size: var(--font-size-lg); color: var(--color-text-primary); }
    main { max-width: 960px; margin: 0 auto; padding: 2rem 1rem; }
    .intro { margin: 0 0 1rem; color: var(--color-text-secondary); }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 0.75rem; }
    .card { display: flex; flex-direction: column; gap: 0.4rem; padding: 1.25rem; text-decoration: none; color: var(--color-text-primary);
      background: var(--color-surface); border: 1px solid var(--color-border); border-radius: 8px; }
    .card:hover, .card:focus-visible { border-color: var(--color-primary, #2f89ff); }
    .card svg { width: 24px; height: 24px; }
    .card span { font-size: var(--font-size-sm); color: var(--color-text-secondary); }
  `,
})
export class ToolsDashboard {
  readonly tools: Tool[] = [
    { title: 'Editor', description: 'Build applications with pages, widgets and workflows.', link: '/console' },
    { title: 'Simple builder', description: 'A simpler way to make an app.', link: '/simple' },
    { title: 'Data', description: 'Connect and manage your databases.', link: '/data' },
  ];
}
