import { Component, ElementRef, OnInit, effect, inject, signal, viewChild } from '@angular/core';
import { LucideEye, LucidePencil, LucideRefreshCw, LucideRotateCcw } from '@lucide/angular';
import { VersionsService } from '../../_services/versions.service';
import { ModalService } from '../../_services/modal/modal.service';
import { VersionDto } from '../../api/models';
import { timeAgo } from '../../_utils/time.utils';

/** What a version without a name is called, by why it was made. */
const KIND_NAMES: Record<NonNullable<VersionDto['kind']>, string> = {
  MANUAL: 'Saved version',
  AUTO: 'Automatic',
  BEFORE_EXPORT: 'Before export',
  RESTORE: 'Before restore',
  LEGACY: 'Old version',
};

/**
 * The sidebar's History tab: the app's versions, newest first. Save the app as a version (optionally
 * named), preview a version in a new browser tab, rename it, or restore it (after confirming).
 */
@Component({
  selector: 'app-history-panel',
  imports: [LucideEye, LucidePencil, LucideRefreshCw, LucideRotateCcw],
  templateUrl: './history-panel.html',
  styleUrl: './history-panel.scss',
})
export class HistoryPanel implements OnInit {
  private readonly modal = inject(ModalService);
  readonly state = inject(VersionsService);

  /** The name typed for the next version. */
  readonly newLabel = signal('');
  /** The version being renamed, and its name so far. */
  readonly renaming = signal<{ id: number; label: string } | null>(null);
  private readonly renameInput = viewChild<ElementRef<HTMLInputElement>>('rename');

  constructor() {
    // The name field takes the focus when it appears
    effect(() => this.renameInput()?.nativeElement.focus());
  }

  ngOnInit(): void {
    void this.state.load();
  }

  title(version: VersionDto): string {
    return version.label || KIND_NAMES[version.kind ?? 'MANUAL'];
  }

  meta(version: VersionDto): string {
    const when = version.createdAt ? timeAgo(new Date(version.createdAt).getTime()) : '';
    // A named automatic version says why it was made (a restore's own name already does)
    const kind = version.label && version.kind !== 'MANUAL' && version.kind !== 'RESTORE' ? KIND_NAMES[version.kind ?? 'MANUAL'] : null;
    return [when, version.author, kind].filter(Boolean).join(' · ');
  }

  async save(): Promise<void> {
    if (await this.state.save(this.newLabel().trim())) this.newLabel.set('');
  }

  startRename(version: VersionDto): void {
    this.renaming.set({ id: version.id!, label: version.label ?? '' });
  }

  async finishRename(): Promise<void> {
    const renaming = this.renaming();
    if (!renaming) return;
    this.renaming.set(null);
    const version = this.state.versions().find((v) => v.id === renaming.id);
    if ((version?.label ?? '') !== renaming.label.trim()) await this.state.rename(renaming.id, renaming.label.trim());
  }

  async restore(version: VersionDto): Promise<void> {
    const confirmed = await this.modal.confirm({
      title: `Restore version ${version.number}`,
      message: `The whole app becomes what it was in “${this.title(version)}”: its pages, workflows and data. `
        + 'What it is now is saved as a version first, so you can go back. The editor reloads.',
      confirmText: 'Restore',
      destructive: true,
    });
    if (confirmed) await this.state.restore(version.id!);
  }

  preview(version: VersionDto): void {
    this.state.preview(version.id!);
  }

  inputValue(event: Event): string {
    return (event.target as HTMLInputElement).value;
  }
}
