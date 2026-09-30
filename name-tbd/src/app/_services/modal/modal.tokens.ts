import { InjectionToken } from '@angular/core';
import { ModalRef } from './modal-ref';

/**
 * Injection token for passing strongly-typed arbitrary input data into a modal component.
 */
export const MODAL_DATA = new InjectionToken<unknown>('MODAL_DATA');

/**
 * Injection token for accessing the current ModalRef inside the hosted modal component.
 */
export const MODAL_REF = new InjectionToken<ModalRef<unknown>>('MODAL_REF');
