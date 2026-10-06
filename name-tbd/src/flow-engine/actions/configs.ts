// Settings of the actions the engine runs itself. Fields called "template" hold text with
// `{{ expression }}` parts (just `{{ … }}` gives the expression's own value, e.g. a number);
// fields called "expression" hold an expression without braces.

/** `set_variable`: gives a variable a new value. */
export interface SetVariableConfig {
  variable: string;
  /** Template. */
  value: string;
}

/** `loop`: runs its `each` branch for every item of a list, then goes on through `out`. */
export interface LoopConfig {
  /** Expression giving a list. */
  items: string;
  /** The name each item has in the branch (default `item`; `index` counts from 0). */
  as: string;
}

export interface HttpHeader {
  name: string;
  /** Template. */
  value: string;
}

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

/** `http_request`: calls a URL; the answer goes into a variable and is `response` for the nodes after it. */
export interface HttpRequestConfig {
  method: string;
  /** Template. */
  url: string;
  headers: HttpHeader[];
  /** Template; a list or object is sent as JSON. Empty: no body. */
  body: string;
  /** The variable the answer's content goes into (empty: none). */
  resultVariable: string;
}

/** A value for one column of a row. */
export interface RowValue {
  column: string;
  /** Template. */
  value: string;
}

/** `create_row`: adds a row to a data source. */
export interface CreateRowConfig {
  dataSourceId: string;
  values: RowValue[];
}

/** `update_row`: changes some columns of a row. */
export interface UpdateRowConfig {
  dataSourceId: string;
  /** Template giving the row (e.g. `{{ orders.selectedRow }}`) or its id. */
  row: string;
  values: RowValue[];
}

/** `delete_row`: deletes a row, or a list of rows. */
export interface DeleteRowConfig {
  dataSourceId: string;
  /** Template giving the row(s) or their ids. */
  row: string;
}
