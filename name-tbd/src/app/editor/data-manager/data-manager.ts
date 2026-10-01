import { Component, computed, effect, inject, signal } from '@angular/core';
import { LucideDatabase, LucideSearch, LucideSheet, LucideUpload } from '@lucide/angular';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { OpenDataSourceService } from '../../_services/open-data-source.service';
import { ModalService } from '../../_services/modal/modal.service';
import { DataSourceSummaryDto } from '../../api/models';
import { DATA_SOURCE_FORMATS } from '../../_constants/data-source.constants';
import { DataManagerDetail } from './data-manager-detail';

/**
 * The Data panel opened as a tab of its own: every data source in a searchable list next to a
 * dashboard of the selected one (see DataManagerDetail). Shares the open data source with the panel.
 */
@Component({
  selector: 'app-data-manager',
  imports: [DataManagerDetail, LucideDatabase, LucideSearch, LucideSheet, LucideUpload],
  templateUrl: './data-manager.html',
  styleUrl: './data-manager.scss',
})
export class DataManager {
  private readonly state = inject(DataSourceStateService);
  private readonly openDataSource = inject(OpenDataSourceService);
  private readonly modal = inject(ModalService);

  readonly loading = this.state.loading;
  readonly error = this.state.error;
  readonly selectedId = this.openDataSource.id;
  readonly query = signal('');

  readonly sources = this.state.sources;
  readonly visibleSources = computed(() => {
    const query = this.query().trim().toLowerCase();
    return query ? this.sources().filter((s) => (s.name ?? '').toLowerCase().includes(query)) : this.sources();
  });

  readonly accept = DATA_SOURCE_FORMATS.flatMap((f) => f.extensions).join(',');
  readonly formatLabels = DATA_SOURCE_FORMATS.map((f) => f.label).join(', ');

  constructor() {
    this.state.ensureLoaded();
    // Nothing open yet: show the first data source rather than an empty dashboard
    effect(() => {
      const first = this.sources()[0]?.id;
      if (this.selectedId() === null && first != null && this.state.loaded()) this.select(first);
    });
  }

  select(id: number): void {
    this.openDataSource.open(id);
  }

  async onFileChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset, so choosing the same file again still triggers a change
    input.value = '';
    if (!file) return;
    const id = await this.state.importFile(file);
    if (id !== undefined) this.select(id);
  }

  async confirmDelete(source: DataSourceSummaryDto): Promise<void> {
    const confirmed = await this.modal.confirm({
      title: 'Delete data source',
      message: `Delete "${source.name}" and all of its rows? Tables and detail sections using it will show nothing. This can't be undone.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!confirmed || !(await this.state.remove(source.id!))) return;
    if (this.selectedId() === source.id) this.openDataSource.open(this.sources()[0]?.id ?? null);
  }
}
