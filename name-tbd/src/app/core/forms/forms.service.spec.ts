import { TestBed } from '@angular/core/testing';
import { FORM_EDIT_MODE, FormsService } from './forms.service';
import { fakeApp, provideFakeApp } from '../testing/fake-app';
import { InputValuesService } from '../services/input-values.service';
import { FieldErrorsService } from '../services/field-errors.service';
import { TableSelectionService } from '../services/table-selection.service';
import { WidgetEvent, WidgetEventsService } from '../services/widget-events.service';
import { SUBMIT_EVENT } from '../../_constants/widget-events.constants';
import { LayoutItem } from '../../_types/layout.types';

const PEOPLE = { id: 5, name: 'People', columns: ['name', 'age', 'member'], rows: [['Alice', '31', 'true']] };

/** A form saving into People: a required name, an age from 18, a "member" checkbox, a note that isn't saved; inside a card. */
const form = (props: Record<string, string> = {}): LayoutItem => ({
  id: 1, type: 'form', x: 0, y: 0, w: 30, h: 20, props: { dataSourceId: '5', successMessage: 'Thanks!', ...props },
  children: [
    { id: 2, parentId: 1, type: 'input', props: { field: 'name', required: 'true' } },
    { id: 3, parentId: 1, type: 'container', props: {}, children: [
      { id: 4, parentId: 3, type: 'number', props: { field: 'age', min: '18' } },
    ] },
    { id: 5, parentId: 1, type: 'checkbox', props: { field: 'member', checked: 'true' } },
    { id: 6, parentId: 1, type: 'textarea', props: {} },
    { id: 7, parentId: 1, type: 'button', props: { label: 'Save' } },
  ],
});

describe('FormsService', () => {
  const setup = (item: LayoutItem = form()) => {
    TestBed.configureTestingModule({ providers: provideFakeApp({ data: [PEOPLE], layouts: { p: [item, { id: 20, type: 'table', props: { dataSourceId: '5' } }] } }) });
    const fired: WidgetEvent[] = [];
    TestBed.inject(WidgetEventsService).events$.subscribe((e) => fired.push(e));
    return { forms: TestBed.inject(FormsService), values: TestBed.inject(InputValuesService), errors: TestBed.inject(FieldErrorsService), fired };
  };
  const rows = () => fakeApp().data.table(5)!.rows.map((r) => r.values);

  it('finds the form a widget is in, and its fields (also in nested containers)', () => {
    const { forms } = setup();
    expect(forms.formOf('p', '7')?.id).toBe(1);
    expect(forms.formOf('p', '20')).toBeNull();
    expect(forms.fields(form()).map((f) => f.id)).toEqual([2, 4, 5, 6]);
  });

  it('refuses to save while a field is wrong, saying why under each one', async () => {
    const { forms, values, errors } = setup();
    values.set('4', '12');

    expect(await forms.submit('p', '1')).toBe(false);
    expect(errors.error('2')).toBe('This field is required.');
    expect(errors.error('4')).toBe('Enter 18 or more.');
    expect(forms.message('1')).toEqual({ text: 'Please check the highlighted fields.', kind: 'error' });
    expect(rows()).toHaveLength(1);
  });

  it('adds a row from its fields (by column), then empties them and fires its submit trigger', async () => {
    const { forms, values, errors, fired } = setup();
    values.set('2', 'Bob');
    values.set('4', '45');
    values.set('6', 'not saved anywhere');

    expect(await forms.submit('p', '1')).toBe(true);
    // The checkbox wasn't touched: its initial value counts
    expect(rows()).toEqual([['Alice', '31', 'true'], ['Bob', '45', 'true']]);
    expect(values.get('2')).toBeUndefined();
    expect(errors.error('2')).toBeNull();
    expect(forms.message('1')).toEqual({ text: 'Thanks!', kind: 'success' });
    expect(fired).toEqual([{ pageId: 'p', elementId: '1', event: SUBMIT_EVENT }]);
  });

  it('edits the row selected in its table, keeping columns it has no field for', async () => {
    const { forms, values } = setup(form({ mode: FORM_EDIT_MODE, tableId: '20' }));
    values.set('2', 'Zed');
    expect(await forms.submit('p', '1')).toBe(false);
    expect(forms.message('1')?.text).toBe('Select a row to edit first.');

    const row = fakeApp().data.table(5)!.rows[0];
    TestBed.inject(TableSelectionService).ensureSelected('20', row.id, false);
    forms.showRow(form(), PEOPLE.columns, row);
    expect(values.get('2')).toBe('Alice');
    values.set('4', '32');

    expect(await forms.submit('p', '1')).toBe(true);
    expect(rows()).toEqual([['Alice', '32', 'true']]);
  });

  it('empties its fields and messages on reset', async () => {
    const { forms, values, errors } = setup();
    await forms.submit('p', '1');
    values.set('2', 'x');

    forms.reset('p', '1');
    expect(values.get('2')).toBeUndefined();
    expect(errors.error('2')).toBeNull();
    expect(forms.message('1')).toBeNull();
  });
});
