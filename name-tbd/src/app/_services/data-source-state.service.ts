import { Injectable, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { DataSourceControllerService } from '../api/services/dataSourceController.service';
import { DataSourceDto, DataSourceSummaryDto } from '../api/models';
import { DATA_SOURCE_BRANCH_ID, DATA_SOURCE_FORMATS } from '../_constants/data-source.constants';
import { DataSourceFormat } from '../_types/data-source.types';

/**
 * The project's data sources (tabular data imported from files). The list is loaded once; a data
 * source's rows only when it's opened. Which one is open is up to the URL (see DataSourcePanel).
 */
@Injectable({ providedIn: 'root' })
export class DataSourceStateService {
  private readonly api = inject(DataSourceControllerService);

  readonly sources = signal<DataSourceSummaryDto[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  /** Fully loaded data sources (with rows) by id. */
  readonly details = signal<Record<number, DataSourceDto>>({});

  private loaded = false;

  /** Loads the list of data sources, unless it's already loaded. */
  ensureLoaded(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.loading.set(true);
    this.api.getDataSources(DATA_SOURCE_BRANCH_ID).subscribe({
      next: (sources) => {
        this.sources.set(sources);
        this.loading.set(false);
      },
      error: (err) => {
        this.loaded = false;
        this.fail('Failed to load data sources', err);
      },
    });
  }

  /** Loads a data source's rows, unless they're already loaded. */
  ensureDetails(id: number): void {
    if (this.details()[id]) return;
    this.error.set(null);
    this.api.getDataSource(id).subscribe({
      next: (source) => this.cache(source),
      error: (err) => this.fail('Failed to load data source', err),
    });
  }

  /** Imports a file as a new data source; resolves to its id (undefined if it failed). */
  async importFile(file: File): Promise<number | undefined> {
    const format = formatOf(file.name);
    if (!format) {
      this.error.set(`Unsupported file type: ${file.name}`);
      return undefined;
    }
    this.error.set(null);
    this.loading.set(true);
    try {
      const content = await file.text();
      const created = await firstValueFrom(
        this.api.importDataSource({ branchId: DATA_SOURCE_BRANCH_ID, name: baseName(file.name), format: format.format, content }),
      );
      this.sources.update((all) => [...all, summaryOf(created)].sort(byName));
      this.cache(created);
      this.loading.set(false);
      return created.id;
    } catch (err) {
      this.fail(`Failed to import ${file.name}`, err);
      return undefined;
    }
  }

  /** Deletes a data source; resolves to whether it worked. */
  async remove(id: number): Promise<boolean> {
    try {
      await firstValueFrom(this.api.deleteDataSource(id));
      this.sources.update((all) => all.filter((s) => s.id !== id));
      this.details.update(({ [id]: _, ...rest }) => rest);
      return true;
    } catch (err) {
      this.fail('Failed to delete data source', err);
      return false;
    }
  }

  private cache(source: DataSourceDto): void {
    this.details.update((all) => ({ ...all, [source.id!]: source }));
  }

  private fail(message: string, err: unknown): void {
    console.error(message, err);
    // The backend explains bad input (e.g. a malformed CSV) in its error body
    const detail = err instanceof HttpErrorResponse ? err.error?.message : undefined;
    this.error.set(detail ? `${message}: ${detail}` : message);
    this.loading.set(false);
  }
}

const formatOf = (fileName: string): DataSourceFormat | undefined => {
  const name = fileName.toLowerCase();
  return DATA_SOURCE_FORMATS.find((f) => f.extensions.some((ext) => name.endsWith(ext)));
};

const baseName = (fileName: string): string => fileName.replace(/\.[^.]+$/, '') || fileName;

const summaryOf = (source: DataSourceDto): DataSourceSummaryDto => ({
  id: source.id,
  name: source.name,
  format: source.format,
  branchId: source.branchId,
  columns: source.columns,
  rowCount: source.rows?.length ?? 0,
});

const byName = (a: DataSourceSummaryDto, b: DataSourceSummaryDto): number =>
  (a.name ?? '').localeCompare(b.name ?? '');
