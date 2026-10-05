import { Component, inject } from '@angular/core';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { ModalService } from '../../_services/modal/modal.service';
import { DataSourceSummaryDto } from '../../api/models';
import { OpenDataSourceService } from '../../_services/open-data-source.service';
import { DataSourceList } from '../data-source-list/data-source-list';
import { DataSourceDetail } from '../data-source-detail/data-source-detail';
import { ActivatedRoute, Router } from '@angular/router';
import { ConnectDataModal } from '../connect-data-modal/connect-data-modal';

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
  private readonly openDataSource = inject(OpenDataSourceService);
  private readonly state = inject(DataSourceStateService);
  private readonly modal = inject(ModalService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  /** The id of the open data source, or null for the list. */
  readonly openId = this.openDataSource.id;

  constructor() {
    this.route.queryParams.subscribe(params => {
      const connected = params['connected'];
      const connectError = params['connectError'];
      if (connectError) {
        this.modal.confirm({
          title: 'Connection failed',
          message: connectError,
          confirmText: 'OK',
        });
        this.router.navigate([], { queryParams: { connectError: null }, queryParamsHandling: 'merge', replaceUrl: true });
      } else if (connected) {
        const connectionId = parseInt(connected, 10);
        this.modal.open(ConnectDataModal, { data: connectionId }).afterClosed().subscribe((sourceId: any) => {
          if (sourceId !== undefined && typeof sourceId === 'number') {
            this.open(sourceId);
          }
        });
        this.router.navigate([], { queryParams: { connected: null }, queryParamsHandling: 'merge', replaceUrl: true });
      }
    });
  }

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

  private setOpenId(id: number | null): void {
    this.openDataSource.open(id);
  }
}
