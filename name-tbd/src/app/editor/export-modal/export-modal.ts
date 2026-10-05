import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Button } from '../../components/button/button';
import { MODAL_REF } from '../../_services/modal/modal.tokens';
import { ModalRef } from '../../_services/modal/modal-ref';
import { ExportControllerService } from '../../api/services/exportController.service';
import { AppKeyControllerService } from '../../api/services/appKeyController.service';
import { EditorContext } from '../../_services/editor-context.service';
import { DataReport, AppKeyDto } from '../../api/models';
import { appExportUrl } from '../../_constants/api.constants';

@Component({
  selector: 'app-export-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, Button],
  templateUrl: './export-modal.html',
  styleUrl: './export-modal.scss',
})
export class ExportModal implements OnInit {
  private readonly modalRef = inject(ModalRef);
  private readonly exportController = inject(ExportControllerService);
  private readonly appKeyController = inject(AppKeyControllerService);
  private readonly context = inject(EditorContext);

  readonly branchId = this.context.requireBranchId();
  readonly appId = this.context.app()?.id!;

  readonly dataReport = signal<DataReport | null>(null);
  readonly appKeys = signal<AppKeyDto[]>([]);

  readonly selectedMode = signal<string>('embed');
  readonly allColumns = signal<boolean>(false);
  
  readonly isEmbed = computed(() => this.selectedMode() === 'embed');
  
  ngOnInit() {
    this.exportController.getExportData(this.branchId).subscribe(report => {
      this.dataReport.set(report);
      if (report.dataMode) {
        this.selectedMode.set(report.dataMode);
      }
    });

    this.loadAppKeys();
  }

  loadAppKeys() {
    if (this.appId) {
      this.appKeyController.getAppKeys(this.appId).subscribe(keys => {
        this.appKeys.set(keys);
      });
    }
  }

  revokeAppKey(id: number | undefined) {
    if (!id) return;
    this.appKeyController.revokeAppKey(id).subscribe(() => {
      this.loadAppKeys();
    });
  }

  exportApp() {
    const url = appExportUrl(this.branchId);
    const link = document.createElement('a');
    // Append query parameters
    link.href = `${url}?dataMode=${this.selectedMode()}&allColumns=${this.allColumns()}`;
    link.download = '';
    link.click();
    this.modalRef.close();
  }

  cancel() {
    this.modalRef.close();
  }
}
