import { Component, Type, inject, resource } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { panelTab } from '../../_constants/sidebar-tabs.constants';

/**
 * A sidebar panel (e.g. Data) opened as a tab of its own (`/editor/panel-<id>/panel`): its own tab
 * design if it has one (loadTabComponent), else the panel itself with a tab's room. Only for panels
 * that allow it (see openInTab).
 */
@Component({
  selector: 'app-panel-page',
  imports: [NgComponentOutlet],
  template: `
    @if (panel(); as panel) {
      @if (panel.loadTabComponent) {
        <!-- Its own design for a whole tab -->
        @if (tabComponent.value(); as component) {
          <ng-container *ngComponentOutlet="component" />
        } @else if (tabComponent.error()) {
          <p class="missing">This panel couldn't be loaded.</p>
        } @else {
          <p class="missing"><span class="ui-spinner"></span> Loading…</p>
        }
      } @else {
        <div class="panel-page">
          <div class="panel-frame">
            <ng-container *ngComponentOutlet="panel.component" />
          </div>
        </div>
      }
    } @else {
      <p class="missing">This panel can't be opened in a tab.</p>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
    }

    .panel-page {
      height: 100%;
      box-sizing: border-box;
      padding: 1.5rem;
      background: var(--color-bg);
    }

    .panel-frame {
      max-width: 64rem;
      height: 100%;
      margin: 0 auto;
      overflow: hidden;
      border: 1px solid var(--color-border);
      border-radius: 0.5rem;
      background: var(--color-surface);
    }

    .missing {
      padding: 1.5rem;
      color: var(--color-text-secondary);
    }
  `,
})
export class PanelPage {
  /** The panel, from the tab id (`panel-<panel id>`). */
  readonly panel = toSignal(
    inject(ActivatedRoute).paramMap.pipe(map((params) => panelTab((params.get('tabId') ?? '').replace(/^panel-/, '')))),
    { initialValue: undefined },
  );

  /** The panel's own tab design, loaded on first use. */
  readonly tabComponent = resource<Type<unknown> | undefined, (() => Promise<Type<unknown>>) | undefined>({
    params: () => this.panel()?.loadTabComponent,
    loader: ({ params: load }) => load(),
  });
}
