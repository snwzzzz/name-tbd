import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PreviewDataService } from './preview-data.service';
import { DataSourceStateService } from './data-source-state.service';
import { DataSourceDto } from '../api/models';

describe('PreviewDataService', () => {
  const real: DataSourceDto = { id: 5, columns: ['name'], rows: [['Alice'], ['Bob']] };
  let preview: PreviewDataService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: DataSourceStateService, useValue: { details: signal({ 5: real }) } }],
    });
    preview = TestBed.inject(PreviewDataService);
  });

  it('reads the real data until something changes, identifying rows by position', () => {
    expect(preview.table(5)?.rows).toEqual([{ id: '0', values: ['Alice'] }, { id: '1', values: ['Bob'] }]);
    expect(preview.table(9)).toBeNull();
  });

  it('changes a copy, never the real data, and drops it on reset', () => {
    preview.addRow(5, ['Carol']);
    preview.updateRow(5, '0', ['Alicia']);
    preview.deleteRows(5, ['1']);

    expect(preview.table(5)?.rows.map((r) => r.values[0])).toEqual(['Alicia', 'Carol']);
    expect(real.rows).toEqual([['Alice'], ['Bob']]);

    preview.reset();
    expect(preview.table(5)?.rows.map((r) => r.values[0])).toEqual(['Alice', 'Bob']);
  });
});
