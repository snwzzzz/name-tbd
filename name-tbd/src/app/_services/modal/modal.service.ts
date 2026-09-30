import {
  Injectable,
  Injector,
  Type,
  inject,
  DOCUMENT,
  Renderer2,
  RendererFactory2,
} from '@angular/core';
import {
  Overlay,
  OverlayConfig,
  OverlayRef,
  GlobalPositionStrategy,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { FocusTrapFactory } from '@angular/cdk/a11y';
import { firstValueFrom } from 'rxjs';
import { ModalConfig, ConfirmOptions } from '../../_types/modal.types';
import { ModalRef, OpenModal } from './modal-ref';
import { MODAL_DATA, MODAL_REF } from './modal.tokens';
import { ConfirmDialog } from '../../components/confirm-dialog/confirm-dialog';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private readonly overlay = inject(Overlay);
  private readonly injector = inject(Injector);
  private readonly focusTrapFactory = inject(FocusTrapFactory);
  private readonly document = inject(DOCUMENT);
  private readonly rendererFactory = inject(RendererFactory2);
  private readonly renderer: Renderer2 = this.rendererFactory.createRenderer(null, null);

  /**
   * Internal stack of open modals to handle stacking z-indices, ESC, backdrop click,
   * aria-hidden backgrounds, and body scroll lock.
   */
  private readonly stack: OpenModal[] = [];

  private keydownListener: (() => void) | null = null;
  private readonly baseZIndex = 1100;
  private readonly stackIncrement = 10;

  /**
   * Opens a modal hosting the specified component.
   *
   * @param component The ComponentType to render
   * @param config Configuration options including data, sizing, and guards
   * @returns ModalRef strongly typed for return value R
   */
  open<T, D = unknown, R = unknown>(
    component: Type<T>,
    config: ModalConfig<D> = {}
  ): ModalRef<R, T> {
    const activeElementBeforeOpen = this.document.activeElement as HTMLElement | null;

    // 1. Create Overlay Configuration
    const overlayConfig = this._createOverlayConfig(config);
    const overlayRef = this.overlay.create(overlayConfig);

    // 2. Adjust z-index based on stack level
    const currentLevel = this.stack.length;
    const currentZIndex = this.baseZIndex + currentLevel * this.stackIncrement;
    const pane = overlayRef.overlayElement;
    pane.style.zIndex = `${currentZIndex + 1}`;
    if (overlayRef.backdropElement) {
      overlayRef.backdropElement.style.zIndex = `${currentZIndex}`;
    }

    // 3. Create ModalRef instance
    const modalRef = new ModalRef<R, T>(overlayRef, config);

    // 4. Create custom DI injector providing MODAL_DATA and MODAL_REF
    const customInjector = Injector.create({
      providers: [
        { provide: MODAL_DATA, useValue: config.data },
        { provide: MODAL_REF, useValue: modalRef },
        { provide: ModalRef, useValue: modalRef },
      ],
      parent: config.viewContainerRef?.injector ?? this.injector,
    });

    // 5. Instantiate component into Overlay portal
    const portal = new ComponentPortal(
      component,
      config.viewContainerRef,
      customInjector
    );
    const componentRef = overlayRef.attach(portal);
    componentRef.changeDetectorRef.detectChanges();

    // 6. Setup Accessibility & Role attributes
    pane.setAttribute('role', 'dialog');
    pane.setAttribute('aria-modal', 'true');
    if (config.ariaLabel) {
      pane.setAttribute('aria-label', config.ariaLabel);
    }
    if (config.ariaDescribedBy) {
      pane.setAttribute('aria-describedby', config.ariaDescribedBy);
    }

    // 7. Initialize Focus Trap
    const focusTrap = this.focusTrapFactory.create(pane);

    // 8. Bind Backdrop click to topmost modal only
    if (config.closeOnBackdropClick !== false) {
      overlayRef.backdropClick().subscribe(() => {
        if (this._isTopmost(modalRef)) {
          modalRef.close();
        }
      });
    }

    // 9. Push to stack and manage body scroll / aria-hidden
    modalRef._init(componentRef, focusTrap, activeElementBeforeOpen);
    this._pushToStack(modalRef);

    // 10. Clean up upon closure
    modalRef.afterClosed().subscribe(() => {
      this._removeFromStack(modalRef);
    });

    return modalRef;
  }

  /**
   * Convenience wrapper for simple yes/no or confirmation dialogs.
   * Resolves to `true` if confirmed, `false` if cancelled or dismissed.
   */
  async confirm(options: ConfirmOptions): Promise<boolean> {
    const modalRef = this.open<ConfirmDialog, ConfirmOptions, boolean>(
      ConfirmDialog,
      {
        data: options,
        width: options.width ?? '420px',
        closeOnBackdropClick: options.closeOnBackdropClick ?? !options.destructive,
        closeOnEscape: options.closeOnEscape ?? true,
        ariaLabel: options.title,
      }
    );

    const result = await firstValueFrom(modalRef.afterClosed());
    return result === true;
  }

  /**
   * Returns whether any modal is currently open.
   */
  hasOpenModals(): boolean {
    return this.stack.length > 0;
  }

  /**
   * Closes all currently open modals, respecting individual canClose guards.
   */
  async closeAll(): Promise<void> {
    const openModals = [...this.stack].reverse();
    for (const modal of openModals) {
      await modal.close();
    }
  }

  // ─── Private Helpers ────────────────────────────────────────────────────────

  private _createOverlayConfig(config: ModalConfig): OverlayConfig {
    const positionStrategy: GlobalPositionStrategy = this.overlay
      .position()
      .global()
      .centerHorizontally()
      .centerVertically();

    const panelClasses = ['app-modal-panel'];
    if (config.panelClass) {
      if (Array.isArray(config.panelClass)) {
        panelClasses.push(...config.panelClass);
      } else {
        panelClasses.push(config.panelClass);
      }
    }

    const backdropClasses = ['app-modal-backdrop'];
    if (config.backdropClass) {
      if (Array.isArray(config.backdropClass)) {
        backdropClasses.push(...config.backdropClass);
      } else {
        backdropClasses.push(config.backdropClass);
      }
    }

    return new OverlayConfig({
      hasBackdrop: true,
      backdropClass: backdropClasses,
      panelClass: panelClasses,
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.block(),
      width: config.width,
      maxWidth: config.maxWidth ?? '600px',
      minWidth: config.minWidth,
      height: config.height,
      maxHeight: config.maxHeight ?? '90vh',
      minHeight: config.minHeight,
    });
  }

  private _pushToStack(modalRef: OpenModal): void {
    if (this.stack.length === 0) {
      this._lockScroll();
      this._bindGlobalKeydown();
    }
    this.stack.push(modalRef);
    this._updateAriaHidden();
  }

  private _removeFromStack(modalRef: OpenModal): void {
    const index = this.stack.indexOf(modalRef);
    if (index !== -1) {
      this.stack.splice(index, 1);
    }

    this._updateAriaHidden();

    if (this.stack.length === 0) {
      this._unlockScroll();
      this._unbindGlobalKeydown();
    }
  }

  private _isTopmost(modalRef: OpenModal): boolean {
    return this.stack.length > 0 && this.stack[this.stack.length - 1] === modalRef;
  }

  private _bindGlobalKeydown(): void {
    if (this.keydownListener) return;
    this.keydownListener = this.renderer.listen(
      this.document,
      'keydown',
      (event: KeyboardEvent) => {
        if (event.key === 'Escape' && this.stack.length > 0) {
          const topModal = this.stack[this.stack.length - 1];
          if (topModal.config.closeOnEscape !== false) {
            event.preventDefault();
            event.stopPropagation();
            topModal.close();
          }
        }
      }
    );
  }

  private _unbindGlobalKeydown(): void {
    if (this.keydownListener) {
      this.keydownListener();
      this.keydownListener = null;
    }
  }

  private _lockScroll(): void {
    this.renderer.addClass(this.document.body, 'modal-open-scroll-locked');
  }

  private _unlockScroll(): void {
    this.renderer.removeClass(this.document.body, 'modal-open-scroll-locked');
  }

  private _updateAriaHidden(): void {
    const appRoot = this.document.querySelector('app-root');
    if (!appRoot) return;

    if (this.stack.length > 0) {
      this.renderer.setAttribute(appRoot, 'aria-hidden', 'true');
    } else {
      this.renderer.removeAttribute(appRoot, 'aria-hidden');
    }
  }
}
