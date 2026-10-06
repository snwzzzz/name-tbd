import { TestBed } from '@angular/core/testing';
import { ModalWidget } from './modal-widget';
import { mountWidget } from '../../core/testing/widget-testing';
import { ModalStateService } from '../../core/services/modal-state.service';

describe('ModalWidget', () => {
  it('closes from its close button or Escape while the app runs (the topmost dialog only)', () => {
    const { el, goLive } = mountWidget(ModalWidget, { title: 'Edit order' });
    const modals = TestBed.inject(ModalStateService);
    expect(el.querySelector('.title')?.textContent).toBe('Edit order');
    modals.show('7');

    // While editing it stays (it's laid out like a container)
    el.querySelector<HTMLButtonElement>('.close')!.click();
    expect(modals.isOpen('7')).toBe(true);

    goLive();
    modals.show('8');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modals.isOpen('7')).toBe(true);

    modals.close('8');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(modals.isOpen('7')).toBe(false);
  });
});
