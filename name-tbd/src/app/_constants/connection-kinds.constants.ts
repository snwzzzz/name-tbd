/**
 * The kinds of system data sources can live in (the backend's DataConnector beans), as the editor's
 * "Connect data" dialog offers them: the fields of a connection to one, and what a data source reads
 * there. A new kind of connection is added here (and as a connector on the backend).
 */

export interface ConnectionFieldOption {
  value: string;
  label: string;
}

export interface ConnectionField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'password' | 'checkbox' | 'select';
  /** Part of the connection's secret (encrypted on the server, never shown again). */
  secret?: boolean;
  required?: boolean;
  placeholder?: string;
  default?: string | number | boolean;
  options?: ConnectionFieldOption[];
  help?: string;
  /** Offer the values the connection lists (tables, sheets, lists) for the settings chosen so far. */
  targets?: boolean;
  /** Only shown when another setting has one of these values. */
  showIf?: { key: string; values: string[] };
}

export type KeyColumnRule = 'required' | 'optional' | 'none';

export interface ConnectionKind {
  kind: string;
  label: string;
  description: string;
  /** Connected by signing in at a provider (OAuth), not with a form. */
  signIn?: 'google' | 'microsoft';
  connectionFields: ConnectionField[];
  sourceFields: ConnectionField[];
  /** Whether a data source needs a key column, may have one, or never has one (the system has row ids). */
  keyColumn: KeyColumnRule | ((settings: Record<string, unknown>) => KeyColumnRule);
  keyHelp: string;
}

const DATABASE_FIELDS = (port: number, schema: boolean): ConnectionField[] => [
  { key: 'host', label: 'Host', type: 'text', required: true, placeholder: 'db.example.com' },
  { key: 'port', label: 'Port', type: 'number', default: port },
  { key: 'database', label: 'Database', type: 'text', required: true },
  ...(schema ? [{ key: 'schema', label: 'Schema', type: 'text', default: 'public' } as ConnectionField] : []),
  { key: 'user', label: 'User', type: 'text', required: true, help: 'Best a user that can only use the tables apps need.' },
  { key: 'password', label: 'Password', type: 'password', secret: true },
  { key: 'ssl', label: 'Encrypted connection (SSL)', type: 'checkbox', default: true },
];

export const CONNECTION_KINDS: ConnectionKind[] = [
  {
    kind: 'gsheets',
    label: 'Google Sheets',
    description: 'A sheet of a Google spreadsheet. Sign in with the Google account that can open it.',
    signIn: 'google',
    connectionFields: [],
    sourceFields: [
      { key: 'spreadsheet', label: 'Spreadsheet link', type: 'text', required: true, placeholder: 'https://docs.google.com/spreadsheets/d/…' },
      { key: 'sheet', label: 'Sheet', type: 'select', targets: true, help: 'Row 1 holds the column names.' },
    ],
    keyColumn: 'optional',
    keyHelp: 'A column with a unique value per row. Without one, the app adds an “_id” column to the sheet.',
  },
  {
    kind: 'postgres',
    label: 'PostgreSQL',
    description: 'A table of a PostgreSQL database that this server can reach.',
    connectionFields: DATABASE_FIELDS(5432, true),
    sourceFields: [{ key: 'table', label: 'Table', type: 'select', required: true, targets: true }],
    keyColumn: 'optional',
    keyHelp: 'Without one, the table’s primary key.',
  },
  {
    kind: 'mysql',
    label: 'MySQL',
    description: 'A table of a MySQL or MariaDB database that this server can reach.',
    connectionFields: DATABASE_FIELDS(3306, false),
    sourceFields: [{ key: 'table', label: 'Table', type: 'select', required: true, targets: true }],
    keyColumn: 'optional',
    keyHelp: 'Without one, the table’s primary key.',
  },
  {
    kind: 'msgraph',
    label: 'Microsoft 365',
    description: 'A table in an Excel workbook (OneDrive, SharePoint) or a SharePoint list. Sign in with a work account.',
    signIn: 'microsoft',
    connectionFields: [],
    sourceFields: [
      { key: 'type', label: 'What', type: 'select', default: 'excel', options: [
        { value: 'excel', label: 'A table in an Excel workbook' },
        { value: 'list', label: 'A SharePoint list' },
      ] },
      { key: 'file', label: 'Workbook', type: 'text', required: true, placeholder: '/Documents/orders.xlsx',
        help: 'Its path in your OneDrive.', showIf: { key: 'type', values: ['excel'] } },
      { key: 'table', label: 'Table', type: 'select', required: true, targets: true, showIf: { key: 'type', values: ['excel'] } },
      { key: 'site', label: 'Site', type: 'text', required: true, placeholder: 'contoso.sharepoint.com:/sites/sales',
        showIf: { key: 'type', values: ['list'] } },
      { key: 'list', label: 'List', type: 'select', required: true, targets: true, showIf: { key: 'type', values: ['list'] } },
    ],
    keyColumn: (settings) => (settings['type'] === 'list' ? 'none' : 'required'),
    keyHelp: 'Excel tables need a column with a unique value per row. SharePoint lists have their own ids.',
  },
  {
    kind: 'rest',
    label: 'REST API',
    description: 'Any JSON API whose records are rows, e.g. your own backend.',
    connectionFields: [
      { key: 'baseUrl', label: 'Base URL', type: 'text', required: true, placeholder: 'https://api.example.com/v1' },
      { key: 'authHeader', label: 'Auth header', type: 'text', default: 'Authorization' },
      { key: 'authValue', label: 'Auth value', type: 'password', secret: true, placeholder: 'Bearer …',
        help: 'Sent with every request. Stored encrypted; it never reaches apps.' },
    ],
    sourceFields: [
      { key: 'path', label: 'Path', type: 'text', required: true, placeholder: '/orders' },
      { key: 'recordsPath', label: 'Records in the answer at', type: 'text', placeholder: 'data.items', help: 'Empty: the answer is the list.' },
      { key: 'pagination', label: 'Pages', type: 'select', default: 'none', options: [
        { value: 'none', label: 'All at once' },
        { value: 'page', label: 'Page number' },
        { value: 'offset', label: 'Offset and limit' },
        { value: 'cursor', label: 'Cursor' },
        { value: 'link', label: 'Link header' },
      ] },
      { key: 'pageSize', label: 'Page size', type: 'number', default: 100, showIf: { key: 'pagination', values: ['page', 'offset'] } },
      { key: 'pageParam', label: 'Page parameter', type: 'text', default: 'page', showIf: { key: 'pagination', values: ['page'] } },
      { key: 'sizeParam', label: 'Size parameter', type: 'text', default: 'per_page', showIf: { key: 'pagination', values: ['page'] } },
      { key: 'offsetParam', label: 'Offset parameter', type: 'text', default: 'offset', showIf: { key: 'pagination', values: ['offset'] } },
      { key: 'limitParam', label: 'Limit parameter', type: 'text', default: 'limit', showIf: { key: 'pagination', values: ['offset'] } },
      { key: 'cursorParam', label: 'Cursor parameter', type: 'text', default: 'cursor', showIf: { key: 'pagination', values: ['cursor'] } },
      { key: 'nextCursorPath', label: 'Next cursor in the answer at', type: 'text', default: 'next_cursor', showIf: { key: 'pagination', values: ['cursor'] } },
      { key: 'updateMethod', label: 'Changes with', type: 'select', default: 'PATCH', options: [
        { value: 'PATCH', label: 'PATCH (changed fields)' },
        { value: 'PUT', label: 'PUT (the whole record)' },
      ] },
    ],
    keyColumn: 'optional',
    keyHelp: 'The records’ id field. Without one: “id”.',
  },
];

export const connectionKind = (kind: string | null | undefined): ConnectionKind | undefined =>
  CONNECTION_KINDS.find((k) => k.kind === kind);

/** Whether a field is shown for these settings (defaults included, see withDefaults). */
export const fieldShown = (field: ConnectionField, values: Record<string, unknown>): boolean =>
  !field.showIf || field.showIf.values.includes(String(values[field.showIf.key] ?? ''));

/** The settings of the shown fields, each field's default where it has no value. */
export function withDefaults(fields: ConnectionField[], values: Record<string, unknown>): Record<string, unknown> {
  const all: Record<string, unknown> = {};
  for (const field of fields) {
    const value = values[field.key] ?? field.default;
    if (value !== undefined && value !== '') all[field.key] = value;
  }
  return Object.fromEntries(Object.entries(all).filter(([key]) => fieldShown(fields.find((f) => f.key === key)!, all)));
}

/** Whether a data source of this kind needs a key column, may have one, or has none, for these settings. */
export const keyColumnRule = (kind: ConnectionKind, settings: Record<string, unknown>): KeyColumnRule =>
  typeof kind.keyColumn === 'function' ? kind.keyColumn(settings) : kind.keyColumn;
