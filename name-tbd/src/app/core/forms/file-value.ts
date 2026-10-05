// A file picked in a file upload, kept as text like every value: a data URL that carries the
// file's name as a parameter (data:image/png;name=logo.png;base64,...), so it can be saved in a
// data source cell and shown by its name.

export interface FileValue {
  name: string;
  type: string;
  /** The data URL (usable as a link or an image source). */
  url: string;
}

/** The value for a file read as a data URL (FileReader.readAsDataURL). */
export function fileValue(name: string, dataUrl: string): string {
  const comma = dataUrl.indexOf(',');
  if (!dataUrl.startsWith('data:') || comma < 0) return dataUrl;
  const head = dataUrl.slice(5, comma).split(';');
  const tail = dataUrl.slice(comma);
  return `data:${[head[0], `name=${encodeURIComponent(name)}`, ...head.slice(1)].join(';')}${tail}`;
}

/** The file a value holds, or null when it isn't one. */
export function parseFileValue(value: string | undefined | null): FileValue | null {
  if (!value?.startsWith('data:')) return null;
  const comma = value.indexOf(',');
  if (comma < 0) return null;
  const [type, ...params] = value.slice(5, comma).split(';');
  const name = params.find((p) => p.startsWith('name='));
  return { name: name ? safeDecode(name.slice(5)) : 'File', type: type || 'application/octet-stream', url: value };
}

/** How a cell's value reads in a table, a detail section or a list: a file by its name. */
export function cellText(value: string | undefined | null): string {
  return parseFileValue(value)?.name ?? value ?? '';
}

function safeDecode(text: string): string {
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}
