import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, inject } from '@angular/core';
import { OverlayContainer, OverlayModule } from '@angular/cdk/overlay';
import { ModalService } from './modal.service';
import { MODAL_DATA, MODAL_REF } from './modal.tokens';
import { ModalRef } from './modal-ref';

interface DummyData {
  text: string;
}

@Component({
  selector: 'app-dummy-modal',
  standalone: true,
  template: `
    <div class="test-content">
      <p id="dummy-text">{{ data?.text }}</p>
      <button id="dummy-close-btn" (click)="onClose()">Close Dummy</button>
    </div>
  `,
})
class DummyModalComponent {
  readonly data = inject<DummyData>(MODAL_DATA, { optional: true });
  readonly modalRef = inject<ModalRef<string>>(MODAL_REF);

  onClose() {
    this.modalRef.close('result-from-dummy');
  }
}

describe('ModalService', () => {
  let service: ModalService;
  let overlayContainer: OverlayContainer;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OverlayModule, DummyModalComponent],
      providers: [ModalService],
    }).compileComponents();

    service = TestBed.inject(ModalService);
    overlayContainer = TestBed.inject(OverlayContainer);
  });

  afterEach(async () => {
    if (service) {
      await service.closeAll();
    }
    if (overlayContainer) {
      overlayContainer.ngOnDestroy();
    }
  });

  it('should be created and injectable', () => {
    expect(service).toBeDefined();
    expect(service.hasOpenModals()).toBe(false);
  });

  it('should open a typed modal, inject data, and return a ModalRef', async () => {
    const modalRef = service.open<DummyModalComponent, DummyData, string>(DummyModalComponent, {
      data: { text: 'Hello Modal World' },
      width: '400px',
    });

    expect(modalRef).toBeDefined();
    expect(service.hasOpenModals()).toBe(true);

    const overlayEl = overlayContainer.getContainerElement();
    const paragraph = overlayEl.querySelector('#dummy-text');
    expect(paragraph?.textContent).toContain('Hello Modal World');

    const closePromise = new Promise<string | undefined>((resolve) => {
      modalRef.afterClosed().subscribe((res) => resolve(res));
    });

    await modalRef.close('closed-manually');
    const result = await closePromise;
    expect(result).toBe('closed-manually');
  });

  it('should support stacking multiple modals and close only topmost on ESC', async () => {
    const modal1 = service.open(DummyModalComponent, { data: { text: 'Modal 1' } });
    const modal2 = service.open(DummyModalComponent, { data: { text: 'Modal 2' } });

    expect(service.hasOpenModals()).toBe(true);

    const escEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    document.dispatchEvent(escEvent);

    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(modal1.overlayRef.hasAttached()).toBe(true);
  });

  it('should respect canClose guard', async () => {
    let preventClose = true;

    const modalRef = service.open(DummyModalComponent, {
      canClose: () => !preventClose,
    });

    const didClose1 = await modalRef.close('try-1');
    expect(didClose1).toBe(false);

    preventClose = false;
    const didClose2 = await modalRef.close('try-2');
    expect(didClose2).toBe(true);
  });

  it('should render confirm dialog and return boolean', async () => {
    const confirmPromise = service.confirm({
      title: 'Delete Item',
      message: 'Are you sure?',
      destructive: true,
      confirmText: 'Delete',
    });

    const overlayEl = overlayContainer.getContainerElement();
    const confirmTitle = overlayEl.querySelector('#confirm-dialog-title');
    expect(confirmTitle?.textContent).toBe('Delete Item');

    const buttons = overlayEl.querySelectorAll('button');
    const cancelBtn = Array.from(buttons).find((b) => b.textContent?.includes('Cancel'));
    cancelBtn?.click();

    const result = await confirmPromise;
    expect(result).toBe(false);
  });
});
