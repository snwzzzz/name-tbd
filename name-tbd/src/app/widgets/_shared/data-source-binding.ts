import { Signal, computed, effect, inject } from '@angular/core';
import { APP_DATA } from '../../core/ports/app-ports';
import { TableData } from '../../_types/data-source.types';
import { WidgetProps } from '../../_types/layout.types';
import { propNumber, propText } from '../../_utils/widget-props.utils';

/** A widget's data source (picked in its `dataSourceId` prop): its id, and its rows once loaded. */
export interface DataSourceBinding {
  readonly id: Signal<number | null>;
  /** The rows; null until loaded (or when none is picked). */
  readonly table: Signal<TableData | null>;
}

/** Binds a widget to the data source its props pick, loading its rows. Call it while the widget is created. */
export function bindDataSource(props: Signal<WidgetProps>, key = 'dataSourceId'): DataSourceBinding {
  const data = inject(APP_DATA);
  const id = computed(() => {
    const value = propNumber(props(), key, NaN);
    return Number.isInteger(value) ? value : null;
  });
  const table = computed(() => {
    const value = id();
    return value === null ? null : data.table(value);
  });
  effect(() => {
    const value = id();
    if (value !== null) data.ensureTable(value);
  });
  return { id, table };
}

/** The index of the column a prop names (e.g. `labelColumn`), or -1. */
export function columnIndex(table: TableData | null, props: WidgetProps, key: string): number {
  const name = propText(props, key);
  return name && table ? table.columns.indexOf(name) : -1;
}
