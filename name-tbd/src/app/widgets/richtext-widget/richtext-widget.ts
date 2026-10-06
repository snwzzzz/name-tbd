import { Component, computed } from '@angular/core';
import { BaseWidget } from '../../_directives/base-widget.directive';
import { renderMarkdown } from '../../core/rendering/markdown';

/** Formatted text: headings, paragraphs, lists, bold, italic and links, written as Markdown (core/rendering/markdown). */
@Component({
  selector: 'app-richtext-widget',
  template: `<div class="richtext" [style.color]="color()" [innerHTML]="html()"></div>`,
  styleUrl: './richtext-widget.scss',
})
export class RichtextWidget extends BaseWidget {
  readonly html = computed(() => renderMarkdown(this.text('content') ?? ''));
  readonly color = computed(() => this.text('color') ?? null);
}
