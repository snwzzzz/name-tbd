import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalRef } from '../../_services/modal/modal-ref';
import { CONNECTION_KINDS, ConnectionKind } from '../../_constants/connection-kinds.constants';
import { EditorContext } from '../../_services/editor-context.service';
import { ConnectionControllerService } from '../../api/services/connectionController.service';
import { DataSourceControllerService } from '../../api/services/dataSourceController.service';
import { DataSourceStateService } from '../../_services/data-source-state.service';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-connect-data-modal',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './connect-data-modal.html',
  styleUrl: './connect-data-modal.scss',
})
export class ConnectDataModal implements OnInit {
  private readonly modalRef = inject(ModalRef);
  private readonly context = inject(EditorContext);
  // Optional services for data source api
  // private readonly connectionApi = inject(ConnectionControllerService);
  // private readonly dataSourceApi = inject(DataSourceControllerService);
  // private readonly dataSourceState = inject(DataSourceStateService);

  readonly kinds = CONNECTION_KINDS;
  step = 1;
  selectedKind: ConnectionKind | null = null;
  connectionId: number | null = null;
  connectionValues: Record<string, any> = {};
  sourceValues: Record<string, any> = {};

  ngOnInit() {
    // modalRef.data might contain a connectionId if we are returning from OAuth
    if (this.modalRef.config.data && typeof this.modalRef.config.data === 'number') {
      this.connectionId = this.modalRef.config.data;
      this.step = 3;
    }
  }

  selectKind(kind: ConnectionKind) {
    this.selectedKind = kind;
    if (kind.signIn) {
      const branchId = this.context.requireBranchId();
      const returnTo = encodeURIComponent(window.location.pathname);
      window.location.href = `/api/connections/oauth/${kind.signIn}/start?branchId=${branchId}&returnTo=${returnTo}`;
    } else {
      this.step = 2;
    }
  }

  async createConnection() {
    // In a full implementation we would call ConnectionControllerService.createConnection
    // For now we just simulate success and go to step 3
    this.connectionId = 123; // mock
    this.step = 3;
  }

  async addDataSource() {
    // In a full implementation we would call DataSourceControllerService.addLiveDataSource
    // and close with the new data source id
    this.modalRef.close(456); // mock id
  }

  close() {
    this.modalRef.close();
  }
}
