import type { ActionExecutor, ActionResult, FlowData, FlowRun, FlowTable } from '../engine';
import type { CreateRowConfig, DeleteRowConfig, RowValue, UpdateRowConfig } from './configs';
import { cellText, rowIdOf, rowIdsOf } from '../data';

// Actions that change a data source's rows directly, with values from expressions (the table
// action instead asks the user in a form).

function data(run: FlowRun): FlowData {
  if (!run.host.data) throw new Error('Data is not available here');
  return run.host.data;
}

async function table(run: FlowRun, dataSourceId: string | undefined): Promise<{ id: number; table: FlowTable }> {
  const id = Number(dataSourceId);
  if (!dataSourceId || !Number.isFinite(id)) throw new Error('Choose a data source');
  return { id, table: await data(run).table(id) };
}

/** The values for the columns, each from its template (columns the data source doesn't have are an error). */
function columnValues(run: FlowRun, table: FlowTable, values: RowValue[] | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  for (const { column, value } of values ?? []) {
    if (!column) continue;
    if (!table.columns.includes(column)) throw new Error(`The data source has no column "${column}"`);
    result[column] = cellText(run.template(value ?? ''));
  }
  return result;
}

/** `create_row`: adds a row; columns without a value stay empty. */
export class CreateRowAction implements ActionExecutor {
  async run(run: FlowRun): Promise<ActionResult> {
    const config = run.node.config as Partial<CreateRowConfig>;
    const { id, table: source } = await table(run, config.dataSourceId);
    const values = columnValues(run, source, config.values);
    run.inputs({ dataSourceId: id, values });
    if (!run.isCurrent()) return { outcome: 'stop' };
    await data(run).addRow(id, source.columns.map((c) => values[c] ?? ''));
    return { output: values };
  }
}

/** `update_row`: changes the given columns of one row; the others keep their values. */
export class UpdateRowAction implements ActionExecutor {
  async run(run: FlowRun): Promise<ActionResult> {
    const config = run.node.config as Partial<UpdateRowConfig>;
    const { id, table: source } = await table(run, config.dataSourceId);
    const rowId = rowIdOf(run.template(config.row ?? ''));
    const row = source.rows.find((r) => r.id === rowId);
    if (!row) throw new Error(`There is no row ${rowId}`);
    const values = columnValues(run, source, config.values);
    run.inputs({ dataSourceId: id, row: rowId, values });
    if (!run.isCurrent()) return { outcome: 'stop' };
    await data(run).updateRow(id, rowId, source.columns.map((c, i) => values[c] ?? row.values[i] ?? ''));
    return { output: values };
  }
}

/** `delete_row`: deletes one row, or every row of a list. Rows that are gone already are left out. */
export class DeleteRowAction implements ActionExecutor {
  async run(run: FlowRun): Promise<ActionResult> {
    const config = run.node.config as Partial<DeleteRowConfig>;
    const { id, table: source } = await table(run, config.dataSourceId);
    const ids = rowIdsOf(run.template(config.row ?? '')).filter((rowId) => source.rows.some((r) => r.id === rowId));
    run.inputs({ dataSourceId: id, rows: ids });
    if (!run.isCurrent()) return { outcome: 'stop' };
    if (ids.length) await data(run).deleteRows(id, ids);
    return { output: ids.length };
  }
}
