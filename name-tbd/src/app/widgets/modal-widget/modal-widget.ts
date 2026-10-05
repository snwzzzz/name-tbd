import { Component, ElementRef, afterNextRender, computed, inject } from '@angular/core';
import { LucideX } from '@lucide/angular';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { APP_SESSION } from '../../core/ports/app-ports';
import { ModalStateService } from '../../core/services/modal-state.service';
import { headerRowsOf } from '../../core/catalog/widget-catalog';
import { CELL_SIZE } from '../../_constants/artboard.constants';

/**
 * The title bar of a modal dialog (its header rows), with a close button; its widgets sit in its
 * nested grid below. While editing, the dialog is laid out on the page like a container; while the
 * app runs it's hidden until an "Open dialog" action opens it over the page. Escape closes the
 * topmost one, and opening one puts the keyboard in it.
 */
@Component({
  selector: 'app-modal-widget',
  imports: [LucideX],
  template: `
    <div class="titlebar" [style.height.px]="headerHeight">
      <span class="title" [id]="titleId()">{{ title() }}</span>
      <button type="button" class="close" aria-label="Close dialog" [attr.tabindex]="session.live() ? null : -1" (click)="close()">
        <svg lucideX aria-hidden="true"></svg>
      </button>
    </div>
  `,
  styleUrl: './modal-widget.scss',
  host: { '(document:keydown.escape)': 'onEscape()' },
})
export class ModalWidget extends BaseWidget {
  protected readonly session = inject(APP_SESSION);
  private readonly modals = inject(ModalStateService);

  readonly headerHeight = headerRowsOf('modal') * CELL_SIZE;
  readonly title = computed(() => this.text('title') ?? '');
  readonly titleId = computed(() => modalTitleId(this.id()));

  constructor() {
    super();
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    // Opened while the app runs: the keyboard goes into the dialog
    afterNextRender(() => {
      if (this.session.live() && this.modals.isOpen(this.id())) host.querySelector<HTMLElement>('.close')?.focus();
    });
  }

  close(): void {
    if (this.session.live()) this.modals.close(this.id());
  }

  onEscape(): void {
    if (this.session.live() && this.modals.top() === this.id()) this.modals.close(this.id());
  }
}

/** The id of a dialog's title, which names the dialog for screen readers. */
export const modalTitleId = (modalId: string): string => `modal-${modalId}-title`;
