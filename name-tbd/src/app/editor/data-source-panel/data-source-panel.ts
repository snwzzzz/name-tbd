import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { ModalService } from '../../_services/modal/modal.service';
import { DataSourceSummaryDto } from '../../api/models';
import { DATA_SOURCE_QUERY_PARAM } from '../../_constants/data-source.constants';
import { DataSourceList } from '../data-source-list/data-source-list';
import { DataSourceDetail } from '../data-source-detail/data-source-detail';

/**
 * The sidebar's Data tab: the list of data sources, or one data source's details. Which one is
 * open lives in the URL (`?dataSource=<id>`), so it survives reloads and the browser's back button
 * returns to the list.
 */
@Component({
  selector: 'app-data-source-panel',
  imports: [DataSourceList, DataSourceDetail],
  template: `
    @if (openId(); as id) {
      <app-data-source-detail [id]="id" (back)="close()" (deleteRequested)="confirmDelete($event)" />
    } @else {
      <app-data-source-list (opened)="open($event)" (deleteRequested)="confirmDelete($event)" />
    }
  `,
  styles: ':host { display: block; height: 100%; }',
})
export class DataSourcePanel {
  private readonly router = inject(Router);
  private readonly state = inject(DataSourceStateService);
  private readonly modal = inject(ModalService);

  /** The id of the open data source, or null for the list. */
  readonly openId = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(
      map((params) => {
        const id = Number(params.get(DATA_SOURCE_QUERY_PARAM));
        return Number.isInteger(id) && params.has(DATA_SOURCE_QUERY_PARAM) ? id : null;
      }),
    ),
    { initialValue: null },
  );

  open(id: number): void {
    this.setOpenId(id);
  }

  close(): void {
    this.setOpenId(null);
  }

  async confirmDelete(source: DataSourceSummaryDto): Promise<void> {
    const confirmed = await this.modal.confirm({
      title: 'Delete data source',
      message: `Delete "${source.name}"? This cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!confirmed) return;
    const deleted = await this.state.remove(source.id!);
    if (deleted && this.openId() === source.id) this.close();
  }

  /** Changes only the query parameter, keeping the current tab and mode. */
  private setOpenId(id: number | null): void {
    this.router.navigate([], { queryParams: { [DATA_SOURCE_QUERY_PARAM]: id }, queryParamsHandling: 'merge' });
  }
}
