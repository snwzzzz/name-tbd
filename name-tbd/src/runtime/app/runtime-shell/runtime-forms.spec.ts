import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RuntimeShell } from './runtime-shell';
import { runtimeConfig } from '../runtime.config';
import { APP_DEFINITION_VERSION, AppDefinition } from '../../../app/core/definition/app-definition';
import { APP_DATA } from '../../../app/core/ports/app-ports';
import { CLICK_EVENT } from '../../../app/_constants/widget-events.constants';
import { LayoutItem } from '../../../app/_types/layout.types';

// Forms, dialogs and tabs in the exported app, end to end: definition in, clicks and typing on the
// page, rows saved into the app's data.

const flush = () => new Promise((resolve) => setTimeout(resolve));

/** Home: a table of people and a form beside it; a dialog a button opens; tabs with a widget on each. */
function definition(formProps: Record<string, string> = {}): AppDefinition {
  const components: LayoutItem[] = [
    { id: 20, type: 'table', x: 0, y: 0, w: 30, h: 12, props: { dataSourceId: '5', columns: '[]' } },
    {
      id: 30, type: 'form', x: 40, y: 0, w: 30, h: 20, props: { dataSourceId: '5', successMessage: 'Saved!', ...formProps },
      children: [
        { id: 31, parentId: 30, type: 'input', x: 0, y: 0, w: 20, h: 4, props: { label: 'Name', field: 'name', required: 'true', searchIcon: 'false', debounceMs: '0' } },
        { id: 32, parentId: 30, type: 'number', x: 0, y: 5, w: 20, h: 4, props: { label: 'Age', field: 'age', min: '0', max: '130' } },
        { id: 33, parentId: 30, type: 'button', x: 0, y: 10, w: 7, h: 3, props: { label: 'Save' } },
      ],
    },
    { id: 40, type: 'button', x: 0, y: 30, w: 7, h: 3, props: { label: 'Help', formAction: 'Nothing' } },
    { id: 50, type: 'modal', x: 0, y: 40, w: 30, h: 12, props: { title: 'Help' }, children: [
      { id: 51, parentId: 50, type: 'label', x: 0, y: 0, w: 10, h: 3, props: { text: 'Call us' } },
    ] },
    { id: 60, type: 'tabs', x: 40, y: 30, w: 30, h: 12, props: { tabs: 'First\nSecond' }, children: [
      { id: 61, parentId: 60, type: 'label', x: 0, y: 0, w: 10, h: 3, props: { text: 'On first' } },
      { id: 62, parentId: 60, type: 'label', x: 0, y: 0, w: 10, h: 3, props: { text: 'On second', tab: '1' } },
    ] },
  ];
  return {
    version: APP_DEFINITION_VERSION,
    app: { id: 71, name: 'Forms' },
    dataRevision: 'r1',
    homePageId: 1,
    pages: [{
      id: 1, name: 'Home', path: '/', layout: false, components,
      workflow: {
        nodes: [
          { id: 100, type: 'Trigger', props: { triggerType: 'element_click', elementId: '40', eventName: CLICK_EVENT } },
          { id: 101, type: 'Action', props: { actionType: 'open_modal', config: { modalId: '50' } } },
        ],
        edges: [{ id: 200, sourceNodeId: 100, sourcePort: 'out', targetNodeId: 101 }],
      },
    }],
    dataSources: [{ id: 5, name: 'People', columns: ['name', 'age'], rows: [['Alice', '31'], ['Bob', '45']] }],
  };
}

describe('Forms, dialogs and tabs in the exported app', () => {
  const start = async (def: AppDefinition) => {
    TestBed.configureTestingModule({ providers: runtimeConfig(def).providers });
    const fixture = TestBed.createComponent(RuntimeShell);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    document.body.appendChild(el);
    const settle = async () => {
      await flush();
      await fixture.whenStable();
    };
    const type = (label: string, value: string) => {
      const input = [...el.querySelectorAll<HTMLInputElement>('input')].find((i) => el.querySelector(`label[for="${i.id}"]`)?.textContent?.includes(label))!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    const click = (label: string) => [...el.querySelectorAll<HTMLElement>('app-button-widget')].find((b) => b.textContent?.includes(label))!.click();
    const people = () => TestBed.inject(APP_DATA).table(5)!.rows.map((r) => r.values);
    await settle();
    return { el, settle, type, click, people };
  };

  beforeEach(() => localStorage.clear());
  afterEach(() => document.body.replaceChildren());

  it('checks the fields, then adds a row and empties the form', async () => {
    const { el, settle, type, click, people } = await start(definition());

    click('Save');
    await settle();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('This field is required.');
    expect(el.textContent).toContain('Please check the highlighted fields.');
    expect(people()).toHaveLength(2);

    type('Name', 'Carol');
    type('Age', '200');
    await settle();
    // Fixing the name took its error away; the age is now out of range
    click('Save');
    await settle();
    expect([...el.querySelectorAll('[role="alert"]')].map((a) => a.textContent?.trim())).toEqual(['Enter 130 or less.']);

    type('Age', '28');
    click('Save');
    await settle();
    expect(people()).toEqual([['Alice', '31'], ['Bob', '45'], ['Carol', '28']]);
    expect(el.textContent).toContain('Saved!');
    expect(el.querySelector('app-table-widget')?.textContent).toContain('Carol');
    expect([...el.querySelectorAll<HTMLInputElement>('app-form-widget ~ * input, input')].every((i) => i.value === '')).toBe(true);
  });

  it('edits the row selected in the table', async () => {
    const { el, settle, type, click, people } = await start(definition({ mode: 'Edit the selected row', tableId: '20' }));

    el.querySelectorAll<HTMLElement>('app-table-widget tbody tr')[1].click();
    await settle();
    const name = el.querySelector<HTMLInputElement>('app-input-widget input')!;
    expect(name.value).toBe('Bob');

    type('Age', '46');
    click('Save');
    await settle();
    expect(people()).toEqual([['Alice', '31'], ['Bob', '46']]);
  });

  it('opens a dialog from a workflow, over the page, and closes it from its backdrop', async () => {
    const { el, settle, click } = await start(definition());
    expect(el.textContent).not.toContain('Call us');

    click('Help');
    await settle();
    const dialog = el.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(el.querySelector('#' + dialog.getAttribute('aria-labelledby'))?.textContent).toBe('Help');
    expect(dialog.textContent).toContain('Call us');

    el.querySelector<HTMLElement>('.modal-backdrop')!.click();
    await settle();
    expect(el.querySelector('[role="dialog"]')).toBeNull();
  });

  it('shows the widgets of the tab picked', async () => {
    const { el, settle } = await start(definition());
    expect(el.textContent).toContain('On first');
    expect(el.textContent).not.toContain('On second');

    el.querySelectorAll<HTMLElement>('[role="tab"]')[1].click();
    await settle();
    expect(el.textContent).toContain('On second');
    expect(el.textContent).not.toContain('On first');
  });
});
