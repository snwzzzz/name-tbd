import { TestBed } from '@angular/core/testing';
import { RowFormModal, RowFormModalData } from './row-form-modal';
import { MODAL_DATA, MODAL_REF } from '../../_services/modal/modal.tokens';

describe('RowFormModal', () => {
  let closedWith: unknown;

  const create = (data: RowFormModalData) => {
    closedWith = 'open';
    TestBed.configureTestingModule({
      providers: [
        { provide: MODAL_DATA, useValue: data },
        { provide: MODAL_REF, useValue: { close: (v?: unknown) => (closedWith = v) } },
      ],
    });
    const fixture = TestBed.createComponent(RowFormModal);
    fixture.detectChanges();
    return fixture;
  };

  const data: RowFormModalData = {
    title: 'Edit',
    submitText: 'Save',
    fields: [
      { name: 'name', type: 'text' },
      { name: 'age', type: 'number' },
      { name: 'active', type: 'boolean' },
      { name: 'born', type: 'date' },
    ],
    values: ['Alice', '30', 'true', '1990-05-01'],
  };

  it('uses an input suited to each column type, filled with the row', () => {
    const fixture = create(data);
    const inputs = [...fixture.nativeElement.querySelectorAll('input')] as HTMLInputElement[];

    expect(inputs.map((i) => i.type)).toEqual(['text', 'number', 'checkbox', 'date']);
    expect(inputs[0].value).toBe('Alice');
    expect(inputs[2].checked).toBe(true);
  });

  it('closes with the edited values, but not while a number is invalid', () => {
    const modal = create(data).componentInstance;
    modal.set(1, 'abc');
    modal.submit();
    expect(closedWith).toBe('open');
    expect(modal.errors()[1]).toBeTruthy();

    modal.set(1, '31');
    modal.submit();
    expect(closedWith).toEqual(['Alice', '31', 'true', '1990-05-01']);
  });

  it('closes with nothing when cancelled', () => {
    create(data).componentInstance.cancel();
    expect(closedWith).toBeUndefined();
  });
});
