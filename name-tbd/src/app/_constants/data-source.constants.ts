import { DataSourceFormat } from '../_types/data-source.types';

/**
 * The file formats that can be imported. `format` must match a parser registered in the backend
 * (TabularDataParser); a new format is supported by adding an entry here.
 */
export const DATA_SOURCE_FORMATS: DataSourceFormat[] = [
  { format: 'csv', label: 'CSV', extensions: ['.csv'] },
];

/** How many rows the sidebar preview of a data source shows. */
export const DATA_SOURCE_PREVIEW_ROWS = 20;

/** The query parameter holding the data source opened in the sidebar (e.g. `?dataSource=5`). */
export const DATA_SOURCE_QUERY_PARAM = 'dataSource';
