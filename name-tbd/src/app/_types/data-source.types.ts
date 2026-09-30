/** A file format data sources can be imported from. */
export interface DataSourceFormat {
  /** The format id the backend parses, e.g. 'csv'. */
  format: string;
  label: string;
  /** File extensions (with the dot) that are read as this format. */
  extensions: string[];
}

export type ColumnType = 'number' | 'boolean' | 'date' | 'text' | 'empty';

/** What the data source details show about one column. */
export interface ColumnInfo {
  index: number;
  name: string;
  type: ColumnType;
  filledCount: number;
}
