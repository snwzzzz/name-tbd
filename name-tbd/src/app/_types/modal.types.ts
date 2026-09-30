import { ViewContainerRef } from '@angular/core';
import { ButtonColor } from './button.types';

export interface ModalConfig<D = unknown> {
  /** Strongly typed input data provided to the modal component via MODAL_DATA */
  data?: D;
  /** Width of the modal panel (e.g., '480px', '90vw') */
  width?: string;
  /** Maximum width of the modal panel (default: '600px') */
  maxWidth?: string;
  /** Minimum width of the modal panel */
  minWidth?: string;
  /** Height of the modal panel */
  height?: string;
  /** Maximum height of the modal panel (default: '90vh') */
  maxHeight?: string;
  /** Minimum height of the modal panel */
  minHeight?: string;
  /** Additional custom CSS class(es) on the modal container pane */
  panelClass?: string | string[];
  /** Additional custom CSS class(es) on the overlay backdrop */
  backdropClass?: string | string[];
  /** Whether clicking the backdrop closes the topmost modal (default: true) */
  closeOnBackdropClick?: boolean;
  /** Whether pressing ESC closes the topmost modal (default: true) */
  closeOnEscape?: boolean;
  /**
   * Guard callback checked before modal is closed (e.g. for unsaved changes confirmation).
   * Return false or a resolved false Promise to prevent closing.
   */
  canClose?: () => boolean | Promise<boolean>;
  /** Accessible label applied as aria-label on the dialog panel */
  ariaLabel?: string;
  /** Optional element ID containing the dialog description for aria-describedby */
  ariaDescribedBy?: string;
  /** Custom ViewContainerRef if component instantiation needs a specific DI tree */
  viewContainerRef?: ViewContainerRef;
  /** Whether to restore focus to the previously active element upon closure (default: true) */
  restoreFocus?: boolean;
}

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  /** Only the confirm button, e.g. for a notice. */
  hideCancel?: boolean;
  confirmColor?: ButtonColor;
  destructive?: boolean;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  width?: string;
}
