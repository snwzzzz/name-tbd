import { Component, inject, OnInit, output } from '@angular/core';
import { LucideSheet, LucideTrash2, LucideUpload } from '@lucide/angular';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { DataSourceSummaryDto } from '../../api/models';
import { DATA_SOURCE_FORMATS } from '../../_constants/data-source.constants';

/** The project's data sources: import files (CSV, ...), open or delete one. */
@Component({
  selector: 'app-data-source-list',
  imports: [LucideSheet, LucideTrash2, LucideUpload],
  templateUrl: './data-source-list.html',
  styleUrl: './data-source-list.scss',
})
export class DataSourceList implements OnInit {
  private readonly state = inject(DataSourceStateService);

  /** A data source was clicked, or just imported. */
  readonly opened = output<number>();
  readonly deleteRequested = output<DataSourceSummaryDto>();

  readonly sources = this.state.sources;
  readonly loading = this.state.loading;
  readonly error = this.state.error;

  readonly accept = DATA_SOURCE_FORMATS.flatMap((f) => f.extensions).join(',');
  readonly formatLabels = DATA_SOURCE_FORMATS.map((f) => f.label).join(', ');

  ngOnInit(): void {
    this.state.ensureLoaded();
  }

  async onFileChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Reset, so choosing the same file again still triggers a change
    input.value = '';
    if (!file) return;
    const id = await this.state.importFile(file);
    if (id !== undefined) this.opened.emit(id);
  }

  requestDelete(source: DataSourceSummaryDto, event: Event): void {
    event.stopPropagation();
    this.deleteRequested.emit(source);
  }
}
