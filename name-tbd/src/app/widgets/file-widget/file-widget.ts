import { Component, computed, signal } from '@angular/core';
import { LucideUpload, LucideX } from '@lucide/angular';
import { BaseFieldWidget } from '../_shared/base-field-widget';
import { fileValue, parseFileValue } from '../../core/forms/file-value';
import { propNumber } from '../../_utils/widget-props.utils';

/**
 * The largest file a file upload takes (KB). Files are kept inline, in the exported app's data
 * (and its visitors' browser storage, a few MB in all); a server keeps them once apps are published.
 */
export const FILE_MAX_KB = 2048;
const FILE_DEFAULT_MAX_KB = 512;

/**
 * Picks a file (or takes one dropped on it) and keeps it as its value: a data URL with the file's
 * name (core/forms/file-value), which a form saves into its row. Files over the size limit are
 * refused with a message under the field.
 */
@Component({
  selector: 'app-file-widget',
  imports: [LucideUpload, LucideX],
  templateUrl: './file-widget.html',
  styleUrl: './file-widget.scss',
})
export class FileWidget extends BaseFieldWidget {
  protected readonly kind = 'file';

  readonly accept = computed(() => this.text('accept') ?? null);
  readonly maxKb = computed(() => Math.min(FILE_MAX_KB, Math.max(1, propNumber(this.props(), 'maxSizeKb', FILE_DEFAULT_MAX_KB))));
  readonly file = computed(() => parseFileValue(this.value()));
  readonly isImage = computed(() => this.file()?.type.startsWith('image/') ?? false);
  readonly dragging = signal(false);

  onPicked(input: HTMLInputElement): void {
    const file = input.files?.[0];
    input.value = '';
    if (file) this.take(file);
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file && this.session.live()) this.take(file);
  }

  onDragOver(event: DragEvent): void {
    if (!this.session.live()) return;
    event.preventDefault();
    this.dragging.set(true);
  }

  remove(): void {
    this.setValue('');
  }

  /** Reads the file into the value, unless it's too big. */
  take(file: File): void {
    if (!this.session.live()) return;
    if (file.size > this.maxKb() * 1024) {
      this.errors.set(this.id(), `The file is larger than ${this.maxKb()} KB.`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.errors.set(this.id(), null);
      this.setValue(fileValue(file.name, String(reader.result)));
    };
    reader.readAsDataURL(file);
  }
}
