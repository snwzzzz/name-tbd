import { OverlayRef } from '@angular/cdk/overlay';
import { FocusTrap } from '@angular/cdk/a11y';
import { ComponentRef } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { ModalConfig } from './modal.types';

export class ModalRef<R = unknown, T = unknown> {
  private readonly _afterClosed = new Subject<R | undefined>();
  private readonly _afterOpened = new Subject<void>();

  private _componentInstance: T | null = null;
  private _componentRef: ComponentRef<T> | null = null;
  private _focusTrap: FocusTrap | null = null;
  private _previouslyFocusedElement: HTMLElement | null = null;
  private _isClosing = false;

  constructor(
    private readonly _overlayRef: OverlayRef,
    private readonly _config: ModalConfig
  ) {}

  /**
   * Internal initialization when overlay and component are attached.
   */
  _init(
    componentRef: ComponentRef<T>,
    focusTrap: FocusTrap,
    previouslyFocusedElement: HTMLElement | null
  ): void {
    this._componentRef = componentRef;
    this._componentInstance = componentRef.instance;
    this._focusTrap = focusTrap;
    this._previouslyFocusedElement = previouslyFocusedElement;

    // Focus the initial element inside the trap safely
    try {
      this._focusTrap?.focusInitialElementWhenReady();
    } catch {
      // safe fallback if in headless/testing environment without layout
    }
    this._afterOpened.next();
    this._afterOpened.complete();
  }

  get componentInstance(): T | null {
    return this._componentInstance;
  }

  get overlayRef(): OverlayRef {
    return this._overlayRef;
  }

  get config(): ModalConfig {
    return this._config;
  }

  /**
   * Observable that emits when the modal has opened and focus has been initialized.
   */
  afterOpened(): Observable<void> {
    return this._afterOpened.asObservable();
  }

  /**
   * Observable that emits with the dialog result when the modal is closed.
   */
  afterClosed(): Observable<R | undefined> {
    return this._afterClosed.asObservable();
  }

  /**
   * Closes the modal with an optional result after checking the `canClose` guard.
   * Returns a promise resolving to whether closure actually occurred.
   */
  async close(result?: R): Promise<boolean> {
    if (this._isClosing) {
      return false;
    }

    if (this._config.canClose) {
      try {
        const canProceed = await this._config.canClose();
        if (!canProceed) {
          return false;
        }
      } catch (err) {
        console.error('Modal canClose guard rejected:', err);
        return false;
      }
    }

    this._isClosing = true;
    this._destroyModal(result);
    return true;
  }

  /**
   * Directly tears down the modal without checking `canClose`.
   * Useful when an unsaved change guard or force-close action confirms dismissal.
   */
  forceClose(result?: R): void {
    if (this._isClosing) {
      return;
    }
    this._isClosing = true;
    this._destroyModal(result);
  }

  private _destroyModal(result?: R): void {
    const pane = this._overlayRef.overlayElement;
    const backdrop = this._overlayRef.backdropElement;

    // Add exit animation classes
    pane?.classList.add('app-modal-exit');
    backdrop?.classList.add('app-modal-backdrop-exit');

    const finalize = () => {
      try {
        this._focusTrap?.destroy();
        this._overlayRef.dispose();
      } catch (e) {
        // Overlay might already be disposed
      }

      if (this._config.restoreFocus !== false && this._previouslyFocusedElement) {
        this._previouslyFocusedElement.focus();
      }

      this._afterClosed.next(result);
      this._afterClosed.complete();
    };

    // If reduced motion is preferred or animations are instant, finish quickly
    const isReducedMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isReducedMotion || typeof window === 'undefined') {
      finalize();
    } else {
      // Allow CSS exit animation to complete (150ms)
      setTimeout(finalize, 150);
    }
  }
}
