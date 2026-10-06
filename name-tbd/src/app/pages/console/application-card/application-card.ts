import { Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LucideCopy, LucidePencil, LucideTrash2 } from '@lucide/angular';
import { ApplicationDto } from '../../../api/models';

/** One application in the console: opens it in the editor, renames, duplicates or deletes it. */
@Component({
  selector: 'app-application-card',
  imports: [RouterLink, DatePipe, LucideCopy, LucidePencil, LucideTrash2],
  templateUrl: './application-card.html',
  styleUrl: './application-card.scss',
})
export class ApplicationCard {
  readonly application = input.required<ApplicationDto>();
  readonly rename = output<void>();
  readonly duplicate = output<void>();
  readonly remove = output<void>();

  readonly editorLink = computed(() => ['/apps', this.application().id, 'edit']);
}
