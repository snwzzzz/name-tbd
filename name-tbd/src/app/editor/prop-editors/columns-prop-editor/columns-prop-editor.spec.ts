import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ColumnsPropEditor } from './columns-prop-editor';
import { DataSourceStateService } from '../../../_services/data-source-state.service';
import { SelectionService } from '../../../_services/selection.service';
import { WidgetPropDefinition } from '../../../_types/widget.types';
import { WidgetProps } from '../../../_types/layout.types';

const DEF: WidgetPropDefinition = { id: 1, widgetType: 'table', propKey: 'columns', propType: 'columns' as never, defaultValue: '[]' };

describe('ColumnsPropEditor', () => {
  let updates: WidgetProps[];

  const create = (props: WidgetProps) => {
    updates = [];
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DataSourceStateService,
          useValue: { sources: signal([{ id: 5, columns: ['a', 'b', 'c'] }]), ensureLoaded: () => {} },
        },
        { provide: SelectionService, useValue: { updateProps: (p: WidgetProps) => updates.push(p) } },
      ],
    });
    const fixture = TestBed.createComponent(ColumnsPropEditor);
    fixture.componentRef.setInput('def', DEF);
    fixture.componentRef.setInput('props', props);
    fixture.detectChanges();
    return fixture.componentInstance;
  };

  it('lists shown columns first, in their order, and all as shown when none are chosen', () => {
    expect(create({ dataSourceId: '5', columns: '["c","a"]' }).choices()).toEqual([
      { name: 'c', shown: true },
      { name: 'a', shown: true },
      { name: 'b', shown: false },
    ]);
    TestBed.resetTestingModule();
    expect(create({ dataSourceId: '5', columns: '[]' }).choices()?.every((c) => c.shown)).toBe(true);
  });

  it('stores the shown columns as JSON when toggled', () => {
    create({ dataSourceId: '5', columns: '[]' }).toggle('b');

    expect(updates.at(-1)).toEqual({ dataSourceId: '5', columns: '["a","c"]' });
  });

  it('has nothing to choose without a data source', () => {
    expect(create({ dataSourceId: '' }).choices()).toBeNull();
  });
});
