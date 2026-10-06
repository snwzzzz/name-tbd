import { cellText, fileValue, parseFileValue } from './file-value';

describe('file values', () => {
  it('keeps the file name in the data URL, and reads it back', () => {
    const value = fileValue('Rechnung März.pdf', 'data:application/pdf;base64,JVBERi0=');
    expect(value).toBe('data:application/pdf;name=Rechnung%20M%C3%A4rz.pdf;base64,JVBERi0=');
    expect(parseFileValue(value)).toEqual({ name: 'Rechnung März.pdf', type: 'application/pdf', url: value });
  });

  it('shows a file by its name in tables and lists; other text as it is', () => {
    expect(cellText(fileValue('logo.png', 'data:image/png;base64,iVBO'))).toBe('logo.png');
    expect(cellText('Alice')).toBe('Alice');
    expect(parseFileValue('Alice')).toBeNull();
  });
});
