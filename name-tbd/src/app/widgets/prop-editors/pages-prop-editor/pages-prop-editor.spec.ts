import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PagesPropEditor } from './pages-prop-editor';
import { PagesStateService } from '../../../_services/pages-state.service';
import { SelectionService } from '../../../_services/selection.service';
import { WidgetPropDefinition } from '../../../_types/widget.types';
import { WidgetProps } from '../../../_types/layout.types';

const DEF = { id: 1, widgetType: 'nav', propKey: 'pages', propType: 'pages', defaultValue: '[]' } as unknown as WidgetPropDefinition;

describe('PagesPropEditor', () => {
  let updates: WidgetProps[];

  const create = (props: WidgetProps) => {
    updates = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PagesStateService,
          useValue: { ensureLoaded: () => {}, contentPages: signal([{ id: 1, name: 'Home' }, { id: 2, name: 'About' }, { id: 3, name: 'Contact' }]) },
        },
        { provide: SelectionService, useValue: { updateProps: (p: WidgetProps) => updates.push(p) } },
      ],
    });
    const fixture = TestBed.createComponent(PagesPropEditor);
    fixture.componentRef.setInput('def', DEF);
    fixture.componentRef.setInput('props', props);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  it('lists the chosen pages first, in their order, then the others', () => {
    expect(create({ pages: '["3","1"]' }).items()).toEqual([
      { id: '3', label: 'Contact', checked: true },
      { id: '1', label: 'Home', checked: true },
      { id: '2', label: 'About', checked: false },
    ]);
  });

  it('stores the checked pages as JSON, in list order', () => {
    const editor = create({ pages: '[]' });
    editor.save([
      { id: '2', label: 'About', checked: true },
      { id: '1', label: 'Home', checked: false },
      { id: '3', label: 'Contact', checked: true },
    ]);
    expect(updates.at(-1)).toEqual({ pages: '["2","3"]' });
  });
});
